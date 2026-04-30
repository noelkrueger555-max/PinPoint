/**
 * Re-encode an image through Canvas to strip ALL metadata (EXIF, XMP, IPTC,
 * thumbnail). browser-image-compression already does this in most paths, but
 * some code paths preserve XMP — this helper guarantees a metadata-free output
 * which is critical when a photo is later marked `public` and the original
 * GPS would otherwise leak inside the JPEG.
 */
export async function stripMetadata(input: Blob, quality = 0.9): Promise<Blob> {
  const url = URL.createObjectURL(input);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return input;
    ctx.drawImage(img, 0, 0);
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    return out ?? input;
  } catch {
    return input;
  } finally {
    URL.revokeObjectURL(url);
  }
}
