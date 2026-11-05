import { TIMEZONE } from "./config";

export const CHANNELS = ["sms", "voice", "mail"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABELS: Record<Channel, string> = {
  sms: "Text messages",
  voice: "Recorded phone calls",
  mail: "Letters in the mail",
};
export const CHANNEL_LABELS_ES: Record<Channel, string> = {
  sms: "Mensajes de texto",
  voice: "Llamadas grabadas",
  mail: "Cartas por correo",
};

/** Bump when the wording below changes; each consent record stores the version shown. */
export const CONSENT_VERSION = "2026-11-05";

export function consentText(channel: Channel, sender: string, lang: "en" | "es" = "en"): string {
  if (lang === "es") {
    switch (channel) {
      case "sms":
        return `Acepto recibir mensajes de texto automáticos y recurrentes de ${sender} sobre servicios para veteranos al número de arriba. No es necesario aceptar para recibir ningún servicio. La frecuencia de los mensajes varía. Pueden aplicarse tarifas de mensajes y datos. Conteste STOP para cancelar o HELP para ayuda.`;
      case "voice":
        return `Acepto recibir llamadas grabadas de ${sender} sobre servicios para veteranos al número de arriba. No es necesario aceptar para recibir ningún servicio. Oprima 9 durante una llamada, o envíe STOP por texto, para parar las llamadas.`;
      case "mail":
        return `Quiero recibir cartas de ${sender} sobre servicios para veteranos en la dirección de arriba. Puedo pedir que paren cuando quiera.`;
    }
  }
  switch (channel) {
    case "sms":
      return `I agree to get recurring automated text messages from ${sender} about veteran services at the phone number above. Consent is not required to get any service. Message frequency varies. Message and data rates may apply. Reply STOP to cancel or HELP for help.`;
    case "voice":
      return `I agree to get recorded phone calls from ${sender} about veteran services at the phone number above. Consent is not required to get any service. Press 9 during a call, or text STOP, to stop calls.`;
    case "mail":
      return `I want to get letters from ${sender} about veteran services at the mailing address above. I can ask to stop at any time.`;
  }
}

export const PERMISSION_TEXT =
  "This is my phone number or address, or the veteran gave me permission to sign them up.";

/**
 * Federal rules (TCPA) bar telemarketing calls before 8 a.m. or after 9 p.m.
 * at the recipient's location. We apply the same window to every automated
 * text and call. The whole service area is on Eastern time.
 */
export function inContactHours(now: Date = new Date(), tz: string = TIMEZONE): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now),
  );
  return hour >= 8 && hour < 21;
}

const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

/** How many billable SMS segments a message uses. */
export function smsSegments(text: string): { segments: number; encoding: "GSM-7" | "UCS-2"; length: number } {
  let gsmLen = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM7.includes(ch)) gsmLen += 1;
    else if (GSM7_EXT.includes(ch)) gsmLen += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (gsm) {
    return { encoding: "GSM-7", length: gsmLen, segments: gsmLen <= 160 ? 1 : Math.ceil(gsmLen / 153) };
  }
  const len = [...text].length;
  return { encoding: "UCS-2", length: len, segments: len <= 70 ? 1 : Math.ceil(len / 67) };
}

export const OPT_OUT_FOOTER = "Reply STOP to opt out.";

/** Every broadcast text names the sender and says how to stop. */
export function withSmsFooter(body: string, sender: string): string {
  let text = body.trim();
  if (!text.toLowerCase().startsWith(sender.toLowerCase())) text = `${sender}: ${text}`;
  if (!/reply stop/i.test(text)) text = `${text} ${OPT_OUT_FOOTER}`;
  return text;
}
