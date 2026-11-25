import type {
  SentinelDecision,
  ThreatDomain,
  ThreatLevel,
} from "@mail-guard/contracts";

/**
 * Agente Centinela · deliberación (función pura).
 *
 * Clasificación: agente DELIBERATIVO basado en objetivos. Mantiene creencias
 * (la base de conocimiento de amenazas), percibe el entorno (análisis
 * agregados por dominio) y elige acciones que acerquen sus objetivos:
 *
 *   O1. Detectar campañas activas de phishing.
 *   O2. Avisar a los usuarios que recibieron correos de esas campañas.
 *   O3. Mantener la base de conocimiento vigente (retirar lo que ya no se ve).
 *
 * Además prioriza con una función de utilidad, para que si hay más trabajo
 * del que permite una ejecución, se atienda primero lo más grave.
 */

/** Lo que percibe el sensor: solo conteos por dominio, nunca contenido. */
export type Observation = {
  domain: string;
  dangerousReports: number;
  suspiciousReports: number;
  safeReports: number;
  affectedUsers: number;
  lastSeenAt: string;
};

export type SentinelPolicy = {
  /** Ventana de percepción en días. */
  windowDays: number;
  /** Reportes «peligroso» para declarar campaña peligrosa. */
  dangerousThreshold: number;
  /** Reportes peligrosos + sospechosos para declarar dominio sospechoso. */
  suspiciousThreshold: number;
  /** Días sin reportes para retirar un dominio de la base de conocimiento. */
  retireAfterDays: number;
  /** Máximo de acciones por ejecución (las de mayor prioridad primero). */
  maxActionsPerRun: number;
};

export const DEFAULT_POLICY: SentinelPolicy = {
  windowDays: 30,
  dangerousThreshold: 2,
  suspiciousThreshold: 3,
  retireAfterDays: 30,
  maxActionsPerRun: 25,
};

/**
 * Proveedores de correo masivo: un atacante puede usarlos, pero bloquear el
 * dominio entero castigaría a millones de remitentes legítimos.
 */
export const PROTECTED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "gmx.com",
  "zoho.com",
  "uts.edu.co",
]);

const LEVEL_RANK: Record<ThreatLevel, number> = { suspicious: 1, dangerous: 2 };

/** Utilidad: cuánto importa actuar sobre un dominio. */
export function priorityOf(o: Observation): number {
  const raw =
    o.dangerousReports * 3 +
    o.suspiciousReports +
    o.affectedUsers * 2 -
    o.safeReports * 2;
  return Math.max(0, Math.round(raw * 100) / 100);
}

/** Nivel que merece el dominio según lo observado, o null si no alcanza umbral. */
export function targetLevel(
  o: Observation,
  policy: SentinelPolicy,
): ThreatLevel | null {
  if (o.dangerousReports >= policy.dangerousThreshold) return "dangerous";
  if (o.dangerousReports + o.suspiciousReports >= policy.suspiciousThreshold)
    return "suspicious";
  return null;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function describe(o: Observation): string {
  return [
    plural(o.dangerousReports, "reporte peligroso", "reportes peligrosos"),
    plural(o.suspiciousReports, "sospechoso", "sospechosos"),
    plural(o.affectedUsers, "usuario expuesto", "usuarios expuestos"),
  ].join(", ");
}

const daysBetween = (from: string, to: Date) =>
  (to.getTime() - new Date(from).getTime()) / 86_400_000;

/**
 * Decide qué hacer con cada dominio. Devuelve las decisiones ordenadas por
 * prioridad; las «ignore» explican por qué un dominio con alertas no se
 * publicó (son parte de la explicación del agente, no generan acciones).
 */
export function deliberate(
  observations: Observation[],
  known: ThreatDomain[],
  now: Date,
  policy: SentinelPolicy = DEFAULT_POLICY,
): SentinelDecision[] {
  const beliefs = new Map(known.map((t) => [t.domain, t]));
  const seen = new Set<string>();
  const decisions: SentinelDecision[] = [];

  for (const o of observations) {
    const domain = o.domain.toLowerCase();
    seen.add(domain);
    const level = targetLevel(o, policy);
    if (!level) continue;

    const priority = priorityOf(o);
    const belief = beliefs.get(domain);
    const evidence = describe(o);

    if (PROTECTED_DOMAINS.has(domain)) {
      decisions.push({
        domain,
        decision: "ignore",
        priority,
        reason: `Proveedor de correo masivo: no se bloquea el dominio completo (${evidence}).`,
      });
      continue;
    }
    if (o.safeReports >= o.dangerousReports + o.suspiciousReports) {
      decisions.push({
        domain,
        decision: "ignore",
        priority,
        reason: `Reputación mixta: ${plural(o.safeReports, "análisis seguro", "análisis seguros")} frente a ${evidence}.`,
      });
      continue;
    }

    if (!belief || !belief.active) {
      decisions.push({
        domain,
        decision: "flag",
        level,
        priority,
        reason: `Campaña ${level === "dangerous" ? "peligrosa" : "sospechosa"} detectada: ${evidence}.`,
      });
    } else if (LEVEL_RANK[level] > LEVEL_RANK[belief.level]) {
      decisions.push({
        domain,
        decision: "escalate",
        level,
        priority,
        reason: `Sube de sospechoso a peligroso: ${evidence}.`,
      });
    } else if (
      belief.dangerousReports !== o.dangerousReports ||
      belief.suspiciousReports !== o.suspiciousReports ||
      belief.affectedUsers !== o.affectedUsers
    ) {
      decisions.push({
        domain,
        decision: "refresh",
        level: belief.level,
        priority,
        reason: `Sigue activa con nuevos reportes: ${evidence}.`,
      });
    }
  }

  for (const belief of known) {
    if (!belief.active || seen.has(belief.domain)) continue;
    const idle = daysBetween(belief.lastSeenAt, now);
    if (idle >= policy.retireAfterDays) {
      decisions.push({
        domain: belief.domain,
        decision: "retire",
        priority: 0,
        reason: `Sin reportes hace ${Math.floor(idle)} días: se retira de la base de conocimiento.`,
      });
    }
  }

  return decisions.sort((a, b) => b.priority - a.priority);
}

/** Decisiones que generan acciones, respetando el máximo por ejecución. */
export function actionable(
  decisions: SentinelDecision[],
  policy: SentinelPolicy = DEFAULT_POLICY,
): SentinelDecision[] {
  return decisions
    .filter((d) => d.decision !== "ignore")
    .slice(0, policy.maxActionsPerRun);
}
