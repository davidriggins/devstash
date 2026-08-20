"use server";

import { AuthError, CredentialsSignin } from "next-auth";

import {
  CREDENTIALS_PROVIDER_ID,
  DEFAULT_SIGN_IN_REDIRECT,
  EMAIL_NOT_VERIFIED_CODE,
  RATE_LIMITED_CODE,
  SIGN_IN_PATH,
} from "@/auth.config";
import {
  EMAIL_NOT_VERIFIED_MESSAGE,
  RATE_LIMITED_MESSAGE,
} from "@/lib/auth/messages";
import { signIn, signOut } from "@/auth";
import { safePath } from "@/lib/search-params";
import { signInSchema } from "@/lib/validation/auth";

export interface SignInState {
  error?: string;
}

/**
 * The hidden `callbackUrl` field reaches us straight from the page's query
 * string, so it is checked here too rather than trusted from the client.
 */
function safeCallbackUrl(value: FormDataEntryValue | null) {
  return safePath(
    typeof value === "string" ? value : undefined,
    DEFAULT_SIGN_IN_REDIRECT
  );
}

export async function signInWithCredentials(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter your credentials" };
  }

  try {
    await signIn(CREDENTIALS_PROVIDER_ID, {
      ...parsed.data,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    // A successful sign-in throws NEXT_REDIRECT, which is not an AuthError and
    // has to keep travelling for the redirect to happen
    if (error instanceof AuthError) {
      // The password was right but the address is unconfirmed, so this says so
      if (
        error instanceof CredentialsSignin &&
        error.code === EMAIL_NOT_VERIFIED_CODE
      ) {
        return { error: EMAIL_NOT_VERIFIED_MESSAGE };
      }

      // The rate limit itself lives in `authorize`, so that a direct POST to
      // the credentials callback is refused too. This only translates the code
      // it throws into words for the form.
      if (
        error instanceof CredentialsSignin &&
        error.code === RATE_LIMITED_CODE
      ) {
        return { error: RATE_LIMITED_MESSAGE };
      }

      // Deliberately vague: saying which half was wrong tells an attacker
      // which emails have accounts
      return { error: "Invalid email or password" };
    }

    throw error;
  }

  return {};
}

export async function signInWithGitHub(formData: FormData) {
  await signIn("github", {
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: SIGN_IN_PATH });
}
