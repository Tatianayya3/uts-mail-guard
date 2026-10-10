import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Llamado desde un Server Component: el proxy refresca la cookie
          // en la siguiente petición.
        }
      },
    },
  });
}

/**
 * Usuario verificado (getUser valida el token contra Supabase Auth) y su
 * access token para llamar al API Gateway en su nombre.
 */
export async function getServerSession() {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const {
    data: { session },
  } = await client.auth.getSession();
  return session ? { user, accessToken: session.access_token } : null;
}
