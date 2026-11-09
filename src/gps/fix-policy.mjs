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

export function startSchmidtGPSWatch(geolocation, state, onPosition, onError, options) {
  const generation = state.schmidtGPSGeneration = (state.schmidtGPSGeneration || 0) + 1;
  const current = () => state.schmidtGPSGeneration === generation && state.watchId !== null;
  return geolocation.watchPosition(
    position => { if (current()) onPosition(position); },
    error => { if (current()) onError(error); }, options);
}

export function stopSchmidtGPSWatch(geolocation, state, id) {
  state.schmidtGPSGeneration = (state.schmidtGPSGeneration || 0) + 1;
  geolocation.clearWatch(id);
}
