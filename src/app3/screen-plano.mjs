// 3.1 (U02) · tela Plano: hectares por ponto, tiros e o recomendado (5.0: sem pessoas, outras opções e ajustes avançados).
import * as P from './planner.mjs';
import { num, plural } from './format.mjs';
import { hintMarkup } from './views-plano.mjs';

/** @param {any} app */
export function installPlano(app) {
  const { document, store } = app;
  let tirosSeq = 0;

  // 3.4 · sugestão do motor: a melhoria da distribuição é calculada em segundo plano (motor.js) para o plano em uso;
  // o Plano mostra o ganho pronto ("maior vazio 689 → 610 m") e um toque aplica, com Desfazer
  const hints = new Map();
  /** @type {any} */ let improver = null, seq = 0;
  try { if (app.window.Worker) { improver = new app.window.Worker('motor.js'); improver.onmessage = e => { const d = e.data || {}; if (d.kind !== 'improve') return; for (const [k, v] of hints) if (v.id === d.id) { hints.set(k, { id: d.id, r: d.r, plus: d.plus || null }); if (app.ui.view === 'plano' && app.hintKey?.() === k) { const box = document.querySelector('[data-hint]'); if (box) box.innerHTML = hintMarkup(app.hint()); } } }; improver.onerror = () => { improver = null; }; } } catch { improver = null; }
  app.hintKey = () => { const cur = app.cur; return cur && !cur.block ? `${app.ui.key}|${JSON.stringify(cur.params)}|${JSON.stringify(app.saved().editsByField?.[app.ui.key] ?? null)}` : null; };
  /** Ganho pronto para o plano em uso (ou null enquanto calcula / se não há ganho). */
  app.hint = () => {
    const k = app.hintKey(); if (!k || !improver) return null;
    const h = hints.get(k);
    if (!h) { const id = ++seq; hints.set(k, { id, r: undefined }); improver.postMessage({ kind: 'improve', id, field: app.cur.field, params: app.cur.params, edits: app.saved().editsByField?.[app.ui.key] ?? null, people: app.people() }); return null; }
    const pl = h.plus, plus = pl ? { reason: pl.reason, text: [pl.reason === 'meio' && pl.after.mid < pl.before.mid && 'sem tiro de 1 ponto no meio do lote',pl.after.worst < pl.before.worst - 1 && `maior vazio ${num(pl.before.worst)} → ${num(pl.after.worst)} m`, pl.after.p95 < pl.before.p95 - 1 && `95% ${num(pl.before.p95)} → ${num(pl.after.p95)} m`].filter(Boolean).join(' · '), n: pl.after.n } : null;
    const r = h.r, parts = r?.edits ? [r.after.worst < r.before.worst - 1 && `maior vazio ${num(r.before.worst)} → ${num(r.after.worst)} m`, r.after.cv < r.before.cv - 0.004 && 'áreas por ponto mais iguais'].filter(Boolean) : [];
    return parts.length || plus ? { text: parts.join(' · '), r: parts.length ? r : null, plus } : null;
  };
  app.clicks.push(t => {
    const cur = app.cur;
    // U04: destaca o tiro no mapa do Plano (tocar de novo tira o destaque)
    if (t.dataset.hitrack) { app.hiTrack = app.hiTrack === t.dataset.hitrack ? null : t.dataset.hitrack; t.setAttribute('aria-pressed', String(app.hiTrack === t.dataset.hitrack)); t.textContent = app.hiTrack ? 'Destacado no mapa' : 'Ver no mapa'; app.drawMaps(); return true; }
    // 3.5 · regra comum com um toque (mesmo caminho do campo "Hectares por ponto")
    if (t.dataset.haSet) { const inp = document.querySelector('#ha'); if (inp) { inp.value = t.dataset.haSet; inp.dispatchEvent(new Event('change', { bubbles: true })); } return true; }
    if (t.dataset.use === 'rec') { app.setParams({ ...cur.base, ...cur.rec.chosen.params }, 'Usando o plano recomendado', null); return true; }
    if (t.dataset.inc || t.dataset.dec) {
      const id = t.dataset.inc || t.dataset.dec, inp = document.querySelector(`#${id}`);
      inp.value = String(Number(inp.value || 0) + (t.dataset.inc ? 1 : -1)); inp.dispatchEvent(new Event('change', { bubbles: true })); return true;
    }
    return false;
  });
  app.changes.push(t => {
    const cur = app.cur;
    if (t.id === 'ha') {
      const v = Math.round(Number(String(t.value).trim().replace(',', '.')) * 10) / 10;
      if (!(v >= 1 && v <= 1000)) { t.value = String(cur.params.haPerPoint ?? 20).replace('.', ','); app.toast('Hectares por ponto: de 1 a 1.000.'); return true; }
      const base = { ...cur.base, haPerPoint: v }, msg = `1 ponto a cada ${num(v, v % 1 ? 1 : 0)} ha`, ready = app.peekRec(cur.field, base);
      if (!cur.inUseIsRec && !cur.recPending) { app.setParams({ ...cur.params, haPerPoint: v }, msg); return true; }
      if (ready) { app.setParams({ ...base, ...ready.chosen.params }, msg); return true; }
      // A6: a regra nova aparece na hora (mesmos tiros, pontos da regra nova); a recomendação vem do motor em segundo
      // plano e só substitui o plano se ele ainda for este (a pessoa não mudou nada no meio)
      const key = app.ui.key, quick = { ...cur.params, haPerPoint: v };
      if (!app.setParams(quick, msg)) return true;
      app.whenRec(cur.field, base, rec => {
        const st = app.saved();
        if (!rec || JSON.stringify(st.paramsByField?.[key]) !== JSON.stringify(quick)) return;
        if (store.update({ paramsByField: { ...(st.paramsByField || {}), [key]: { ...base, ...rec.chosen.params } } }) && app.ui.key === key) app.render();
      }, key);
      return true;
    }
    // 4.10 · pedido de campo (Gean, 26/11): escolher quantos tiros e o app recalcula. 5.0: busca o melhor plano com
    // exatamente N tiros (espaçamento na barra × fase), aos poucos para não travar; rumo e regra de pontos iguais
    if (t.id === 'tiros') {
      const v = Number(String(t.value).trim()), now = cur.sc.selected.length;
      if (!(Number.isInteger(v) && v >= 1 && v <= 60)) { t.value = String(now); app.toast('Tiros: número inteiro de 1 a 60.'); return true; }
      if (v === now) return true;
      const key = app.ui.key, token = ++tirosSeq, rec = app.recNow(cur.field, cur.base, key), cp = rec?.chosen?.params ?? cur.params;
      const steps = P.tracksSteps(cur.field, cur.base, cp, v);
      app.toast(`Calculando ${plural(v, 'tiro', 'tiros')}…`);
      const run = () => {
        if (token !== tirosSeq || app.ui.key !== key) return;
        const t0 = Date.now(); let r = steps.next();
        while (!r.done && Date.now() - t0 < 25) r = steps.next();
        if (!r.done) { setTimeout(run, 0); return; }
        if (!app.setParams(r.value, `${plural(v, 'tiro', 'tiros')}, escolhido`, null)) return;
        const got = app.cur.sc.selected.length;
        if (got !== v) app.toast(`Neste lote cabem ${plural(got, 'tiro', 'tiros')} na barra (pedido: ${v}).`);
      };
      setTimeout(run, 0);
      return true;
    }
    return false;
  });
  Object.assign(app.ACTIONS, {
    'reset-lot': () => {
      const st = app.saved(), by = { ...(st.paramsByField || {}) }, ed = { ...(st.editsByField || {}) }; delete by[app.ui.key]; delete ed[app.ui.key];
      if (store.update({ paramsByField: by, editsByField: ed })) { app.clearInvalid(); app.render(); app.toast('Usando o plano recomendado.'); }
    },
    // 3.2 · minimax: desliza os pontos no próprio tiro para encurtar o maior vazio (sem piorar o resto); com Desfazer
    minimax() {
      const cur = app.cur, edits = app.saved().editsByField?.[app.ui.key] ?? null, ready = hints.get(app.hintKey())?.r;
      const r = ready !== undefined && ready !== null ? ready : P.minimaxEdits(cur.field, cur.params, edits);
      if (!r.edits) { app.toast('A distribuição já é a melhor possível sem piorar a cobertura.'); return; }
      const parts = [r.after.worst < r.before.worst - 1 && `maior vazio ${num(r.before.worst)} → ${num(r.after.worst)} m`,
        r.after.cv < r.before.cv - 0.004 && `áreas ${num(r.before.cv * 100)} → ${num(r.after.cv * 100)}% de variação`].filter(Boolean);
      app.setParams(cur.params, parts.join(' · ') || 'Distribuição melhorada', r.edits);
    },
    // 3.15 · lote irregular: 1 ponto acima do mínimo (com Desfazer)
    plus1() {
      const pl = hints.get(app.hintKey())?.plus ?? P.plusOne(app.cur.field, app.cur.params, app.people());
      if (!pl) { app.toast('Neste lote, 1 ponto a mais não melhora o bastante.'); return; }
      // 4.0.1 · "vazio": mesmo plano + 1 ponto no lugar do maior vazio (vai como ajuste, com Desfazer)
      app.setParams(pl.params, `${pl.after.n} pontos (1 acima do mínimo${pl.reason === 'vazio' ? ', no maior vazio' : ''}): maior vazio ${num(pl.before.worst)} → ${num(pl.after.worst)} m`, pl.edits ?? null);
    },
  });
}
