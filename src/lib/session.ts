import { SignJWT, jwtVerify } from "jose";

// Edge-safe: pure JWT helpers with no next/headers import.
// Used by middleware and by the cookie helpers in ./auth.

export const COOKIE_NAME = "journal_session";
const ALG = "HS256";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Session = { username: string };

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ username: session.username })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}
