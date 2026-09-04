import { NextResponse } from "next/server";
import { handleAuth } from "@workos-inc/authkit-nextjs";

/**
 * WorkOS sends people back here after they sign in; the session cookie is set and they land on their account page.
 * A visit without a valid code (a stale tab, an expired attempt) goes to a short explanation instead of an error page.
 */
export const GET = handleAuth({
  returnPathname: "/account",
  onError: ({ error, request }) => {
    console.error("callback:", error instanceof Error ? error.message : error);
    return NextResponse.redirect(new URL("/sign-in/trouble", request.url));
  },
});
