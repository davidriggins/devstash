import { afterEach, describe, expect, it } from "vitest";

import { isEmailVerificationEnabled } from "@/lib/auth/email-verification";

function setFlag(value: string | undefined) {
  if (value === undefined) {
    delete process.env.EMAIL_VERIFICATION_ENABLED;
  } else {
    process.env.EMAIL_VERIFICATION_ENABLED = value;
  }
}

afterEach(() => {
  setFlag(undefined);
});

/**
 * The switch is parsed opt-out on purpose: only the exact string "false" turns
 * verification off, so a missing or misspelt value fails to the secure state
 * rather than silently disabling the check.
 */
describe("isEmailVerificationEnabled", () => {
  it("is on when the variable is unset", () => {
    setFlag(undefined);

    expect(isEmailVerificationEnabled()).toBe(true);
  });

  it("is off only for the exact string false", () => {
    setFlag("false");
    expect(isEmailVerificationEnabled()).toBe(false);

    setFlag("FALSE");
    expect(isEmailVerificationEnabled()).toBe(false);

    setFlag("  false  ");
    expect(isEmailVerificationEnabled()).toBe(false);
  });

  it("stays on for anything else, including near misses", () => {
    for (const value of ["true", "", "0", "no", "flase", "off", "disabled"]) {
      setFlag(value);
      expect(isEmailVerificationEnabled()).toBe(true);
    }
  });
});
