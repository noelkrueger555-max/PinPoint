import exifr from "exifr";

export interface ExifResult {
  lat?: number;
  lng?: number;
  takenAt?: number;
  /** Indicates we tried but the file truly has no GPS metadata. */
  hadAnyExif: boolean;
}

const EXIFR_OPTIONS = {
  tiff: true,
  exif: true,
  gps: true,
  xmp: true,
  iptc: false,
  icc: false,
  jfif: false,
  ihdr: false,
  mergeOutput: true,
  translateValues: true,
  reviveValues: true,
  sanitize: true,
} as const;

function dmsToDecimal(dms: number[], ref?: string): number | undefined {
  if (!Array.isArray(dms) || dms.length === 0) return undefined;
  const [d = 0, m = 0, s = 0] = dms;
  const sign = ref === "S" || ref === "W" ? -1 : 1;
  return sign * (d + m / 60 + s / 3600);
}

async function tryRead(
  input: File | Blob | ArrayBuffer
): Promise<Partial<ExifResult> & { hadAnyExif?: boolean }> {
  let lat: number | undefined;
  let lng: number | undefined;
  let takenAt: number | undefined;
  let hadAnyExif = false;

  try {
    const gps = await exifr.gps(input);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      lat = gps.latitude;
      lng = gps.longitude;
      hadAnyExif = true;
    }
  } catch {
    /* ignore */
  }

  try {
    const data = (await exifr.parse(input, EXIFR_OPTIONS)) as Record<string, unknown> | undefined;
    if (data && Object.keys(data).length > 0) {
      hadAnyExif = true;
      const dLat = data.latitude;
      const dLng = data.longitude;
      if (lat == null && typeof dLat === "number") lat = dLat;
      if (lng == null && typeof dLng === "number") lng = dLng;

      if (lat == null || lng == null) {
        const rawLat = data.GPSLatitude as number[] | undefined;
        const rawLng = data.GPSLongitude as number[] | undefined;
        const refLat = data.GPSLatitudeRef as string | undefined;
        const refLng = data.GPSLongitudeRef as string | undefined;
        if (Array.isArray(rawLat) && Array.isArray(rawLng)) {
          lat = lat ?? dmsToDecimal(rawLat, refLat);
          lng = lng ?? dmsToDecimal(rawLng, refLng);
        }
      }

      const date =
        (data.DateTimeOriginal as Date | string | undefined) ??
        (data.CreateDate as Date | string | undefined) ??
        (data.ModifyDate as Date | string | undefined);
      if (date instanceof Date) takenAt = date.getTime();
      else if (typeof date === "string") {
        const ts = Date.parse(date);
        if (!Number.isNaN(ts)) takenAt = ts;
      }
    }
  } catch {
    /* ignore */
  }

  return { lat, lng, takenAt, hadAnyExif };
}

/**
 * Read GPS + capture date from a photo. Tries the original input first; if it
 * yields nothing (browser HEIC quirks, container conversions, etc.) we retry
 * against an ArrayBuffer copy, which exifr can sometimes parse where direct
 * Blob parsing fails.
 */
export async function readExif(file: File | Blob): Promise<ExifResult> {
  const a = await tryRead(file);
  let lat = a.lat;
  let lng = a.lng;
  let takenAt = a.takenAt;
  let hadAnyExif = !!a.hadAnyExif;

  if (lat == null || lng == null || takenAt == null) {
    try {
      const buf = await file.arrayBuffer();
      const b = await tryRead(buf);
      lat = lat ?? b.lat;
      lng = lng ?? b.lng;
      takenAt = takenAt ?? b.takenAt;
      hadAnyExif = hadAnyExif || !!b.hadAnyExif;
    } catch {
      /* ignore */
    }
  }

  // eslint-disable-next-line no-console
  console.info("[exif]", { lat, lng, takenAt, hadAnyExif });
  return { lat, lng, takenAt, hadAnyExif };
}
