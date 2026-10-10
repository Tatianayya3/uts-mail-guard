import { describe, expect, test } from "bun:test";
import { emailSnapshotSchema, signUpSchema, trustTone } from "../src";

describe("contracts", () => {
  test("emailSnapshotSchema valida remitente y enlaces", () => {
    const base = {
      provider: "Gmail",
      sender: "a@b.com",
      subject: "",
      bodyText: "",
      links: [],
    };
    expect(emailSnapshotSchema.safeParse(base).success).toBe(true);
    expect(
      emailSnapshotSchema.safeParse({ ...base, sender: "no-es-correo" })
        .success,
    ).toBe(false);
    expect(
      emailSnapshotSchema.safeParse({ ...base, links: ["nota url"] }).success,
    ).toBe(false);
  });

  test("signUpSchema exige contraseñas iguales", () => {
    const result = signUpSchema.safeParse({
      fullName: "Ana Pérez",
      email: "ana@uts.edu.co",
      password: "12345678",
      confirmPassword: "87654321",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Las contraseñas no coinciden.",
    );
  });

  test("trustTone clasifica el puntaje", () => {
    expect(trustTone(90)).toBe("success");
    expect(trustTone(60)).toBe("warning");
    expect(trustTone(10)).toBe("danger");
  });
});
