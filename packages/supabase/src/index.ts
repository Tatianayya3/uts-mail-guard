import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Casos de uso de autenticación. Supabase es la única fuente de identidad;
 * los datos de negocio (historial, métricas) viven en los microservicios.
 */
export const createAuthApi = (supabase: SupabaseClient) => ({
  signUp: (email: string, password: string, fullName?: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    }),
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  resetPasswordForEmail: (email: string, redirectTo: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo }),
  updatePassword: (password: string) => supabase.auth.updateUser({ password }),
  /** JWT vigente (lo refresca si expiró) para llamar al API Gateway. */
  getAccessToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});

export type AuthApi = ReturnType<typeof createAuthApi>;
