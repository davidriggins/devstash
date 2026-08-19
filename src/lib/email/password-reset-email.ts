import { RESET_PASSWORD_PATH } from "@/auth.config";
import { getAppUrl, getFromAddress, getResendClient } from "@/lib/email/resend";

/**
 * The password reset email. Plain inline-styled HTML for the same reason as the
 * verification email: it is one message, and email clients strip most of what a
 * component framework would emit anyway.
 */

/** Anything interpolated into the HTML is user-supplied, so it cannot go in raw */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPasswordResetUrl(token: string) {
  const url = new URL(RESET_PASSWORD_PATH, `${getAppUrl()}/`);
  url.searchParams.set("token", token);

  return url.toString();
}

interface SendPasswordResetEmailArgs {
  to: string;
  name: string;
  token: string;
}

/**
 * Reports success as a boolean instead of throwing. The caller answers the same
 * way whether or not the send worked — saying it failed would confirm the
 * address has an account — so it must be able to carry on either way.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  token,
}: SendPasswordResetEmailArgs) {
  const resetUrl = buildPasswordResetUrl(token);
  const greeting = escapeHtml(name.split(" ")[0] ?? name);

  try {
    const { error } = await getResendClient().emails.send({
      from: getFromAddress(),
      to: [to],
      subject: "Reset your DevStash password",
      text: [
        `Hi ${name},`,
        "",
        "Use this link to choose a new DevStash password:",
        resetUrl,
        "",
        "The link works once and expires in 1 hour.",
        "If you did not ask to reset your password, you can ignore this email — your password will not change.",
      ].join("\n"),
      html: `
        <div style="margin:0;padding:32px 16px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <div style="max-width:480px;margin:0 auto;padding:32px;background:#ffffff;border-radius:16px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;">DevStash</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
              Hi ${greeting}, use the button below to choose a new password.
            </p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
              Reset password
            </a>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
              The link works once and expires in 1 hour. If the button does not
              work, paste this into your browser:
            </p>
            <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;color:#6366f1;">
              ${resetUrl}
            </p>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
              If you did not ask to reset your password, you can ignore this
              email — your password will not change.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      // The message only, never the token that is sitting in `resetUrl`
      console.error("Password reset email failed to send:", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Password reset email failed to send:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
