// 3.0 · ligação da tela: estado, plano do lote, navegação e eventos. Toda conta vem do planner (motor 2).
// 3.1 (U02): cada tela no seu arquivo (screen-*.mjs); aqui fica só o que é comum a todas. O plano só é recalculado
// quando muda o que ele usa (estado gravado, lote ou bloco): trocar de aba não refaz conta.
import { createStore, safeStorage } from './store.mjs';
import * as P from './planner.mjs';
import * as V from './views.mjs';
import * as VMa from './views-mapa.mjs';
import * as VMo from './views-monitor.mjs';
import * as VP from './views-plano.mjs';
import { esc, num } from './format.mjs';
import { offlineStatus } from './offline.mjs';
import { createSchmidtSessionLock, installSchmidtSessionLifecycle } from '../platform/browser-session-lock.mjs';
import { installMapa } from './screen-mapa.mjs';
import { installMonitor } from './screen-monitor.mjs';
import { installPlano } from './screen-plano.mjs';
import { installLotes } from './screen-lotes.mjs';
import { installMais } from './screen-mais.mjs';
import { installBloco } from './screen-bloco.mjs';

/** Entra na sessão (trava entre abas da 2.x) e só então lê o estado e desenha. */
export async function startApp(opts) {
  const session = createSchmidtSessionLock(opts.window.navigator.locks);
  try { await session.enter(); } catch { /* sem trava: segue só leitura se a sessão disser que não pode gravar */ }
  installSchmidtSessionLifecycle(opts.window, session);
  const app = runApp({ ...opts, session });
  registerWorker(opts.window, app.toast, app.setOffline);
  return app;
}

/** 3.12 · versão nova: o service worker novo fica esperando (nunca troca sozinho no meio do uso). Quando ele está pronto,
 *  aparece "Atualizar" no topo (no lugar da palavra SCHMIDT) e um aviso; um toque troca e recarrega. Escondido durante a guia (CSS). */
/** @param {any} window @param {any} toast @param {(st:any)=>void} setOffline */
function registerWorker(window, toast, setOffline) {
  const sw = window.navigator.serviceWorker;
  if (!sw || !/^https?:$/.test(window.location.protocol)) return;
  const doc = window.document, had = !!sw.controller;
  let asked = false;
  const offer = (/** @type {any} */ waiting) => {
    if (!waiting || !sw.controller || doc.getElementById('upd')) return;
    const b = doc.createElement('button'); b.id = 'upd'; b.type = 'button';
    b.innerHTML = '<span class="sr">Versão nova pronta: </span><b>Atualizar</b>';
    b.addEventListener('click', () => { asked = true; b.disabled = true; b.querySelector('b').textContent = 'Atualizando…'; waiting.postMessage({ type: 'schmidt-atualizar' }); });
    doc.querySelector('header .logo')?.after(b);
    toast('Versão nova pronta. Toque em Atualizar no topo quando puder.');
  };
  // 3.24 · selo "pronto sem internet": confere o cache quando o worker fica ativo. Na 1ª visita (página ainda sem
  // worker), avisa uma vez quando termina de guardar; nas outras só atualiza o selo do menu Mais
  let told = false;
  const check = () => offlineStatus(window.caches, window.location.href).then(st => {
    setOffline(st);
    if (st.state === 'pronto' && !had && !told) { told = true; toast('Pronto para usar sem internet.'); }
  });
  sw.ready.then(check); sw.addEventListener('controllerchange', () => setTimeout(check, 500));
  sw.register('sw.js').then((/** @type {any} */ reg) => {
    offer(reg.waiting);
    reg.addEventListener('updatefound', () => { const nw = reg.installing; nw?.addEventListener('statechange', () => { if (nw.state === 'installed') offer(nw); }); });
  }).catch(() => { /* sem service worker: funciona só com internet */ });
  sw.addEventListener('controllerchange', () => {
    if (asked) window.location.reload();
    else if (had) toast('Nova versão instalada.', { label: 'Recarregar', run: () => window.location.reload() });
  });
}

/** @param {{document:any, window:any, fields:any, appVersion:string, culturas?:any, recs?:any, session:any}} opts */
function runApp({ document, window, fields, appVersion, culturas = null, recs = null, session }) {
  const $ = s => document.querySelector(s);
  let blockedShown = false;
  // C2: sem armazenamento (modo privado restrito) o app abre igual, só não guarda depois de fechar.
  const { storage, persistent } = safeStorage(() => window.localStorage);
  // 3.12: depois de restaurar uma cópia, nada mais grava até o app recarregar (uma recomendação que chegasse do motor
  // nesse meio-tempo gravaria por cima o estado antigo que ainda está na memória)
  let frozen = false;
  const store = createStore(storage, { canWrite: () => !frozen && session.canWrite(),
    onBlocked: () => { if (!frozen && !blockedShown) { blockedShown = true; toast(session.writeError().userMessage); } },
    // C3: não finge que gravou
    onFail: () => toast('Não foi possível gravar neste aparelho (memória cheia ou bloqueada). Nada foi alterado.') });
  const keys = Object.keys(fields).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  const ui = { view: 'mapa', key: fields[store.get().fieldKey] ? store.get().fieldKey : keys[0] };
  const recCache = new Map();
  // U05: recomendações da regra padrão já vêm calculadas no arquivo (mesmo motor; conferidas no teste)
  if (recs?.motor === P.ENGINE_LABEL) for (const [k, r] of Object.entries(recs.recs || {})) if (fields[k]) recCache.set(`${k}|{}|${recs.pessoas}|false`, r);
  let toastTimer = 0;
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
  // 5.0 · "Pessoas" saiu da tela: não muda o plano recomendado (0 de 357 casos medidos). Valor interno fixo (mesmo das
  // recomendações prontas do arquivo), e "limitar à equipe" desligado (1 tiro = 1 pessoa)
  const people = () => 5;
  /** Recomendação do lote. Vem pronta do arquivo (regra padrão) ou é montada no motor em segundo plano (motor.js,
   *  Web Worker): a tela não trava; enquanto isso o lote mostra o plano gravado e "calculando o recomendado".
   *  Sem worker (navegador antigo ou arquivo local): recomendação base na hora e equilíbrio aos poucos. */
  const recId = (base, key) => `${key}|${JSON.stringify(base)}|${people()}|false`;
  /** @type {Map<string, {field:any, base:any, key:string, fns:Function[]}>} */ const pending = new Map();
  /** @type {any} */ let worker = null;
  try {
    if (/^https?:$/.test(window.location.protocol) && window.Worker) {
      worker = new window.Worker('motor.js');
      worker.onmessage = e => { const { id, rec, error } = e.data || {}; const p = pending.get(id); if (!p) return; pending.delete(id); done(id, error ? P.recommendBase(p.field, p.base, people(), false) : rec, p); };
      worker.onerror = () => { worker = null; for (const [id, p] of [...pending]) { pending.delete(id); done(id, P.recommend(p.field, p.base, people(), false), p); } };
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
      if (!pending.has(id)) { pending.set(id, { field, base, key, fns: [] }); worker.postMessage({ id, field, base, people: people(), fitTeam: false }); }
      return null;
    }
    const first = P.recommendBase(field, base, people(), false);
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
  let ignorePop = 0;
  /** Contexto comum: cada tela (screen-*.mjs) lê daqui e registra as suas folhas, ações e eventos. */
  /** @type {any} */ const app = {
    document, window, fields, keys, ui, store, storage, persistent, session, culturas, appVersion, host,
    cur: null, hiTrack: null, toast, saved, people, recFor, whenRec, render, setParams,
    /** Recomendação já pronta (sem calcular), ou undefined. */
    /** Recomendação já pronta ou feita na hora (para listas e bloco, que precisam do valor já). */
    recNow: (field, base, key = ui.key) => recFor(field, base, key) ?? P.recommendBase(field, base, people(), false),
    peekRec: (field, base, key = ui.key) => recCache.get(recId(base, key)),
    SHEETS: {}, ACTIONS: {}, clicks: [], changes: [], inputs: [], onLotChange: [], onCloseSheet: [],
    // 3.13 (X3) · janela aberta ocupa uma entrada no histórico: o Voltar do celular fecha a janela em vez de sair do app
    openSheet: (title, body) => {
      if (!host.innerHTML) { try { window.history.pushState({ sheet: 1 }, ''); } catch { /* sem histórico: fecha só pelo ×/Esc */ } }
      host.innerHTML = V.sheet(title, body); host.querySelector('.close')?.focus();
    },
    closeSheet: (fromBack = false) => {
      const was = !!host.innerHTML;
      host.innerHTML = ''; for (const f of app.onCloseSheet) f();
      if (was && !fromBack && window.history.state?.sheet) { ignorePop++; window.history.back(); }
    },
    clearInvalid: () => { warnedInvalid = null; },
    /** Para de gravar até recarregar (usado ao restaurar uma cópia). */
    freeze: (on = true) => { frozen = on; },
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
    // 5.0 · plano com ajuste avançado (saiu da tela) volta ao recomendado e grava; avisa uma vez
    let legacy = false;
    if (P.legacyAdvanced(params)) { legacy = true; params = undefined; edits = undefined; const ed = { ...(st.editsByField || {}) }; delete ed[ui.key]; store.update({ editsByField: ed }); }
    let tried = params ? P.tryPlan(field, params, edits) : null;
    if (tried?.error) { invalid = tried.error; params = undefined; edits = undefined; tried = null; }
    const base = P.baseOf(params);
    const rec = recFor(field, base);
    if (!params && rec) { params = { ...base, ...rec.chosen.params }; if (!invalid) store.update({ paramsByField: { ...(st.paramsByField || {}), [ui.key]: params } }); }
    const sc = tried?.sc || P.planInUse(field, params || base, edits);
    if (legacy && warnedInvalid !== ui.key) { warnedInvalid = ui.key; setTimeout(() => toast(`O plano gravado de ${field.code} usava ajustes avançados (saíram na 5.0): agora é o recomendado.`), 0); }
    if (invalid && warnedInvalid !== ui.key) { warnedInvalid = ui.key; setTimeout(() => toast(`O plano gravado de ${field.code} não abre (${invalid}). Mostrando o recomendado.`), 0); }
    const blind = P.uncovered(field, sc), list = P.checks(sc, blind), split = null;
    // 3.8 · bordadura na conferência: o ponto mais perto da borda (atenção se a menos do mínimo)
    const bd = P.borderStats(field, sc);
    if (bd) list.push(bd.minM < P.BORDA_MIN_M ? { level: 'alerta', text: `Ponto ${bd.min.number} (${bd.min.trackId}) a ${num(bd.minM)} m da borda (mínimo ${P.BORDA_MIN_M} m)` }
      : bd.minM < P.BORDADURA_M ? { level: 'ok', text: `Ponto ${bd.min.number} a ${num(bd.minM)} m da borda (bordadura do plantio: ${P.BORDADURA_M} m)` }
        : { level: 'ok', text: `Bordadura ok (≥ ${num(bd.minM)} m da borda)` });
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
    render();
    toast(msg, { label: 'Desfazer', run: () => { if (write(before.params, before.edits ?? null)) { ui.key = key; render(); toast('Desfeito'); } } });
    return true;
  }
  function render() {
    const main = $('#view');
    // Redesenhar a mesma aba não fecha o que a pessoa abriu nem perde a rolagem (tiro aberto, Conferir, Equipe).
    const same = main.dataset.view === ui.view, sc = main.querySelector('.scroll');
    const keep = same ? { open: [...main.querySelectorAll('details[data-k][open]')].map(d => d.dataset.k), top: sc ? sc.scrollTop : 0 } : null;
    try {
      draw(main);
      if (keep) {
        for (const d of main.querySelectorAll('details[data-k]')) if (keep.open.includes(d.dataset.k)) d.open = true;
        const s2 = main.querySelector('.scroll'); if (s2 && keep.top) s2.scrollTop = keep.top;
      }
    } catch (e) {
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
    $('#titulo').textContent = `SCHMIDT CAMPO · ${c.field.code} · ${({ lotes: 'Lotes', mapa: 'Mapa', plano: 'Plano', monitorar: 'Monitorar' })[ui.view] || ''}`;
    for (const a of document.querySelectorAll('[data-tab]')) { const on = a.dataset.tab === ui.view; a.classList.toggle('on', on); a.setAttribute('aria-current', on ? 'page' : 'false'); }
    main.dataset.view = ui.view; app.applySnap?.();
    if (ui.view === 'mapa') main.innerHTML = VMa.mapaView(c);
    else if (ui.view === 'plano') main.innerHTML = VP.planoView({ ...c, haPerPoint: String(c.params.haPerPoint ?? P.DEFAULT_PARAMS.haPerPoint).replace('.', ','), hiTrack: app.hiTrack, bigMap: !!app.planBig, hint: c.block ? null : app.hint?.(), border: (b => (b ? { minM: b.minM, n: b.min.number, near: b.minM < P.BORDADURA_M, low: b.minM < P.BORDA_MIN_M } : null))(P.borderStats(c.field, c.sc)),
      rows: c.sc.trackRows.map(r => ({ ...r, d: c.block ? null : (c.details ??= new Map()).get(r.trackId) ?? c.details.set(r.trackId, P.trackDetail(c.field, c.sc, r.trackId)).get(r.trackId) })) });
    else if (ui.view === 'lotes') main.innerHTML = app.lotesView();
    else main.innerHTML = VMo.monitorView(app.monitorData());
    app.requestDraw();
  }

  // 4.0-c · folha sobre o mapa com 3 alturas (baixa, meia, cheia), só no design 4.0: arrastar pela alça escolhe a mais
  // perto (ou segue o gesto rápido); tocar na alça alterna. O mapa redesenha o lote acima da folha.
  const SNAPS = ['baixa', 'meia', 'cheia'];
  app.snap = 'meia';
  const applySnap = () => { const m = $('#view'); if (app.isDesign4?.()) m.dataset.snap = app.snap; else delete m.dataset.snap; };
  const afterSnap = () => setTimeout(() => app.drawMaps?.(), 300);
  app.ACTIONS['sheet-cycle'] = () => { app.snap = SNAPS[(SNAPS.indexOf(app.snap) + 1) % SNAPS.length]; applySnap(); afterSnap(); };
  /** @type {any} */ let drag = null;
  document.addEventListener('pointerdown', e => {
    const g = e.target.closest?.('.grabber'); if (!g || !app.isDesign4?.()) return;
    const sheet = g.closest('.scroll'), host = $('#view').getBoundingClientRect();
    drag = { sheet, y0: e.clientY, h0: sheet.getBoundingClientRect().height, H: host.height, t0: performance.now(), moved: false };
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    // a tela pode ser redesenhada no meio do arraste (recomendação que chega do motor): segue com a folha nova
    if (!drag.sheet.isConnected) { const s2 = $('.map.sm+.scroll'); if (!s2) { drag = null; return; } drag.sheet = s2; }
    const dy = e.clientY - drag.y0; if (Math.abs(dy) > 6) drag.moved = true;
    if (drag.moved) drag.sheet.style.setProperty('height', `${Math.max(120, Math.min(drag.H - 8, drag.h0 - dy))}px`);
  });
  document.addEventListener('pointerup', e => {
    if (!drag) return;
    const d = drag; drag = null; if (!d.moved) return;
    if (!d.sheet.isConnected) d.sheet = $('.map.sm+.scroll') || d.sheet;
    const h = d.sheet.getBoundingClientRect().height, v = (d.y0 - e.clientY) / Math.max(1, performance.now() - d.t0); // px/ms, + = para cima
    const targets = { baixa: 0.34 * d.H, meia: 0.56 * d.H, cheia: d.H - 8 };
    let pick = Object.entries(targets).sort((a, b) => Math.abs(a[1] - h) - Math.abs(b[1] - h))[0][0];
    if (Math.abs(v) > 0.6) pick = SNAPS[Math.max(0, Math.min(2, SNAPS.indexOf(app.snap) + (v > 0 ? 1 : -1)))]; // gesto rápido: próxima altura
    d.sheet.style.removeProperty('height'); app.snap = pick; applySnap(); afterSnap();
    // o arraste não vira clique na alça (só o clique que vem logo em seguida, se vier)
    const eat = ev => { ev.stopPropagation(); ev.preventDefault(); };
    document.addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', eat, { capture: true }), 350);
  });
  app.applySnap = applySnap;

  // cada tela registra o que é seu
  installBloco(app); installMapa(app); installMonitor(app); installPlano(app); installMais(app); installLotes(app);

  // ---------- eventos (um ouvinte por tipo; cada tela responde pelos seus botões e campos) ----------
  let tabTimer = 0;
  document.addEventListener('click', e => {
    const t = e.target.closest('button,a,[data-close]');
    if (!t) return;
    // 3.4: troca de aba com entrada suave do conteúdo (180 ms, só na troca; "reduzir movimento" desliga no CSS). A tela é
    // montada na hora: a animação é só de entrada, não atrasa nada
    // 4.0-f · troca de aba: a animação leve de sempre (não bloqueia o toque). A View Transition do 4.0-e foi retirada:
    // durante os ~0,2 s dela os toques não chegam à tela (medido no teste do mapa), pior que o visual anterior
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
  window.addEventListener('popstate', () => { if (ignorePop) { ignorePop--; return; } if (host.innerHTML) app.closeSheet(true); });
  const sun = on => { document.documentElement.classList.toggle('sun', on); $('#sol').setAttribute('aria-pressed', String(on)); app.requestDraw?.(); };
  $('#sol').addEventListener('click', () => { const on = !saved().sunMode; store.update({ sunMode: on }); sun(on); toast(on ? 'Sol: contraste alto para a luz do dia.' : 'Sol desligado.'); });
  sun(!!saved().sunMode);
  // 4.0 · design novo em prévia, atrás de uma chave (Mais → Design 4.0): liga e desliga na hora, sem mexer no plano
  const design4 = on => { if (on) document.documentElement.dataset.design = '4'; else delete document.documentElement.dataset.design; app.requestDraw?.(); };
  // 4.0-f · o 4.0 é o padrão (aprovado em 20/11, depois de empatar ou ganhar em cada medida); o visual anterior fica como
  // reserva por uma versão (Mais → Visual anterior), gravado como design '3'
  // 4.2 · o visual anterior (reserva da 4.0) saiu: o 4.0 é o único
  app.isDesign4 = () => true;
  design4(true);
  new window.ResizeObserver(() => app.cur && app.requestDraw()).observe($('#view'));
  render();
  document.documentElement.dataset.ready = '1';
  // 3.24 · selo "pronto sem internet" (o service worker é registrado fora daqui)
  app.offline = { state: window.navigator.serviceWorker && /^https?:$/.test(window.location.protocol) ? 'baixando' : 'sem' };
  return { render, toast, setOffline: (/** @type {any} */ st) => { app.offline = st; }, get state() { return { ...ui, cur: app.cur }; } };
}
