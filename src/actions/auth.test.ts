import { beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialsSignin } from "next-auth";

import {
  CREDENTIALS_PROVIDER_ID,
  DEFAULT_SIGN_IN_REDIRECT,
  EMAIL_NOT_VERIFIED_CODE,
  RATE_LIMITED_CODE,
} from "@/auth.config";
import {
  EMAIL_NOT_VERIFIED_MESSAGE,
  RATE_LIMITED_MESSAGE,
} from "@/lib/auth/messages";

/**
 * `@/auth` pulls in the Prisma adapter, so it is mocked rather than loaded —
 * without this the import alone would try to build a database client.
 */
vi.mock("@/auth", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { signIn } = await import("@/auth");
const { signInWithCredentials } = await import("@/actions/auth");

function formData(fields: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }

  return data;
}

const CREDENTIALS = { email: "ada@example.com", password: "a real password" };

beforeEach(() => {
  vi.mocked(signIn).mockReset();
});

describe("signInWithCredentials", () => {
  it("passes parsed credentials to the provider", async () => {
    await signInWithCredentials({}, formData(CREDENTIALS));

    expect(signIn).toHaveBeenCalledWith(CREDENTIALS_PROVIDER_ID, {
      ...CREDENTIALS,
      redirectTo: DEFAULT_SIGN_IN_REDIRECT,
    });
  });

  it("normalises the email before it reaches the provider", async () => {
    await signInWithCredentials(
      {},
      formData({ ...CREDENTIALS, email: "  Ada@Example.COM  " })
    );

    expect(vi.mocked(signIn).mock.calls[0][1]).toMatchObject({
      email: "ada@example.com",
    });
  });

  it("rejects a malformed address without calling the provider", async () => {
    const result = await signInWithCredentials(
      {},
      formData({ ...CREDENTIALS, email: "not-an-email" })
    );

    expect(result.error).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  describe("callbackUrl", () => {
    it("honours a same-site path", async () => {
      await signInWithCredentials(
        {},
        formData({ ...CREDENTIALS, callbackUrl: "/items/snippets" })
      );

      expect(vi.mocked(signIn).mock.calls[0][1]).toMatchObject({
        redirectTo: "/items/snippets",
      });
    });

    /**
     * The hidden field reaches the server from the client, so the page having
     * sanitised it means nothing — the action checks again.
     */
    it.each(["https://evil.com", "//evil.com", "dashboard"])(
      "falls back to the default for %s",
      async (callbackUrl) => {
        await signInWithCredentials(
          {},
          formData({ ...CREDENTIALS, callbackUrl })
        );

        expect(vi.mocked(signIn).mock.calls[0][1]).toMatchObject({
          redirectTo: DEFAULT_SIGN_IN_REDIRECT,
        });
      }
    );
  });

  describe("when the provider refuses", () => {
    function credentialsError(code?: string) {
      const error = new CredentialsSignin();

      if (code) {
        error.code = code;
      }

      return error;
    }

    // Naming which half was wrong would make the page an oracle for which
    // addresses have accounts
    it("stays vague about a plain refusal", async () => {
      vi.mocked(signIn).mockRejectedValueOnce(credentialsError());

      const result = await signInWithCredentials({}, formData(CREDENTIALS));

      expect(result.error).toBe("Invalid email or password");
    });

    it("names the unverified address, since the password already proved ownership", async () => {
      vi.mocked(signIn).mockRejectedValueOnce(
        credentialsError(EMAIL_NOT_VERIFIED_CODE)
      );

      const result = await signInWithCredentials({}, formData(CREDENTIALS));

      expect(result.error).toBe(EMAIL_NOT_VERIFIED_MESSAGE);
    });

    it("translates the rate-limit code thrown by authorize", async () => {
      vi.mocked(signIn).mockRejectedValueOnce(
        credentialsError(RATE_LIMITED_CODE)
      );

      const result = await signInWithCredentials({}, formData(CREDENTIALS));

      expect(result.error).toBe(RATE_LIMITED_MESSAGE);
    });
  });

  /**
   * A *successful* sign-in throws NEXT_REDIRECT, which is not an AuthError.
   * Swallowing it would strand the user on the form, so it has to keep
   * travelling for the redirect to happen.
   */
  it("rethrows a non-auth error so the redirect can complete", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(signIn).mockRejectedValueOnce(redirect);

    await expect(
      signInWithCredentials({}, formData(CREDENTIALS))
    ).rejects.toThrow(redirect);
  });
});
