import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  emailSchema,
  PASSWORD_MIN_LENGTH,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/lib/validation/auth";

const VALID_PASSWORD = "correct horse battery";

describe("emailSchema", () => {
  it("lowercases and trims before validating", () => {
    expect(emailSchema.parse("  Me@Example.COM  ")).toBe("me@example.com");
  });

  /**
   * Regression. The rules once ended in `.trim()`, but `z.email()` carries its
   * format check at the base, so a trailing trim never ran on input the check
   * had already rejected — a padded address 400'd instead of being accepted
   * and normalised.
   */
  it("accepts a padded address rather than rejecting it", () => {
    expect(emailSchema.safeParse("  padded@test.com  ").success).toBe(true);
  });

  it("rejects a malformed address", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "Ada",
    email: "ada@example.com",
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  };

  it("accepts a well-formed registration", () => {
    expect(registerSchema.parse(valid).email).toBe("ada@example.com");
  });

  it("normalises the email the same way as signing in later will", () => {
    const parsed = registerSchema.parse({ ...valid, email: " Ada@Example.com " });

    expect(parsed.email).toBe(emailSchema.parse("ada@example.com"));
  });

  it("requires a name", () => {
    expect(registerSchema.safeParse({ ...valid, name: "   " }).success).toBe(
      false
    );
  });

  it("rejects a password under the minimum length", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    const result = registerSchema.safeParse({
      ...valid,
      password: short,
      confirmPassword: short,
    });

    expect(result.success).toBe(false);
  });

  it("reports a mismatch against the confirm field", () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: "something else",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password, since it is not being set here", () => {
    const result = signInSchema.safeParse({ email: "a@b.com", password: "x" });

    expect(result.success).toBe(true);
  });

  it("still requires a password to be present", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.com", password: "" }).success
    ).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const valid = {
    currentPassword: "old password",
    newPassword: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  };

  it("accepts a genuine change", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  // Reusing the current password is a no-op dressed up as a change
  it("refuses a new password identical to the current one", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: VALID_PASSWORD,
      newPassword: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["newPassword"]);
  });

  it("requires the current password", () => {
    expect(
      changePasswordSchema.safeParse({ ...valid, currentPassword: "" }).success
    ).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires a token", () => {
    const result = resetPasswordSchema.safeParse({
      token: "",
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    });

    expect(result.success).toBe(false);
  });

  it("shares the password rule with registration", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);

    expect(
      resetPasswordSchema.safeParse({
        token: "t",
        password: short,
        confirmPassword: short,
      }).success
    ).toBe(false);
  });
});
