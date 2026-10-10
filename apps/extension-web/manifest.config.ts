import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

/** Origen del gateway como patrón de host_permissions: http://localhost:4000/* */
function originPattern(url: string | undefined): string[] {
  if (!url) return [];
  try {
    return [`${new URL(url).origin}/*`];
  } catch {
    return [];
  }
}

/**
 * Permisos mínimos: activeTab + scripting para leer SOLO la pestaña activa
 * cuando el usuario pulsa «Escanear». Nada de <all_urls> ni "tabs".
 */
export const createManifest = (apiGatewayUrl?: string) =>
  defineManifest({
    manifest_version: 3,
    name: pkg.displayName,
    description: pkg.description,
    version: pkg.version,
    icons: { 48: "public/logo.png" },
    action: {
      default_icon: { 48: "public/logo.png" },
      default_title: "Mail Guard",
      default_popup: "src/app/index.html",
    },
    permissions: ["activeTab", "scripting"],
    // Alt+Shift+M abre el popup sin usar el ratón.
    commands: {
      _execute_action: {
        suggested_key: { default: "Alt+Shift+M", mac: "Alt+Shift+M" },
        description: "Abrir Mail Guard",
      },
    },
    host_permissions: [
      "https://mail.google.com/*",
      "https://outlook.live.com/*",
      "https://outlook.office.com/*",
      "https://outlook.office365.com/*",
      "https://outlook.cloud.microsoft/*",
      ...originPattern(apiGatewayUrl),
    ],
  });
