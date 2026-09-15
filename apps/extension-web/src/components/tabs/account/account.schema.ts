import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Escribe un correo válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const signUpSchema = signInSchema
  .extend({
    fullName: z.string().trim().min(2, "Escribe tu nombre completo."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type AuthValues = SignInValues &
  Partial<Pick<SignUpValues, "fullName" | "confirmPassword">>;
