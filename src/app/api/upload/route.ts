import { handler, ok, fail, requireSession, assertSameOrigin } from "@/lib/api";
import { uploadImage, UploadError } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/upload  (multipart form-data, field "file") → { url }
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  await requireSession();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Expected multipart form data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file provided.", 400);

  try {
    return ok(await uploadImage(file));
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message, err.status);
    throw err;
  }
});
