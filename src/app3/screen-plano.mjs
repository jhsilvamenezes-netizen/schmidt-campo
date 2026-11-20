// 3.1 (U02) · tela Plano: hectares por ponto, pessoas, recomendado e outras opções, ajustes avançados.
import * as P from './planner.mjs';
import { num, plural } from './format.mjs';
import { hintMarkup } from './views.mjs';
import { advancedForm, applyField } from './advanced.mjs';

/** @param {any} app */
export function installPlano(app) {
  const { document, store } = app;
  const reopenAdvanced = () => { if (app.host.querySelector('[data-adv]')) app.SHEETS.ajustes(); };
  function advancedChange(name, raw) {
    const err = app.host.querySelector('[data-err]'), cur = app.cur;
    if (name === 'fitTeam') { store.update({ fitTeam: !!raw }); app.render(); setTimeout(reopenAdvanced, 0); return; }
    const r = applyField(cur.params, name, raw);
    if (r.error) { if (err) err.textContent = r.error; return; }
    if (JSON.stringify(r.params) === JSON.stringify(cur.params)) return;
    app.setParams(r.params, 'Ajuste aplicado'); setTimeout(reopenAdvanced, 0);
  }

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
    const r = h.r, parts = r?.edits ? [r.after.worst < r.before.worst - 1 && `maior vazio ${num(r.before.worst)} → ${num(r.after.worst)} m`, r.after.cv < r.before.cv - 0.004 && `áreas ${num(r.before.cv * 100)} → ${num(r.after.cv * 100)}%`].filter(Boolean) : [];
    return parts.length || plus ? { text: parts.join(' · '), r: parts.length ? r : null, plus } : null;
  };
  app.SHEETS.ajustes = () => app.openSheet('Ajustes avançados', advancedForm(app.cur.params, app.cur.sc, app.saved().fitTeam));
  app.clicks.push(t => {
    const cur = app.cur;
    // U04: destaca o tiro no mapa do Plano (tocar de novo tira o destaque)
    if (t.dataset.hitrack) { app.hiTrack = app.hiTrack === t.dataset.hitrack ? null : t.dataset.hitrack; t.setAttribute('aria-pressed', String(app.hiTrack === t.dataset.hitrack)); t.textContent = app.hiTrack ? 'Destacado no mapa' : 'Ver no mapa'; app.drawMaps(); return true; }
    // 3.5 · regra comum com um toque (mesmo caminho do campo "Hectares por ponto")
    if (t.dataset.haSet) { const inp = document.querySelector('#ha'); if (inp) { inp.value = t.dataset.haSet; inp.dispatchEvent(new Event('change', { bubbles: true })); } return true; }
    if (t.dataset.set) { advancedChange(t.dataset.set, t.dataset.v); return true; }
    if (t.dataset.alt) { const a = cur.rec.alternatives.filter(Boolean)[+t.dataset.alt]; if (a) app.setParams({ ...cur.base, ...a.params }, `Usando ${plural(a.m.tiros, 'tiro', 'tiros')} · ${plural(a.m.pontos, 'ponto', 'pontos')}`, null); return true; }
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
    if (t.id === 'people') {
      const v = Number(String(t.value).trim().replace(',', '.'));
      if (!(Number.isInteger(v) && v >= 1 && v <= 60)) { t.value = app.people(); app.toast('Pessoas: número inteiro de 1 a 60.'); return true; }
      store.update({ quickMonitors: v }); app.render(); return true;
    }
    if (t.form?.hasAttribute('data-adv')) { advancedChange(t.name, t.type === 'checkbox' ? t.checked : t.value); return true; }
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
      app.setParams(pl.params, `${pl.after.n} pontos (1 acima do mínimo): maior vazio ${num(pl.before.worst)} → ${num(pl.after.worst)} m`, null);
    },
    optimize() {
      const cur = app.cur, r = P.optimizeEdits(cur.field, cur.params);
      if (!r.edits) { app.toast('Nenhuma distribuição melhor sem piorar a regularidade.'); return; }
      app.setParams(cur.params, `95% do lote: ${num(r.report.baseline.p95M)} → ${num(r.report.optimized.p95M)} m`, r.edits); setTimeout(reopenAdvanced, 0);
    },
    restore() {
      const cur = app.cur, base = { haPerPoint: cur.params.haPerPoint ?? P.DEFAULT_PARAMS.haPerPoint };
      app.whenRec(cur.field, base, rec => { app.setParams(rec ? { ...base, ...rec.chosen.params } : base, 'Padrões do lote restaurados', null); setTimeout(reopenAdvanced, 0); });
    },
  });
}
