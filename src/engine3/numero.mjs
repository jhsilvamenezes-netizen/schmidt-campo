// Motor 2 · número no formato brasileiro (vírgula decimal, ponto de milhar), com formatadores em cache.
const formatters = new Map();
/** numBR(1234.5, 1) → "1.234,5". `min` casas fixas; até `max` casas quando houver (mínimo = min). */
/** 4.3 · inteiro sem casas: separador de milhar direto (mesmo texto do Intl pt-BR, conferido no teste; ~2× mais rápido). */
export function intBR(n) {
  if (Object.is(n, -0)) return '-0';
  const a = Math.abs(n), s = a < 1000 ? String(a) : String(a).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? `-${s}` : s;
}
export function numBR(value, min = 0, max = 3) {
  if (min === 0 && Number.isInteger(value) && Math.abs(value) < 1e15) return intBR(value);
  const key = min * 100 + max;
  let f = formatters.get(key);
  if (!f) { f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: Math.max(min, max) }); formatters.set(key, f); }
  return f.format(value);
}
