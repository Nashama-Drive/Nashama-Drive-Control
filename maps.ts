export type Coordinates = { latitude: number; longitude: number };

export const validCoordinates = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

export const googleMapsUrl = (
  latitude: number | null,
  longitude: number | null,
  address = "",
) => {
  const query =
    latitude != null &&
    longitude != null &&
    validCoordinates(latitude, longitude)
      ? `${latitude},${longitude}`
      : address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export const parseGoogleMapsLocation = (value: string): Coordinates | null => {
  const input = value.trim();
  if (!input) return null;

  let candidate = input;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    if (!/(^|\.)google\.[a-z.]+$/.test(host)) return null;

    // In place links, !3d/!4d is the pin; @lat,lng is only the camera center.
    const place = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (place) candidate = `${place[1]},${place[2]}`;
    else {
      const query = url.searchParams.get("query") || url.searchParams.get("q");
      candidate = query && /^\s*-?\d/.test(query) ? query : url.href;
    }
  } catch {
    // Accept coordinates pasted directly, without a Google Maps URL.
  }

  const match = candidate.match(/(?:@|^|[=\s])(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return validCoordinates(latitude, longitude) ? { latitude, longitude } : null;
};