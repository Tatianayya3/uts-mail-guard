/**
 * Ejecuta `bun test` en cada workspace con pruebas y guarda el resultado en
 * `apps/extension-dashboard/src/features/tests/tests.report.json`, que es lo
 * que muestra la página /dashboard/tests. Correr tras agregar o cambiar
 * pruebas: `bun run tests:report`.
 *
 * El tipo de prueba sale de la carpeta: `test/*.test.ts` es unitaria y
 * `test/<tipo>/…` usa ese tipo (api, security, acceptance). En aceptación,
 * cada escenario se enlaza a su línea en el archivo .feature.
 */
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUTPUT = "apps/extension-dashboard/src/features/tests/tests.report.json";
const KINDS = ["api", "security", "acceptance"] as const;
const POSTMAN = "docs/postman/mail-guard.postman_collection.json";

type TestCase = {
  name: string;
  suite: string[];
  line: number;
  assertions: number;
  timeMs: number;
  status: "pass" | "fail" | "skip";
  /** Dónde está escrito el caso si no es en el .test.ts (escenarios Gherkin). */
  source?: { path: string; line: number };
};

type TestFile = {
  path: string;
  kind: "unit" | (typeof KINDS)[number];
  tests: TestCase[];
};

function workspaces(): { dir: string; name: string }[] {
  const root = JSON.parse(readFileSync("package.json", "utf8"));
  const result: { dir: string; name: string }[] = [];
  for (const pattern of root.workspaces as string[]) {
    const base = pattern.replace(/\/\*$/, "");
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = `${base}/${entry.name}`;
      try {
        const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
        if (pkg.scripts?.test) result.push({ dir, name: pkg.name });
      } catch {
        // Carpeta sin package.json: no es un workspace.
      }
    }
  }
  return result.sort((a, b) => a.dir.localeCompare(b.dir));
}

function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function kindOf(path: string): TestFile["kind"] {
  const folder = path.match(/\/test\/([^/]+)\//)?.[1];
  return KINDS.find((kind) => kind === folder) ?? "unit";
}

/** Recorre el JUnit de bun: suites anidadas (archivo → describe…) y casos. */
function parseJunit(xml: string, dir: string): TestFile[] {
  const files = new Map<string, TestFile>();
  const stack: string[] = [];
  const tags = xml.matchAll(
    /<(\/?)(testsuite|testcase|failure|skipped)\b([^>]*?)(\/?)>/g,
  );
  let current: TestCase | undefined;

  for (const [, closing, tag, attrs = "", selfClosing] of tags) {
    if (tag === "testsuite") {
      if (closing) stack.pop();
      else stack.push(decode(attr(attrs, "name") ?? ""));
      continue;
    }
    if (tag === "testcase" && !closing) {
      const path = `${dir}/${attr(attrs, "file")}`;
      const file = files.get(path) ?? { path, kind: kindOf(path), tests: [] };
      files.set(path, file);
      current = {
        name: decode(attr(attrs, "name") ?? ""),
        suite: stack.slice(1),
        line: Number(attr(attrs, "line") ?? 0),
        assertions: Number(attr(attrs, "assertions") ?? 0),
        timeMs: Math.round(Number(attr(attrs, "time") ?? 0) * 1000 * 100) / 100,
        status: "pass",
      };
      file.tests.push(current);
      if (selfClosing) current = undefined;
      continue;
    }
    if (tag === "testcase" && closing) current = undefined;
    else if (tag === "failure" && current && !closing) current.status = "fail";
    else if (tag === "skipped" && current && !closing) current.status = "skip";
  }
  return [...files.values()];
}

/** Enlaza cada escenario de aceptación con su línea `Escenario:` del .feature. */
function linkScenarios(file: TestFile) {
  const root = file.path.match(/^(.*\/test\/acceptance)\//)?.[1];
  if (!root) return;
  const scenarios = new Map<string, { path: string; line: number }>();
  for (const entry of readdirSync(root, { recursive: true }) as string[]) {
    if (!entry.endsWith(".feature")) continue;
    const path = `${root}/${entry}`;
    readFileSync(path, "utf8")
      .split("\n")
      .forEach((text, index) => {
        const name = text.trim().match(/^Escenario:\s*(.+)$/)?.[1];
        if (name) scenarios.set(name, { path, line: index + 1 });
      });
  }
  for (const test of file.tests) test.source = scenarios.get(test.name);
}

function git(...args: string[]): string {
  return Bun.spawnSync(["git", ...args])
    .stdout.toString()
    .trim();
}

const tmp = mkdtempSync(join(tmpdir(), "mail-guard-tests-"));
const packages = [];

for (const { dir, name } of workspaces()) {
  const outfile = join(tmp, `${name.replace(/[^\w-]/g, "_")}.xml`);
  const run = Bun.spawnSync(
    ["bun", "test", "--reporter=junit", `--reporter-outfile=${outfile}`],
    { cwd: dir, stdout: "ignore", stderr: "ignore" },
  );
  let files: TestFile[] = [];
  try {
    files = parseJunit(readFileSync(outfile, "utf8"), dir);
  } catch {
    console.warn(
      `✗ ${dir}: bun test no generó reporte (código ${run.exitCode})`,
    );
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  for (const file of files) {
    if (file.kind === "acceptance") linkScenarios(file);
    file.tests.sort(
      (a, b) =>
        (a.source?.path ?? "").localeCompare(b.source?.path ?? "") ||
        (a.source?.line ?? a.line) - (b.source?.line ?? b.line),
    );
  }
  const count = files.reduce((n, f) => n + f.tests.length, 0);
  console.log(
    `${run.exitCode === 0 ? "✓" : "✗"} ${dir}: ${count} pruebas en ${files.length} archivos`,
  );
  packages.push({ name, dir, files });
}
packages.push(postmanPackage());
rmSync(tmp, { recursive: true, force: true });

/**
 * Colección de Postman contra el gateway desplegado. Solo se ejecuta con
 * `--postman` (necesita red y los servicios de Render despiertos); si no, se
 * conserva el último resultado del reporte anterior.
 */
function postmanPackage() {
  const pkg = { name: "Colección de Postman", dir: "docs/postman" };
  if (!process.argv.includes("--postman")) {
    try {
      const previous = JSON.parse(readFileSync(OUTPUT, "utf8"));
      const kept = previous.packages.find(
        (p: { dir: string }) => p.dir === pkg.dir,
      );
      if (kept) {
        console.log(
          `• ${pkg.dir}: se conserva el último resultado (usa --postman para correrla)`,
        );
        return kept;
      }
    } catch {
      // Sin reporte anterior.
    }
    return { ...pkg, files: [] };
  }

  const outfile = join(tmp, "postman.xml");
  const run = Bun.spawnSync(
    [
      "bunx",
      "newman@6.2.1",
      "run",
      POSTMAN,
      "--reporters",
      "junit",
      "--reporter-junit-export",
      outfile,
    ],
    { stdout: "ignore", stderr: "ignore" },
  );
  const lines = readFileSync(POSTMAN, "utf8").split("\n");
  const lineOf = (request: string, name: string) => {
    const start = lines.findIndex((l) => l.includes(`"name": "${request}"`));
    const offset = lines
      .slice(start)
      .findIndex((l) => l.includes(`pm.test(\\"${name}\\"`));
    return offset < 0 ? 0 : start + offset + 1;
  };

  const tests: TestCase[] = [];
  let request = "";
  let current: TestCase | undefined;
  const xml = readFileSync(outfile, "utf8");
  for (const [, closing, tag, attrs = "", selfClosing] of xml.matchAll(
    /<(\/?)(testsuite|testcase|failure|error)\b([^>]*?)(\/?)>/g,
  )) {
    if (tag === "testsuite" && !closing)
      request = decode(attr(attrs, "name") ?? "");
    else if (tag === "testcase" && !closing) {
      const name = decode(attr(attrs, "name") ?? "");
      current = {
        name,
        suite: [request],
        line: lineOf(request, name),
        assertions: 1,
        timeMs: Math.round(Number(attr(attrs, "time") ?? 0) * 1000),
        status: "pass",
      };
      tests.push(current);
      if (selfClosing) current = undefined;
    } else if (tag === "testcase" && closing) current = undefined;
    else if ((tag === "failure" || tag === "error") && current && !closing)
      current.status = "fail";
  }
  console.log(
    `${run.exitCode === 0 ? "✓" : "✗"} ${pkg.dir}: ${tests.length} pruebas contra el gateway desplegado`,
  );
  return { ...pkg, files: [{ path: POSTMAN, kind: "api" as const, tests }] };
}

const report = {
  generatedAt: new Date().toISOString(),
  commit: git("rev-parse", "--short", "HEAD"),
  runner: `bun ${Bun.version}`,
  packages,
};

writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nReporte escrito en ${OUTPUT}`);
