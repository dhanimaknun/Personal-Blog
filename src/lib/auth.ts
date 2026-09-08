import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  COOKIE_NAME,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type Session,
} from "@/lib/session";

export { COOKIE_NAME, verifySession };
export type { Session };

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminUser || !adminHash) {
    throw new Error("ADMIN_USERNAME / ADMIN_PASSWORD_HASH are not configured");
  }
  if (username !== adminUser) {
    // still run a compare to keep timing roughly constant
    await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidin");
    return false;
  }
  return bcrypt.compare(password, adminHash);
}

export async function startSession(session: Session) {
  const token = await signSession(session);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  return verifySession(cookies().get(COOKIE_NAME)?.value);
}
