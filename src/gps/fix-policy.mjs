export function validateSchmidtGPSFix(position, { now, lastTimestamp = 0, maxAgeMs = 15000 }) {
  const timestamp = position?.timestamp;
  const coords = position?.coords;
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now
    || now - timestamp > maxAgeMs || timestamp <= lastTimestamp
    || !coords || !Number.isFinite(coords.longitude) || Math.abs(coords.longitude) > 180
    || !Number.isFinite(coords.latitude) || Math.abs(coords.latitude) > 90
    || !Number.isFinite(coords.accuracy) || coords.accuracy < 0) return null;
  return { timestamp, coords };
}
