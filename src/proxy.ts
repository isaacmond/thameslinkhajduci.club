import { NextResponse, type NextRequest } from "next/server";
import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs";

/**
 * WorkOS AuthKit session handling for every page and API route (static assets excluded). /account needs a signed-in user;
 * anonymous visitors are sent to /sign-in, the route handler that starts the hosted flow (it, unlike a page, can set the
 * PKCE cookie that protects the round trip). When WorkOS is not configured (no client id yet) this is a no-op, so the site
 * keeps working without sign-in.
 */
const enabled = Boolean(process.env.WORKOS_API_KEY && process.env.WORKOS_CLIENT_ID && process.env.WORKOS_COOKIE_PASSWORD);
const PROTECTED = [/^\/account(\/|$)/, /^\/admin(\/|$)/];

export default async function proxy(request: NextRequest) {
  if (!enabled) return NextResponse.next();
  const { session, headers } = await authkit(request);
  const { pathname } = request.nextUrl;
  if (PROTECTED.some((re) => re.test(pathname)) && !session.user) return handleAuthkitHeaders(request, headers, { redirect: "/sign-in" });
  return handleAuthkitHeaders(request, headers);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpe?g|svg|webp|gif|ico|txt|xml|woff2?)$).*)"],
};
