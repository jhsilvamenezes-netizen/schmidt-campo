// Motor 2 · projeção UTM (hemisfério sul, WGS 84) ↔ longitude/latitude, série de Krüger de 6ª ordem
// (Karney 2011, "Transverse Mercator with an accuracy of a few nanometers"). Reescrita do módulo projection do 0.5.1;
// coeficientes iguais (teste diferencial). Fuso padrão 23 (EPSG:32723), como os dados dos lotes.
const F = 1 / 298.257223563, K0 = 0.9996, FALSE_E = 5e5, FALSE_N = 1e7;
const N3 = F / 1.9966471893352524, N4 = N3 ** 4, N5 = N4 * N3, N6 = N5 * N3;
const RECT_A = 6367449.145823415; // A: raio do meridiano retificado
const ALPHA = [0.0008377318206244698, 7.608527773802082e-7 - (1983433 * N6) / 1935360, 1.1976455033294527e-9, 24291706072013587e-28,
  (34729 * N5) / 80640 - (3418889 * N6) / 1995840, (212378941 * N6) / 319334400];
const BETA = [0.0008377321640579488, 5.9058701528681994e-8 - (1118711 * N6) / 3870720, 1673482665283997e-25,
  (4397 * N4) / 161280 - (11 * N5) / 504 - (830251 * N6) / 7257600, (4583 * N5) / 161280 - (108847 * N6) / 3991680, (20648693 * N6) / 638668800];
const DELTA = [0.003356551469132927 - (2854 * N6) / 675, 6571873198628443e-21, 1.7646404113085808e-8,
  (4279 * N4) / 630 - (332 * N5) / 35 - (399572 * N6) / 14175, (4174 * N5) / 315 - (144838 * N6) / 6237, (601676 * N6) / 22275];
const DEG = Math.PI / 180;
const centralMeridian = zone => (-183 + 6 * zone) * DEG;

/** [lon, lat] (graus) → [E, N] (m) no fuso sul indicado. */
export function lonLatToUtmSouth(lon, lat, zone = 23) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw Error('Lon/lat inválidos');
  const phi = lat * DEG, lam = lon * DEG - centralMeridian(zone), e = Math.sqrt(F * 1.9966471893352524);
  const tau = Math.sinh(Math.atanh(Math.sin(phi)) - e * Math.atanh(e * Math.sin(phi)));
  const xi0 = Math.atan2(tau, Math.cos(lam)), eta0 = Math.atanh(Math.sin(lam) / Math.sqrt(1 + tau * tau));
  let xi = xi0, eta = eta0;
  for (let j = 1; j <= 6; j++) { xi += ALPHA[j - 1] * Math.sin(2 * j * xi0) * Math.cosh(2 * j * eta0); eta += ALPHA[j - 1] * Math.cos(2 * j * xi0) * Math.sinh(2 * j * eta0); }
  return [FALSE_E + K0 * RECT_A * eta, FALSE_N + K0 * RECT_A * xi];
}
/** [E, N] (m) no fuso sul → [lon, lat] (graus). */
export function utmSouthToLonLat(e, n, zone = 23) {
  if (!Number.isFinite(e) || !Number.isFinite(n)) throw Error('UTM inválido');
  const xi = (n - FALSE_N) / (K0 * RECT_A), eta = (e - FALSE_E) / (K0 * RECT_A);
  let xi1 = xi, eta1 = eta;
  for (let j = 1; j <= 6; j++) { xi1 -= BETA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta); eta1 -= BETA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta); }
  const chi = Math.asin(Math.sin(xi1) / Math.cosh(eta1));
  let phi = chi;
  for (let j = 1; j <= 6; j++) phi += DELTA[j - 1] * Math.sin(2 * j * chi);
  return [(centralMeridian(zone) + Math.atan2(Math.sinh(eta1), Math.cos(xi1))) / DEG, phi / DEG];
}
/** Coordenada local do lote (metros relativos a centroidUTM) → [lon, lat]. */
export const localToLonLat = (x, y, centroidUTM) => utmSouthToLonLat(centroidUTM[0] + x, centroidUTM[1] + y);
/** [lon, lat] → coordenada local do lote. */
export function lonLatToLocal(lon, lat, centroidUTM) { const [e, n] = lonLatToUtmSouth(lon, lat); return [e - centroidUTM[0], n - centroidUTM[1]]; }
