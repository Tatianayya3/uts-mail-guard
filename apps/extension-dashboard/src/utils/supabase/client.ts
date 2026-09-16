"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  createAnalyticsApi,
  createAuthApi,
  createProfilesApi,
} from "@mail-guard/supabase";
import { supabaseAnonKey, supabaseUrl } from "./env";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
export const auth = createAuthApi(supabase);
export const profiles = createProfilesApi(supabase);
export const analytics = createAnalyticsApi(supabase);
