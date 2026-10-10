import {
  LIMITS,
  type Overview,
  type ScanRecord,
  type StoredScan,
} from "@mail-guard/contracts";
import { dedupeByHash, deriveAnalytics } from "../domain/analytics";
import type { AuthenticatedUser, ScanRepository } from "./ports";

const MAX_LIST = 100;

/**
 * UC-07: guardar un análisis en el historial del usuario. Un duplicado (misma
 * huella) cuenta como guardado: ya está en el historial.
 */
export async function saveScan(
  repo: ScanRepository,
  scan: StoredScan,
): Promise<boolean> {
  await repo.insertMany([scan]);
  return true;
}

/** UC-08: sincronizar análisis hechos sin sesión. */
export async function syncScans(
  repo: ScanRepository,
  scans: StoredScan[],
): Promise<number> {
  const unique = dedupeByHash(scans).slice(0, LIMITS.syncBatch);
  return unique.length ? repo.insertMany(unique) : 0;
}

/** UC-09/UC-10: historial reciente. */
export function listScans(
  repo: ScanRepository,
  limit: number,
): Promise<ScanRecord[]> {
  return repo.listRecent(
    Math.max(1, Math.min(MAX_LIST, Math.trunc(limit) || 20)),
  );
}

/** UC-09: perfil + métricas, con respaldo calculado si el agregado no existe. */
export async function getOverview(
  repo: ScanRepository,
  user: AuthenticatedUser,
): Promise<Overview> {
  const [profile, stored] = await Promise.all([
    repo.getProfile(),
    repo.getAnalytics(),
  ]);

  let analytics = stored;
  if (!analytics || analytics.totalScans === 0) {
    const recent = await repo.listRecent(MAX_LIST);
    if (!analytics || recent.length > 0) analytics = deriveAnalytics(recent);
  }

  return {
    profile: profile ?? {
      id: user.id,
      displayName: user.fullName,
      role: null,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    analytics,
  };
}
