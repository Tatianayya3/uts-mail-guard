import { describe, expect, test } from "bun:test";
import {
  crearEndpoints as crearAnalizador,
  type Analisis,
} from "./analizador/endpoint";
import { validarCorreo } from "./analizador/validador";
import { crearEndpoints as crearHistorial } from "./historial/endpoint";
import { validarRegistro } from "./historial/validador";

const post = (path: string, body: unknown) =>
  new Request(`http://local${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const PHISHING = {
  remitente: "soporte-banco@gmail.com",
  asunto: "URGENTE: tu cuenta fue suspendida",
  cuerpo: "Verifica tu cuenta y tu contraseña aquí: http://192.168.4.20/login",
};

describe("validadores", () => {
  test("el analizador rechaza un correo sin remitente válido ni cuerpo", () => {
    const r = validarCorreo({
      remitente: "no-es-correo",
      asunto: "Hola",
      cuerpo: "",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores).toHaveLength(2);
  });

  test("el historial rechaza un veredicto desconocido y un puntaje fuera de rango", () => {
    const r = validarRegistro({
      remitente: "a@b.co",
      veredicto: "raro",
      puntaje: 150,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores).toHaveLength(2);
  });
});

describe("analizador", () => {
  test("marca como phishing un correo urgente con enlace a una IP", async () => {
    const guardados: Analisis[] = [];
    const analizador = crearAnalizador(async (a) => (guardados.push(a), true));

    const res = await analizador(post("/analizar", PHISHING));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.veredicto).toBe("phishing");
    expect(body.senales).toContain(
      "Se presenta como entidad pero escribe desde gmail.com",
    );
    expect(body.guardado).toBe(true);
    expect(guardados).toHaveLength(1);
  });

  test("responde 400 con los errores del validador", async () => {
    const analizador = crearAnalizador(async () => true);
    const res = await analizador(post("/analizar", { asunto: 1 }));
    expect(res.status).toBe(400);
    expect((await res.json()).errores.length).toBeGreaterThan(0);
  });

  test("entrega el análisis aunque el historial esté caído", async () => {
    const analizador = crearAnalizador(async () => {
      throw new Error("historial caído");
    });
    const res = await analizador(post("/analizar", PHISHING));
    expect(res.status).toBe(200);
    expect((await res.json()).guardado).toBe(false);
  });
});

describe("historial", () => {
  test("guarda registros y devuelve el resumen por veredicto", async () => {
    const historial = crearHistorial();
    await historial(
      post("/historial", {
        remitente: "a@b.co",
        veredicto: "phishing",
        puntaje: 90,
      }),
    );
    await historial(
      post("/historial", {
        remitente: "c@d.co",
        veredicto: "seguro",
        puntaje: 0,
      }),
    );

    const res = await historial(new Request("http://local/historial"));
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.resumen).toEqual({ seguro: 1, sospechoso: 0, phishing: 1 });
  });
});

describe("los dos microservicios conectados por HTTP", () => {
  test("el analizador registra en el historial a través de la red", async () => {
    const historial = Bun.serve({ port: 0, fetch: crearHistorial() });
    try {
      const analizador = crearAnalizador(async (a) => {
        const r = await fetch(`${historial.url}historial`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            remitente: a.remitente,
            veredicto: a.veredicto,
            puntaje: a.puntaje,
          }),
        });
        return r.ok;
      });

      await analizador(post("/analizar", PHISHING));
      const lista = await fetch(`${historial.url}historial`).then((r) =>
        r.json(),
      );
      expect(lista.total).toBe(1);
      expect(lista.registros[0].veredicto).toBe("phishing");
    } finally {
      historial.stop(true);
    }
  });
});
