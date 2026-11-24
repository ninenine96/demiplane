export interface ResendMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface ResendResult {
  ok: boolean;
  status?: number;
  detail?: string;
}

/** One place for the Resend HTTP call; templates stay with each app. */
export async function sendResendEmail(
  apiKey: string,
  message: ResendMessage,
): Promise<ResendResult> {
  if (!apiKey) return { ok: false, detail: "RESEND_API_KEY is not configured." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        detail: await response.text(),
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: String(error) };
  }
}
