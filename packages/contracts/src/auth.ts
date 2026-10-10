import { z } from "zod";

const email = z.email("Escribe un correo válido.");
const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.");

const passwordsMatch = {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
};

export const signInSchema = z.object({ email, password });

export const signUpSchema = signInSchema
  .extend({
    fullName: z.string().trim().min(2, "Escribe tu nombre completo."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type AuthValues = SignInValues &
  Partial<Pick<SignUpValues, "fullName" | "confirmPassword">>;

/** Devuelve el primer mensaje de error de un safeParse fallido. */
export function firstIssue(
  error: z.ZodError,
  fallback = "Revisa los campos.",
): string {
  return error.issues[0]?.message ?? fallback;
}
