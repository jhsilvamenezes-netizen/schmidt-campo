// 3.1 (U08) · bússola do celular: rumo (0 = norte, sentido horário) a partir do sensor de orientação, como na 2.5.
// iPhone: webkitCompassHeading; Android: alpha do evento "absolute". Corrige a tela deitada e suaviza o tremor.
// Sem DOM: testado no Node.

/** Rumo em graus a partir do evento de orientação; null se o aparelho não deu um rumo absoluto. */
export function headingOf(e, screenAngle = 0) {
  /** @type {number|null} */ let h = null;
  if (typeof e?.webkitCompassHeading === 'number' && Number.isFinite(e.webkitCompassHeading)) h = e.webkitCompassHeading;
  else if (e?.absolute && typeof e.alpha === 'number' && Number.isFinite(e.alpha)) h = 360 - e.alpha;
  if (h === null) return null;
  return (((h + (Number(screenAngle) || 0)) % 360) + 360) % 360;
}

/** Suaviza pelo caminho mais curto do círculo (359° → 1° anda 2°, não 358°). k = peso da leitura nova. */
export function smoothHeading(prev, next, k = 0.3) {
  if (prev === null || prev === undefined || !Number.isFinite(prev)) return next;
  const d = ((((next - prev) % 360) + 540) % 360) - 180;
  return (((prev + d * k) % 360) + 360) % 360;
}

/** Ângulo da seta na tela: rumo ao alvo menos o rumo do celular (com bússola) ou o rumo ao alvo (norte para cima). */
export const arrowAngle = (azimuthDeg, heading) => (Number.isFinite(heading) ? (((azimuthDeg - heading) % 360) + 360) % 360 : azimuthDeg);
