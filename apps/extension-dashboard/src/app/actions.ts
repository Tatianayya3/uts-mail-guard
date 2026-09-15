"use server";

import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";

export type CreateUserState = {
  error?: string;
  success?: string;
};

export async function createUser(
  _previousState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { error: "Introduce un correo electrónico válido." };
  }

  try {
    await db.orm.public.User.create({
      email,
      name: name || null,
      username: username || null,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      return { error: "Ya existe un usuario con ese correo." };
    }

    return { error: "No se pudo crear el usuario. Inténtalo de nuevo." };
  }

  revalidatePath("/");
  return { success: "Usuario creado correctamente." };
}
