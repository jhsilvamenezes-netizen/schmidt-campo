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
  /** 3.12 · tiro tocado no Mapa (mostra o tiro inteiro) */
  /** @type {string|null} */ let selTrack = null;
  /** "Onde estou": última posição pedida no Mapa (só enquanto o lote não muda) */
  /** @type {any} */ let here = null;
  /** 3.17 · id do acompanhamento contínuo do GPS no Mapa (null = parado) */
  /** @type {any} */ let hereWatch = null;
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

  // 3.15 · com a fonte embutida carregada, mede os rótulos de novo (a primeira medida pode ter sido com a letra do aparelho)
  try { document.fonts?.ready.then(() => { measured.clear(); app.drawMaps?.(); }); } catch { /* sem API de fontes */ }

  function balloon() {
    const cur = app.cur, i = /** @type {any} */ (selectedPt && P.pointInfo(cur.field, cur.sc, selectedPt));
    if (!i) return '';
    const parts = [i.prevM != null && `anterior ${num(i.prevM)} m`, i.nextM != null && `próximo ${num(i.nextM)} m`].filter(Boolean).join(' · ');
    const ha = P.pointAreas(cur.field, cur.sc)?.cells.find(c => c.id === selectedPt);
    const across = (i.across || []).map(a => `${esc(a.trackId)} a ${num(a.m)} m`).join(' · ');
    // cada linha do balão com a marca da linha desenhada no mapa
    return `<div class="bal" role="status"><b>Ponto ${num(i.number)} · ${esc(i.trackId)}</b>${parts ? `<span><i class="sw p" aria-hidden="true"></i>${parts} (andando)</span>` : ''}${across ? `<span><i class="sw t sel" aria-hidden="true"></i>vizinhos: ${across}</span>` : ''}<span><i class="sw b" aria-hidden="true"></i>borda a ${num(i.edgeM)} m${ha ? ` · área ${num(ha.ha, 1)} ha` : ''}</span></div>`;
  }

  /** 3.12 · tiro tocado: comprimento, pontos, intervalo, por onde entrar e vizinhos (os mesmos dados do Plano). */
  function trackCard() {
    const cur = app.cur, d = /** @type {any} */ (selTrack && P.trackDetail(cur.field, cur.sc, selTrack));
    if (!d) return '';
    const row = cur.sc.trackRows.find(r => r.trackId === selTrack), p0 = d.parts[0];
    const gap = row?.medianGapM ? ` · a cada ${num(row.medianGapM)} m` : '';
    const nb = d.neighbors.map(n => `${esc(n.id)} a ${num(n.m)} m`).join(' · ');
    return `<div class="bal" role="status"><b>Tiro ${esc(d.id)} · ${num(d.lengthM)} m</b><span><i class="sw p" aria-hidden="true"></i>${d.n === 1 ? '1 ponto' : `${num(d.n)} pontos`}${gap}</span>`
      + (p0 ? `<span>entra a ${esc(p0.entra)} e anda para ${esc(p0.anda)}${d.parts.length > 1 ? ` · ${d.parts.length} partes` : ''}</span>` : '')
      + (nb ? `<span><i class="sw t sel" aria-hidden="true"></i>vizinhos: ${nb}</span>` : '') + '</div>';
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
    if (hereWatch !== null && app.ui.view !== 'mapa') stopHere(); // saiu do Mapa: para de acompanhar (bateria)
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
      const opts = full ? { measure, ruler, grid: layers.grade, border: layers.borda && bd ? { ends: bd.ends, min: P.BORDADURA_M, low: P.BORDA_MIN_M } : null, pos: here, to: w ? [w.point.x, w.point.y] : null, focus: here && w && views.full === ID ? [[here.x, here.y], [w.point.x, w.point.y]] : null, pad: { t: info || ruler || w || selTrack ? 116 : 44, r: 64, b: 56, l: 36 }, measures: layers.medidas, areas: layers.areas ? areas : null, info,
        reserve: [...(info || ruler || w || selTrack ? [[0, 0, Math.min(W - 40, 330), 104]] : []), [W - 60, H - 170, W, H]] } : { pad: 22, grid: layers.grade };
      // 4.0-c · com a folha por cima do mapa inteiro, a faixa coberta é a altura da folha
      const sheet4 = app.isDesign4?.() && el.classList.contains('sm') && el.nextElementSibling?.classList.contains('scroll') ? el.nextElementSibling.getBoundingClientRect().height : 0;
      const g = guide ? app.guide() : null, under = sheet4 || parseFloat(document.defaultView.getComputedStyle(el).getPropertyValue('--under')) || 0;
      const kind = full ? 'full' : guide ? 'guide' : 'small', view = guide && g.focus ? ID : views[kind];
      el.innerHTML = mapMarkup(cur.field, cur.sc, W, H, { small: !full, view, selected: guide ? g.target : selectedPt, pos: guide ? g.pos : null, to: guide ? g.to : null, heading: guide ? g.heading : null, hiTrack: full ? selTrack : !guide ? app.hiTrack : null, focus: guide ? g.focus : null, others: cur.others || [], under, ...opts })
        + (full ? (ruler ? `<div class="bal" role="status"><b>${num(ruler.m)} m</b><span>do ponto ${num(ruler.na)} ao ponto ${num(ruler.nb)} (em linha reta)</span><span>Toque fora para limpar</span></div>` : info ? balloon() : selTrack ? trackCard() : w ? hereCard(w) : '')
          + V.mapTools(layers, moved(view), !!here, panel, panel ? summary(cur, areas, bd) : null)
          : guide && g.pos ? `<button class="fit" data-act="follow" aria-pressed="${!!g.follow}" aria-label="${g.follow ? 'Ver o lote inteiro' : 'Seguir minha posição'}">${g.follow ? '⤢' : '◎'}</button>`
            : (moved(view) ? '<button class="fit" data-act="fit" aria-label="Enquadrar o lote">⤢</button>' : '')
              // 3.15 · Plano: mapa maior com um toque (e de volta)
              + (kind === 'small' && !app.cur.block ? `<button class="fit grow" data-act="plan-grow" aria-pressed="${!!app.planBig}" aria-label="${app.planBig ? 'Mapa menor' : 'Mapa maior'}">${app.planBig ? '⌄' : '⌃'}</button>` : ''));
      if (!el.dataset.g) {
        el.dataset.g = '1';
        const k2 = full ? 'full' : el.dataset.map === 'guide' ? 'guide' : 'small';
        attachGestures(el, { getView: () => views[k2], setView: v => { views[k2] = v; }, onChange: () => requestAnimationFrame(drawMaps),
          onTap: target => {
            if (target.closest?.('.lpanel')) return; // toque dentro do painel não mexe no mapa
            const t = target.closest?.('[data-pt]'), id = t ? t.dataset.pt : null, trk = !id && k2 === 'full' ? target.closest?.('[data-trk]')?.dataset.trk ?? null : null;
            // com um ponto escolhido, tocar em outro mede a distância entre os dois (régua); tocar fora limpa
            if (k2 === 'full' && panel) { panel = false; drawMaps(); return; } // tocar no mapa fecha o painel
            if (k2 === 'full' && id && selectedPt && id !== selectedPt && !rulerPt) rulerPt = id;
            else { selectedPt = id; rulerPt = null; }
            selTrack = trk && trk !== selTrack ? trk : null; // tocar no mesmo tiro de novo (ou fora) limpa
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

  function stopHere() { if (hereWatch !== null) app.window.navigator.geolocation?.clearWatch(hereWatch); hereWatch = null; here = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && hereWatch !== null) stopHere(); });
  app.drawMaps = drawMaps;
  app.onLotChange.push(() => { panel = false; stopHere(); views.full = views.small = views.guide = ID; selectedPt = null; rulerPt = null; selTrack = null; app.hiTrack = null; });
  Object.assign(app.ACTIONS, {
    fit: () => { views.full = views.small = views.guide = ID; drawMaps(); },
    'plan-grow': () => { app.planBig = !app.planBig; views.small = ID; app.render(); },
    // 3.17 · "Onde estou" acompanha cada movimento (antes pedia a posição uma vez só): liga e desliga no ◎; para
    // sozinho ao sair do Mapa, ao trocar de lote e com a tela apagada (bateria)
    where() {
      if (here || hereWatch !== null) { stopHere(); drawMaps(); return; }   // tocar de novo tira
      const geo = app.window.navigator.geolocation;
      if (!geo) { app.toast('Este aparelho não oferece GPS ao navegador.'); return; }
      app.toast('Buscando sua posição…');
      let first = true;
      hereWatch = geo.watchPosition(position => {
        const pos = fixToPos(position, app.cur.field, here?.at ?? 0, Date.now());
        if (!pos) { if (first) app.toast('Posição do GPS imprecisa ou antiga: tente a céu aberto.'); return; }
        here = pos; if (first) { selectedPt = null; views.full = ID; app.toast('Acompanhando sua posição. Toque em ◎ para parar.'); }
        first = false;
        if (app.ui.view === 'mapa') drawMaps();
      }, err => {
        // parado, o GPS só manda leitura quando muda: "tempo esgotado" ou "sem sinal" não param o acompanhamento;
        // só a localização negada para
        if (err.code === 1) { app.toast('Permita a localização para ver onde você está.'); stopHere(); drawMaps(); }
        else if (first) app.toast('Sem sinal do GPS ainda: continue a céu aberto.');
      }, { enableHighAccuracy: true, maximumAge: 0 });
    },
    'layer-medidas': () => toggleLayer('medidas'),
    'layer-areas': () => toggleLayer('areas'),
    'layer-borda': () => toggleLayer('borda'),
    'layer-grade': () => toggleLayer('grade'),
    layers: () => { panel = !panel; drawMaps(); },
  });
}
