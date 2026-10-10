import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mail Guard · Detección de phishing en tu correo",
  description:
    "Extensión para Chrome que detecta phishing en Gmail, Outlook, Yahoo, AOL, Proton y Zoho, y explica cada veredicto. Consulta tu historial y métricas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster
          theme="dark"
          position="top-center"
          richColors={false}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "flex items-start gap-3 w-full rounded-xl border px-4 py-3.5 text-sm shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl",
              title: "font-semibold leading-5",
              description: "text-xs leading-5 opacity-80",
              default:
                "bg-guard-surface-raised/95 border-guard-surface-card text-white",
              success:
                "bg-guard-surface-raised/95 border-guard-success-strong/40 text-guard-success",
              error:
                "bg-guard-surface-raised/95 border-red-400/40 text-red-200",
              warning:
                "bg-guard-surface-raised/95 border-amber-300/40 text-amber-200",
              info: "bg-guard-surface-raised/95 border-guard-accent/40 text-guard-accent-bright",
              actionButton:
                "bg-guard-accent text-guard-surface font-bold rounded-lg",
              cancelButton: "bg-white/10 text-guard-text-muted rounded-lg",
            },
          }}
        />
      </body>
    </html>
  );
}
