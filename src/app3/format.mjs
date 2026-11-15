// 3.0 · formatação de números e texto seguro para HTML (pt-BR).
const cache = new Map();
/** Número pt-BR com `d` casas (padrão 0). */
export function num(v, d = 0) {
  if (v == null || !Number.isFinite(v)) return '—';
  let f = cache.get(d);
  if (!f) cache.set(d, (f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })));
  return f.format(v);
}
/** Faixa "438–515" (ou um número só, se iguais depois de arredondar). */
export function range(a, b, d = 0) { const x = num(a, d), y = num(b, d); return x === y ? x : `${x}–${y}`; }
export const km = m => num(m / 1000, 1);
export const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);
