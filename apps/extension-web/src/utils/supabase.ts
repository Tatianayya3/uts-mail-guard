import {
  createAnalyticsApi,
  createAuthApi,
  createProfilesApi,
  createSupabaseInstance,
} from "@mail-guard/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createSupabaseInstance(supabaseUrl, supabaseAnonKey);
export const auth = createAuthApi(supabase);
export const profiles = createProfilesApi(supabase);
export const analytics = createAnalyticsApi(supabase);
