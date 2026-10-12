import { handler, ok, readJson } from "@/lib/api";
import { assertSyncSecret, ingestSync, syncConfig, SyncPayload } from "@/lib/google-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Called by the owner's Google Apps Script, never by a browser — it carries
// its own bearer secret instead of a session (see middleware PUBLIC_PATHS).

// GET /api/google/sync → the Gmail searches to run and how far ahead to read
export const GET = handler(async (req) => {
  assertSyncSecret(req);
  return ok(await syncConfig());
});

// POST /api/google/sync → the calendar window + matching receipts
export const POST = handler(async (req) => {
  assertSyncSecret(req);
  const body = await readJson(req, SyncPayload);
  return ok(await ingestSync(body));
});
