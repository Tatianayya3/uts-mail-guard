import report from "./tests.report.json";

export const REPO_URL = "https://github.com/Tatianayya3/uts-mail-guard";

export type TestKind = "unit" | "api" | "security" | "acceptance";
export type TestStatus = "pass" | "fail" | "skip";

export type TestCase = {
  name: string;
  suite: string[];
  line: number;
  assertions: number;
  timeMs: number;
  status: TestStatus;
  /** Escenarios Gherkin: archivo .feature y línea donde están escritos. */
  source?: { path: string; line: number };
};

export type TestFile = { path: string; kind: TestKind; tests: TestCase[] };
export type TestPackage = { name: string; dir: string; files: TestFile[] };

export type TestReport = {
  generatedAt: string;
  commit: string;
  runner: string;
  packages: TestPackage[];
};

/** Generado por `bun run tests:report` (scripts/generate-test-report.ts). */
export const testReport = report as TestReport;

export type KindInfo = {
  label: string;
  title: string;
  description: string;
  /** Herramienta del proyecto y su equivalente visto en clase. */
  tool: string;
  folder: string;
  optional?: boolean;
  /** Qué se va a probar; se muestra mientras el tipo no tenga pruebas. */
  plan: string[];
};

export const KIND_INFO: Record<TestKind, KindInfo> = {
  unit: {
    label: "Unitarias",
    title: "Pruebas unitarias",
    description:
      "Prueban una función o caso de uso aislado, con dobles en lugar de red y base de datos.",
    tool: "bun test (equivalente a Jasmine / JUnit / pytest)",
    folder: "test/*.test.ts",
    plan: [
      "Puntaje y veredicto del motor de análisis",
      "Extracción de evidencias: dominios, marcas imitadas y enlaces",
      "Casos de uso del historial y reglas del gateway",
    ],
  },
  api: {
    label: "API",
    title: "Pruebas de API",
    description:
      "Peticiones HTTP reales contra el gateway, que a su vez llama a analysis-service e history-service.",
    tool: "bun test con HTTP real entre los 3 servicios + Postman / Newman contra la nube",
    folder: "test/api/ · docs/postman/",
    plan: [
      "GET /health/services responde con los tres servicios en ok",
      "POST /v1/scans como invitado analiza sin guardar",
      "Con sesión guarda el análisis y no duplica el mismo correo",
      "GET /v1/scans, GET /v1/scans/:id y DELETE /v1/scans",
      "Errores: cuerpo inválido → 400, cuota agotada → 429",
    ],
  },
  security: {
    label: "Seguridad",
    title: "Pruebas de seguridad",
    description:
      "Autenticación y autorización: quién puede entrar y a qué datos puede acceder.",
    tool: "bun test + Supabase real (RLS)",
    folder: "test/security/",
    plan: [
      "Sin token, o con un JWT falso o vencido → 401",
      "analysis-service sin el token interno → rechazado",
      "Un usuario no puede ver ni borrar el historial de otro (RLS)",
      "La cuota diaria limita al invitado",
    ],
  },
  acceptance: {
    label: "Aceptación",
    title: "Pruebas de aceptación",
    description:
      "Escenarios en lenguaje natural (Dado / Cuando / Entonces) sacados de los casos de uso.",
    tool: "Gherkin en español (formato Cucumber) ejecutado con bun test",
    folder: "test/acceptance/features/*.feature",
    plan: [
      "UC-01 Analizar un correo abierto",
      "UC-07 Guardar el análisis en el historial",
      "UC-13 Borrar el historial",
    ],
  },
};

export const KIND_ORDER: TestKind[] = ["unit", "api", "security", "acceptance"];

export function sourceUrl(path: string, line?: number): string {
  return `${REPO_URL}/blob/main/${path}${line ? `#L${line}` : ""}`;
}

export function summarize(files: TestFile[]) {
  const tests = files.flatMap((file) => file.tests);
  return {
    files: files.length,
    tests: tests.length,
    passed: tests.filter((t) => t.status === "pass").length,
    failed: tests.filter((t) => t.status === "fail").length,
    assertions: tests.reduce((sum, t) => sum + t.assertions, 0),
  };
}

/** Agrupa las pruebas de un archivo por su `describe` (ruta completa). */
export function groupBySuite(tests: TestCase[]) {
  const groups = new Map<string, TestCase[]>();
  for (const test of tests) {
    const key = test.suite.join(" › ");
    groups.set(key, [...(groups.get(key) ?? []), test]);
  }
  return [...groups.entries()];
}
