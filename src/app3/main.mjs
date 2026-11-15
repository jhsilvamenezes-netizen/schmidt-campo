// 3.0 · ligação da tela: estado, navegação, eventos. Toda conta vem do planner (motor 2).
import { createStore } from './store.mjs';
import { mapMarkup } from './map.mjs';
import * as P from './planner.mjs';
import * as V from './views.mjs';
import { esc, num } from './format.mjs';
import { buildPlanFile, parsePlanFile } from './plan-file.mjs';
import { buildRoute } from '../engine/guidance.mjs';
import { toCSV, toGeoJSON, toGPX, toKML } from '../engine/exporters.mjs';
import { explainScenario } from '../engine/explain.mjs';
import { assessField } from '../engine/dataQuality.mjs';

export function startApp({ document, window, fields, appVersion }) {
  const $ = s => document.querySelector(s), store = createStore(window.localStorage);
  const keys = Object.keys(fields).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  const ui = { view: 'mapa', key: fields[store.get().fieldKey] ? store.get().fieldKey : keys[0] };
  const recCache = new Map();
  let toastTimer = 0;
  const toast = msg => { const t = $('#toast'); t.textContent = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.textContent = ''; }, 4000); };
  /** @type {any} */ let cur = null;

  const saved = () => store.get();
  const people = () => Math.max(1, Math.min(60, Math.round(saved().quickMonitors ?? 5)));
  function recFor(field, base) {
    const id = `${ui.key}|${JSON.stringify(base)}|${people()}|${!!saved().fitTeam}`;
    if (!recCache.has(id)) recCache.set(id, P.recommend(field, base, people(), saved().fitTeam));
    return recCache.get(id);
  }
  /** Plano do lote atual (recomendado na primeira vez, depois o salvo). */
  function compute() {
    const field = fields[ui.key], st = saved();
    let params = st.paramsByField?.[ui.key];
    const base = P.baseOf(params);
    const rec = recFor(field, base);
    if (!params && rec) { params = { ...base, ...rec.chosen.params }; store.update({ paramsByField: { ...(st.paramsByField || {}), [ui.key]: params } }); }
    const sc = P.planInUse(field, params || base, st.editsByField?.[ui.key]);
    const blind = P.uncovered(field, sc), list = P.checks(sc, people(), blind), split = P.team(sc, people());
    cur = { field, params: params || base, base, rec, sc, f: P.figures(sc), blind, list, split, inUseIsRec: !!rec && P.sameShape(params, rec.chosen.params) };
    return cur;
  }
  function setParams(params) {
    const st = saved();
    store.update({ paramsByField: { ...(st.paramsByField || {}), [ui.key]: params }, fieldKey: ui.key });
    render();
  }

  function drawMaps() {
    for (const el of document.querySelectorAll('[data-map]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) continue;
      el.innerHTML = mapMarkup(cur.field, cur.sc, Math.round(r.width), Math.round(r.height), { small: el.dataset.map === 'small', pad: el.dataset.map === 'small' ? 22 : 30 });
    }
  }
  function render() {
    const c = compute(), main = $('#view');
    $('#lot-name').textContent = c.field.code;
    $('#lot-farm').textContent = `· ${c.field.farm}`;
    for (const a of document.querySelectorAll('[data-tab]')) { const on = a.dataset.tab === ui.view; a.classList.toggle('on', on); a.setAttribute('aria-current', on ? 'page' : 'false'); }
    main.dataset.view = ui.view;
    if (ui.view === 'mapa') main.innerHTML = V.mapaView(c);
    else if (ui.view === 'plano') main.innerHTML = V.planoView({ ...c, haPerPoint: c.params.haPerPoint ?? P.DEFAULT_PARAMS.haPerPoint, people: people(), rows: c.sc.trackRows });
    else if (ui.view === 'enviar') main.innerHTML = V.enviarView(c);
    else main.innerHTML = '<div class="scroll"><section class="card"><h2 class="big md">Guia por GPS</h2><p class="mu">Chega na próxima etapa da 3.0. Até lá, use a guia da versão 2.5.</p></section></div>';
    requestAnimationFrame(drawMaps);
  }

  // ---------- folhas (menu, lote, dados, cálculo, ajustes) ----------
  const host = $('#sheets');
  const openSheet = (title, body) => { host.innerHTML = V.sheet(title, body); host.querySelector('.close')?.focus(); };
  const closeSheet = () => { host.innerHTML = ''; };
  function lotPicker() {
    const farms = new Map();
    for (const k of keys) { const f = fields[k]; if (!farms.has(f.farm)) farms.set(f.farm, []); farms.get(f.farm).push(k); }
    return [...farms].map(([farm, ks]) => `<h3 class="h">${esc(farm)}</h3><div class="lots">${ks.map(k => `<button class="lotb${k === ui.key ? ' on' : ''}" data-lot="${esc(k)}">${esc(fields[k].code)}<small>${num(fields[k].areaOfficialHa)} ha</small></button>`).join('')}</div>`).join('');
  }
  const SHEETS = {
    menu: () => openSheet('Mais', V.menuBody([['dados', 'Dados do lote'], ['calculo', 'Como foi calculado'], ['abrir', 'Abrir plano recebido']])),
    lote: () => openSheet('Escolher lote', lotPicker()),
    dados: () => openSheet(`Dados · ${cur.field.code}`, V.dadosBody(cur.field, assessField(cur.field))),
    calculo: () => openSheet('Como foi calculado', V.calculoBody(explainScenario(cur.sc, cur.field))),
    ajustes: () => openSheet('Ajustes avançados', `<label class="sw-row"><span>Limitar tiros ao número de pessoas</span><input type="checkbox" data-fit ${saved().fitTeam ? 'checked' : ''}></label>
<p class="mu">Barra de ${num(cur.params.boomWidthM ?? P.DEFAULT_PARAMS.boomWidthM, 2)} m · tiros em passadas inteiras a partir do ponto A.</p>`),
    abrir: () => { closeSheet(); $('#plan-input').click(); },
  };

  // ---------- ações de envio ----------
  const status = msg => { const s = $('#status'); if (s) s.textContent = msg; };
  function download(text, name, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const fileBase = () => `${cur.field.farm}_${cur.field.code}_SIMULADO`.replace(/[^\p{L}\p{N}_-]+/gu, '_');
  const routes = () => cur.sc.selected.filter(t => cur.sc.units.some(u => u.trackId === t.id)).map(t => buildRoute(cur.sc, cur.field, t.id));
  const summary = () => P.summaryText(cur.field, cur.sc, people(), cur.list, cur.split);
  const ACTIONS = {
    csv: () => download(toCSV(cur.sc, cur.field), `${fileBase()}.csv`, 'text/csv'),
    geojson: () => download(JSON.stringify(toGeoJSON(cur.sc, cur.field)), `${fileBase()}.geojson`, 'application/geo+json'),
    kml: () => download(toKML(routes(), cur.field, cur.sc), `${fileBase()}.kml`, 'application/vnd.google-earth.kml+xml'),
    gpx: () => download(toGPX(routes(), cur.field, cur.sc, appVersion), `${fileBase()}.gpx`, 'application/gpx+xml'),
    async copy() { try { await window.navigator.clipboard.writeText(summary()); status('Resumo copiado.'); } catch { status('Este navegador não deixou copiar.'); } },
    async share() {
      const st = saved(), plan = buildPlanFile({ engineVersion: cur.sc.engineVersion, appVersion, fieldKey: ui.key, summary: cur.f, params: cur.sc.params, edits: st.editsByField?.[ui.key] ?? null });
      const text = JSON.stringify(plan, null, 1), name = `${fileBase()}.plano.json`, file = typeof File === 'function' ? new File([text], name, { type: 'application/json' }) : null;
      try {
        if (file && window.navigator.canShare?.({ files: [file] })) { await window.navigator.share({ title: `Plano ${cur.field.code}`, text: summary(), files: [file] }); return; }
      } catch (e) { if (/** @type {any} */ (e)?.name === 'AbortError') return; }
      download(text, name, 'application/json'); status('Arquivo do plano baixado: envie aos monitores.');
    },
  };

  // ---------- eventos ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('button,a,[data-close]');
    if (!t) return;
    if (t.dataset.tab) { ui.view = t.dataset.tab; render(); return; }
    if (t.dataset.go) { ui.view = t.dataset.go; render(); return; }
    if (t.dataset.open) { SHEETS[t.dataset.open]?.(); return; }
    if (t.dataset.lot) { ui.key = t.dataset.lot; store.update({ fieldKey: ui.key }); closeSheet(); render(); return; }
    if (t.dataset.act) { ACTIONS[t.dataset.act]?.(); return; }
    if (t.dataset.alt) { const a = cur.rec.alternatives.filter(Boolean)[+t.dataset.alt]; if (a) setParams({ ...cur.base, ...a.params }); return; }
    if (t.dataset.use === 'rec') { setParams({ ...cur.base, ...cur.rec.chosen.params }); return; }
    if (t.dataset.soon) { toast('Bloco de lotes: chega na próxima etapa da 3.0.'); return; }
    if (t.dataset.inc || t.dataset.dec) { const id = t.dataset.inc || t.dataset.dec, inp = $(`#${id}`); inp.value = String(Number(inp.value || 0) + (t.dataset.inc ? 1 : -1)); inp.dispatchEvent(new Event('change', { bubbles: true })); return; }
    if (t.hasAttribute('data-close') && (t === e.target || t.classList.contains('close'))) closeSheet();
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'ha') {
      const v = Math.round(Number(t.value));
      if (!(v >= 1 && v <= 1000)) { t.value = cur.params.haPerPoint ?? 20; return; }
      const base = { ...cur.base, haPerPoint: v }, rec = recFor(cur.field, base);
      setParams(cur.inUseIsRec && rec ? { ...base, ...rec.chosen.params } : { ...cur.params, haPerPoint: v });
    } else if (t.id === 'people') {
      const v = Math.round(Number(t.value));
      if (!(v >= 1 && v <= 60)) { t.value = people(); return; }
      store.update({ quickMonitors: v }); render();
    } else if (t.hasAttribute('data-fit')) {
      store.update({ fitTeam: t.checked }); closeSheet(); render();
    } else if (t.id === 'plan-input' && t.files?.[0]) {
      t.files[0].text().then(text => {
        const p = parsePlanFile(text, fields), st = saved();
        ui.key = p.fieldKey;
        store.update({ fieldKey: p.fieldKey, paramsByField: { ...(st.paramsByField || {}), [p.fieldKey]: p.params }, editsByField: { ...(st.editsByField || {}), [p.fieldKey]: p.edits ?? undefined } });
        ui.view = 'plano'; render(); toast(`Plano de ${fields[p.fieldKey].code} aberto.`);
      }).catch(err => { toast(err.message); }).finally(() => { t.value = ''; });
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && host.innerHTML) closeSheet(); });
  $('#sol').addEventListener('click', () => { const on = !saved().sunMode; store.update({ sunMode: on }); document.documentElement.classList.toggle('sun', on); });
  document.documentElement.classList.toggle('sun', !!saved().sunMode);
  new window.ResizeObserver(() => cur && drawMaps()).observe($('#view'));
  render();
  document.documentElement.dataset.ready = '1';
  return { render, get state() { return { ...ui, cur } } };
}
