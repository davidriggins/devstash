import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in user's id, or null when nobody is signed in. Every data
 * function scopes its queries through this, so it is the single point where
 * "whose data is this?" is decided.
 *
 * Until this feature it returned a hardcoded demo account, which meant the
 * dashboard showed the same seeded data to everyone. Callers already treated a
 * null id as "no data", which is exactly the signed-out case, so none of them
 * needed changing.
 */
// Cached so the several data functions a page calls share one lookup per request
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const session = await auth();

  return session?.user?.id ?? null;
});

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  /**
   * Whether a password is set, rather than the hash itself — nothing outside
   * the auth checks has any business reading that. Distinguishes a credentials
   * account from a GitHub-only one, the same test `authorize` makes.
   */
  hasPassword: boolean;
}

/**
 * The signed-in user's own record, read fresh from the database rather than
 * from the session. The JWT carries a snapshot from sign-in time; a profile
 * page has to show what is true now.
 *
 * Returns null when the session names a user that no longer exists. That is not
 * hypothetical: sessions are JWTs, so deleting an account leaves its cookie
 * working, and the holder must be treated as signed out rather than crashing
 * the page.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      password: true,
    },
  });

  if (!user) {
    return null;
  }

  const { password, ...rest } = user;

  return { ...rest, hasPassword: password !== null };
});
