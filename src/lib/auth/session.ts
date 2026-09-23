import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/queries/users";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, buildSessionToken, parseSessionToken } from "@/lib/auth/sessionToken";
import type { User } from "@/lib/types/domain";

// Real sign-in: the seeded participant account has an email + password (see
// users.ts ensureSeeded). Session state is a signed, expiring cookie — an
// HMAC over the user id and expiry, see sessionToken.ts — rather than a raw
// user id, so it can't be forged into someone else's account by
// hand-editing the cookie. proxy.ts performs the same signature check on
// every request to redirect signed-out visitors to /login before a page
// even renders; this module re-checks per request for defense in depth.
// SSO/RTA-intranet integration remains out of scope for this build, per the
// plan ("Responsive web first; RTA intranet or SSO integration in the
// pilot").

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  store.set(SESSION_COOKIE_NAME, buildSessionToken(userId, expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = parseSessionToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

/** For Server Components: redirects to /login if nobody is signed in. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
