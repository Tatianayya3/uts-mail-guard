import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

type UpdateSessionOptions = {
  /**
   * Confirma además con Supabase Auth (getUser) que la sesión sigue viva.
   * Si se cerró en el servidor, borra las cookies locales y devuelve user null.
   */
  verifyWithAuth?: boolean;
};

export async function updateSession(
  request: NextRequest,
  { verifyWithAuth = false }: UpdateSessionOptions = {},
) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() verifica la firma del JWT (localmente con JWKS si el proyecto
  // usa claves asimétricas; si no, consultando a Supabase Auth) y refresca la
  // sesión si expiró. Corre en cada navegación, así que evita una llamada de
  // red extra cuando puede. La página /dashboard vuelve a validar con getUser.
  const { data } = await supabase.auth.getClaims();
  let user = data?.claims?.sub ? { id: data.claims.sub } : null;

  // getClaims() solo mira la firma y la caducidad: un token de una sesión ya
  // cerrada (p. ej. tras cerrar sesión en la extensión, que es global) sigue
  // pareciendo válido hasta que caduca. Si el proxy decidiera con eso y
  // /dashboard con getUser, se redirigirían en bucle (ERR_TOO_MANY_REDIRECTS).
  if (user && verifyWithAuth) {
    const {
      data: { user: liveUser },
      error,
    } = await supabase.auth.getUser();
    if (!liveUser) {
      // Solo si Supabase confirma que la sesión no vale (401/403, p. ej.
      // session_not_found) se borran las cookies; un fallo de red no cierra
      // la sesión, pero tampoco redirige: se queda en la portada.
      if (error?.status === 401 || error?.status === 403) {
        await supabase.auth.signOut({ scope: "local" });
      }
      user = null;
    }
  }

  return { response, user };
}
