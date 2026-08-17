import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig, { SIGN_IN_PATH } from "@/auth.config";

// Edge-only NextAuth instance: config without the adapter, so no Prisma here
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (req.auth) {
    return NextResponse.next();
  }

  // Our own sign-in page; `callbackUrl` returns them where they were
  const signInUrl = new URL(SIGN_IN_PATH, req.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);

  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/profile", "/profile/:path*"],
};
