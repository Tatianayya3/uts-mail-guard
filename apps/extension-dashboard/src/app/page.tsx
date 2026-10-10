import Image from "next/image";
import { AuthCard } from "@/features/auth";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-guard-surface text-white font-sans selection:bg-guard-accent selection:text-guard-surface flex flex-col overflow-hidden">
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 flex items-center justify-center">
        <div className="absolute top-10 md:top-32 left-10 md:left-32 w-72 h-72 bg-guard-accent rounded-full mix-blend-screen filter blur-[80px] opacity-30 animate-blob"></div>
        <div className="absolute top-40 md:top-32 right-10 md:right-32 w-72 h-72 bg-guard-success rounded-full mix-blend-screen filter blur-[80px] opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-guard-accent-bright rounded-full mix-blend-screen filter blur-[90px] opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <header className="relative z-10 px-6 py-6 md:px-12 md:py-8 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="" width={48} height={48} priority />
          <span className="text-2xl font-bold tracking-tight text-white">
            Mail Guard
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <div className="space-y-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight drop-shadow-sm">
            Protege tu bandeja con{" "}
            <span className="text-guard-accent">Mail Guard</span>.
          </h1>
          <p className="text-lg md:text-xl text-guard-text-muted max-w-lg leading-relaxed">
            Una extensión para Chrome que revisa el correo que tienes abierto en
            Gmail, Outlook, Yahoo, AOL, Proton o Zoho y te dice, en segundos, si
            es seguro, sospechoso o un intento de phishing, y por qué.
          </p>

          <ul className="space-y-5 pt-4">
            {[
              "Detecta suplantación de marcas y enlaces engañosos.",
              "Explica cada veredicto con señales verificables.",
              "Historial y métricas de tus análisis en este panel.",
            ].map((feature, idx) => (
              <li key={idx} className="flex items-center gap-4">
                <div className="shrink-0 w-6 h-6 rounded-full bg-guard-surface-raised flex items-center justify-center border border-guard-surface-card">
                  <svg
                    className="w-4 h-4 text-guard-success-strong drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-guard-text-muted text-lg font-medium">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <AuthCard />
      </main>
    </div>
  );
}
