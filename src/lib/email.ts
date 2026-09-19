import { FLAVOUR } from "../../shared/messages";

export interface SendResult {
  delivered: boolean;
  /** Present only in dev mode, so the code can be surfaced without email. */
  devCode?: string;
}

/**
 * Sends the one-time login code (the sigil on a sending stone). Without a
 * configured Resend key (or with AUTH_DEV_MODE=true) the code is logged to the
 * console instead, so local development needs no email provider at all.
 */
export async function sendLoginCode(
  env: Env,
  to: string,
  code: string,
): Promise<SendResult> {
  if (env.AUTH_DEV_MODE === "true" || !env.RESEND_API_KEY) {
    console.log(`[Demiplane] sigil for ${to}: ${code}`);
    return { delivered: false, devCode: code };
  }

  const html = loginCodeEmail(code);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: "Demiplane <onboarding@resend.dev>",
      to: [to],
      subject: `Your sigil: ${code}`,
      text: `${FLAVOUR.codeSent}\n\n${code}\n\nEnter this sigil to unseal the portal. It crumbles to dust in 10 minutes.`,
      html,
    }),
  });

  if (!response.ok) {
    console.error(
      "[Demiplane] Resend rejected the sending stone",
      response.status,
      await response.text(),
    );
    return { delivered: false };
  }
  return { delivered: true };
}

function loginCodeEmail(code: string): string {
  const spaced = code.split("").join(" ");
  return `<!doctype html>
<html>
  <body style="margin:0;background:#131110;font-family:ui-sans-serif,system-ui,sans-serif;color:#f1e9da;">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
      <p style="letter-spacing:.28em;text-transform:uppercase;font-size:11px;color:#c3a15c;margin:0 0 10px;">Demiplane</p>
      <h1 style="font-size:22px;margin:0 0 16px;color:#f1e9da;">A sending stone has arrived.</h1>
      <p style="font-size:15px;line-height:1.6;color:#cbbfad;margin:0 0 20px;">
        Enter this sigil to unseal the portal:
      </p>
      <p style="font-family:ui-monospace,monospace;font-size:30px;letter-spacing:.32em;color:#d9c08a;margin:0 0 22px;padding:14px 18px;border:1px solid #2e2823;border-radius:10px;background:#1a1714;">
        ${spaced}
      </p>
      <p style="font-size:12px;line-height:1.5;color:#a4998a;margin:24px 0 0;">
        The stone crumbles to dust in ten minutes, and the sigil works only once.
      </p>
    </div>
  </body>
</html>`;
}
