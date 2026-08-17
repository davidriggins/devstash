"use server";

import { AuthError } from "next-auth";

import {
  CREDENTIALS_PROVIDER_ID,
  DEFAULT_SIGN_IN_REDIRECT,
  SIGN_IN_PATH,
} from "@/auth.config";
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
