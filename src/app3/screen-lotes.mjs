// 3.1 · tela Lotes (no lugar de Enviar): panorama da fazenda. Todos os lotes desenhados na posição real (UTM), o lote
// em uso em destaque, números da fazenda e a lista de lotes com o plano de cada um. Tocar num lote escolhe o lote.
import { attachGestures } from './gestures.mjs';
import { esc, num } from './format.mjs';

/** @param {any} app */
export function installLotes(app) {
  const { document, fields, keys, ui, store } = app;
  const ID = { k: 1, x: 0, y: 0 };
  /** @type {any} */ let view = ID, farm = null, run = 0;
  const farms = () => [...new Set(keys.map(k => fields[k].farm))];
  const farmKeys = f => keys.filter(k => fields[k].farm === f);
  /** linha do plano de cada lote (calculada aos poucos e guardada em screen-mais) */
  const ready = new Map();

  // contorno de cada lote em UTM (centroide + desenho local), guardado
  const shapes = new Map();
  function shapeOf(k) {
    if (!shapes.has(k)) {
      const f = fields[k], [cx, cy] = f.centroidUTM, rings = [];
      for (const poly of f.geom) for (const ring of poly) rings.push(ring.map(([x, y]) => [x + cx, y + cy]));
      shapes.set(k, rings);
    }
    return shapes.get(k);
  }

  function drawFarm() {
    const el = document.querySelector('[data-farm]');
    if (!el || ui.view !== 'lotes') return;
    const r = el.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height);
    if (W < 10 || H < 10) return;
    const ks = farmKeys(farm);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k of ks) for (const ring of shapeOf(k)) for (const [x, y] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const pad = 18, s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
    const ox = (W - s * (x1 - x0)) / 2, oy = (H - s * (y1 - y0)) / 2;
    const P = ([x, y]) => `${(ox + (x - x0) * s).toFixed(1)} ${(oy + (y1 - y) * s).toFixed(1)}`;
    let polys = '', labels = '';
    for (const k of ks) {
      const rings = shapeOf(k), on = k === ui.key, [cx, cy] = fields[k].centroidUTM;
      polys += `<path class="flot${on ? ' on' : ''}${ready.get(k)?.alerts ? ' al' : ''}" data-pick="${esc(k)}" d="${rings.map(rg => `M${rg.map(P).join('L')}Z`).join('')}"/>`;
      const [lx, ly] = P([cx, cy]).split(' ');
      labels += `<text class="fcode${on ? ' on' : ''}" x="${lx}" y="${(+ly + 4).toFixed(1)}">${esc(fields[k].code)}</text>`;
    }
    // escala: barra redonda (500 m, 1 km, 2 km…) de no máximo ~30% da largura
    const target = (W * 0.3) / s, len = [250, 500, 1000, 2000, 5000].filter(v => v <= target).pop() || 250, L = len * s;
    // grade em metros (um quadrado = a barra de escala), dentro do mesmo zoom
    let grid = '';
    for (let gx = Math.floor(x0 / len) * len; gx <= x1 + len; gx += len) { const X = P([gx, 0]).split(' ')[0]; grid += `M${X} ${(oy - len * s).toFixed(1)}V${(H - oy + len * s).toFixed(1)}`; }
    for (let gy = Math.floor(y0 / len) * len; gy <= y1 + len; gy += len) { const Y = P([0, gy]).split(' ')[1]; grid += `M${(ox - len * s).toFixed(1)} ${Y}H${(W - ox + len * s).toFixed(1)}`; }
    el.innerHTML = `<svg class="map-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lotes da fazenda ${esc(farm)}"><g transform="translate(${view.x.toFixed(1)} ${view.y.toFixed(1)}) scale(${view.k.toFixed(3)})"><path class="mgrid" vector-effect="non-scaling-stroke" d="${grid}"/>${polys}${labels}</g>
<g class="scale" transform="translate(14 ${H - 14})"><path d="M0 -6V0H${L.toFixed(1)}V-6"/><text x="0" y="-10">${num(len)} m</text></g><g class="north" transform="translate(${W - 18} 16)"><text x="0" y="8">N</text><path d="M0 14V30M-4 19L0 14L4 19"/></g></svg>`
      + (view !== ID ? '<button class="fit" data-act="farm-fit" aria-label="Enquadrar a fazenda">⤢</button>' : '');
    if (!el.dataset.g) {
      el.dataset.g = '1';
      attachGestures(el, { getView: () => view, setView: v => { view = v; }, onChange: () => requestAnimationFrame(drawFarm),
        onTap: target => { const t = target.closest?.('[data-pick]'); if (t) pick(t.dataset.pick); } });
    }
  }

  function pick(k) {
    if (k === ui.key) return;
    for (const f of app.onLotChange) f();
    ui.key = k; store.update({ fieldKey: k }); app.render();
  }

  const rowHtml = k => {
    const f = fields[k], r = ready.get(k), on = k === ui.key;
    return `<button class="li lotrow${on ? ' on' : ''}" data-pick="${esc(k)}" aria-pressed="${on}"><span class="id">${esc(f.code)}</span><span class="x"><b>${num(f.areaOfficialHa, 1)} ha</b>`
      + `<small class="sub">${r ? `${num(r.pontos)} pontos · ${num(r.tiros)} tiros · 95% &lt; ${num(r.p95)} m` : 'calculando…'}</small></span>`
      + `<span class="r">${r ? (r.alerts ? `<span class="chip alerta">${r.alerts}</span>` : '<span class="chip ok">ok</span>') : ''}</span></button>`;
  };
  function totals(ks) {
    const ha = ks.reduce((a, k) => a + fields[k].areaOfficialHa, 0), done = ks.filter(k => ready.has(k));
    const pts = done.reduce((a, k) => a + ready.get(k).pontos, 0), alerts = done.reduce((a, k) => a + (ready.get(k).alerts ? 1 : 0), 0);
    return `<div class="m3"><div class="m"><small>Lotes</small><b>${num(ks.length)}</b></div><div class="m"><small>Área</small><b>${num(ha)} ha</b></div>`
      + `<div class="m"><small>Pontos</small><b>${done.length === ks.length ? num(pts) : '…'}</b></div></div>`
      + `<p class="mu sm">${done.length === ks.length ? (alerts ? `${alerts} ${alerts === 1 ? 'lote' : 'lotes'} com alerta` : 'Todos os lotes sem alerta') : `Calculando ${done.length} de ${ks.length} lotes…`}</p>`;
  }

  /** Tela: escolha da fazenda, mapa da fazenda, lote escolhido, números e lista. */
  app.lotesView = () => {
    if (!farm || !farms().includes(farm)) farm = fields[ui.key].farm;
    // o lote em uso sai do plano já calculado da tela (sempre o atual, sem recalcular)
    const cs = app.cur?.sc;
    if (cs) ready.set(ui.key, { key: ui.key, pontos: cs.samples.length, tiros: cs.selected.length, p95: cs.coverage.p95, alerts: cs.warnings.filter(w => w.level !== 'info').length });
    const fs = farms(), ks = farmKeys(farm), f = fields[ui.key], r = ready.get(ui.key);
    const seg = `<div class="seg${fs.length > 2 ? ' s3' : ''}" role="group" aria-label="Fazenda">${fs.map(x => `<button data-farm-pick="${esc(x)}" class="${x === farm ? 'on' : ''}" aria-pressed="${x === farm}">${esc(x)}</button>`).join('')}</div>`;
    const sel = f.farm === farm ? `<section class="card hero"><div class="row-sb"><div><p class="eyebrow">Lote em uso</p><p class="big">${esc(f.code)} <span>· ${num(f.areaOfficialHa, 1)} ha</span></p></div>`
      + `${r ? (r.alerts ? `<span class="chip alerta">${r.alerts} ${r.alerts === 1 ? 'alerta' : 'alertas'}</span>` : '<span class="chip ok">Sem alertas</span>') : ''}</div>`
      + `<p class="mu">${r ? `${num(r.pontos)} pontos · ${num(r.tiros)} tiros · 95% do lote &lt; ${num(r.p95)} m` : 'Calculando o plano…'}</p>`
      + '<div class="two"><button class="btn p" data-go="mapa">Abrir no mapa</button><button class="btn" data-go="plano">Plano</button></div></section>' : '';
    return `<div class="map sm farm" data-farm></div><div class="scroll">${seg}${sel}<section class="card"><h2 class="h">Fazenda ${esc(farm)}</h2><div data-tot>${totals(ks)}</div></section>
<section class="card list"><h2 class="h">Lotes</h2><div data-rows>${ks.map(rowHtml).join('')}</div></section></div>`;
  };

  /** Calcula o plano dos lotes que faltam, em partes de ~25 ms; atualiza só a lista e os números. */
  function fill() {
    const id = ++run, st = app.saved(), ks = farmKeys(farm).sort((a, b) => (a === ui.key ? -1 : b === ui.key ? 1 : 0));
    const step = () => {
      if (id !== run || ui.view !== 'lotes') return;
      const t0 = performance.now();
      let changed = false;
      for (const k of ks) { if (ready.has(k)) continue; ready.set(k, app.lotRow(k, st)); changed = true; if (performance.now() - t0 > 25) break; }
      if (changed) {
        const rows = document.querySelector('[data-rows]'), tot = document.querySelector('[data-tot]');
        if (rows) rows.innerHTML = farmKeys(farm).map(rowHtml).join('');
        if (tot) tot.innerHTML = totals(farmKeys(farm));
      }
      if (ks.some(k => !ready.has(k))) setTimeout(step, 0);
      else if (changed) drawFarm(); // contorno âmbar nos lotes com alerta, quando todos estão calculados
    };
    setTimeout(step, 0);
  }

  const orig = app.drawMaps;
  app.drawMaps = () => { orig(); drawFarm(); if (ui.view === 'lotes') fill(); };
  app.onLotChange.push(() => { view = ID; });
  app.clicks.push(t => {
    if (t.dataset.farmPick) { farm = t.dataset.farmPick; view = ID; app.render(); return true; }
    if (t.dataset.pick) { pick(t.dataset.pick); return true; }
    return false;
  });
  Object.assign(app.ACTIONS, { 'farm-fit': () => { view = ID; drawFarm(); } });
}
