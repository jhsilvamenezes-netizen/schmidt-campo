// 3.1 (U02) · tela Mapa: desenho de todos os mapas (lote, medidas, área de cada ponto, ponto tocado), camadas e gestos.
import { mapMarkup } from './map.mjs';
import * as P from './planner.mjs';
import * as V from './views.mjs';
import { esc, num } from './format.mjs';
import { attachGestures } from './gestures.mjs';

const LAYERS_KEY = 'schmidt.mapa.v1';

/** @param {any} app */
export function installMapa(app) {
  const { document, storage } = app;
  let view = { k: 1, x: 0, y: 0 };
  /** @type {string|null} */ let selectedPt = null;
  let layers = { medidas: true, areas: false };
  try { const l = JSON.parse(storage.getItem(LAYERS_KEY) || '{}'); layers = { medidas: l.medidas !== false, areas: l.areas === true }; } catch { /* padrão */ }

  // largura e altura reais de cada rótulo do mapa, medidas com a fonte deste aparelho (guardadas por texto)
  const measured = new Map(), mctx = document.createElement('canvas').getContext('2d');
  /** @param {string} text @param {string} font */
  const measure = (text, font) => {
    const key = font + '|' + text;
    let m = measured.get(key);
    if (!m) {
      const fs = parseFloat(font.split(' ')[1]);
      if (!mctx) return { w: text.length * fs * 0.66, a: fs * 0.95, d: fs * 0.3 };
      mctx.font = font; const t = mctx.measureText(text);
      m = { w: t.width, a: t.fontBoundingBoxAscent || fs * 0.95, d: t.fontBoundingBoxDescent || fs * 0.3 };
      measured.set(key, m);
    }
    return m;
  };

  function balloon() {
    const cur = app.cur, i = /** @type {any} */ (selectedPt && P.pointInfo(cur.field, cur.sc, selectedPt));
    if (!i) return '';
    const parts = [i.prevM != null && `anterior ${num(i.prevM)} m`, i.nextM != null && `próximo ${num(i.nextM)} m`].filter(Boolean).join(' · ');
    const ha = P.pointAreas(cur.field, cur.sc)?.cells.find(c => c.id === selectedPt);
    const across = (i.across || []).map(a => `${esc(a.trackId)} a ${num(a.m)} m`).join(' · ');
    // cada linha do balão com a marca da linha desenhada no mapa
    return `<div class="bal" role="status"><b>Ponto ${num(i.number)} · ${esc(i.trackId)}</b>${parts ? `<span><i class="sw p" aria-hidden="true"></i>${parts} (andando)</span>` : ''}${across ? `<span><i class="sw t sel" aria-hidden="true"></i>vizinhos: ${across}</span>` : ''}<span><i class="sw b" aria-hidden="true"></i>borda a ${num(i.edgeM)} m${ha ? ` · área ${num(ha.ha, 1)} ha` : ''}</span></div>`;
  }

  function drawMaps() {
    const cur = app.cur;
    if (!cur) return;
    for (const el of document.querySelectorAll('[data-map]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) continue;
      const W = Math.round(r.width), H = Math.round(r.height), full = el.dataset.map === 'full', guide = el.dataset.map === 'guide';
      const areas = full ? P.pointAreas(cur.field, cur.sc) : null, info = full && selectedPt ? P.pointInfo(cur.field, cur.sc, selectedPt) : null;
      // mapa principal: legenda no alto à esquerda e botões das camadas embaixo à direita ficam fora do desenho
      const opts = full ? { measure, pad: { t: 112, r: 30, b: 64, l: 40 }, measures: layers.medidas, areas: layers.areas ? areas : null, info,
        reserve: [[0, 0, info ? Math.min(W - 40, 330) : Math.min(W * 0.66, 252), 104], [W - 214, H - 60, W, H]] } : { pad: 22 };
      const g = guide ? app.guide() : null;
      el.innerHTML = mapMarkup(cur.field, cur.sc, W, H, { small: !full, view: guide && g.focus ? { k: 1, x: 0, y: 0 } : view, selected: guide ? g.target : selectedPt, pos: guide ? g.pos : null, to: guide ? g.to : null, focus: guide ? g.focus : null, others: cur.others || [], ...opts })
        + (full ? (info ? balloon() : V.legend(cur.field, P.figures(cur.sc), areas)) + V.mapTools(layers, view.k > 1.01)
          : guide && g.pos ? `<button class="fit" data-act="follow" aria-pressed="${!!g.follow}" aria-label="${g.follow ? 'Ver o lote inteiro' : 'Seguir minha posição'}">${g.follow ? '⤢' : '◎'}</button>`
            : (view.k > 1.01 ? '<button class="fit" data-act="fit" aria-label="Enquadrar o lote">⤢</button>' : '') + balloon());
      if (!el.dataset.g) {
        el.dataset.g = '1';
        attachGestures(el, { getView: () => view, setView: v => { view = v; }, onChange: () => requestAnimationFrame(drawMaps),
          onTap: target => { const t = target.closest?.('[data-pt]'); selectedPt = t ? t.dataset.pt : null; drawMaps(); } });
      }
    }
  }
  function toggleLayer(name) {
    layers = { ...layers, [name]: !layers[name] };
    try { storage.setItem(LAYERS_KEY, JSON.stringify(layers)); } catch { /* só não lembra */ }
    drawMaps();
  }

  app.drawMaps = drawMaps;
  app.onLotChange.push(() => { view = { k: 1, x: 0, y: 0 }; selectedPt = null; });
  Object.assign(app.ACTIONS, {
    fit: () => { view = { k: 1, x: 0, y: 0 }; drawMaps(); },
    'layer-medidas': () => toggleLayer('medidas'),
    'layer-areas': () => toggleLayer('areas'),
  });
}
