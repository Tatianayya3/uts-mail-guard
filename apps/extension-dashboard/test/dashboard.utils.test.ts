import { describe, expect, test } from "bun:test";
import type { ScanRecord, Verdict } from "@mail-guard/contracts";
import {
  bucketScansByDay,
  dayKey,
  filterScans,
  periodDelta,
  scansInRange,
  scansToCsv,
  topSenderDomains,
} from "../src/features/dashboard/dashboard.utils";

const NOW = new Date("2026-10-10T15:00:00.000Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

function scan(
  daysAgo: number,
  verdict: Verdict,
  domain = "uts.edu.co",
  subject = "Hola",
): ScanRecord {
  const at = new Date(NOW - daysAgo * DAY).toISOString();
  return {
    id: `${daysAgo}-${verdict}-${domain}`,
    provider: "Gmail",
    subject,
    trustScore: verdict === "safe" ? 90 : verdict === "dangerous" ? 10 : 50,
    verdict,
    summary: "",
    advice: "",
    sender: {
      email: `a@${domain}`,
      domain,
      displayName: "A",
      domainStatus: "unknown",
    },
    signals: [],
    links: [],
    model: "test",
    analyzedAt: at,
    createdAt: at,
  };
}

describe("dashboard utils", () => {
  test("agrupa por día en hora de Colombia, no en UTC", () => {
    // 2026-10-10 02:00 UTC = 2026-10-09 21:00 en Bogotá
    expect(dayKey("2026-10-10T02:00:00.000Z")).toBe("2026-10-09");
  });

  test("bucketScansByDay crea un balde por día y cuenta por veredicto", () => {
    const buckets = bucketScansByDay(
      [scan(0, "safe"), scan(0, "dangerous"), scan(2, "safe")],
      7,
      NOW,
    );
    expect(buckets).toHaveLength(7);
    expect(buckets.at(-1)?.total).toBe(2);
    expect(buckets.at(-1)?.dangerous).toBe(1);
    expect(buckets.reduce((acc, b) => acc + b.total, 0)).toBe(3);
  });

  test("scansInRange y periodDelta comparan con el periodo anterior", () => {
    const scans = [scan(1, "safe"), scan(2, "safe"), scan(9, "safe")];
    expect(scansInRange(scans, 7, NOW)).toHaveLength(2);
    expect(periodDelta(scans, 7, NOW)).toEqual({
      current: 2,
      previous: 1,
      delta: 1,
    });
  });

  test("topSenderDomains prioriza dominios con alertas", () => {
    const scans = [
      scan(0, "safe", "uts.edu.co"),
      scan(0, "safe", "uts.edu.co"),
      scan(0, "safe", "uts.edu.co"),
      scan(0, "dangerous", "bancolombla.com"),
    ];
    const [first, second] = topSenderDomains(scans);
    expect(first?.domain).toBe("bancolombla.com");
    expect(first?.worst).toBe("dangerous");
    expect(second?.total).toBe(3);
  });

  test("filterScans busca por asunto/remitente y filtra por veredicto", () => {
    const scans = [
      scan(0, "safe", "uts.edu.co", "Notas"),
      scan(0, "dangerous", "x.com", "Premio"),
    ];
    expect(filterScans(scans, { query: "prem", verdict: "all" })).toHaveLength(
      1,
    );
    expect(filterScans(scans, { query: "", verdict: "safe" })[0]?.subject).toBe(
      "Notas",
    );
  });

  test("scansToCsv escapa comillas y usa ; para Excel en español", () => {
    const csv = scansToCsv([
      scan(0, "safe", "uts.edu.co", 'Dijo "hola"; adiós'),
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Dijo ""hola""; adiós"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
