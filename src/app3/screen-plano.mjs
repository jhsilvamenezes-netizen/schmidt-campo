// 3.1 (U02) · tela Plano: hectares por ponto, pessoas, recomendado e outras opções, ajustes avançados.
import * as P from './planner.mjs';
import { num } from './format.mjs';
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

  app.SHEETS.ajustes = () => app.openSheet('Ajustes avançados', advancedForm(app.cur.params, app.cur.sc, app.saved().fitTeam));
  app.clicks.push(t => {
    const cur = app.cur;
    // U04: destaca o tiro no mapa do Plano (tocar de novo tira o destaque)
    if (t.dataset.hitrack) { app.hiTrack = app.hiTrack === t.dataset.hitrack ? null : t.dataset.hitrack; t.setAttribute('aria-pressed', String(app.hiTrack === t.dataset.hitrack)); t.textContent = app.hiTrack ? 'Destacado no mapa' : 'Ver no mapa'; app.drawMaps(); return true; }
    if (t.dataset.set) { advancedChange(t.dataset.set, t.dataset.v); return true; }
    if (t.dataset.alt) { const a = cur.rec.alternatives.filter(Boolean)[+t.dataset.alt]; if (a) app.setParams({ ...cur.base, ...a.params }, `Usando ${a.m.tiros} tiros · ${a.m.pontos} pontos`, null); return true; }
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
