// Image uploads → Supabase Storage, via the Storage REST API (no SDK).
//
// Setup (one time):
//   1. Supabase → Storage → New bucket → name it "post-images", make it PUBLIC.
//   2. Supabase → Settings → API Keys → "Secret keys" → reveal the `sb_secret_…`
//      key (or the legacy `service_role` key). Add it as env var
//      SUPABASE_SERVICE_ROLE_KEY (SUPABASE_SECRET_KEY also accepted).
//   3. Optionally SUPABASE_URL — otherwise derived from DATABASE_URL.

const BUCKET = "post-images";

function secretKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

function supabaseUrl(): string | null {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, "");
  // derive from the pooled connection string: postgres.<ref>:pw@...
  const db = process.env.DATABASE_URL ?? "";
  const ref = db.match(/postgres\.([a-z0-9]+):/)?.[1];
  return ref ? `https://${ref}.supabase.co` : null;
}

export function uploadsConfigured(): boolean {
  return Boolean(supabaseUrl() && secretKey());
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024;

async function putObject(path: string, contentType: string, body: Buffer): Promise<string> {
  const base = supabaseUrl();
  const key = secretKey();
  if (!base || !key) throw new UploadError("Image upload is not configured.", 501);

  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      // works for both legacy service_role JWTs and the new sb_secret_… keys
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "false",
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new UploadError(
      `Storage upload failed (${res.status}). ${detail.slice(0, 200)}`,
      res.status === 400 || res.status === 404 ? 400 : 502,
    );
  }

  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  if (!ALLOWED.has(file.type)) throw new UploadError("Unsupported image type.", 415);
  if (file.size > MAX_BYTES) throw new UploadError("Image is larger than 8 MB.", 413);

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${new Date().getUTCFullYear()}/${name}`;
  const url = await putObject(path, file.type, Buffer.from(await file.arrayBuffer()));
  return { url };
}

/** Same as uploadImage, for raw bytes (e.g. a file downloaded from Telegram). */
export async function uploadImageBuffer(
  buffer: Buffer,
  contentType: string,
): Promise<{ url: string }> {
  if (!ALLOWED.has(contentType)) throw new UploadError("Unsupported image type.", 415);
  if (buffer.length > MAX_BYTES) throw new UploadError("Image is larger than 8 MB.", 413);

  const ext = contentType.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "jpg";
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${new Date().getUTCFullYear()}/${name}`;
  const url = await putObject(path, contentType, buffer);
  return { url };
}

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
