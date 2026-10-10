"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuthApi } from "@mail-guard/supabase";
import { supabaseAnonKey, supabaseUrl } from "./env";

// Se construye en el primer uso real y no al importar el módulo: las páginas
// estáticas ("/", "/reset-password") ejecutan este código durante `next build`
// y createBrowserClient falla si las variables no existen en ese momento.
let client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  client ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

export const auth = createAuthApi(supabase);
