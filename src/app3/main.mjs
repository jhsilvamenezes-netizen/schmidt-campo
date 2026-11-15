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
import { createVersions } from './versions.mjs';
import { makeBackup, readBackup, ITEM_LABELS } from './backup.mjs';
import { createSchmidtBackupService } from '../persistence/backup-service.mjs';
import { createSchmidtJournal, createSchmidtImageRepository } from '../platform/browser-backup-adapters.mjs';
import { buildRoute } from '../engine/guidance.mjs';
import { toCSV, toGeoJSON, toGPX, toKML } from '../engine/exporters.mjs';
import { explainScenario } from '../engine/explain.mjs';
import { assessField } from '../engine/dataQuality.mjs';

/** @param {{document:any, window:any, fields:any, appVersion:string, safra?:any}} opts */
export function startApp({ document, window, fields, appVersion, safra = null }) {
  const $ = s => document.querySelector(s), store = createStore(window.localStorage);
  const keys = Object.keys(fields).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  const ui = { view: 'mapa', key: fields[store.get().fieldKey] ? store.get().fieldKey : keys[0] };
  const recCache = new Map();
  const versions = createVersions(window.indexedDB);
  const backupService = window.indexedDB ? createSchmidtBackupService({ storage: window.localStorage, images: createSchmidtImageRepository(window.indexedDB), history: versions.history, journal: createSchmidtJournal(window.indexedDB) }) : null;
  let versionTimer = 0;
  /** @type {any} */ let pendingRestore = null;
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
  function recFor(field, base, key = ui.key) {
    const id = `${key}|${JSON.stringify(base)}|${people()}|${!!saved().fitTeam}`;
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
    render(); scheduleVersion();
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
  /** Guarda uma versão do plano quando ele para de mudar (4 s), como na 2.x. */
  function scheduleVersion() {
    clearTimeout(versionTimer);
    versionTimer = setTimeout(() => {
      const st = saved(), key = ui.key, sc = cur.sc;
      versions.save(key, { params: st.paramsByField?.[key] ?? null, edits: st.editsByField?.[key] ?? null },
        [`${sc.selected.length} tiros`, `${sc.samples.length} pontos`, `95% < ${num(sc.coverage.p95 ?? 0)} m`, `1 ponto a cada ${sc.params.haPerPoint} ha`].join(' · '));
    }, 4000);
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
    menu: () => openSheet('Mais', V.menuBody([['todos', 'Todos os lotes'], ['dados', 'Dados do lote'], ['calculo', 'Como foi calculado'], ['versoes', 'Versões anteriores'],
      ['copia', 'Cópia de segurança'], ['abrir', 'Abrir plano recebido']])),
    todos: () => { openSheet('Todos os lotes', '<p class="mu">Calculando…</p>'); setTimeout(() => { if (host.innerHTML) openSheet('Todos os lotes', V.allLotsBody(allLots())); }, 30); },
    versoes: async () => { openSheet(`Versões · ${cur.field.code}`, '<p class="mu">…</p>'); const rows = await versions.list(ui.key); openSheet(`Versões · ${cur.field.code}`, V.versionsBody(rows)); },
    copia: () => openSheet('Cópia de segurança', V.backupBody('', lastBackup())),
    lote: () => openSheet('Escolher lote', lotPicker()),
    dados: () => openSheet(`Dados · ${cur.field.code}`, V.dadosBody(cur.field, assessField(cur.field), safra?.data?.[ui.key], safra?.source)),
    calculo: () => openSheet('Como foi calculado', V.calculoBody(explainScenario(cur.sc, cur.field))),
    ajustes: () => openSheet('Ajustes avançados', advancedForm(cur.params, cur.sc, saved().fitTeam)),
    abrir: () => { closeSheet(); $('#plan-input').click(); },
  };

  /** Plano salvo (ou recomendado) de cada lote, para a visão geral. */
  function allLots() {
    const st = saved();
    return keys.map(k => {
      const f = fields[k], params = st.paramsByField?.[k] ?? { ...recFor(f, {}, k).chosen.params };
      try { const sc = P.planInUse(f, params, st.editsByField?.[k]); return { key: k, code: f.code, farm: f.farm, pontos: sc.samples.length, tiros: sc.selected.length, p95: sc.coverage.p95, alerts: sc.warnings.filter(w => w.level !== 'info').length }; }
      catch { return { key: k, code: f.code, farm: f.farm, pontos: 0, tiros: 0, p95: null, alerts: 1 }; }
    });
  }
  const LAST_BACKUP = 'schmidt3.ultimaCopia';
  const lastBackup = () => { try { const t = window.localStorage.getItem(LAST_BACKUP); return t ? new Date(+t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''; } catch { return ''; } };
  const stamp = () => { const d = new Date(), z = v => String(v).padStart(2, '0'); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}`; };
  const toBase64 = blob => new Promise((ok, ko) => { const r = new window.FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => ko(r.error); r.readAsDataURL(blob); });
  const fromBase64 = (b, type) => { const s = window.atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: type || 'image/png' }); };
  async function doBackup() {
    if (!backupService) throw Error('este navegador não guarda dados locais');
    return makeBackup({ service: backupService, subtle: window.crypto.subtle, encodeBlob: toBase64, version: appVersion, engine: P.ENGINE_LABEL });
  }
  function printFichas() {
    const people = new Map(); (cur.split?.pessoas || []).forEach((p, i) => p.tarefas.forEach(t => people.set(t.id, `Pessoa ${i + 1}`)));
    const mapFor = id => mapMarkup(cur.field, { ...cur.sc, samples: cur.sc.samples.filter(s => s.trackId === id) }, 700, 240, { pad: 16 });
    let box = $('#print'); if (!box) { box = document.createElement('div'); box.id = 'print'; document.body.append(box); }
    box.innerHTML = V.fichasMarkup(cur.field, routes(), people, mapFor);
    window.print();
  }
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
    fichas: () => printFichas(),
    async backup() {
      try { const b = await doBackup(); download(JSON.stringify(b), `schmidt_copia_${stamp()}.json`, 'application/json'); try { window.localStorage.setItem(LAST_BACKUP, String(Date.now())); } catch { /* só não lembra */ } toast('Cópia de segurança baixada.'); }
      catch (e) { toast(`Cópia não feita: ${/** @type {Error} */ (e).message}.`); }
    },
    'restore-pick': () => $('#backup-input').click(),
    async 'restore-go'() {
      if (!pendingRestore) return;
      try { const before = await doBackup(); download(JSON.stringify(before), `schmidt_antes_de_restaurar_${stamp()}.json`, 'application/json'); } catch { /* sem cópia anterior possível: segue com o diário de restauração */ }
      try {
        const b = pendingRestore;
        if (!backupService) return;
        await backupService.restore({ data: b.dados, images: b.imagens.map(i => ({ key: i.chave, rec: { blob: fromBase64(i.base64, i.tipo), name: i.nome, world: i.world, width: i.largura, height: i.altura, crs: i.crs } })), history: b.historico || [], legacy: !!b.legado });
        toast('Restaurado. Abrindo de novo…'); setTimeout(() => window.location.reload(), 600);
      } catch (e) { toast(`Falha ao restaurar: ${/** @type {Error} */ (e).message}.`); }
    },
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
    if (t.dataset.ver) { versions.list(ui.key).then(rows => { const r = rows.find(x => String(x.id) === t.dataset.ver); if (r?.estado?.params) { closeSheet(); setParams(r.estado.params, 'Versão anterior em uso', r.estado.edits ?? null); } }); return; }
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
    } else if (t.id === 'backup-input' && t.files?.[0]) {
      t.files[0].text().then(text => readBackup(text, window.crypto.subtle)).then(({ backup, items }) => { pendingRestore = backup; openSheet('Restaurar cópia', V.backupBody(V.restoreConfirm(items, ITEM_LABELS), lastBackup())); })
        .catch(err => toast(`Cópia recusada: ${err.message}.`)).finally(() => { t.value = ''; });
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
  backupService?.recover().catch(() => toast('Restauração anterior incompleta: faça uma nova cópia.'));
  pushRecent(ui.key);
  render();
  document.documentElement.dataset.ready = '1';
  return { render, get state() { return { ...ui, cur } } };
}
