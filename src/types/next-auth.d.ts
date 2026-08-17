import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * NextAuth types `user.id` as optional. The JWT callback always sets it, so
   * narrow it to a required string and save every caller a null check.
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
