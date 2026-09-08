import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, type Session } from "@/lib/auth";
import { site } from "@/lib/site";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Throws an HttpError(401) when there is no valid admin session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new HttpError("Unauthorized", 401);
  return session;
}

/** Same-origin check for mutating requests (defence-in-depth against CSRF). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser client / same-origin navigation
  const allowed = new Set([site.url, "http://localhost:3000"]);
  if (!allowed.has(origin.replace(/\/$/, ""))) {
    throw new HttpError("Cross-origin request rejected", 403);
  }
}

export async function readJson<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(parsed.error.issues.map((i) => i.message).join("; "), 422);
  }
  return parsed.data;
}

/** Wrap a route handler so thrown HttpError / Error become clean JSON responses. */
export function handler<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.message, err.status);
      const anyErr = err as { status?: number; message?: string };
      if (typeof anyErr?.status === "number") {
        return fail(anyErr.message || "Request failed", anyErr.status);
      }
      console.error("[api]", err);
      return fail("Internal server error", 500);
    }
  };
}
