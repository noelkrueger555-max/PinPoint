import exifr from "exifr";

export interface ExifResult {
  lat?: number;
  lng?: number;
  takenAt?: number;
}

/**
 * Read GPS + capture date from a photo.
 *
 * NOTE: do NOT pass `pick: [...]` together with GPS extraction — `latitude`
 * and `longitude` are derived properties from the GPSLatitude / GPSLongitude
 * tags. `pick` filters at the raw tag level and silently drops them, which
 * was the bug that caused photos with valid GPS metadata to land at
 * lat/lng = undefined. We call `exifr.gps()` for coords and a separate parse
 * for dates.
 */
export async function readExif(file: File | Blob): Promise<ExifResult> {
  let lat: number | undefined;
  let lng: number | undefined;
  let takenAt: number | undefined;

  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      lat = gps.latitude;
      lng = gps.longitude;
    }
  } catch {
    // fall through to parse-based fallback
  }

  try {
    const data = await exifr.parse(file, true);
    if (data) {
      if (lat == null && typeof data.latitude === "number") lat = data.latitude;
      if (lng == null && typeof data.longitude === "number") lng = data.longitude;
      const date = data.DateTimeOriginal ?? data.CreateDate ?? data.ModifyDate;
      if (date instanceof Date) takenAt = date.getTime();
      else if (typeof date === "string") {
        const ts = Date.parse(date);
        if (!Number.isNaN(ts)) takenAt = ts;
      }
    }
  } catch {
    // ignore
  }

  return { lat, lng, takenAt };
}
