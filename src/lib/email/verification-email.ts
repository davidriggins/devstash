import { getAppUrl, getFromAddress, getResendClient } from "@/lib/email/resend";

/**
 * The verification email. Built as plain inline-styled HTML rather than with a
 * template library: it is one message, and email clients strip most of what a
 * component framework would emit anyway.
 */

/** Where the link points. A static segment, so it wins over NextAuth's `[...nextauth]` catch-all. */
export const VERIFY_EMAIL_ENDPOINT = "/api/auth/verify-email";

/** Anything interpolated into the HTML is user-supplied, so it cannot go in raw */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildVerificationUrl(token: string) {
  const url = new URL(VERIFY_EMAIL_ENDPOINT, `${getAppUrl()}/`);
  url.searchParams.set("token", token);

  return url.toString();
}

interface SendVerificationEmailArgs {
  to: string;
  name: string;
  token: string;
}

/**
 * Reports success as a boolean instead of throwing. A failed send must not undo
 * a created account — the user can ask for another link — so the caller needs
 * to carry on either way.
 */
export async function sendVerificationEmail({
  to,
  name,
  token,
}: SendVerificationEmailArgs) {
  const verificationUrl = buildVerificationUrl(token);
  const greeting = escapeHtml(name.split(" ")[0] ?? name);

  try {
    const { error } = await getResendClient().emails.send({
      from: getFromAddress(),
      to: [to],
      subject: "Verify your DevStash email",
      text: [
        `Hi ${name},`,
        "",
        "Confirm your email address to finish setting up your DevStash account:",
        verificationUrl,
        "",
        "The link works once and expires in 24 hours.",
        "If you did not create a DevStash account, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="margin:0;padding:32px 16px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <div style="max-width:480px;margin:0 auto;padding:32px;background:#ffffff;border-radius:16px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;">DevStash</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
              Hi ${greeting}, confirm your email address to finish setting up your account.
            </p>
            <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
              Verify email
            </a>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
              The link works once and expires in 24 hours. If the button does not
              work, paste this into your browser:
            </p>
            <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;color:#6366f1;">
              ${verificationUrl}
            </p>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
              If you did not create a DevStash account, you can ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      // The message only, never the token that is sitting in `verificationUrl`
      console.error("Verification email failed to send:", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Verification email failed to send:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
