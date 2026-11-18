// 3.0 · mapa do lote em SVG: contorno, tiros, pontos numerados, norte e escala. Norte para cima, sem rotação.
// 3.1 (U03) · medidas como na 2.5, sem sobreposição: distância entre tiros (cota), intervalo entre pontos em cada
// trecho, área de cada ponto (célula exata) e, ao tocar num ponto, as distâncias dele aos vizinhos e à borda.
// Todo texto passa por um único verificador de espaço: o que não cabe sem cobrir ponto, número ou outro texto
// não é desenhado (nunca fica um em cima do outro).
import { num } from './format.mjs';

const NICE = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];
/** Fonte de cada classe de texto (igual ao styles.css). Medida no próprio aparelho quando há tela (qualquer fonte de
 * celular); sem tela (Node), estimativa conservadora pela largura média do caractere. */
export const FONTS = { tid: '600 12px system-ui', med: '700 12px system-ui', ha: '600 12px system-ui', sel: '700 13px system-ui' };
const CH = { tid: 7.6, med: 7.2, ha: 7.2, sel: 8 };
/** @typedef {(text:string, font:string) => {w:number, a:number, d:number}} Measure */
/** @type {Measure} */
const estimate = (text, font) => { const fs = parseFloat(font.split(' ')[1]), k = Object.keys(FONTS).find(c => FONTS[c] === font) || 'sel'; return { w: text.length * CH[k], a: fs * 0.95, d: fs * 0.3 }; };
const f1 = v => v.toFixed(1);

/** Espaço ocupado: círculos [x, y, r] e caixas [x0, y0, x1, y1]. */
/** @param {number} w @param {number} h @param {Measure} measure */
function space(w, h, measure) {
  const circles = [], boxes = [];
  const freeBox = ([a, b, c, d], m = 2) => a >= 4 && b >= 4 && c <= w - 4 && d <= h - 4
    && circles.every(([x, y, r]) => Math.hypot(x - Math.max(a, Math.min(x, c)), y - Math.max(b, Math.min(y, d))) > r + m)
    && boxes.every(([e, f, g, k]) => a >= g + m || c <= e - m || b >= k + m || d <= f - m);
  return { circles, boxes, freeBox,
    /** Primeira posição livre entre as candidatas [x, y, âncora]; ocupa e devolve a caixa, ou null. */
    place(cands, text, cls) {
      const m = measure(text, FONTS[cls]), wd = m.w + 2;
      for (const [x, y, anc] of cands) {
        const x0 = anc === 'start' ? x : anc === 'end' ? x - wd : x - wd / 2, bx = /** @type {[number, number, number, number]} */ ([x0, y - m.a - 1, x0 + wd, y + m.d + 1]);
        if (freeBox(bx)) { boxes.push(bx); return { x, y, anc, bx }; }
      }
      return null;
    },
    /** Linha desenhada: ocupa pontos ao longo dela (para nenhum texto cruzar a cota). */
    line(a, b, r = 2) { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6)); for (let i = 0; i <= n; i++) circles.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, r]); },
  };
}

/** Comprimentos acumulados e ponto a uma distância ao longo da linha. */
function along(line) {
  /** @type {number[]} */ const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const at = d => {
    const t = Math.max(0, Math.min(cum[cum.length - 1], d));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < t) i++;
    const seg = cum[i] - cum[i - 1] || 1, u = (t - cum[i - 1]) / seg;
    return [line[i - 1][0] + u * (line[i][0] - line[i - 1][0]), line[i - 1][1] + u * (line[i][1] - line[i - 1][1])];
  };
  return { len: cum[cum.length - 1], at };
}
/** Ponto mais perto de p sobre a linha (metros). */
function nearestOn(line, [px, py]) {
  /** @type {{q:number[], d:number}|null} */ let best = null;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1], [bx, by] = line[i], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / L2)) : 0, q = [ax + t * ex, ay + t * ey], d = Math.hypot(px - q[0], py - q[1]);
    if (!best || d < best.d) best = { q, d };
  }
  return best;
}
const anchorFor = dx => (dx > 3 ? 'start' : dx < -3 ? 'end' : 'middle');
const text = (cls, p, s) => `<text class="${cls}" text-anchor="${p.anc}" x="${f1(p.x)}" y="${f1(p.y)}">${s}</text>`;
/** Cota: linha com traços nas pontas. */
function cota(cls, a, b) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L * 5, ny = (b[0] - a[0]) / L * 5;
  return `<path class="${cls}" d="M${f1(a[0])},${f1(a[1])}L${f1(b[0])},${f1(b[1])}M${f1(a[0] - nx)},${f1(a[1] - ny)}L${f1(a[0] + nx)},${f1(a[1] + ny)}M${f1(b[0] - nx)},${f1(b[1] - ny)}L${f1(b[0] + nx)},${f1(b[1] + ny)}"/>`;
}

/** Marcação SVG do lote ajustada a w × h px. `small` = mapa do Plano/guia (sem medidas).
 * @param {any} field @param {any} sc @param {number} w @param {number} h
 * @param {{pad?:number|{t:number,r:number,b:number,l:number}, small?:boolean, view?:{k:number,x:number,y:number}, selected?:string|null,
 *   pos?:{x:number,y:number,accuracyM:number}|null, others?:{field:any, sc:any}[], measures?:boolean, areas?:any, info?:any, reserve?:number[][], measure?:Measure, focus?:number[][]|null, to?:number[]|null, heading?:number|null, hiTrack?:string|null}} [opts] */
export function mapMarkup(field, sc, w, h, opts = {}) {
  const { pad: pad0 = 28, small = false, view = { k: 1, x: 0, y: 0 }, selected = null, pos = null, others = [], measures = false, areas = null, info = null, reserve = [], measure = estimate, focus = null, to = null, heading = null, hiTrack = null } = opts;
  const pad = typeof pad0 === 'number' ? { t: pad0, r: pad0, b: pad0, l: pad0 } : pad0;
  // Outros lotes (bloco): levados ao referencial do lote atual pela diferença dos centroides UTM.
  const shift = o => [o.field.centroidUTM[0] - field.centroidUTM[0], o.field.centroidUTM[1] - field.centroidUTM[1]];
  const extra = others.map(o => ({ ...o, d: shift(o) }));
  // `focus`: enquadra só estes pontos (guia: posição e alvo), com folga mínima de 250 m; senão o lote (e o bloco)
  const pts = focus?.length ? focus.flatMap(([x, y]) => [[x - 125, y - 125], [x + 125, y + 125]])
    : [...field.geom.flat(2), ...extra.flatMap(o => o.field.geom.flat(2).map(([x, y]) => [x + o.d[0], y + o.d[1]]))], xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const iw = Math.max(40, w - pad.l - pad.r), ih = Math.max(40, h - pad.t - pad.b);
  const k = Math.min(iw / (x1 - x0 || 1), ih / (y1 - y0 || 1));
  const ox = pad.l + (iw - k * (x1 - x0)) / 2, oy = pad.b + (ih - k * (y1 - y0)) / 2;
  const XY = (x, y) => [view.x + view.k * (ox + k * (x - x0)), view.y + view.k * (h - oy - k * (y - y0))];
  const P = ([x, y]) => XY(x, y).map(f1).join(',');
  const kk = k * view.k, sp = space(w, h, measure);
  let r = small ? 9.5 : 11.5;
  const numY = 4.2;
  for (const b of reserve) sp.boxes.push(b);
  // escala e norte ocupam o seu canto
  const target = (w * 0.3) / kk, len = NICE.reduce((b, v) => (Math.abs(v - target) < Math.abs(b - target) ? v : b), NICE[0]), L = len * kk;
  sp.boxes.push([6, h - 40, 22 + Math.max(L, 48), h - 4], [w - 34, 4, w - 4, 52]);

  let s0 = '';
  for (const o of extra) {
    const Q = ([x, y]) => P([x + o.d[0], y + o.d[1]]);
    s0 += `<path class="lot other" d="${o.field.geom.map(pg => pg.map(rg => `M${rg.map(Q).join('L')}Z`).join('')).join('')}" fill-rule="evenodd"/>`;
    if (o.sc) for (const u of o.sc.units) s0 += `<path class="track other" d="M${u.line.map(Q).join('L')}"/>`;
    if (o.sc) for (const q of o.sc.samples) { const [x, y] = XY(q.x + o.d[0], q.y + o.d[1]); s0 += `<circle class="opt" cx="${f1(x)}" cy="${f1(y)}" r="${small ? 4 : 5}"/>`; }
    const c = XY(o.d[0], o.d[1]); s0 += `<text class="oname" x="${f1(c[0])}" y="${f1(c[1])}">${o.field.code}</text>`;
  }
  const ring = field.geom.map(pg => pg.map(rg => `M${rg.map(P).join('L')}Z`).join('')).join('');
  let s = `<svg class="map-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Lote ${field.code}: ${sc ? `${sc.samples.length} pontos em ${sc.selected.length} tiros` : 'sem plano'}">`;
  // 3.2 (G1) · grade em METROS: cada quadrado tem o tamanho da barra de escala (ex.: 500 m), presa ao terreno (anda com o zoom)
  {
    const wx = sx => x0 + ((sx - view.x) / view.k - ox) / k, wy = sy => y0 + (h - oy - (sy - view.y) / view.k) / k;
    const ax = Math.floor(wx(0) / len) * len, bx = wx(w), ay = Math.floor(wy(h) / len) * len, by = wy(0);
    let g = '';
    if ((bx - ax) / len < 60 && (by - ay) / len < 60) {
      for (let gx = ax; gx <= bx; gx += len) { const X = XY(gx, 0)[0]; g += `M${f1(X)} 0V${h}`; }
      for (let gy = ay; gy <= by; gy += len) { const Y = XY(0, gy)[1]; g += `M0 ${f1(Y)}H${w}`; }
    }
    if (g) s += `<path class="mgrid" d="${g}"/>`;
  }
  s += s0 + `<path class="lot" d="${ring}" fill-rule="evenodd"/>`;
  let top = '';
  if (sc) {
    const scr = new Map(sc.samples.map(p => [p.id, XY(p.x, p.y)]));
    // lote com pontos muito juntos nesta escala: círculo menor (nunca abaixo de 9 px; número continua com 12 px)
    const sp0 = [...scr.values()];
    let dmin = Infinity;
    for (let i = 0; i < sp0.length; i++) for (let j = i + 1; j < sp0.length; j++) dmin = Math.min(dmin, Math.hypot(sp0[i][0] - sp0[j][0], sp0[i][1] - sp0[j][1]));
    r = Math.max(8.5, Math.min(r, dmin / 2 - 0.5));
    for (const [, [x, y]] of scr) sp.circles.push([x, y, r + 1]);
    // área de cada ponto: contornos das células por baixo dos tiros
    if (areas && !small) s += `<g class="cells">${areas.cells.map(c => `<path d="${c.rings.map(rg => `M${rg.map(P).join('L')}Z`).join('')}"/>`).join('')}</g>`;
    for (const u of sc.units) s += `<path class="track${hiTrack ? (u.trackId === hiTrack ? ' hi' : ' lo') : ''}" d="M${u.line.map(P).join('L')}"/>`;
    // ponto tocado primeiro: as distâncias dele têm prioridade sobre os demais textos
    if (info && !small) top = tocado(info, XY, sp, r);
    // nome do tiro na ponta esquerda; se não couber, na direita (nunca sob um ponto)
    const ends = new Map();
    for (const u of sc.units) {
      const a = XY(...u.line[0]), b = XY(...u.line.at(-1)), [lf, rt] = a[0] <= b[0] ? [a, b] : [b, a], cur = ends.get(u.trackId);
      ends.set(u.trackId, { lf: !cur || lf[0] < cur.lf[0] ? lf : cur.lf, rt: !cur || rt[0] > cur.rt[0] ? rt : cur.rt });
    }
    let labels = '';
    for (const [id, { lf, rt }] of ends) {
      const p = sp.place([[lf[0] - 7, lf[1] + 4, 'end'], [rt[0] + 7, rt[1] + 4, 'start'], [lf[0] - 7, lf[1] - 8, 'end'], [lf[0] - 7, lf[1] + 16, 'end'], [rt[0] + 7, rt[1] - 8, 'start']], id, 'tid');
      if (p) labels += text(`tid${small ? ' sm' : ''}`, p, id);
    }
    if (measures && !small && !areas) labels += medidas(sc, XY, sp, [w / 2, h / 2], r);
    if (areas && !small) {
      for (const c of areas.cells) {
        const at = scr.get(c.id); if (!at) continue;
        const t = `${num(c.ha, 1)} ha`, d = r + 2, p = sp.place([[at[0], at[1] + r + 14, 'middle'], [at[0], at[1] - r - 5, 'middle'], [at[0] + d, at[1] - d, 'start'], [at[0] - d, at[1] - d, 'end'],
          [at[0] + d, at[1] + d + 9, 'start'], [at[0] - d, at[1] + d + 9, 'end'], [at[0] + r + 4, at[1] + 4, 'start'], [at[0] - r - 4, at[1] + 4, 'end']], t, 'ha');
        if (p) labels += text('ha', p, t);
      }
    }
    s += labels;
    for (const p of sc.samples) {
      const [x, y] = scr.get(p.id);
      s += `<g class="pt${p.offTrack ? ' off' : ''}${p.id === selected ? ' sel' : ''}" data-pt="${p.id}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${r}"/><text x="${f1(x)}" y="${f1(y + numY)}">${p.number ?? ''}</text></g>`;
    }
  }
  s += top;
  if (pos) {
    const [px, py] = XY(pos.x, pos.y), acc = Math.max(6, pos.accuracyM * kk);
    if (to) { const [tx, ty] = XY(to[0], to[1]); s += `<path class="togo" d="M${f1(px)},${f1(py)}L${f1(tx)},${f1(ty)}"/>`; }
    s += `<circle class="acc" cx="${f1(px)}" cy="${f1(py)}" r="${f1(acc)}"/>`;
    // para onde o celular aponta (bússola): cone curto à frente do ponto azul
    if (Number.isFinite(heading)) s += `<path class="cone" transform="translate(${f1(px)} ${f1(py)}) rotate(${Number(heading).toFixed(0)})" d="M0 0L-11 -26A28 28 0 0 1 11 -26Z"/>`;
    s += `<circle class="me" cx="${f1(px)}" cy="${f1(py)}" r="7"/>`;
  }
  s += `<g class="scale" transform="translate(14 ${h - 14})"><path d="M0 -6V0H${f1(L)}V-6"/><text x="0" y="-10">${num(len)} m</text></g>`;
  s += `<g class="north" transform="translate(${w - 18} 16)"><text x="0" y="8">N</text><path d="M0 14V30M-4 19L0 14L4 19"/></g>`;
  return s + '</svg>';
}

/** Cotas entre tiros vizinhos (uma por par) e intervalo de cada par de pontos no trecho, como na 2.5. */
function medidas(sc, XY, sp, center, r0) {
  let out = '';
  const tracks = sc.selected.filter(t => Number.isFinite(t.offsetM)).slice().sort((a, b) => a.offsetM - b.offsetM);
  for (let i = 1; i < tracks.length; i++) {
    const A = tracks[i - 1], B = tracks[i], dist = Math.abs(B.offsetM - A.offsetM), label = `${num(dist)} m`;
    const ua = sc.units.filter(u => u.trackId === A.id), ub = sc.units.filter(u => u.trackId === B.id);
    let done = false;
    for (const u of ua) {
      if (done) break;
      const g = along(u.line);
      for (const fr of [0.9, 0.1, 0.94, 0.06, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4, 0.5, 1, 0]) {
        const a = g.at(g.len * fr);
        /** @type {{q:number[], d:number}|null} */ let q = null;
        for (const v of ub) { const n = nearestOn(v.line, /** @type {[number, number]} */ (a)); if (n && (!q || n.d < q.d)) q = n; }
        if (!q || Math.abs(q.d - dist) > Math.max(2, dist * 0.03)) continue;
        const pa = XY(...a), pb = XY(...q.q), L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
        if (L < 24) continue;
        const inner = [pa[0] + (pb[0] - pa[0]) * 0.15, pa[1] + (pb[1] - pa[1]) * 0.15], inner2 = [pa[0] + (pb[0] - pa[0]) * 0.85, pa[1] + (pb[1] - pa[1]) * 0.85];
        if (!lineFree(sp, inner, inner2)) continue;
        const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2, ex = (pb[0] - pa[0]) / L, ey = (pb[1] - pa[1]) / L, cands = [];
        for (const off of [8, 20, 32, 44]) for (const sg of [1, -1]) { const dx = -ey * off * sg; cands.push([mx + dx, my + ex * off * sg + 4, anchorFor(dx)]); }
        const before = sp.boxes.length, p = sp.place(cands, label, 'med');
        if (!p) continue;
        sp.boxes.splice(before, 1); sp.line(inner, inner2); sp.boxes.push(p.bx);
        out += cota('cota-t', pa, pb) + text('med-t', p, label);
        done = true; break;
      }
    }
  }
  // intervalo de cada par de pontos; se menos da metade couber nesta escala, uma cota só (a do trecho mais central)
  const marks = [], pairs = [];
  for (const u of sc.units) {
    const list = sc.samples.filter(p => p.unitId === u.id && !p.offTrack && Number.isFinite(p.s)).sort((a, b) => a.s - b.s);
    const g = along(u.line);
    for (let i = 1; i < list.length; i++) pairs.push({ g, a: list[i - 1], b: list[i] });
  }
  const snap = { c: sp.circles.length, b: sp.boxes.length };
  for (const { g, a, b } of pairs) {
    const m = (a.s + b.s) / 2, o = XY(...g.at(m)), o2 = XY(...g.at(m + 1)), L = Math.hypot(o2[0] - o[0], o2[1] - o[1]) || 1;
    let nx = -(o2[1] - o[1]) / L, ny = (o2[0] - o[0]) / L;
    if (ny > 0) { nx = -nx; ny = -ny; } // primeiro acima do tiro
    const t = `${num(b.s - a.s)} m`, c = [];
    for (const off of [12, 20]) c.push([o[0] + nx * off, o[1] + ny * off + 4, 'middle'], [o[0] - nx * off, o[1] - ny * off + 4, 'middle']);
    const p = sp.place(c, t, 'med');
    if (p) marks.push(text('med-p', p, t));
  }
  if (pairs.length && marks.length >= pairs.length / 2) return out + marks.join('');
  sp.circles.length = snap.c; sp.boxes.length = snap.b;
  const cd = q => { const a = XY(q.a.x, q.a.y), b = XY(q.b.x, q.b.y); return Math.hypot((a[0] + b[0]) / 2 - center[0], (a[1] + b[1]) / 2 - center[1]); };
  const byCenter = pairs.slice().sort((p1, p2) => cd(p1) - cd(p2));
  for (const { a, b } of byCenter) {
    const pa = XY(a.x, a.y), pb = XY(b.x, b.y), L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    if (L < 40) continue;
    const ux = (pb[0] - pa[0]) / L, uy = (pb[1] - pa[1]) / L;
    for (const sg of [-1, 1]) {
      const nx = -uy * sg, ny = ux * sg;
      const off = 20, A = [pa[0] + nx * off, pa[1] + ny * off], B = [pb[0] + nx * off, pb[1] + ny * off];
      if (!lineFree(sp, A, B)) continue;
      const t = `${num(b.s - a.s)} m entre pontos`, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, c = [];
      for (const d of [14, 26]) c.push([mx + nx * d, my + ny * d + 4, anchorFor(nx * d)]);
      for (const sh of [30, -30, 60, -60]) c.push([mx + nx * 14 + ux * sh, my + ny * 14 + uy * sh + 4, anchorFor(nx * 14)]);
      const p = sp.place(c, t, 'med');
      if (!p) continue;
      sp.line(A, B);
      return out + `<path class="cota-g" d="M${f1(pa[0] + nx * (r0 + 2))},${f1(pa[1] + ny * (r0 + 2))}L${f1(A[0] + nx * 4)},${f1(A[1] + ny * 4)}M${f1(pb[0] + nx * (r0 + 2))},${f1(pb[1] + ny * (r0 + 2))}L${f1(B[0] + nx * 4)},${f1(B[1] + ny * 4)}"/>`
        + cota('cota-p', A, B) + text('med-p', p, t);
    }
  }
  return out;
}
function lineFree(sp, a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
  for (let i = 0; i <= n; i++) {
    const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n;
    if (sp.circles.some(([cx, cy, rr]) => rr >= 8 && Math.hypot(cx - x, cy - y) < rr)) return false;
    if (sp.boxes.some(([e, f, g, k]) => x >= e && x <= g && y >= f && y <= k)) return false;
  }
  return true;
}

/** Ponto tocado: linha até o anterior e o próximo no tiro, até o mais perto de cada tiro vizinho e até a borda. */
function tocado(info, XY, sp, r) {
  const me = XY(info.x, info.y), parts = [];
  const add = (to, label, cls, isPoint = true) => {
    const b0 = XY(...to), L = Math.hypot(b0[0] - me[0], b0[1] - me[1]);
    if (L < 2 * r + 4) return;
    const ux = (b0[0] - me[0]) / L, uy = (b0[1] - me[1]) / L, a = [me[0] + ux * (r + 2), me[1] + uy * (r + 2)];
    const b = isPoint ? [b0[0] - ux * (r + 2), b0[1] - uy * (r + 2)] : b0;
    const cands = [];
    for (const t of [0.5, 0.65, 0.35, 0.8]) {
      const mx = a[0] + (b[0] - a[0]) * t, my = a[1] + (b[1] - a[1]) * t;
      for (const off of [10, 22, 34]) for (const sg of [1, -1]) { const dx = -uy * off * sg; cands.push([mx + dx, my + ux * off * sg + 4, anchorFor(dx)]); }
    }
    sp.line(a, b, 2);
    const p = sp.place(cands, label, 'sel');
    parts.push(`<path class="${cls}" d="M${f1(a[0])},${f1(a[1])}L${f1(b[0])},${f1(b[1])}"/>` + (p ? text('sel-l', p, label) : ''));
  };
  if (info.prev) add([info.prev.x, info.prev.y], `${num(info.prevM)} m`, 'sel-p');
  if (info.next) add([info.next.x, info.next.y], `${num(info.nextM)} m`, 'sel-p');
  for (const a of info.across || []) add([a.x, a.y], `${num(a.m)} m`, 'sel-t');
  if (info.edgeAt) add(info.edgeAt, `borda ${num(info.edgeM)} m`, 'sel-b', false);
  return parts.length ? `<g class="sel-m" aria-hidden="true">${parts.join('')}</g>` : '';
}
