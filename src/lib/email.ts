import { FLAVOUR } from "../../shared/messages";

export interface SendResult {
  delivered: boolean;
  /** Present only in dev mode, so the link can be logged instead of emailed. */
  devLink?: string;
}

/**
 * Sends the magic link. Without a configured Resend key (or with
 * AUTH_DEV_MODE=true) the link is logged to the console instead, so local
 * development needs no email provider at all.
 */
export async function sendMagicLink(
  env: Env,
  to: string,
  link: string,
): Promise<SendResult> {
  if (env.AUTH_DEV_MODE === "true" || !env.RESEND_API_KEY) {
    console.log(`[Demiplane] sending stone for ${to}: ${link}`);
    return { delivered: false, devLink: link };
  }

  const html = magicLinkEmail(link);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: "Demiplane <onboarding@resend.dev>",
      to: [to],
      subject: "A sending stone has arrived",
      text: `${FLAVOUR.magicLinkSent}\n\n${link}\n\nFollow the link and seal the portal. It crumbles to dust in 10 minutes.`,
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

function magicLinkEmail(link: string): string {
  const safeLink = link.replace(/"/g, "&quot;");
  return `<!doctype html>
<html>
  <body style="margin:0;background:#140f2e;font-family:ui-sans-serif,system-ui,sans-serif;color:#efe9ff;">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
      <p style="letter-spacing:.18em;text-transform:uppercase;font-size:11px;color:#b8923f;margin:0 0 8px;">Demiplane</p>
      <h1 style="font-size:22px;margin:0 0 16px;color:#efe9ff;">A sending stone has arrived.</h1>
      <p style="font-size:15px;line-height:1.6;color:#c9c0e8;margin:0 0 24px;">
        Seal the portal to enter your pocket dimension. This stone crumbles to dust in ten minutes, and works only once.
      </p>
      <a href="${safeLink}" style="display:inline-block;background:#6d4bd6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;">Seal the portal</a>
      <p style="font-size:12px;line-height:1.5;color:#8f85b5;margin:24px 0 0;">
        If the button does nothing, copy this into your browser:<br />
        <span style="word-break:break-all;color:#b8923f;">${safeLink}</span>
      </p>
    </div>
  </body>
</html>`;
}
