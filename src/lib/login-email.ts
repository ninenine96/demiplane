import { FLAVOUR } from "../../shared/messages";

export interface LoginCodeMessage {
  subject: string;
  text: string;
  html: string;
}

/**
 * The sigil is always one unbroken run of digits. Spacing it out with literal
 * spaces reads nicely but breaks Gmail's "Copy code" chip on Android, and a
 * long-press copy then pastes `1 2 3 4 5 6`. Any visual spacing belongs in CSS.
 *
 * Kept free of provider imports so it can be exercised without a mail service.
 */
export function loginCodeMessage(code: string): LoginCodeMessage {
  return {
    subject: `Your sigil: ${code}`,
    text: [
      FLAVOUR.emailHeading,
      "",
      `Your sigil: ${code}`,
      "",
      `Enter it to unseal the portal. ${FLAVOUR.emailExpiry}`,
    ].join("\n"),
    html: loginCodeEmail(code),
  };
}

function loginCodeEmail(code: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#131110;font-family:ui-sans-serif,system-ui,sans-serif;color:#f1e9da;">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
      <p style="letter-spacing:.28em;text-transform:uppercase;font-size:11px;color:#c3a15c;margin:0 0 10px;">Demiplane</p>
      <h1 style="font-size:22px;margin:0 0 16px;color:#f1e9da;">${FLAVOUR.emailHeading}</h1>
      <p style="font-size:15px;line-height:1.6;color:#cbbfad;margin:0 0 20px;">
        Enter this sigil to unseal the portal:
      </p>
      <p style="font-family:ui-monospace,monospace;font-size:30px;letter-spacing:.28em;color:#d9c08a;margin:0 0 8px;padding:14px 18px;border:1px solid #2e2823;border-radius:10px;background:#1a1714;">${code}</p>
      <p style="font-size:12px;line-height:1.5;color:#a4998a;margin:0 0 24px;">
        ${FLAVOUR.emailCopyHint}
      </p>
      <p style="font-size:12px;line-height:1.5;color:#a4998a;margin:24px 0 0;">
        ${FLAVOUR.emailExpiry}
      </p>
    </div>
  </body>
</html>`;
}
