"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAnalyticsApi,
  createAuthApi,
  createProfilesApi,
} from "@mail-guard/supabase";
import { supabaseAnonKey, supabaseUrl } from "./env";

// Constructed lazily (on first real use) instead of at module import time.
// Statically-generated pages ("/", "/reset-password") execute this module's
// top-level code during `next build`, and createBrowserClient throws if the
// env vars aren't set at build time — which would fail the entire build
// instead of just that one page. Deferring construction means it only ever
// runs in the browser, when auth/profiles/analytics are actually called.
let client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

export const auth = createAuthApi(supabase);
export const profiles = createProfilesApi(supabase);
export const analytics = createAnalyticsApi(supabase);
