import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Stands in for the signed-in user until NextAuth lands. Every data function
 * scopes its queries through this, so swapping it for a real session is the
 * only change those functions will need.
 */
const DEMO_USER_EMAIL = "demo@devstash.io";

// Cached so the several data functions a page calls share one lookup per request
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });

  return user?.id ?? null;
});
