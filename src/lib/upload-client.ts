// Browser-side image upload. Photos are downscaled and re-encoded before they
// leave the browser: Vercel rejects request bodies over ~4.5 MB with a 413,
// and a 12 MP phone photo is far bigger than any page needs anyway.

const MAX_EDGE = 2400;
const QUALITY = 0.85;
const SKIP_BELOW = 1024 * 1024; // already small enough, upload as-is

async function shrink(file: File): Promise<File> {
  // GIFs may be animated, and canvas would flatten them to one frame.
  if (file.type === "image/gif" || !file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // a format the browser can't decode (e.g. HEIC): let the server decide
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SKIP_BELOW) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );
  // Safari without WebP encoding hands back PNG; JPEG is smaller then.
  const out =
    blob && blob.type === "image/webp"
      ? blob
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!out || out.size >= file.size) return file;

  const ext = out.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([out], `${base}.${ext}`, { type: out.type });
}

/** Shrinks the image if needed, POSTs it to /api/upload, and returns its public URL. */
export async function uploadImageFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", await shrink(file));
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (res.status === 413) throw new Error("Image is too large to upload, even after resizing.");
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data.url as string;
}
