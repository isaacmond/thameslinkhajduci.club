import { redirect } from "next/navigation";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { authEnabled } from "@/lib/auth";

/** Starts the hosted AuthKit sign-in. Also the "Sign-in URL" configured in the WorkOS dashboard. */
export async function GET() {
  if (!authEnabled()) redirect("/account");
  redirect(await getSignInUrl());
}
