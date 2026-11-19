// 3.0 · ligação da tela: estado, plano do lote, navegação e eventos. Toda conta vem do planner (motor 2).
// 3.1 (U02): cada tela no seu arquivo (screen-*.mjs); aqui fica só o que é comum a todas. O plano só é recalculado
// quando muda o que ele usa (estado gravado, lote ou bloco): trocar de aba não refaz conta.
import { createStore, safeStorage } from './store.mjs';
import * as P from './planner.mjs';
import * as V from './views.mjs';
import { esc, num } from './format.mjs';
import { createVersions } from './versions.mjs';
import { createSchmidtSessionLock, installSchmidtSessionLifecycle } from '../platform/browser-session-lock.mjs';
import { installMapa } from './screen-mapa.mjs';
import { installMonitor } from './screen-monitor.mjs';
import { installPlano } from './screen-plano.mjs';
import { installEnviar } from './screen-enviar.mjs';
import { installLotes } from './screen-lotes.mjs';
import { installMais } from './screen-mais.mjs';
import { installBloco } from './screen-bloco.mjs';

/** Entra na sessão (trava entre abas da 2.x) e só então lê o estado e desenha. */
export async function startApp(opts) {
  const session = createSchmidtSessionLock(opts.window.navigator.locks);
  try { await session.enter(); } catch { /* sem trava: segue só leitura se a sessão disser que não pode gravar */ }
  installSchmidtSessionLifecycle(opts.window, session);
  const app = runApp({ ...opts, session });
  registerWorker(opts.window, app.toast);
  return app;
}

function registerWorker(window, toast) {
  const sw = window.navigator.serviceWorker;
  if (!sw || !/^https?:$/.test(window.location.protocol)) return;
  const had = !!sw.controller;
  sw.register('sw.js').catch(() => { /* sem service worker: funciona só com internet */ });
  sw.addEventListener('controllerchange', () => { if (had) toast('Nova versão instalada.', { label: 'Recarregar', run: () => window.location.reload() }); });
}

/** @param {{document:any, window:any, fields:any, appVersion:string, safra?:any, recs?:any, session:any}} opts */
function runApp({ document, window, fields, appVersion, safra = null, recs = null, session }) {
  const $ = s => document.querySelector(s);
  let blockedShown = false;
  // C2: sem armazenamento (modo privado restrito) o app abre igual, só não guarda depois de fechar.
  const { storage, persistent } = safeStorage(() => window.localStorage);
  const store = createStore(storage, { canWrite: () => session.canWrite(),
    onBlocked: () => { if (!blockedShown) { blockedShown = true; toast(session.writeError().userMessage); } },
    // C3: não finge que gravou
    onFail: () => toast('Não foi possível gravar neste aparelho (memória cheia ou bloqueada). Nada foi alterado.') });
  const keys = Object.keys(fields).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  const ui = { view: 'mapa', key: fields[store.get().fieldKey] ? store.get().fieldKey : keys[0] };
  const recCache = new Map();
  // U05: recomendações da regra padrão já vêm calculadas no arquivo (mesmo motor; conferidas no teste)
  if (recs?.motor === P.ENGINE_LABEL) for (const [k, r] of Object.entries(recs.recs || {})) if (fields[k]) recCache.set(`${k}|{}|${recs.pessoas}|false`, r);
  let toastTimer = 0, versionTimer = 0;
  /** @type {any} */ let toastAction = null;
  /** @type {string|null} */ let warnedInvalid = null;
  /** @type {any} */ let memo = null;

  /** Aviso curto; com `action`, mostra um botão (ex.: Desfazer) durante 6 s. */
  const toast = (/** @type {string} */ msg, /** @type {any} */ action = null) => {
    const t = $('#toast'); toastAction = action;
    t.innerHTML = action ? `<span>${esc(msg)}</span><button data-toast>${esc(action.label)}</button>` : esc(msg);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.innerHTML = ''; toastAction = null; }, action ? 6000 : 4000);
  };
  const saved = () => store.get();
  const people = () => Math.max(1, Math.min(60, Math.round(saved().quickMonitors ?? 5)));
  /** Recomendação do lote. Vem pronta do arquivo (regra padrão) ou é montada no motor em segundo plano (motor.js,
   *  Web Worker): a tela não trava; enquanto isso o lote mostra o plano gravado e "calculando o recomendado".
   *  Sem worker (navegador antigo ou arquivo local): recomendação base na hora e equilíbrio aos poucos. */
  const recId = (base, key) => `${key}|${JSON.stringify(base)}|${people()}|${!!saved().fitTeam}`;
  /** @type {Map<string, {field:any, base:any, key:string, fns:Function[]}>} */ const pending = new Map();
  /** @type {any} */ let worker = null;
  try {
    if (/^https?:$/.test(window.location.protocol) && window.Worker) {
      worker = new window.Worker('motor.js');
      worker.onmessage = e => { const { id, rec, error } = e.data || {}; const p = pending.get(id); if (!p) return; pending.delete(id); done(id, error ? P.recommendBase(p.field, p.base, people(), saved().fitTeam) : rec, p); };
      worker.onerror = () => { worker = null; for (const [id, p] of [...pending]) { pending.delete(id); done(id, P.recommend(p.field, p.base, people(), saved().fitTeam), p); } };
    }
  } catch { worker = null; }
  function done(id, rec, p) {
    recCache.set(id, rec); memo = null;
    for (const fn of p.fns) fn(rec);
    if (ui.key === p.key) render();
  }
  function recFor(field, base, key = ui.key) {
    const id = recId(base, key);
    if (recCache.has(id)) return recCache.get(id);
    if (worker) {
      if (!pending.has(id)) { pending.set(id, { field, base, key, fns: [] }); worker.postMessage({ id, field, base, people: people(), fitTeam: !!saved().fitTeam }); }
      return null;
    }
    const first = P.recommendBase(field, base, people(), saved().fitTeam);
    recCache.set(id, first);
    if (first) balanceLater(id, field, base, key, first);
    return first;
  }
  /** Chama `fn(rec)` quando a recomendação estiver pronta (na hora, se já estiver). */
  function whenRec(field, base, fn, key = ui.key) {
    const r = recFor(field, base, key), p = pending.get(recId(base, key));
    if (p) p.fns.push(fn); else fn(r);
  }
  function balanceLater(id, field, base, key, first) {
    const steps = P.balanceSteps(field, base, first);
    const run = () => {
      const t0 = Date.now();
      let r = steps.next();
      while (!r.done && Date.now() - t0 < 25) r = steps.next();
      if (!r.done) { setTimeout(run, 0); return; }
      const rec = r.value;
      recCache.set(id, rec); memo = null;
      if (rec === first) return;
      // ajusta o plano gravado só se ele ainda é o recomendado de antes (a pessoa não escolheu outro no meio)
      const st = saved(), now = st.paramsByField?.[key];
      if (now && P.sameShape(now, first.chosen.params) && JSON.stringify(P.baseOf(now)) === JSON.stringify(base)) {
        if (store.update({ paramsByField: { ...(st.paramsByField || {}), [key]: { ...base, ...rec.chosen.params } } })) {
          // não cobre um aviso em curso (ex.: "Desfazer" da regra)
          if (ui.key === key) { render(); if (!$('#toast').textContent) toast('Recomendado ajustado: áreas por ponto mais iguais.'); }
        }
      } else if (ui.key === key) render();
    };
    setTimeout(run, 0);
  }
  const host = $('#sheets');
  /** Contexto comum: cada tela (screen-*.mjs) lê daqui e registra as suas folhas, ações e eventos. */
  /** @type {any} */ const app = {
    document, window, fields, keys, ui, store, storage, persistent, session, safra, appVersion, host, versions: createVersions(window.indexedDB),
    cur: null, hiTrack: null, toast, saved, people, recFor, whenRec, render, setParams,
    /** Recomendação já pronta (sem calcular), ou undefined. */
    /** Recomendação já pronta ou feita na hora (para listas e bloco, que precisam do valor já). */
    recNow: (field, base, key = ui.key) => recFor(field, base, key) ?? P.recommendBase(field, base, people(), saved().fitTeam),
    peekRec: (field, base, key = ui.key) => recCache.get(`${key}|${JSON.stringify(base)}|${people()}|${!!saved().fitTeam}`),
    SHEETS: {}, ACTIONS: {}, clicks: [], changes: [], inputs: [], onLotChange: [], onCloseSheet: [],
    openSheet: (title, body) => { host.innerHTML = V.sheet(title, body); host.querySelector('.close')?.focus(); },
    closeSheet: () => { host.innerHTML = ''; for (const f of app.onCloseSheet) f(); },
    clearInvalid: () => { warnedInvalid = null; },
    download(text, name, type) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    },
  };

  /** Plano do lote atual (recomendado na primeira vez, depois o salvo). Refeito só quando o estado, o lote ou o bloco mudam. */
  function compute() {
    const blockId = app.blockId();
    if (memo && app.cur && memo.st === saved() && memo.key === ui.key && memo.block === blockId) return app.cur;
    app.cur = app.computeBlock() || computeLot();
    memo = { st: saved(), key: ui.key, block: app.blockId() };
    return app.cur;
  }
  function computeLot() {
    const field = fields[ui.key], st = saved();
    let params = st.paramsByField?.[ui.key], edits = st.editsByField?.[ui.key];
    /** @type {string|null} */ let invalid = null;
    // C1/C4/C6: um plano gravado que não abre (valor fora da faixa, trajeto importado, versão antiga) não derruba o app:
    // abre com o recomendado e avisa; o gravado só é trocado quando a pessoa mudar algo.
    let tried = params ? P.tryPlan(field, params, edits) : null;
    if (tried?.error) { invalid = tried.error; params = undefined; edits = undefined; tried = null; }
    const base = P.baseOf(params);
    const rec = recFor(field, base);
    if (!params && rec) { params = { ...base, ...rec.chosen.params }; if (!invalid) store.update({ paramsByField: { ...(st.paramsByField || {}), [ui.key]: params } }); }
    const sc = tried?.sc || P.planInUse(field, params || base, edits);
    if (invalid && warnedInvalid !== ui.key) { warnedInvalid = ui.key; setTimeout(() => toast(`O plano gravado de ${field.code} não abre (${invalid}). Mostrando o recomendado.`), 0); }
    const blind = P.uncovered(field, sc), list = P.checks(sc, people(), blind), split = P.team(sc, people());
    // 3.8 · bordadura na conferência: o ponto mais perto da borda (atenção se a menos do mínimo)
    const bd = P.borderStats(field, sc);
    if (bd) list.push(bd.minM < P.BORDADURA_M ? { level: 'alerta', text: `Ponto ${bd.min.number} (${bd.min.trackId}) a ${num(bd.minM)} m da borda` } : { level: 'ok', text: `Pontos a ${num(bd.minM)} m ou mais da borda` });
    return { field, params: params || base, base, rec, recPending: rec === null && !!worker, sc, f: P.figures(sc), blind, list, split, inUseIsRec: !!rec && P.sameShape(params, rec.chosen.params), block: null, others: [] };
  }
  /** Troca o plano do lote (com Desfazer). `edits`: undefined = manter, null = apagar, objeto = gravar. */
  function setParams(params, msg = 'Plano alterado', edits) {
    const st = saved(), key = ui.key, before = { params: st.paramsByField?.[key], edits: st.editsByField?.[key] };
    // C5/C6: só grava o que o motor consegue montar (ex.: teto de 600 pontos) e o que está dentro das faixas
    const check = P.tryPlan(fields[key], params, edits === undefined ? before.edits : edits ?? undefined);
    if (check.error) { toast(`Não aplicado: ${check.error}`); render(); return false; }
    const write = (p, e) => {
      const now = saved(), editsBy = { ...(now.editsByField || {}) };
      if (e === null) delete editsBy[key]; else if (e !== undefined) editsBy[key] = e;
      return store.update({ paramsByField: { ...(now.paramsByField || {}), [key]: p }, editsByField: editsBy, fieldKey: key });
    };
    if (!write(params, edits)) { render(); return false; }
    render(); scheduleVersion();
    toast(msg, { label: 'Desfazer', run: () => { if (write(before.params, before.edits ?? null)) { ui.key = key; render(); toast('Desfeito'); } } });
    return true;
  }
  /** Guarda uma versão do plano quando ele para de mudar (4 s), como na 2.x. */
  function scheduleVersion() {
    clearTimeout(versionTimer);
    versionTimer = setTimeout(() => {
      const st = saved(), key = ui.key, sc = app.cur.sc;
      app.versions.save(key, { params: st.paramsByField?.[key] ?? null, edits: st.editsByField?.[key] ?? null },
        [`${sc.selected.length} tiros`, `${sc.samples.length} pontos`, `95% < ${num(sc.coverage.p95 ?? 0)} m`, `1 ponto a cada ${sc.params.haPerPoint} ha`].join(' · '));
    }, 4000);
  }
  function render() {
    const main = $('#view');
    try { draw(main); } catch (e) {
      // Nunca tela em branco: mostra o problema e uma saída (lote recomendado).
      app.cur = null; memo = null;
      main.innerHTML = `<div class="scroll"><section class="card"><h2 class="big md">Não foi possível montar este plano</h2><p class="mu">${esc(P.friendly(e))}</p>
<button class="btn p" data-act="reset-lot">Usar o plano recomendado</button><button class="btn" data-open="lote">Escolher outro lote</button></section></div>`;
    }
  }
  function draw(main) {
    const c = compute();
    $('#lot-name').textContent = c.field.code;
    $('#lot-farm').textContent = c.field.farm;
    $('#titulo').textContent = `SCHMIDT Campo · ${c.field.code} · ${({ lotes: 'Lotes', mapa: 'Mapa', plano: 'Plano', monitorar: 'Monitorar' })[ui.view] || ''}`;
    for (const a of document.querySelectorAll('[data-tab]')) { const on = a.dataset.tab === ui.view; a.classList.toggle('on', on); a.setAttribute('aria-current', on ? 'page' : 'false'); }
    main.dataset.view = ui.view;
    if (ui.view === 'mapa') main.innerHTML = V.mapaView(c);
    else if (ui.view === 'plano') main.innerHTML = V.planoView({ ...c, haPerPoint: String(c.params.haPerPoint ?? P.DEFAULT_PARAMS.haPerPoint).replace('.', ','), people: people(), hiTrack: app.hiTrack, hint: c.block ? null : app.hint?.(), border: (b => (b ? { minM: b.minM, n: b.min.number, near: b.minM < P.BORDADURA_M } : null))(P.borderStats(c.field, c.sc)),
      rows: c.sc.trackRows.map(r => ({ ...r, d: c.block ? null : (c.details ??= new Map()).get(r.trackId) ?? c.details.set(r.trackId, P.trackDetail(c.field, c.sc, r.trackId)).get(r.trackId) })) });
    else if (ui.view === 'lotes') main.innerHTML = app.lotesView();
    else main.innerHTML = V.monitorView(app.monitorData());
    requestAnimationFrame(app.drawMaps);
  }

  // cada tela registra o que é seu
  installBloco(app); installMapa(app); installMonitor(app); installPlano(app); installEnviar(app); installMais(app); installLotes(app);

  // ---------- eventos (um ouvinte por tipo; cada tela responde pelos seus botões e campos) ----------
  let tabTimer = 0;
  document.addEventListener('click', e => {
    const t = e.target.closest('button,a,[data-close]');
    if (!t) return;
    // 3.4: troca de aba com entrada suave do conteúdo (180 ms, só na troca; "reduzir movimento" desliga no CSS). A tela é
    // montada na hora: a animação é só de entrada, não atrasa nada
    const go = v => { const changed = ui.view !== v; ui.view = v; render(); if (changed) { const m = $('#view'); m.classList.remove('tab-in'); void m.offsetWidth; m.classList.add('tab-in'); clearTimeout(tabTimer); tabTimer = setTimeout(() => m.classList.remove('tab-in'), 220); } };
    if (t.dataset.tab) { go(t.dataset.tab); return; }
    if (t.dataset.go) { go(t.dataset.go); return; }
    if (t.dataset.open) { app.SHEETS[t.dataset.open]?.(); return; }
    if (t.hasAttribute('data-toast')) { const a = toastAction; $('#toast').innerHTML = ''; toastAction = null; a?.run(); return; }
    for (const h of app.clicks) if (h(t)) return;
    if (t.dataset.act) { app.ACTIONS[t.dataset.act]?.(); return; }
    if (t.hasAttribute('data-close') && (t === e.target || t.classList.contains('close'))) app.closeSheet();
  });
  document.addEventListener('change', e => { for (const h of app.changes) if (h(e.target)) return; });
  document.addEventListener('input', e => { for (const h of app.inputs) if (h(e.target)) return; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && host.innerHTML) app.closeSheet(); });
  const sun = on => { document.documentElement.classList.toggle('sun', on); $('#sol').setAttribute('aria-pressed', String(on)); requestAnimationFrame(() => app.drawMaps?.()); };
  $('#sol').addEventListener('click', () => { const on = !saved().sunMode; store.update({ sunMode: on }); sun(on); toast(on ? 'Sol: contraste alto para a luz do dia.' : 'Sol desligado.'); });
  sun(!!saved().sunMode);
  new window.ResizeObserver(() => app.cur && app.drawMaps()).observe($('#view'));
  render();
  document.documentElement.dataset.ready = '1';
  return { render, toast, get state() { return { ...ui, cur: app.cur }; } };
}
