import { describe, expect, test } from "bun:test";
import { authErrorMessage, GENERIC_AUTH_ERROR } from "../src/errors";

describe("authErrorMessage", () => {
  test("traduce por código", () => {
    expect(
      authErrorMessage({ code: "invalid_credentials", message: "x" }),
    ).toBe("El correo o la contraseña no son correctos.");
  });
  test("traduce por mensaje si no hay código", () => {
    expect(authErrorMessage({ message: "Email not confirmed" })).toContain(
      "Confirma tu correo",
    );
  });
  test("nunca muestra el inglés original", () => {
    expect(authErrorMessage({ message: "Something odd happened" })).toBe(
      GENERIC_AUTH_ERROR,
    );
    expect(authErrorMessage(null)).toBe(GENERIC_AUTH_ERROR);
  });
});
