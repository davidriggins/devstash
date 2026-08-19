/**
 * Master switch for the whole email verification flow: the email on register,
 * the link, the resend endpoint and the unverified sign-in block.
 *
 * It exists because Resend has no verified domain yet, so the sandbox sender
 * only reaches the Resend account owner — nobody else can complete a signup.
 * Turning this off lets any address register while that is still true.
 *
 * Read through this function everywhere. Parsing the variable in one place is
 * what keeps the answer the same in the route, the provider and the pages.
 *
 * Opt-out on purpose: anything other than the exact string "false" leaves
 * verification **on**, so a missing or misspelt value fails to the safe state.
 * Server-only — never expose it as `NEXT_PUBLIC_`; the browser learns what
 * happened from what the register route returns.
 */
export function isEmailVerificationEnabled(): boolean {
  return process.env.EMAIL_VERIFICATION_ENABLED?.trim().toLowerCase() !== "false";
}
