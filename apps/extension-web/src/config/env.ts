/**
 * Variables públicas de la extensión (se incrustan en el bundle al compilar).
 * Nunca pongas aquí claves privadas: cualquiera puede leer el bundle.
 */
const read = (key: keyof ImportMetaEnv): string =>
  String(import.meta.env[key] ?? "").replace(/\/+$/, "");

export const env = {
  apiGatewayUrl: read("VITE_API_GATEWAY_URL"),
  dashboardUrl: read("VITE_DASHBOARD_URL"),
  supabaseUrl: read("VITE_SUPABASE_URL"),
  supabasePublishableKey: read("VITE_SUPABASE_PUBLISHABLE_KEY"),
};
