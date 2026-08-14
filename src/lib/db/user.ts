import { prisma } from "@/lib/prisma";

/**
 * Stands in for the signed-in user until NextAuth lands. Every data function
 * scopes its queries through this, so swapping it for a real session is the
 * only change those functions will need.
 */
const DEMO_USER_EMAIL = "demo@devstash.io";

export async function getCurrentUserId(): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });

  return user?.id ?? null;
}
