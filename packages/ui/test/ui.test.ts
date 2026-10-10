import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { cn } from "../src/cn";
import { fieldErrors } from "../src/useZodForm";

describe("ui", () => {
  test("cn deja ganar la última clase en conflicto", () => {
    expect(cn("px-4 text-sm", false && "hidden", "px-2")).toBe("text-sm px-2");
  });

  test("fieldErrors toma el primer mensaje por campo", () => {
    const schema = z.object({
      email: z.email("Correo inválido"),
      name: z.string().min(2, "Corto"),
    });
    const result = schema.safeParse({ email: "x", name: "a" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({
        email: "Correo inválido",
        name: "Corto",
      });
    }
  });
});
