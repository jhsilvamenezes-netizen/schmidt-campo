// Motor 2 · número no formato brasileiro (vírgula decimal, ponto de milhar), com formatadores em cache.
const formatters = new Map();
/** numBR(1234.5, 1) → "1.234,5". `min` casas fixas; até `max` casas quando houver (mínimo = min). */
export function numBR(value, min = 0, max = 3) {
  const key = min * 100 + max;
  let f = formatters.get(key);
  if (!f) { f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: Math.max(min, max) }); formatters.set(key, f); }
  return f.format(value);
}
