import {
  Boxes,
  CircleCheck,
  FileCode2,
  ListChecks,
  Terminal,
} from "lucide-react";
import PageHeader from "@/features/dashboard/PageHeader";
import StatCard from "@/features/dashboard/StatCard";
import CopyButton from "@/features/dashboard/CopyButton";
import TestSlider from "@/features/tests/TestSlider";
import { REPO_URL, summarize, testReport } from "@/features/tests/tests.data";

export const metadata = { title: "Pruebas | Mail Guard" };

const COMMANDS = [
  {
    command: "bun run test",
    help: "Corre todas las pruebas del monorepo con Turborepo.",
  },
  {
    command: "cd services/gateway && bun test",
    help: "Corre las pruebas de un solo servicio.",
  },
  {
    command: "bun run test:postman",
    help: "Corre la colección de Postman contra el gateway desplegado.",
  },
  {
    command: "bun run tests:report -- --postman",
    help: "Vuelve a ejecutar todo (incluida la colección) y actualiza esta página.",
  },
];

/** Microservicios primero, luego paquetes compartidos y aplicaciones. */
const DIR_ORDER = ["services/", "docs/", "packages/", "apps/"];

export default function TestsPage() {
  const files = [...testReport.packages]
    .sort(
      (a, b) =>
        DIR_ORDER.findIndex((prefix) => a.dir.startsWith(prefix)) -
        DIR_ORDER.findIndex((prefix) => b.dir.startsWith(prefix)),
    )
    .flatMap((pkg) => pkg.files.map((file) => ({ ...file, pkg: pkg.name })));
  const total = summarize(files);
  const generatedAt = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(testReport.generatedAt));

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Pruebas"
        description={
          <>
            Resultado de <code>bun test</code> ({testReport.runner}) sobre el
            commit{" "}
            <a
              href={`${REPO_URL}/commit/${testReport.commit}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-guard-accent hover:underline"
            >
              {testReport.commit}
            </a>
            , generado el {generatedAt}
          </>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CircleCheck}
          label="Pruebas que pasan"
          value={`${total.passed}/${total.tests}`}
          helper={total.failed ? `${total.failed} fallan` : "Ninguna falla"}
          tone={total.failed ? "danger" : "success"}
        />
        <StatCard
          icon={FileCode2}
          label="Archivos de prueba"
          value={total.files}
          tone="accent"
        />
        <StatCard
          icon={ListChecks}
          label="Aserciones"
          value={total.assertions}
          helper="Llamadas a expect()"
        />
        <StatCard
          icon={Boxes}
          label="Paquetes probados"
          value={testReport.packages.length}
        />
      </div>

      <TestSlider files={files} />

      <section
        aria-labelledby="ejecutar"
        className="mb-10 rounded-2xl border border-guard-accent/20 bg-guard-accent/5 p-6"
      >
        <h2
          id="ejecutar"
          className="mb-4 flex items-center gap-2 text-lg font-semibold"
        >
          <Terminal className="h-5 w-5 text-guard-accent" aria-hidden="true" />
          Cómo ejecutarlas
        </h2>
        <ul className="flex flex-col gap-3">
          {COMMANDS.map(({ command, help }) => (
            <li
              key={command}
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              <code className="rounded-lg bg-guard-surface px-2.5 py-1 text-sm text-white">
                {command}
              </code>
              <CopyButton value={command} />
              <span className="text-sm text-guard-text-muted">{help}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
