import { describe, expect, test } from "bun:test";
import { collectEvidence } from "../src/domain/evidence";
import { heuristicDecision, mergeSignals } from "../src/domain/scoring";
import { emptyEmail, legitEmail, phishingEmail } from "./fixtures";

describe("heuristicDecision", () => {
  test("phishing → peligroso con puntaje bajo", () => {
    const d = heuristicDecision(collectEvidence(phishingEmail));
    expect(d.verdict).toBe("dangerous");
    expect(d.trustScore).toBeLessThan(40);
    expect(d.signals.find((s) => s.key === "sender")?.status).toBe("fail");
  });

  test("correo legítimo → seguro", () => {
    const d = heuristicDecision(collectEvidence(legitEmail));
    expect(d.verdict).toBe("safe");
    expect(d.trustScore).toBeGreaterThanOrEqual(70);
  });

  test("sin contenido → sin determinar", () => {
    expect(heuristicDecision(collectEvidence(emptyEmail)).verdict).toBe(
      "unknown",
    );
  });
});

describe("mergeSignals", () => {
  test("conserva la señal más grave por clave", () => {
    const merged = mergeSignals(
      [
        {
          key: "sender",
          label: "R",
          value: "ok",
          status: "pass",
          detail: "modelo",
        },
      ],
      [
        {
          key: "sender",
          label: "R",
          value: "imita",
          status: "fail",
          detail: "regla",
        },
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.detail).toBe("regla");
  });
});
