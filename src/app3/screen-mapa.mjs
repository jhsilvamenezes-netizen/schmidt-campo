// 3.1 (U02) · tela Mapa: desenho de todos os mapas (lote, medidas, área de cada ponto, ponto tocado), camadas e gestos.
import { mapMarkup } from './map.mjs';
import * as P from './planner.mjs';
import * as V from './views.mjs';
import { esc, num } from './format.mjs';
import { attachGestures } from './gestures.mjs';
import { fixToPos } from './monitor.mjs';

const LAYERS_KEY = 'schmidt.mapa.v1';

/** @param {any} app */
export function installMapa(app) {
  const { document, storage } = app;
  // cada mapa com o seu zoom: mexer no Mapa não tira o lote do quadro no Plano ou na guia
  const ID = { k: 1, x: 0, y: 0 }, views = { full: ID, small: ID, guide: ID };
  const moved = v => v.k > 1.01 || v.k < 0.99 || Math.abs(v.x) > 2 || Math.abs(v.y) > 2;
  /** @type {string|null} */ let selectedPt = null;
  /** régua: segundo ponto tocado com um ponto já escolhido */
  /** @type {string|null} */ let rulerPt = null;
  /** "Onde estou": última posição pedida no Mapa (só enquanto o lote não muda) */
  /** @type {any} */ let here = null;
  let layers = { medidas: true, areas: false, borda: false, grade: true }, panel = false;
  try { const l = JSON.parse(storage.getItem(LAYERS_KEY) || '{}'); layers = { medidas: l.medidas !== false, areas: l.areas === true, borda: l.borda === true, grade: l.grade !== false }; } catch { /* padrão */ }

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

  /** Cartão do "onde estou": onde a pessoa está em relação ao lote, ao tiro e ao ponto mais perto. */
  function hereCard(w) {
    const where = w.inside ? `Dentro de ${esc(app.cur.field.code)} · borda a ${num(w.edgeM)} m` : `Fora de ${esc(app.cur.field.code)} · a ${num(w.edgeM)} m da borda`;
    return `<div class="bal" role="status"><b>Você está aqui</b><span>${where}</span><span><i class="sw t sel" aria-hidden="true"></i>tiro mais perto: ${esc(w.track.id)} a ${num(w.track.m)} m</span><span><i class="sw p" aria-hidden="true"></i>ponto mais perto: nº ${num(w.point.number)} (${esc(w.point.trackId)}) a ${num(w.point.m)} m</span><span>GPS ± ${num(w.accuracyM)} m</span></div>`;
  }
  /** Resumo do painel de camadas: as medidas do plano (as mesmas do Plano) e a bordadura. */
  function summary(cur, areas, bd) {
    const f = P.figures(cur.sc), cada = areas ? (Math.abs(areas.maxHa - areas.minHa) < 0.05 ? num(areas.minHa, 1) : `${num(areas.minHa, 1)} a ${num(areas.maxHa, 1)}`) : null;
    return { code: cur.field.code, ha: cur.field.areaOfficialHa, entreTiros: f.entreTiros, entrePontos: f.entrePontos, cada, vazio: areas?.worstGapM ?? 0,
      borda: bd?.minM ?? 0, bordaPt: bd?.min.number ?? 0, bordMin: P.BORDADURA_M, bordLow: P.BORDA_MIN_M };
  }
  function drawMaps() {
    const cur = app.cur;
    if (!cur) return;
    for (const el of document.querySelectorAll('[data-map]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) continue;
      const W = Math.round(r.width), H = Math.round(r.height), full = el.dataset.map === 'full', guide = el.dataset.map === 'guide';
      const areas = full ? P.pointAreas(cur.field, cur.sc) : null, info = full && selectedPt && !rulerPt ? P.pointInfo(cur.field, cur.sc, selectedPt) : null;
      // mapa principal: legenda no alto à esquerda e botões das camadas embaixo à direita ficam fora do desenho
      const w = full && here ? P.whereAmI(cur.field, cur.sc, here) : null;
      const ra = full && selectedPt && rulerPt ? cur.sc.samples.find(p => p.id === selectedPt) : null, rb = ra ? cur.sc.samples.find(p => p.id === rulerPt) : null;
      const ruler = ra && rb ? { a: [ra.x, ra.y], b: [rb.x, rb.y], m: Math.hypot(ra.x - rb.x, ra.y - rb.y), na: ra.number, nb: rb.number } : null;
      const bd = full ? P.borderStats(cur.field, cur.sc) : null;
      const opts = full ? { measure, ruler, grid: layers.grade, border: layers.borda && bd ? { ends: bd.ends, min: P.BORDADURA_M, low: P.BORDA_MIN_M } : null, pos: here, to: w ? [w.point.x, w.point.y] : null, focus: here && w && views.full === ID ? [[here.x, here.y], [w.point.x, w.point.y]] : null, pad: { t: info || ruler || w ? 116 : 44, r: 64, b: 56, l: 36 }, measures: layers.medidas, areas: layers.areas ? areas : null, info,
        reserve: [...(info || ruler || w ? [[0, 0, Math.min(W - 40, 330), 104]] : []), [W - 60, H - 170, W, H]] } : { pad: 22, grid: layers.grade };
      const g = guide ? app.guide() : null;
      const kind = full ? 'full' : guide ? 'guide' : 'small', view = guide && g.focus ? ID : views[kind];
      el.innerHTML = mapMarkup(cur.field, cur.sc, W, H, { small: !full, view, selected: guide ? g.target : selectedPt, pos: guide ? g.pos : null, to: guide ? g.to : null, heading: guide ? g.heading : null, hiTrack: !full && !guide ? app.hiTrack : null, focus: guide ? g.focus : null, others: cur.others || [], ...opts })
        + (full ? (ruler ? `<div class="bal" role="status"><b>${num(ruler.m)} m</b><span>do ponto ${num(ruler.na)} ao ponto ${num(ruler.nb)} (em linha reta)</span><span>Toque fora para limpar</span></div>` : info ? balloon() : w ? hereCard(w) : '')
          + V.mapTools(layers, moved(view), !!here, panel, panel ? summary(cur, areas, bd) : null)
          : guide && g.pos ? `<button class="fit" data-act="follow" aria-pressed="${!!g.follow}" aria-label="${g.follow ? 'Ver o lote inteiro' : 'Seguir minha posição'}">${g.follow ? '⤢' : '◎'}</button>`
            : (moved(view) ? '<button class="fit" data-act="fit" aria-label="Enquadrar o lote">⤢</button>' : ''));
      if (!el.dataset.g) {
        el.dataset.g = '1';
        const k2 = full ? 'full' : el.dataset.map === 'guide' ? 'guide' : 'small';
        attachGestures(el, { getView: () => views[k2], setView: v => { views[k2] = v; }, onChange: () => requestAnimationFrame(drawMaps),
          onTap: target => {
            if (target.closest?.('.lpanel')) return; // toque dentro do painel não mexe no mapa
            const t = target.closest?.('[data-pt]'), id = t ? t.dataset.pt : null;
            // com um ponto escolhido, tocar em outro mede a distância entre os dois (régua); tocar fora limpa
            if (k2 === 'full' && panel) { panel = false; drawMaps(); return; } // tocar no mapa fecha o painel
            if (k2 === 'full' && id && selectedPt && id !== selectedPt && !rulerPt) rulerPt = id;
            else { selectedPt = id; rulerPt = null; }
            drawMaps();
          } });
      }
    }
  }
  function toggleLayer(name) {
    layers = { ...layers, [name]: !layers[name] };
    try { storage.setItem(LAYERS_KEY, JSON.stringify(layers)); } catch { /* só não lembra */ }
    drawMaps();
  }

  app.drawMaps = drawMaps;
  app.onLotChange.push(() => { panel = false; here = null; views.full = views.small = views.guide = ID; selectedPt = null; rulerPt = null; app.hiTrack = null; });
  Object.assign(app.ACTIONS, {
    fit: () => { views.full = views.small = views.guide = ID; drawMaps(); },
    where() {
      if (here) { here = null; drawMaps(); return; }   // tocar de novo tira
      const geo = app.window.navigator.geolocation;
      if (!geo) { app.toast('Este aparelho não oferece GPS ao navegador.'); return; }
      app.toast('Buscando sua posição…');
      geo.getCurrentPosition(position => {
        const pos = fixToPos(position, app.cur.field, 0, Date.now());
        if (!pos) { app.toast('Posição do GPS imprecisa ou antiga: tente a céu aberto.'); return; }
        here = pos; selectedPt = null; views.full = ID; drawMaps(); app.toast('Posição encontrada. Toque em ◎ de novo para tirar.');
      }, err => app.toast(err.code === 1 ? 'Permita a localização para ver onde você está.' : 'GPS indisponível agora.'), { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    },
    'layer-medidas': () => toggleLayer('medidas'),
    'layer-areas': () => toggleLayer('areas'),
    'layer-borda': () => toggleLayer('borda'),
    'layer-grade': () => toggleLayer('grade'),
    layers: () => { panel = !panel; drawMaps(); },
  });
}
