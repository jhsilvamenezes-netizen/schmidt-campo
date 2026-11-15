// 3.0 · ligação da tela: estado, navegação, eventos. Toda conta vem do planner (motor 2).
import { createStore } from './store.mjs';
import { mapMarkup } from './map.mjs';
import * as P from './planner.mjs';
import * as V from './views.mjs';
import { esc, num } from './format.mjs';
import { buildPlanFile, parsePlanFile } from './plan-file.mjs';
import { advancedForm, applyField } from './advanced.mjs';
import { attachGestures } from './gestures.mjs';
import { routeFor, fixToPos, guideModel } from './monitor.mjs';
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
  /** @type {any} */ let toastAction = null;
  /** Aviso curto; com `action`, mostra um botão (ex.: Desfazer) durante 6 s. */
  const toast = (/** @type {string} */ msg, /** @type {any} */ action = null) => {
    const t = $('#toast'); toastAction = action;
    t.innerHTML = action ? `<span>${esc(msg)}</span><button data-toast>${esc(action.label)}</button>` : esc(msg);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.innerHTML = ''; toastAction = null; }, action ? 6000 : 4000);
  };
  const RECENT_KEY = 'schmidt3.recentes';
  const recents = () => { try { return JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]').filter(k => fields[k]); } catch { return []; } };
  const pushRecent = k => { try { window.localStorage.setItem(RECENT_KEY, JSON.stringify([k, ...recents().filter(x => x !== k)].slice(0, 4))); } catch { /* sem armazenamento: só não lembra */ } };
  let view = { k: 1, x: 0, y: 0 };
  /** Guia: tiro, sentido, GPS ligado, última posição, memória da sessão, trava de tela. */
  /** @type {any} */ const mon = { trackId: null, flipped: false, active: false, watchId: null, pos: null, session: {}, wake: null, arrivedId: null, ticker: 0 };
  /** @type {string|null} */ let selectedPt = null;
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
  /** Troca o plano do lote (com Desfazer). `edits`: undefined = manter, null = apagar, objeto = gravar. */
  function setParams(params, msg = 'Plano alterado', edits) {
    const st = saved(), key = ui.key, before = { params: st.paramsByField?.[key], edits: st.editsByField?.[key] };
    const write = (p, e) => {
      const cur = saved(), editsBy = { ...(cur.editsByField || {}) };
      if (e === null) delete editsBy[key]; else if (e !== undefined) editsBy[key] = e;
      store.update({ paramsByField: { ...(cur.paramsByField || {}), [key]: p }, editsByField: editsBy, fieldKey: key });
    };
    write(params, edits);
    render();
    toast(msg, { label: 'Desfazer', run: () => { write(before.params, before.edits ?? null); ui.key = key; render(); toast('Desfeito'); } });
  }

  function drawMaps() {
    for (const el of document.querySelectorAll('[data-map]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) continue;
      el.innerHTML = mapMarkup(cur.field, cur.sc, Math.round(r.width), Math.round(r.height), { small: el.dataset.map !== 'full', pad: el.dataset.map !== 'full' ? 22 : 30, view, selected: el.dataset.map === 'guide' ? (mon.active ? monitorData().target : null) : selectedPt, pos: el.dataset.map === 'guide' ? mon.pos : null })
        + (view.k > 1.01 ? '<button class="fit" data-act="fit" aria-label="Enquadrar o lote">⤢</button>' : '') + balloon();
      if (!el.dataset.g) {
        el.dataset.g = '1';
        attachGestures(el, { getView: () => view, setView: v => { view = v; }, onChange: () => requestAnimationFrame(drawMaps),
          onTap: target => { const g = target.closest?.('[data-pt]'); selectedPt = g ? g.dataset.pt : null; drawMaps(); } });
      }
    }
  }
  function balloon() {
    const i = /** @type {any} */ (selectedPt && P.pointInfo(cur.field, cur.sc, selectedPt));
    if (!i) return '';
    const parts = [i.prevM != null && `anterior ${num(i.prevM)} m`, i.nextM != null && `próximo ${num(i.nextM)} m`].filter(Boolean).join(' · ');
    return `<div class="bal" role="status"><b>Ponto ${num(i.number)} · ${esc(i.trackId)}</b>${parts ? `<span>${parts} (andando)</span>` : ''}<span>borda a ${num(i.edgeM)} m</span></div>`;
  }
  function monitorData() {
    const sc = cur.sc, tasks = new Map();
    (cur.split?.pessoas || []).forEach((p, i) => p.tarefas.forEach(t => tasks.set(t.id, `Pessoa ${i + 1}`)));
    const tracks = sc.selected.filter(t => sc.units.some(u => u.trackId === t.id)).map(t => ({ id: t.id, person: tasks.get(t.id) }));
    if (!tracks.some(t => t.id === mon.trackId)) mon.trackId = tracks[0]?.id ?? null;
    const route = mon.trackId ? routeFor(sc, cur.field, mon.trackId, mon.flipped) : null;
    const model = route && mon.active ? guideModel(route, sc, cur.field, mon.pos, Date.now(), mon.session) : null;
    if (model?.state === 'arrived' && model.next?.id !== mon.arrivedId) { mon.arrivedId = model.next.id; try { window.navigator.vibrate?.([200, 80, 200]); } catch { /* sem vibração */ } }
    return { tracks, trackId: mon.trackId, flipped: mon.flipped, active: mon.active, model, steps: route?.instructions || [], target: model?.next?.id ?? null };
  }
  async function keepAwake(on) {
    try {
      if (on && !mon.wake && window.navigator.wakeLock) mon.wake = await window.navigator.wakeLock.request('screen');
      else if (!on && mon.wake) { await mon.wake.release(); mon.wake = null; }
    } catch { mon.wake = null; /* aparelho sem permissão: a guia funciona igual */ }
  }
  function gpsStart() {
    const geo = window.navigator.geolocation;
    if (!geo) { toast('Este aparelho não oferece GPS ao navegador.'); return; }
    mon.active = true; mon.pos = null; mon.session = {}; mon.arrivedId = null;
    mon.watchId = geo.watchPosition(position => {
      const pos = fixToPos(position, cur.field, mon.pos?.at ?? 0, Date.now());
      if (pos) { mon.pos = pos; if (ui.view === 'monitorar') render(); }
    }, err => { toast(err.code === 1 ? 'Permita a localização para usar a guia.' : 'GPS indisponível agora.'); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    keepAwake(true); clearInterval(mon.ticker); mon.ticker = setInterval(() => { if (mon.active && ui.view === 'monitorar') render(); }, 5000);
    render();
  }
  function gpsStop() {
    if (mon.watchId !== null) window.navigator.geolocation?.clearWatch(mon.watchId);
    mon.watchId = null; mon.active = false; clearInterval(mon.ticker); keepAwake(false); render();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && mon.active) keepAwake(true); });
  function render() {
    const c = compute(), main = $('#view');
    $('#lot-name').textContent = c.field.code;
    $('#lot-farm').textContent = `· ${c.field.farm}`;
    for (const a of document.querySelectorAll('[data-tab]')) { const on = a.dataset.tab === ui.view; a.classList.toggle('on', on); a.setAttribute('aria-current', on ? 'page' : 'false'); }
    main.dataset.view = ui.view;
    if (ui.view === 'mapa') main.innerHTML = V.mapaView(c);
    else if (ui.view === 'plano') main.innerHTML = V.planoView({ ...c, haPerPoint: c.params.haPerPoint ?? P.DEFAULT_PARAMS.haPerPoint, people: people(), rows: c.sc.trackRows });
    else if (ui.view === 'enviar') main.innerHTML = V.enviarView(c);
    else main.innerHTML = V.monitorView(monitorData());
    requestAnimationFrame(drawMaps);
  }

  // ---------- folhas (menu, lote, dados, cálculo, ajustes) ----------
  const host = $('#sheets');
  const openSheet = (title, body) => { host.innerHTML = V.sheet(title, body); host.querySelector('.close')?.focus(); };
  const closeSheet = () => { host.innerHTML = ''; };
  const lotButton = k => `<button class="lotb${k === ui.key ? ' on' : ''}" data-lot="${esc(k)}">${esc(fields[k].code)}<small>${num(fields[k].areaOfficialHa)} ha</small></button>`;
  function lotList(q = '') {
    const norm = t => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(), nq = norm(q.trim());
    const hit = keys.filter(k => !nq || norm(`${fields[k].code} ${fields[k].farm}`).includes(nq));
    if (!hit.length) return '<p class="mu">Nenhum lote com esse nome.</p>';
    const farms = new Map();
    for (const k of hit) { const f = fields[k]; if (!farms.has(f.farm)) farms.set(f.farm, []); farms.get(f.farm).push(k); }
    const rec = nq ? [] : recents();
    return (rec.length ? `<h3 class="h">Recentes</h3><div class="lots">${rec.map(lotButton).join('')}</div>` : '')
      + [...farms].map(([farm, ks]) => `<h3 class="h">${esc(farm)}</h3><div class="lots">${ks.map(lotButton).join('')}</div>`).join('');
  }
  const lotPicker = () => `<input class="search" type="search" placeholder="Buscar lote ou fazenda" aria-label="Buscar lote ou fazenda" data-search><div data-lots>${lotList()}</div>`;
  const SHEETS = {
    menu: () => openSheet('Mais', V.menuBody([['dados', 'Dados do lote'], ['calculo', 'Como foi calculado'], ['abrir', 'Abrir plano recebido']])),
    lote: () => openSheet('Escolher lote', lotPicker()),
    dados: () => openSheet(`Dados · ${cur.field.code}`, V.dadosBody(cur.field, assessField(cur.field))),
    calculo: () => openSheet('Como foi calculado', V.calculoBody(explainScenario(cur.sc, cur.field))),
    ajustes: () => openSheet('Ajustes avançados', advancedForm(cur.params, cur.sc, saved().fitTeam)),
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
  const reopenAdvanced = () => { if (host.querySelector('[data-adv]')) SHEETS.ajustes(); };
  const ACTIONS = {
    fit: () => { view = { k: 1, x: 0, y: 0 }; drawMaps(); },
    'gps-start': () => gpsStart(),
    'gps-stop': () => gpsStop(),
    flip: () => { mon.flipped = !mon.flipped; mon.session = {}; render(); },
    optimize() {
      const r = P.optimizeEdits(cur.field, cur.params);
      if (!r.edits) { toast('Nenhuma distribuição melhor sem piorar a regularidade.'); return; }
      setParams(cur.params, `95% do lote: ${num(r.report.baseline.p95M)} → ${num(r.report.optimized.p95M)} m`, r.edits); setTimeout(reopenAdvanced, 0);
    },
    restore() {
      const base = { haPerPoint: cur.params.haPerPoint ?? P.DEFAULT_PARAMS.haPerPoint }, rec = recFor(cur.field, base);
      setParams(rec ? { ...base, ...rec.chosen.params } : base, 'Padrões do lote restaurados', null); setTimeout(reopenAdvanced, 0);
    },
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
    if (t.dataset.track) { mon.trackId = t.dataset.track; mon.session = {}; mon.arrivedId = null; render(); return; }
    if (t.dataset.lot) { if (mon.active) gpsStop(); mon.trackId = null; ui.key = t.dataset.lot; pushRecent(ui.key); view = { k: 1, x: 0, y: 0 }; selectedPt = null; store.update({ fieldKey: ui.key }); closeSheet(); render(); return; }
    if (t.hasAttribute('data-toast')) { const a = toastAction; $('#toast').innerHTML = ''; toastAction = null; a?.run(); return; }
    if (t.dataset.set) { advancedChange(t.dataset.set, t.dataset.v); return; }
    if (t.dataset.act) { ACTIONS[t.dataset.act]?.(); return; }
    if (t.dataset.alt) { const a = cur.rec.alternatives.filter(Boolean)[+t.dataset.alt]; if (a) setParams({ ...cur.base, ...a.params }, `Usando ${a.m.tiros} tiros · ${a.m.pontos} pontos`, null); return; }
    if (t.dataset.use === 'rec') { setParams({ ...cur.base, ...cur.rec.chosen.params }, 'Usando o plano recomendado', null); return; }
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
      setParams(cur.inUseIsRec && rec ? { ...base, ...rec.chosen.params } : { ...cur.params, haPerPoint: v }, `1 ponto a cada ${v} ha`);
    } else if (t.id === 'people') {
      const v = Math.round(Number(t.value));
      if (!(v >= 1 && v <= 60)) { t.value = people(); return; }
      store.update({ quickMonitors: v }); render();
    } else if (t.form?.hasAttribute('data-adv')) {
      advancedChange(t.name, t.type === 'checkbox' ? t.checked : t.value);
    } else if (t.id === 'plan-input' && t.files?.[0]) {
      t.files[0].text().then(text => {
        const p = parsePlanFile(text, fields), st = saved();
        ui.key = p.fieldKey;
        store.update({ fieldKey: p.fieldKey, paramsByField: { ...(st.paramsByField || {}), [p.fieldKey]: p.params }, editsByField: Object.fromEntries(Object.entries({ ...(st.editsByField || {}), [p.fieldKey]: p.edits }).filter(([, v]) => v)) });
        ui.view = 'plano'; render(); toast(`Plano de ${fields[p.fieldKey].code} aberto.`);
      }).catch(err => { toast(err.message); }).finally(() => { t.value = ''; });
    }
  });
  document.addEventListener('input', e => { if (e.target.hasAttribute?.('data-search')) host.querySelector('[data-lots]').innerHTML = lotList(e.target.value); });
  function advancedChange(name, raw) {
    const err = host.querySelector('[data-err]');
    if (name === 'fitTeam') { store.update({ fitTeam: !!raw }); render(); setTimeout(reopenAdvanced, 0); return; }
    const r = applyField(cur.params, name, raw);
    if (r.error) { if (err) err.textContent = r.error; return; }
    if (JSON.stringify(r.params) === JSON.stringify(cur.params)) return;
    setParams(r.params, 'Ajuste aplicado'); setTimeout(reopenAdvanced, 0);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && host.innerHTML) closeSheet(); });
  $('#sol').addEventListener('click', () => { const on = !saved().sunMode; store.update({ sunMode: on }); document.documentElement.classList.toggle('sun', on); });
  document.documentElement.classList.toggle('sun', !!saved().sunMode);
  new window.ResizeObserver(() => cur && drawMaps()).observe($('#view'));
  pushRecent(ui.key);
  render();
  document.documentElement.dataset.ready = '1';
  return { render, get state() { return { ...ui, cur } } };
}
