// 3.0 · mapa do lote em SVG: contorno, tiros, pontos numerados, norte e escala. Norte para cima, sem rotação.
import { num } from './format.mjs';

const NICE = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];

/** Marcação SVG do lote ajustada a w × h px (margem `pad`). `small` = pontos menores (mapa do Plano). */
/** @param {any} field @param {any} sc @param {number} w @param {number} h
 * @param {{pad?:number, small?:boolean, view?:{k:number,x:number,y:number}, selected?:string|null, pos?:{x:number,y:number,accuracyM:number}|null, others?:{field:any, sc:any}[]}} [opts] */
export function mapMarkup(field, sc, w, h, opts = {}) {
  const { pad = 28, small = false, view = { k: 1, x: 0, y: 0 }, selected = null, pos = null, others = [] } = opts;
  // Outros lotes (bloco): levados ao referencial do lote atual pela diferença dos centroides UTM.
  const shift = o => [o.field.centroidUTM[0] - field.centroidUTM[0], o.field.centroidUTM[1] - field.centroidUTM[1]];
  const extra = others.map(o => ({ ...o, d: shift(o) }));
  const pts = [...field.geom.flat(2), ...extra.flatMap(o => o.field.geom.flat(2).map(([x, y]) => [x + o.d[0], y + o.d[1]]))], xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min((w - 2 * pad) / (x1 - x0 || 1), (h - 2 * pad) / (y1 - y0 || 1));
  const ox = (w - k * (x1 - x0)) / 2, oy = (h - k * (y1 - y0)) / 2;
  const XY = (x, y) => [view.x + view.k * (ox + k * (x - x0)), view.y + view.k * (h - oy - k * (y - y0))];
  const P = ([x, y]) => XY(x, y).map(v => v.toFixed(1)).join(',');
  let s0 = '';
  for (const o of extra) {
    const Q = ([x, y]) => P([x + o.d[0], y + o.d[1]]);
    s0 += `<path class="lot other" d="${o.field.geom.map(pg => pg.map(r => `M${r.map(Q).join('L')}Z`).join('')).join('')}" fill-rule="evenodd"/>`;
    if (o.sc) for (const u of o.sc.units) s0 += `<path class="track other" d="M${u.line.map(Q).join('L')}"/>`;
    if (o.sc) for (const q of o.sc.samples) { const [x, y] = XY(q.x + o.d[0], q.y + o.d[1]); s0 += `<circle class="opt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${small ? 4 : 5}"/>`; }
    const c = XY(o.d[0], o.d[1]); s0 += `<text class="oname" x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}">${o.field.code}</text>`;
  }
  const ring = field.geom.map(pg => pg.map(r => `M${r.map(P).join('L')}Z`).join('')).join('');
  const r = small ? 8.5 : 11, fs = small ? 9 : 10;
  let s = `<svg class="map-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Lote ${field.code}: ${sc ? `${sc.samples.length} pontos em ${sc.selected.length} tiros` : 'sem plano'}">`;
  s += s0 + `<path class="lot" d="${ring}" fill-rule="evenodd"/>`;
  if (sc) {
    for (const u of sc.units) s += `<path class="track" d="M${u.line.map(P).join('L')}"/>`;
    const firstEnd = new Map();
    for (const u of sc.units) {
      const a = XY(...u.line[0]), b = XY(...u.line.at(-1)), left = a[0] <= b[0] ? a : b, cur = firstEnd.get(u.trackId);
      if (!cur || left[0] < cur[0]) firstEnd.set(u.trackId, left);
    }
    for (const [id, [x, y]] of firstEnd) s += `<text class="tid${small ? ' sm' : ''}" x="${(x - 7).toFixed(1)}" y="${(y + 4).toFixed(1)}">${id}</text>`;
    for (const p of sc.samples) {
      const [x, y] = XY(p.x, p.y);
      s += `<g class="pt${p.offTrack ? ' off' : ''}${p.id === selected ? ' sel' : ''}" data-pt="${p.id}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/><text x="${x.toFixed(1)}" y="${(y + fs * 0.36).toFixed(1)}" class="${small ? 'sm' : ''}">${p.number ?? ''}</text></g>`;
    }
  }
  if (pos) {
    const [px, py] = XY(pos.x, pos.y), acc = Math.max(6, pos.accuracyM * k * view.k);
    s += `<circle class="acc" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${acc.toFixed(1)}"/><circle class="me" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="7"/>`;
  }
  const kk = k * view.k, target = (w * 0.3) / kk, len = NICE.reduce((b, v) => (Math.abs(v - target) < Math.abs(b - target) ? v : b), NICE[0]), L = len * kk;
  s += `<g class="scale" transform="translate(14 ${h - 14})"><path d="M0 -6V0H${L.toFixed(1)}V-6"/><text x="0" y="-10">${num(len)} m</text></g>`;
  s += `<g class="north" transform="translate(${w - 18} 16)"><text x="0" y="8">N</text><path d="M0 14V30M-4 19L0 14L4 19"/></g>`;
  return s + '</svg>';
}
