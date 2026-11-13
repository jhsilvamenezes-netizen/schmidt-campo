import { publishSchmidtSatelliteFrame } from './satellite-map.mjs';
import { schmidtBlockBorderDistance } from '../application/block-planning.mjs';

// Menor segmento geométrico até uma borda, incluindo furos do polígono.
export function schmidtMapClosestBorder(point, geom) {
  let best = { metres: Infinity, xy: null };
  for (const poly of geom) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
        const t = len ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / len)) : 0;
        const xy = [a[0] + t * dx, a[1] + t * dy];
        const metres = Math.hypot(point[0] - xy[0], point[1] - xy[1]);
        if (metres < best.metres) best = { metres, xy };
      }
    }
  }
  return best;
}

// 1.32: aparência do mapa do bloco. Só tokens do aplicativo (o tema Sol vale aqui), letra de 12 px ou mais
// e alvos de toque de 44 px. Cores do desenho: as mesmas do mapa de cada lote (tiro, ponto, rótulo, lote).
const SCHMIDT_BLOCK_MAP_CSS = `
#block-map-panel{color:var(--sx-ink);background:var(--sx-surface);padding:var(--sx-sp-2);border-radius:var(--sx-r);min-width:0;flex-shrink:0}
#block-map-panel[hidden],#block-map-point[hidden],.block-map-hint[hidden]{display:none!important}
.block-map-tabs{display:flex;gap:6px;margin-bottom:var(--sx-sp-2)}
.block-map-tabs button{flex:1;min-width:0;min-height:var(--sx-touch);padding:4px 6px;font:inherit;font-size:var(--sx-fs-13);font-weight:700;line-height:1.2;border:1px solid var(--sx-line-strong);border-radius:var(--sx-r);color:var(--sx-brand);background:var(--sx-surface)}
.block-map-tabs button[aria-pressed=true]{background:var(--sx-brand);border-color:var(--sx-brand);color:#fff}
.block-map-canvas{position:relative;border:1px solid var(--sx-line);border-radius:var(--sx-r);overflow:hidden;background:var(--sx-soft)}
#block-overview{display:block;width:100%;height:390px;touch-action:none}
.block-map-tools{position:absolute;right:8px;top:8px;display:grid;gap:6px;justify-items:end}
.block-map-tools button{min-width:var(--sx-touch);height:var(--sx-touch);padding:0 10px;background:var(--sx-surface);color:var(--sx-brand);border:1px solid var(--sx-line-strong);border-radius:var(--sx-r);font:inherit;font-size:var(--sx-fs-20);font-weight:700;line-height:1}
.block-map-tools button:last-child{font-size:var(--sx-fs-12)}
.block-map-title{position:absolute;left:8px;top:8px;font-size:var(--sx-fs-13);font-weight:700;color:var(--sx-head);background:var(--sx-glass);padding:4px 8px;border-radius:6px;max-width:calc(100% - 76px)}
.block-map-hint{position:absolute;left:8px;right:8px;bottom:34px;margin:0;font-size:var(--sx-fs-12);line-height:1.3;color:var(--sx-ink-2);text-align:center;pointer-events:none}
.block-map-hint span{background:var(--sx-glass);padding:2px 8px;border-radius:6px}
.block-map-metrics{display:grid;grid-template-columns:1fr 1fr;gap:var(--sx-sp-2);margin-top:var(--sx-sp-2)}
.block-map-metrics div{background:var(--sx-soft);border:1px solid var(--sx-line);border-left:4px solid var(--sx-map-label);border-radius:var(--sx-r);padding:var(--sx-sp-2);font-size:var(--sx-fs-13);color:var(--sx-ink-2)}
.block-map-metrics div+div{border-left-color:var(--sx-map-point)}
.block-map-metrics strong{display:block;font-size:var(--sx-fs-20);line-height:1.2;color:var(--sx-map-label);font-variant-numeric:tabular-nums}
.block-map-metrics div+div strong{color:var(--sx-map-point)}
#block-map-point{padding:var(--sx-sp-2);font-size:var(--sx-fs-14);line-height:1.4}
#block-map-point p{margin:4px 0}
#block-map-point button{display:block;margin-top:var(--sx-sp-2);min-height:var(--sx-touch);background:var(--sx-brand);color:#fff;border:1px solid var(--sx-brand);border-radius:var(--sx-r);padding:8px 14px;font:inherit;font-weight:800}
#block-overview .bm-field{fill:var(--sx-map-field);stroke:var(--sx-map-field-line);stroke-width:1.6;fill-rule:evenodd}
#block-overview .bm-track{fill:none;stroke:var(--sx-map-track);stroke-width:1.6}
#block-overview .bm-point{fill:var(--sx-map-point);stroke:var(--sx-surface);stroke-width:1.5;cursor:pointer}
#block-overview .bm-point.is-selected{fill:var(--sx-map-point-strong);stroke:var(--sx-brand);stroke-width:3}
#block-overview .bm-point:focus{outline:none}
#block-overview .bm-point:focus-visible{stroke:var(--sx-focus);stroke-width:3}
#block-overview text{font-family:inherit;font-weight:800;pointer-events:none}
#block-overview .bm-num{fill:#fff;font-size:var(--sx-fs-12);text-anchor:middle}
#block-overview .bm-label{font-size:var(--sx-fs-12);text-anchor:middle;paint-order:stroke;stroke:var(--sx-soft);stroke-width:3.5px;stroke-linejoin:round}
#block-overview .bm-label[data-label=track]{fill:var(--sx-map-label)}
#block-overview .bm-label[data-label=measure]{fill:var(--sx-map-point-strong)}
#block-overview .bm-label[data-label=field]{fill:var(--sx-head);font-size:var(--sx-fs-13);stroke:none}
#block-overview .bm-pill{fill:var(--sx-surface);stroke:var(--sx-line-strong)}
#block-overview .bm-measure{fill:none;stroke:var(--sx-map-point-strong);stroke-width:2;stroke-dasharray:4 3;pointer-events:none}
#block-overview .bm-chrome{fill:none;stroke:var(--sx-head);stroke-width:1.6}
#block-overview .bm-chrome-text{fill:var(--sx-head);font-size:var(--sx-fs-12);font-weight:700}
.map-area.schmidt-joint-map{height:auto!important;max-height:none!important;overflow:visible!important}
.map-area.schmidt-joint-map #goals,.map-area.schmidt-joint-map #field-readout,.map-area.schmidt-joint-map>.legend{display:none}
@media(max-width:999px){.layout .map-area.schmidt-joint-map{height:calc(100dvh - var(--top-h,52px) - var(--block-sheet-height,64px))!important;padding-bottom:8px!important;overflow-y:auto!important;min-height:0}}
@media(max-width:379px){#block-overview{height:350px}}
@media(min-width:600px) and (max-width:999px){#block-overview{height:min(56vh,560px)}}
@media(min-width:1000px){#block-overview{height:min(66vh,680px)}}`;

// Ponto com número dentro: raio 10 e letra de 12 px. Só quando os pontos vizinhos ficam a esta distância
// na tela; abaixo disso todos viram ponto simples (nunca "uns com número, outros sem").
const SCHMIDT_BLOCK_NUMBERED_MIN_PX = 23;

// Visão conjunta de leitura; operar um membro usa o mapa original do aplicativo.
export function createSchmidtBlockMap({ document, selectMember }) {
  const win = document.defaultView;
  const legacy = document.getElementById('map').parentElement, area = legacy.parentElement;
  const make = (tag, text) => { const e = document.createElement(tag); if (text) e.textContent = text; return e; };
  const root = make('section'); root.id = 'block-map-panel'; root.hidden = true;
  const tabs = make('div'); tabs.className = 'block-map-tabs';
  const box = make('div'); box.className = 'block-map-canvas';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'block-overview'; svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', 'Mapa dos lotes do bloco');
  const tools = make('div'); tools.className = 'block-map-tools';
  const title = make('div'); title.className = 'block-map-title';
  const hint = make('p'); hint.className = 'block-map-hint'; hint.hidden = true;
  hint.append(make('span', 'Aproxime (+) para ver o número de cada ponto'));
  const metrics = make('div'); metrics.className = 'block-map-metrics';
  const info = make('div'); info.id = 'block-map-point'; info.hidden = true;
  const go = make('button', 'Abrir este lote'); go.type = 'button';
  box.append(svg, title, tools, hint); root.append(tabs, box, metrics, info); legacy.before(root);
  const style = make('style'); style.textContent = SCHMIDT_BLOCK_MAP_CSS; document.head.append(style);

  let record = null, fields = null, scenarios = null, live = false, focus = null, lastField = null;
  let zoom = 1, pan = [0, 0], dragged = false, selected = null, frame = 0;
  const fmt = (n, d = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
  const sv = (tag, attrs, text) => {
    const e = document.createElementNS(svg.namespaceURI, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const schedule = () => { if (!frame) frame = win.requestAnimationFrame(() => { frame = 0; paint(); }); };
  const view = key => {
    resetGestures(); focus = key; zoom = 1; pan = [0, 0]; selected = null; info.hidden = true;
    if (key && live) selectMember(key);
    render();
  };
  const samplesByUnit = sc => {
    const map = new Map();
    for (const p of sc.samples) { if (!map.has(p.unitId)) map.set(p.unitId, []); map.get(p.unitId).push(p); }
    for (const list of map.values()) list.sort((a, b) => a.s - b.s);
    return map;
  };

  function render() {
    if (!record) return;
    root.hidden = false; tabs.replaceChildren();
    for (const [key, label] of [[null, 'Bloco completo'], ...record.members.map(k => [k, fields[k].code])]) {
      const b = make('button', label); b.type = 'button'; b.dataset.blockView = key || 'all';
      b.setAttribute('aria-pressed', String(focus === key)); b.onclick = () => view(key); tabs.append(b);
    }
    // A prévia sempre é de leitura. Só o bloco ativo pode abrir o mapa operacional.
    const memberView = !!focus && live;
    box.hidden = memberView; metrics.hidden = memberView || !!record.geometryOnly;
    legacy.hidden = !memberView; legacy.style.display = memberView ? '' : 'none';
    area.classList.toggle('schmidt-joint-map', !memberView);
    title.textContent = (record.geometryOnly ? 'Lotes · ' : live ? 'Bloco · ' : 'Prévia · ') + record.members.map(k => fields[k].code).join(' + ');
    schedule();
  }

  // Mostra as medidas do ponto escolhido no painel abaixo do mapa.
  function describePoint(key, f, p, unitPoints) {
    info.replaceChildren(make('strong', `${f.code} · ${p.id} · ${p.trackId}`));
    const next = unitPoints[unitPoints.findIndex(q => q.id === p.id) + 1];
    const border = schmidtBlockBorderDistance(f.geom, [p]);
    if (Number.isFinite(border)) info.append(make('p', `Até a borda mais próxima: ${fmt(border, 1)} m`));
    info.append(make('p', next ? `Até ${next.id}: ${fmt(Math.hypot(next.x - p.x, next.y - p.y), 1)} m` : 'Último ponto deste trecho.'));
    if (live) { go.onclick = () => view(key); info.append(go); }
    info.hidden = false;
  }

  function paint() {
    if (!record) return;
    const focusedPoint = document.activeElement?.dataset?.blockPoint;
    svg.replaceChildren();
    const keys = focus && !live ? [focus] : record.members;
    const w = svg.clientWidth || 360, h = svg.clientHeight || 390;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    // Enquadramento: todos os vértices dos lotes mostrados, com margem para título, botões e régua.
    const vertices = keys.flatMap(k => fields[k].geom.flat(2).map(p => [p[0] + fields[k].centroidUTM[0], p[1] + fields[k].centroidUTM[1]]));
    const xs = vertices.map(p => p[0]), ys = vertices.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const scale = Math.min((w - 110) / (x1 - x0), (h - 115) / (y1 - y0)) * zoom;
    const xy = (p, f) => [
      w / 2 - 8 + (p[0] + f.centroidUTM[0] - (x0 + x1) / 2) * scale + pan[0],
      h / 2 + 10 - (p[1] + f.centroidUTM[1] - (y0 + y1) / 2) * scale + pan[1],
    ];

    // 1ª passada: o que será desenhado e a menor distância entre pontos vizinhos (na tela).
    const drawn = [], gaps = [];
    let total = 0, closestPx = Infinity;
    for (const key of keys) {
      const f = fields[key], sc = scenarios[record.members.indexOf(key)], byUnit = samplesByUnit(sc);
      total += sc.samples.length;
      for (const list of byUnit.values()) {
        for (let i = 1; i < list.length; i++) {
          const metres = Math.hypot(list[i].x - list[i - 1].x, list[i].y - list[i - 1].y);
          gaps.push(metres); closestPx = Math.min(closestPx, metres * scale);
        }
      }
      drawn.push({ key, f, sc, byUnit });
    }
    if (total && Number.isFinite(record.common?.spacingM)) closestPx = Math.min(closestPx, record.common.spacingM * scale);
    const numbered = total > 0 && closestPx >= SCHMIDT_BLOCK_NUMBERED_MIN_PX;
    const radius = numbered ? 10 : 5;
    hint.hidden = numbered || total === 0;

    // Áreas já ocupadas: título, botões e, depois, cada ponto. Rótulo não entra em cima de nada disso.
    const occupied = [{ x: 0, y: 0, w: w - 55, h: 45 }, { x: w - 62, y: 0, w: 62, h: 160 }];
    const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    if (!hint.hidden) occupied.push({ x: 0, y: h - 62, w, h: 32 }); // faixa do aviso "Aproxime (+)"
    const labels = [], measures = [], pointNodes = [];

    for (const { key, f, sc, byUnit } of drawn) {
      const d = f.geom.map(poly => poly.map(ring => 'M' + ring.map(p => xy(p, f).join(',')).join('L') + 'Z').join('')).join('');
      svg.append(sv('path', { d, class: 'bm-field', 'data-block-field': key }));
      for (const u of sc.units) {
        svg.append(sv('polyline', { points: u.line.map(p => xy(p, f).join(',')).join(' '), class: 'bm-track' }));
        labels.push([u.id, xy(u.line[0], f), 'track']);
      }
      for (const p of sc.samples) {
        const pos = xy([p.x, p.y], f), unitPoints = byUnit.get(p.unitId) || [];
        const isSelected = selected?.key === key && selected.p.id === p.id;
        const point = sv('circle', {
          cx: pos[0], cy: pos[1], r: isSelected && !numbered ? 7 : radius, class: 'bm-point' + (isSelected ? ' is-selected' : ''),
          tabindex: 0, role: 'button', 'aria-label': `${f.code}, ${p.id}, ${p.trackId}`, 'data-block-point': key + '::' + p.id,
        });
        const choose = () => { if (dragged) return; selected = { key, p }; schedule(); describePoint(key, f, p, unitPoints); };
        point.onclick = choose;
        // Toque concluído consulta o ponto mesmo se o navegador não sintetizar click.
        point.onpointerup = e => { if (e.pointerType === 'touch') choose(); };
        point.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } };
        occupied.push({ x: pos[0] - radius - 1, y: pos[1] - radius - 1, w: 2 * radius + 2, h: 2 * radius + 2 });
        pointNodes.push([point, numbered ? sv('text', { x: pos[0], y: pos[1] + 4.2, class: 'bm-num' }, String(p.number ?? p.id)) : null]);
        if (isSelected) {
          const border = schmidtMapClosestBorder([p.x, p.y], f.geom);
          if (border.xy) measures.push({ a: pos, b: xy(border.xy, f), text: fmt(border.metres, 1) + ' m · borda' });
          const next = unitPoints[unitPoints.findIndex(q => q.id === p.id) + 1];
          if (next) measures.push({ a: pos, b: xy([next.x, next.y], f), text: fmt(Math.hypot(next.x - p.x, next.y - p.y), 1) + ' m · pontos' });
        }
      }
      const outer = f.geom[0][0];
      const center = outer.reduce((a, p) => [a[0] + p[0] / outer.length, a[1] + p[1] / outer.length], [0, 0]);
      labels.unshift([f.code, xy(center, f), 'field']);
    }

    for (const m of measures) {
      svg.append(sv('path', { d: `M${m.a.join(',')}L${m.b.join(',')}`, class: 'bm-measure', 'data-block-measure': m.text }));
      if (Math.hypot(m.a[0] - m.b[0], m.a[1] - m.b[1]) > m.text.length * 7 + 24) {
        labels.splice(keys.length, 0, [m.text, [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], 'measure']);
      }
    }
    for (const [point, number] of pointNodes) { svg.append(point); if (number) svg.append(number); }

    // Rótulos por prioridade (lote, medida, tiro): cada um tenta posições ao redor e só entra se couber.
    // O nome do lote aparece SEMPRE: procura em anéis cada vez mais largos ao redor do centro e, se nada
    // estiver livre, entra no centro mesmo (dentro da área do desenho).
    const fieldOffsets = [[0, 0]];
    for (const r of [26, 52, 78, 104, 130, 156]) for (let a = 0; a < 8; a++) fieldOffsets.push([Math.round(r * 1.4 * Math.cos(a * Math.PI / 4)), Math.round(r * Math.sin(a * Math.PI / 4))]);
    const place = (text, p, kind) => {
      const width = text.length * 7.6 + 12, height = 20, far = radius + 12;
      const options = kind === 'field'
        ? fieldOffsets
        : kind === 'track'
          ? [[-far - width / 2 + 8, 0], [far + width / 2 - 8, 0], [0, -far - 2], [0, far + 4], [-far - width / 2 + 8, -14], [-far - width / 2 + 8, 14]]
          : [[0, -14], [0, 16], [width / 2 + 8, 0], [-width / 2 - 8, 0]];
      for (const [dx, dy] of options) {
        const x = p[0] + dx, y = p[1] + dy, b = { x: x - width / 2, y: y - 13, w: width, h: height };
        if (b.x < 4 || b.y < 45 || b.x + width > w - 4 || b.y + height > h - 25 || occupied.some(o => overlaps(o, b))) continue;
        occupied.push(b);
        if (kind === 'field') svg.append(sv('rect', { x: b.x, y: b.y, width, height, rx: 5, class: 'bm-pill' }));
        svg.append(sv('text', { x, y: y + 2, class: 'bm-label', 'data-label': kind }, text));
        return;
      }
      if (kind !== 'field') return;
      const x = Math.max(width / 2 + 4, Math.min(w - width / 2 - 4, p[0])), y = Math.max(58, Math.min(h - 38, p[1]));
      occupied.push({ x: x - width / 2, y: y - 13, w: width, h: height });
      svg.append(sv('rect', { x: x - width / 2, y: y - 13, width, height, rx: 5, class: 'bm-pill' }), sv('text', { x, y: y + 2, class: 'bm-label', 'data-label': kind }, text));
    };
    for (const l of labels) place(...l);

    // Norte e régua de escala.
    svg.append(sv('text', { x: 16, y: 65, class: 'bm-chrome-text' }, 'N'), sv('path', { d: 'M20 92V70M15 77L20 70L25 77', class: 'bm-chrome' }));
    const exp = 10 ** Math.floor(Math.log10(70 / scale));
    const len = [1, 2, 5, 10].map(n => n * exp).filter(n => n * scale <= 70).at(-1) || exp;
    svg.append(sv('path', { d: `M15 ${h - 16}h${len * scale}`, class: 'bm-chrome' }), sv('text', { x: 15, y: h - 23, class: 'bm-chrome-text' }, fmt(len) + ' m'));

    metrics.replaceChildren();
    if (!record.geometryOnly) {
      const between = gaps.length ? fmt(Math.min(...gaps)) + '–' + fmt(Math.max(...gaps)) + ' m' : 'Um ponto por trecho';
      for (const [name, value] of [['Entre tiros', fmt(record.common.spacingM, 2) + ' m'], ['Entre pontos · ' + (focus ? fields[focus].code : 'bloco'), between]]) {
        const cell = make('div', name); cell.append(make('strong', value)); metrics.append(cell);
      }
    }
    publishSchmidtSatelliteFrame({svg, layer:svg, scope:'block:'+record.id, width:w, height:h, scale, angle:0,
      origin:[w/2-8-(x0+x1)/2*scale+pan[0],h/2+10+(y0+y1)/2*scale+pan[1]]});
    svg.dataset.total = String(total);
    svg.dataset.numbered = String(numbered);
    if (focusedPoint) [...svg.querySelectorAll('[data-block-point]')].find(n => n.dataset.blockPoint === focusedPoint)?.focus({ preventScroll: true });
  }

  // Gestos alteram somente a câmera; coordenadas, tiros e registros não mudam.
  const pointers = new Map();
  let gesture = null;
  function resetGestures() {
    for (const id of pointers.keys()) if (svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
    pointers.clear(); gesture = null;
  }
  const local = e => {
    const rect = svg.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const rebase = () => {
    const points = [...pointers.values()];
    gesture = points.length ? { points: points.map(p => [...p]), pan: [...pan], zoom } : null;
  };
  // Conservar a posição do terreno sob os dedos/cursor durante a aproximação.
  const scaleAt = (next, from, to = from, baseZoom = zoom, basePan = pan) => {
    const value = Math.max(.6, Math.min(8, next)), ratio = value / baseZoom;
    const origin = [svg.clientWidth / 2 - 8, svg.clientHeight / 2 + 10];
    pan = origin.map((o, i) => to[i] - o - (from[i] - o - basePan[i]) * ratio);
    zoom = value;
  };
  const center = () => [svg.clientWidth / 2, svg.clientHeight / 2];
  for (const [label, name, action] of [
    ['+', 'Aproximar', () => scaleAt(zoom * 1.3, center())],
    ['−', 'Afastar', () => scaleAt(zoom / 1.3, center())],
    ['Enquadrar', 'Enquadrar todos os lotes', () => { zoom = 1; pan = [0, 0]; }],
  ]) {
    const button = make('button', label);
    button.type = 'button'; button.setAttribute('aria-label', name);
    button.onclick = () => {
      resetGestures(); action();
      if (label === 'Enquadrar') {
        view(null); document.querySelector('[data-v08-view="mapa"]')?.click(); area.scrollTop = 0;
      }
      schedule();
    };
    tools.append(button);
  }
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0 || pointers.size >= 2) return;
    if (!pointers.size) dragged = false;
    pointers.set(e.pointerId, local(e)); rebase();
    // Capturar no SVG estável: os pontos são recriados durante a pintura.
    if (pointers.size === 2) {
      dragged = true;
      for (const id of pointers.keys()) svg.setPointerCapture(id);
    }
  });
  svg.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, local(e));
    const points = [...pointers.values()];
    if (points.length === 2) {
      const initial = distance(...gesture.points);
      if (initial < 1) { rebase(); return; }
      scaleAt(gesture.zoom * distance(...points) / initial,
        midpoint(...gesture.points), midpoint(...points), gesture.zoom, gesture.pan);
    } else {
      const dx = points[0][0] - gesture.points[0][0], dy = points[0][1] - gesture.points[0][1];
      if (!dragged && Math.hypot(dx, dy) <= 6) return;
      pan = [gesture.pan[0] + dx, gesture.pan[1] + dy];
    }
    dragged = true; svg.setPointerCapture(e.pointerId); schedule();
  });
  const end = e => {
    if (!pointers.delete(e.pointerId)) return;
    // O dedo restante continua a partir da câmera atual, sem salto.
    rebase();
    if (!pointers.size) setTimeout(() => { if (!pointers.size) dragged = false; }, 0);
  };
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('lostpointercapture', e => {
    if (e.target === svg && !svg.hasPointerCapture(e.pointerId)) end(e);
  });
  win.addEventListener('pointerup', end);
  win.addEventListener('blur', () => { resetGestures(); dragged = false; });
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    if (pointers.size) return;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? svg.clientHeight : 1);
    scaleAt(zoom * Math.exp(-Math.max(-200, Math.min(200, delta)) * .002), local(e));
    schedule();
  }, { passive: false });
  new win.ResizeObserver(() => { resetGestures(); schedule(); }).observe(svg);
  const sheet = document.getElementById('sheet');
  const sizeSheet = () => area.style.setProperty('--block-sheet-height', Math.ceil(sheet.getBoundingClientRect().height) + 'px');
  new win.ResizeObserver(sizeSheet).observe(sheet); sizeSheet();

  return {
    preview(group, allFields) { this.update({ ...group, geometryOnly: true }, allFields, group.members.map(() => ({ samples: [], units: [] })), false, null); },
    showAll() { view(null); document.querySelector('[data-v08-view="mapa"]')?.click(); area.scrollTop = 0; },
    update(next, allFields, plans, isLive, currentField) {
      if (record?.id !== next.id || live !== isLive || !!record?.geometryOnly !== !!next.geometryOnly) {
        resetGestures(); focus = null; zoom = 1; pan = [0, 0]; selected = null; info.hidden = true;
      } else if (isLive && lastField && currentField !== lastField) focus = currentField;
      record = next; fields = allFields; scenarios = plans; live = isLive; lastField = currentField; render();
    },
    focus: key => view(key),
    clear() {
      resetGestures(); record = null; root.hidden = true; legacy.hidden = false; legacy.style.display = '';
      area.classList.remove('schmidt-joint-map'); info.hidden = true; focus = null;
    },
  };
}
