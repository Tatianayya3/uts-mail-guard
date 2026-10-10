import type { Analytics, ScanRecord, StoredScan } from "@mail-guard/contracts";

/**
 * Calcula métricas a partir de análisis crudos. Se usa cuando la tabla
 * agregada `profile_analytics` aún no existe o está desactualizada.
 */
export function deriveAnalytics(
  scans: Pick<ScanRecord, "verdict" | "trustScore" | "links" | "analyzedAt">[],
): Analytics {
  const count = (verdict: ScanRecord["verdict"]) =>
    scans.filter((s) => s.verdict === verdict).length;
  const total = scans.length;
  return {
    totalScans: total,
    safeScans: count("safe"),
    suspiciousScans: count("suspicious"),
    dangerousScans: count("dangerous"),
    unknownScans: count("unknown"),
    linksReviewed: scans.reduce((acc, s) => acc + s.links.length, 0),
    averageTrustScore: total
      ? Math.round(scans.reduce((acc, s) => acc + s.trustScore, 0) / total)
      : 0,
    lastScannedAt: scans[0]?.analyzedAt ?? null,
  };
}

/** Elimina duplicados de un lote por huella del correo (los sin huella se conservan). */
export function dedupeByHash<T extends Pick<StoredScan, "emailHash">>(
  scans: T[],
): T[] {
  const seen = new Set<string>();
  return scans.filter((scan) => {
    if (!scan.emailHash) return true;
    if (seen.has(scan.emailHash)) return false;
    seen.add(scan.emailHash);
    return true;
  });
}
