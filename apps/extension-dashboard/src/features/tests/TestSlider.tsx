"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleMinus,
  CircleX,
  ExternalLink,
  FlaskConical,
  Globe,
  Hourglass,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@mail-guard/ui";
import CopyButton from "@/features/dashboard/CopyButton";
import {
  KIND_INFO,
  KIND_ORDER,
  groupBySuite,
  sourceUrl,
  summarize,
  type TestFile,
  type TestKind,
  type TestStatus,
} from "./tests.data";

export type SlideFile = TestFile & { pkg: string };

const KIND_ICON: Record<TestKind, LucideIcon> = {
  unit: FlaskConical,
  api: Globe,
  security: ShieldCheck,
  acceptance: ScrollText,
};

const STATUS: Record<
  TestStatus,
  { icon: LucideIcon; label: string; className: string }
> = {
  pass: { icon: CircleCheck, label: "Pasó", className: "text-guard-success" },
  fail: { icon: CircleX, label: "Falló", className: "text-red-300" },
  skip: {
    icon: CircleMinus,
    label: "Omitida",
    className: "text-guard-text-muted",
  },
};

const SWIPE_THRESHOLD = 60;

/** Pruebas por tipo: una pestaña por tipo y un carrusel con un archivo por diapositiva. */
export default function TestSlider({ files }: { files: SlideFile[] }) {
  const [kind, setKind] = useState<TestKind>("unit");
  const [index, setIndex] = useState(0);
  const pointerX = useRef<number | null>(null);

  const slides = files.filter((file) => file.kind === kind);
  const total = Math.max(slides.length, 1);
  const info = KIND_INFO[kind];
  const kindSummary = summarize(slides);
  const KindIcon = KIND_ICON[kind];

  const go = (next: number) => setIndex(Math.min(Math.max(next, 0), total - 1));

  const selectKind = (next: TestKind) => {
    setKind(next);
    setIndex(0);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") go(index + 1);
    else if (event.key === "ArrowLeft") go(index - 1);
    else return;
    event.preventDefault();
  };

  return (
    <section aria-labelledby="tipos" className="mb-10">
      <h2 id="tipos" className="sr-only">
        Pruebas por tipo
      </h2>

      <div
        role="tablist"
        aria-label="Tipos de prueba"
        className="mb-4 flex gap-2 overflow-x-auto pb-1"
      >
        {KIND_ORDER.map((option) => {
          const Icon = KIND_ICON[option];
          const count = summarize(
            files.filter((file) => file.kind === option),
          ).tests;
          const selected = option === kind;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              id={`tab-${option}`}
              aria-selected={selected}
              aria-controls="panel-pruebas"
              onClick={() => selectKind(option)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-300",
                "focus-visible:outline-2 focus-visible:outline-guard-accent",
                selected
                  ? "border-guard-accent bg-guard-accent text-guard-surface shadow-lg shadow-guard-accent/20"
                  : "border-guard-surface-raised bg-guard-surface-card/60 text-guard-text-muted hover:border-guard-accent/40 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
              {KIND_INFO[option].label}
              <span
                className={cn(
                  "rounded-md px-1.5 text-xs tabular-nums",
                  selected ? "bg-guard-surface/15" : "bg-white/5",
                )}
              >
                {count || "—"}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="panel-pruebas"
        role="tabpanel"
        aria-labelledby={`tab-${kind}`}
        key={kind}
        className="animate-test-panel rounded-3xl border border-guard-surface-raised bg-guard-surface-card/40 p-5 md:p-6"
      >
        <div className="mb-5 flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-guard-accent/10 text-guard-accent">
            <KindIcon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold">{info.title}</h3>
              {info.optional && (
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-guard-text-muted">
                  Opcional
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-6 text-guard-text-muted">
              {info.description}
            </p>
            <p className="mt-1.5 text-xs text-guard-text-muted">
              Herramienta: <span className="text-white/90">{info.tool}</span> ·
              Carpeta: <code className="text-white/90">{info.folder}</code>
            </p>
          </div>
          {kindSummary.tests > 0 && (
            <dl className="flex gap-5 text-right">
              {[
                ["Archivos", kindSummary.files],
                ["Pruebas", kindSummary.tests],
                ["Aserciones", kindSummary.assertions],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-guard-text-muted">{label}</dt>
                  <dd className="text-2xl font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div
          role="region"
          aria-roledescription="carrusel"
          aria-label={`Archivos: ${info.title.toLowerCase()}`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => {
            pointerX.current = event.clientX;
          }}
          onPointerUp={(event) => {
            if (pointerX.current === null) return;
            const delta = event.clientX - pointerX.current;
            pointerX.current = null;
            if (Math.abs(delta) > SWIPE_THRESHOLD)
              go(index + (delta < 0 ? 1 : -1));
          }}
          className="rounded-2xl focus-visible:outline-2 focus-visible:outline-guard-accent"
        >
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-guard-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>

          <div className="overflow-hidden">
            <div
              className="flex items-start transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {slides.length === 0 ? (
                <PlanSlide kind={kind} />
              ) : (
                slides.map((file, position) => (
                  <FileSlide
                    key={file.path}
                    file={file}
                    position={position}
                    total={slides.length}
                    active={position === index}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {total > 1 && (
          <div className="mt-5 flex items-center justify-between gap-4">
            <SlideButton
              label="Archivo anterior"
              icon={ChevronLeft}
              disabled={index === 0}
              onClick={() => go(index - 1)}
            />
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {slides.map((file, position) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => go(position)}
                  aria-label={`Ir al archivo ${position + 1}: ${file.path}`}
                  aria-current={position === index ? "true" : undefined}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    position === index
                      ? "w-7 bg-guard-accent"
                      : "w-2 bg-white/15 hover:bg-white/30",
                  )}
                />
              ))}
            </div>
            <SlideButton
              label="Archivo siguiente"
              icon={ChevronRight}
              disabled={index === total - 1}
              onClick={() => go(index + 1)}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function SlideButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-guard-surface-raised bg-guard-surface-card text-white transition-all duration-200 hover:scale-105 hover:border-guard-accent/50 hover:text-guard-accent focus-visible:outline-2 focus-visible:outline-guard-accent disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}

function PassRing({
  passed,
  total,
  active,
}: {
  passed: number;
  total: number;
  active: boolean;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const ratio = total ? passed / total : 0;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg
        viewBox="0 0 64 64"
        className="h-16 w-16 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-white/10"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={
            active ? circumference * (1 - ratio) : circumference
          }
          className={cn(
            "transition-[stroke-dashoffset] delay-150 duration-1000 ease-out motion-reduce:transition-none",
            ratio === 1 ? "stroke-guard-success" : "stroke-red-300",
          )}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
        {passed}/{total}
      </span>
    </div>
  );
}

function FileSlide({
  file,
  position,
  total,
  active,
}: {
  file: SlideFile;
  position: number;
  total: number;
  active: boolean;
}) {
  const summary = summarize([file]);
  return (
    <article
      aria-roledescription="diapositiva"
      aria-label={`${position + 1} de ${total}: ${file.path}`}
      aria-hidden={!active}
      inert={!active}
      className={cn(
        "w-full shrink-0 rounded-2xl border border-guard-surface-raised bg-guard-surface-card/70 p-5 transition-[opacity,max-height] duration-500 ease-out motion-reduce:transition-none",
        // La inactiva se colapsa: la ventana toma la altura de la activa.
        active
          ? "max-h-[3000px] opacity-100"
          : "max-h-0 overflow-hidden opacity-0",
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        <PassRing
          passed={summary.passed}
          total={summary.tests}
          active={active}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-guard-text-muted">
            <span className="font-semibold text-guard-accent">{file.pkg}</span>{" "}
            · Archivo {position + 1} de {total} · {summary.assertions}{" "}
            aserciones
          </p>
          <code className="mt-1 block break-all text-base font-semibold text-white">
            {file.path}
          </code>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <a
              href={sourceUrl(file.path)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-guard-accent hover:bg-guard-accent/10"
            >
              Ver en GitHub
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            <CopyButton value={file.path} label="Copiar ruta" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {groupBySuite(file.tests).map(([suite, tests]) => (
          <div key={suite}>
            {tests[0]?.source ? (
              <p className="mb-1 text-xs text-guard-text-muted">
                <span className="font-mono">Característica:</span> {suite} ·{" "}
                <a
                  href={sourceUrl(tests[0].source.path)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-guard-accent hover:underline"
                >
                  {tests[0].source.path.split("/").pop()}
                </a>
              </p>
            ) : (
              suite && (
                <p className="mb-1 font-mono text-xs text-guard-text-muted">
                  describe(&quot;{suite}&quot;)
                </p>
              )
            )}
            <ul className="flex flex-col gap-1.5">
              {tests.map((test) => {
                const status = STATUS[test.status];
                const Icon = status.icon;
                const delay = Math.min(file.tests.indexOf(test) * 60, 720);
                const where = test.source ?? {
                  path: file.path,
                  line: test.line,
                };
                return (
                  <li
                    key={`${test.line}-${test.name}`}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2 text-sm transition-colors hover:bg-white/[0.06]",
                      active && "animate-test-row",
                    )}
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        status.className,
                      )}
                      aria-label={status.label}
                    />
                    <span className="min-w-0 flex-1 text-white/90">
                      {test.name}
                    </span>
                    <span className="hidden shrink-0 text-xs text-guard-text-muted tabular-nums sm:inline">
                      {test.assertions} expect · {test.timeMs} ms
                    </span>
                    <a
                      href={sourceUrl(where.path, where.line)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs text-guard-accent hover:bg-guard-accent/10"
                      aria-label={`Ver la línea ${where.line} en GitHub`}
                    >
                      L{where.line}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}

function PlanSlide({ kind }: { kind: TestKind }) {
  const info = KIND_INFO[kind];
  return (
    <article className="w-full shrink-0 rounded-2xl border border-dashed border-guard-surface-raised bg-guard-surface-card/40 p-6">
      <div className="flex items-center gap-3">
        <Hourglass className="h-5 w-5 text-amber-200" aria-hidden="true" />
        <p className="font-semibold">
          Aún no hay pruebas de este tipo · lo que se va a probar
        </p>
      </div>
      <ol className="mt-4 flex flex-col gap-2">
        {info.plan.map((item, position) => (
          <li
            key={item}
            className="animate-test-row flex gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm"
            style={{ animationDelay: `${position * 80}ms` }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-guard-accent/15 text-xs font-bold text-guard-accent">
              {position + 1}
            </span>
            <span className="text-white/90">{item}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs leading-5 text-guard-text-muted">
        Al agregar archivos en{" "}
        <code className="text-white/90">{info.folder}</code> y correr{" "}
        <code className="text-white/90">bun run tests:report</code>, aparecen
        aquí automáticamente.
      </p>
    </article>
  );
}
