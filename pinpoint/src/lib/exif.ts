import exifr from "exifr";

export interface ExifResult {
  lat?: number;
  lng?: number;
  takenAt?: number;
}

export async function readExif(file: File | Blob): Promise<ExifResult> {
  try {
    const data = await exifr.parse(file, {
      gps: true,
      pick: ["latitude", "longitude", "DateTimeOriginal", "CreateDate"],
    });
    if (!data) return {};
    const lat = typeof data.latitude === "number" ? data.latitude : undefined;
    const lng = typeof data.longitude === "number" ? data.longitude : undefined;
    const date = data.DateTimeOriginal ?? data.CreateDate;
    const takenAt = date instanceof Date ? date.getTime() : undefined;
    return { lat, lng, takenAt };
  } catch {
    return {};
  }
}
