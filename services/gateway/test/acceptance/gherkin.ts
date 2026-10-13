/**
 * Runner mínimo de Gherkin en español sobre `bun test` (el mismo formato que
 * Cucumber). Cada `Escenario` del .feature es una prueba; cada paso se busca
 * en las definiciones por expresión regular. Un paso sin definir falla.
 */
import { describe, test } from "bun:test";
import { readFileSync } from "node:fs";

type Step = { text: string; line: number };
type Scenario = { name: string; line: number; steps: Step[] };
type Feature = { name: string; background: Step[]; scenarios: Scenario[] };

const STEP = /^(Dado|Dada|Dados|Dadas|Cuando|Entonces|Y|E|Pero)\s+(.+)$/;

export function parseFeature(source: string): Feature {
  const feature: Feature = { name: "", background: [], scenarios: [] };
  let target: Step[] | null = null;

  source.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const [, keyword = "", rest = ""] = line.match(/^([^:]+):\s*(.*)$/) ?? [];
    if (keyword === "Característica") feature.name = rest;
    else if (keyword === "Antecedentes") target = feature.background;
    else if (keyword === "Escenario") {
      const scenario = { name: rest, line: index + 1, steps: [] };
      feature.scenarios.push(scenario);
      target = scenario.steps;
    } else {
      const step = line.match(STEP);
      if (step && target) target.push({ text: step[2]!, line: index + 1 });
    }
  });
  return feature;
}

export type StepDefinition<World> = [
  pattern: RegExp,
  run: (world: World, ...args: string[]) => unknown,
];

export function runFeature<World>(
  file: string,
  steps: StepDefinition<World>[],
  hooks: { create: () => World; dispose: (world: World) => void },
) {
  const feature = parseFeature(readFileSync(file, "utf8"));
  const name = file.split("/").pop();

  describe(feature.name, () => {
    for (const scenario of feature.scenarios) {
      test(scenario.name, async () => {
        const world = hooks.create();
        try {
          for (const step of [...feature.background, ...scenario.steps]) {
            const found = steps
              .map(([pattern, run]) => ({
                run,
                match: step.text.match(pattern),
              }))
              .find(({ match }) => match);
            if (!found?.match)
              throw new Error(
                `${name}:${step.line} paso sin definir: "${step.text}"`,
              );
            try {
              await found.run(world, ...found.match.slice(1));
            } catch (error) {
              throw new Error(
                `${name}:${step.line} falló el paso "${step.text}": ${error instanceof Error ? error.message : error}`,
              );
            }
          }
        } finally {
          hooks.dispose(world);
        }
      });
    }
  });
}
