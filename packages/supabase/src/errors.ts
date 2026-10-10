/** Mensajes en español para los errores de Supabase Auth (que llegan en inglés). */
const BY_CODE: Record<string, string> = {
  invalid_credentials: "El correo o la contraseña no son correctos.",
  email_not_confirmed:
    "Confirma tu correo antes de entrar: revisa tu bandeja de entrada.",
  user_already_exists: "Ya existe una cuenta con este correo. Inicia sesión.",
  email_exists: "Ya existe una cuenta con este correo. Inicia sesión.",
  weak_password:
    "La contraseña es demasiado débil. Usa al menos 8 caracteres con letras y números.",
  same_password: "La nueva contraseña debe ser distinta de la actual.",
  email_address_invalid: "Ese correo no es válido.",
  signup_disabled: "El registro de cuentas está desactivado por ahora.",
  over_email_send_rate_limit:
    "Enviamos demasiados correos seguidos. Espera unos minutos e inténtalo de nuevo.",
  over_request_rate_limit:
    "Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.",
  session_expired: "Tu sesión expiró. Vuelve a iniciar sesión.",
  session_not_found: "Tu sesión expiró. Vuelve a iniciar sesión.",
};

/** Respaldo por texto, para versiones de Supabase que no envían `code`. */
const BY_MESSAGE: [RegExp, string][] = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials!],
  [/email not confirmed/i, BY_CODE.email_not_confirmed!],
  [/already (registered|exists)/i, BY_CODE.user_already_exists!],
  [/password should be|weak password/i, BY_CODE.weak_password!],
  [/rate limit|too many requests/i, BY_CODE.over_request_rate_limit!],
  [
    /failed to fetch|network/i,
    "Sin conexión con el servidor. Revisa tu internet.",
  ],
];

export const GENERIC_AUTH_ERROR =
  "No pudimos completar la operación. Inténtalo de nuevo.";

export function authErrorMessage(
  error: { message?: string; code?: string } | null | undefined,
): string {
  if (!error) return GENERIC_AUTH_ERROR;
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]!;
  const message = error.message ?? "";
  const match = BY_MESSAGE.find(([pattern]) => pattern.test(message));
  return match?.[1] ?? GENERIC_AUTH_ERROR;
}
