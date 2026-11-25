import { sendResendEmail } from "@ninenine96/worker";
import { loginCodeMessage } from "./login-email";

export interface SendResult {
  delivered: boolean;
  /** Present only in dev mode, so the code can be surfaced without email. */
  devCode?: string;
}

/**
 * The app's own sending subdomain. Onboarding it in Cloudflare (Email Sending)
 * adds the bounce MX, SPF, DKIM and DMARC records for us.
 */
const DEFAULT_FROM_ADDRESS = "sigil@unseal.demiplane.app";
const DEFAULT_FROM_NAME = "Demiplane";

/**
 * Resend's shared sender only reaches the address the Resend account was signed
 * up with. It stays as a fallback so a deployment without the sending domain
 * onboarded still lets the keeper in, and can be dropped once `unseal` verifies.
 */
const RESEND_FALLBACK_FROM = "Demiplane <onboarding@resend.dev>";

/**
 * Sends the one-time login code (the sigil on a sending stone).
 *
 * Prefers Cloudflare Email Sending from the app's own subdomain; falls through
 * to the shared Resend sender when that is unavailable, so a fresh deployment
 * can never lock the keeper out. Without any provider the code is logged.
 */
export async function sendLoginCode(
  env: Env,
  to: string,
  code: string,
): Promise<SendResult> {
  const message = loginCodeMessage(code);

  if (env.AUTH_DEV_MODE === "true") {
    console.log(`[Demiplane] sigil for ${to}: ${code}`);
    return { delivered: false, devCode: code };
  }

  if (env.EMAIL) {
    try {
      await env.EMAIL.send({
        to,
        from: {
          email: env.EMAIL_FROM_ADDRESS ?? DEFAULT_FROM_ADDRESS,
          name: env.EMAIL_FROM_NAME ?? DEFAULT_FROM_NAME,
        },
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return { delivered: true };
    } catch (error) {
      console.error(
        "[Demiplane] Email Service refused the sending stone",
        describeSendError(error),
      );
    }
  }

  if (env.RESEND_API_KEY) {
    const result = await sendResendEmail(env.RESEND_API_KEY, {
      from: RESEND_FALLBACK_FROM,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (!result.ok) {
      console.error(
        "[Demiplane] Resend rejected the sending stone",
        result.status,
        result.detail,
      );
      return { delivered: false };
    }
    return { delivered: true };
  }

  console.error(
    "[Demiplane] no sending stone provider is configured; the sigil is only in this log",
  );
  return { delivered: false };
}

function describeSendError(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code, message } = error as { code?: unknown; message?: unknown };
    return `${String(code)}: ${String(message)}`;
  }
  return error instanceof Error ? error.message : "unknown error";
}
