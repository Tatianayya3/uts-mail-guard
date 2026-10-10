import type { EmailSnapshot } from "@mail-guard/contracts";

export const legitEmail: EmailSnapshot = {
  provider: "Gmail",
  sender: "no-reply@accounts.google.com",
  senderName: "Google",
  subject: "Alerta de seguridad",
  bodyText:
    "Se inició sesión en tu cuenta desde un nuevo dispositivo. Si fuiste tú, no necesitas hacer nada.",
  links: ["https://myaccount.google.com/notifications"],
};

export const phishingEmail: EmailSnapshot = {
  provider: "Outlook",
  sender: "seguridad@bancolombla-alertas.com",
  senderName: "Bancolombia",
  subject: "URGENTE: tu cuenta será bloqueada",
  bodyText:
    "Tu cuenta será bloqueada en 24 horas. Verifica tu cuenta e ingresa tu contraseña y número de tarjeta aquí de inmediato.",
  links: ["http://192.168.10.20/login", "https://bit.ly/3xYz"],
};

export const emptyEmail: EmailSnapshot = {
  provider: "Gmail",
  sender: "alguien@empresa.com",
  subject: "",
  bodyText: "",
  links: [],
};
