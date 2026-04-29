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

  // 1) Dedicated GPS helper — handles GPSLatitude/Longitude + GPSLatitudeRef/LongitudeRef.
  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      lat = gps.latitude;
      lng = gps.longitude;
    }
  } catch {
    // fall through
  }

  // 2) Full parse with GPS + EXIF + XMP enabled — covers iPhone HEIC, Android,
  //    DSLR XMP-only files, etc. Without `gps:true` exifr skips the GPS IFD.
  try {
    const data = await exifr.parse(file, {
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
    });
    if (data) {
      if (lat == null && typeof data.latitude === "number") lat = data.latitude;
      if (lng == null && typeof data.longitude === "number") lng = data.longitude;
      // Some files only carry raw GPS arrays — derive manually.
      if ((lat == null || lng == null) && Array.isArray(data.GPSLatitude) && Array.isArray(data.GPSLongitude)) {
        const toDec = (dms: number[], ref?: string) => {
          const [d = 0, m = 0, s = 0] = dms;
          const sign = ref === "S" || ref === "W" ? -1 : 1;
          return sign * (d + m / 60 + s / 3600);
        };
        lat = toDec(data.GPSLatitude, data.GPSLatitudeRef);
        lng = toDec(data.GPSLongitude, data.GPSLongitudeRef);
      }
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

  // eslint-disable-next-line no-console
  console.info("[exif]", { lat, lng, takenAt });
  return { lat, lng, takenAt };
}
