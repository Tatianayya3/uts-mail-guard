import { createClient } from "@supabase/supabase-js";
import { createAuthApi } from "@mail-guard/supabase";
import { env } from "@/config/env";

export const supabase = createClient(
  env.supabaseUrl,
  env.supabasePublishableKey,
);
export const auth = createAuthApi(supabase);
