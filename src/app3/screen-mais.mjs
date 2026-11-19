// 3.1 (U02) · menu Mais e folhas: escolher lote (busca e recentes), todos os lotes, dados do lote, como foi calculado,
// versões anteriores e cópia de segurança.
import * as P from './planner.mjs';
import * as V from './views.mjs';
import { esc, num } from './format.mjs';
import { makeBackup, readBackup, ITEM_LABELS } from './backup.mjs';
import { createSchmidtBackupService } from '../persistence/backup-service.mjs';
import { createSchmidtJournal, createSchmidtImageRepository } from '../platform/browser-backup-adapters.mjs';
import { explainScenario } from '../engine3/explain.mjs';
import { assessField } from '../engine3/dataQuality.mjs';

const RECENT_KEY = 'schmidt3.recentes', LAST_BACKUP = 'schmidt3.ultimaCopia';

/** @param {any} app */
export function installMais(app) {
  const { window, fields, keys, ui, store, storage, versions, safra } = app;
  const recents = () => { try { return JSON.parse(storage.getItem(RECENT_KEY) || '[]').filter(k => fields[k]); } catch { return []; } };
  const pushRecent = k => { try { storage.setItem(RECENT_KEY, JSON.stringify([k, ...recents().filter(x => x !== k)].slice(0, 4))); } catch { /* sem armazenamento: só não lembra */ } };
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
  /** Plano salvo (ou recomendado) de um lote, para a visão geral; guardado até o plano do lote mudar. */
  const rowCache = new Map();
  function lotRow(k, st) {
    const f = fields[k], params = st.paramsByField?.[k] ?? { ...app.recNow(f, {}, k).chosen.params }, edits = st.editsByField?.[k];
    const id = `${k}|${JSON.stringify(params)}|${JSON.stringify(edits ?? null)}`;
    if (!rowCache.has(id)) {
      let row;
      try { const sc = P.planInUse(f, params, edits); row = { key: k, code: f.code, farm: f.farm, pontos: sc.samples.length, tiros: sc.selected.length, p95: sc.coverage.p95, alerts: sc.warnings.filter(w => w.level !== 'info').length }; }
      catch { row = { key: k, code: f.code, farm: f.farm, pontos: 0, tiros: 0, p95: null, alerts: 1 }; }
      rowCache.set(id, row);
    }
    return rowCache.get(id);
  }
  app.lotRow = lotRow;
  /** U05: a visão geral é montada em partes de ~30 ms, com o progresso na tela: o celular não trava e dá para fechar. */
  let allRun = 0;
  function openAll() {
    const run = ++allRun, st = app.saved(), rows = [];
    let i = 0;
    app.openSheet('Todos os lotes', `<p class="mu" data-prog>Calculando… 0 de ${keys.length}</p>`);
    const step = () => {
      if (run !== allRun || !app.host.querySelector('[data-prog]')) return;
      const t0 = performance.now();
      while (i < keys.length && performance.now() - t0 < 30) rows.push(lotRow(keys[i++], st));
      if (i < keys.length) { app.host.querySelector('[data-prog]').textContent = `Calculando… ${i} de ${keys.length}`; setTimeout(step, 0); }
      else app.openSheet('Todos os lotes', V.allLotsBody(rows));
    };
    setTimeout(step, 0);
  }

  // ---------- cópia de segurança (mesmo formato da 2.x) ----------
  const backupService = window.indexedDB && app.persistent ? createSchmidtBackupService({ storage, images: createSchmidtImageRepository(window.indexedDB), history: versions.history, journal: createSchmidtJournal(window.indexedDB),
    exclusive: window.navigator.locks ? op => app.session.exclusive(op) : op => op() }) : null;
  /** @type {any} */ let pendingRestore = null;
  const lastBackup = () => { try { const t = storage.getItem(LAST_BACKUP); return t ? new Date(+t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''; } catch { return ''; } };
  const stamp = () => { const d = new Date(), z = v => String(v).padStart(2, '0'); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}`; };
  const toBase64 = blob => new Promise((ok, ko) => { const r = new window.FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => ko(r.error); r.readAsDataURL(blob); });
  const fromBase64 = (b, type) => { const s = window.atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: type || 'image/png' }); };
  async function doBackup() {
    if (!backupService) throw Error('este navegador não guarda dados locais');
    return makeBackup({ service: backupService, subtle: window.crypto.subtle, encodeBlob: toBase64, version: app.appVersion, engine: P.ENGINE_LABEL });
  }

  Object.assign(app.SHEETS, {
    menu: () => app.openSheet('Mais', `<div class="brand"><img src="marca-logo.png" alt="SCHMIDT" width="88" height="88"><span><b>SCHMIDT Campo</b><small>Planejamento de amostragem · versão ${app.appVersion}</small></span></div>` + V.menuBody([['arquivos', 'Arquivos e fichas'], ['dados', 'Dados do lote'], ['calculo', 'Como foi calculado'], ['versoes', 'Versões anteriores'],
      ['copia', 'Cópia de segurança'], ['abrir', 'Abrir plano recebido']])),
    todos: openAll,
    versoes: async () => { app.openSheet(`Versões · ${app.cur.field.code}`, '<p class="mu">…</p>'); const rows = await versions.list(ui.key); app.openSheet(`Versões · ${app.cur.field.code}`, V.versionsBody(rows)); },
    copia: () => app.openSheet('Cópia de segurança', V.backupBody('', lastBackup())),
    lote: () => app.openSheet('Escolher lote', lotPicker()),
    dados: () => app.openSheet(`Dados · ${app.cur.field.code}`, V.dadosBody(app.cur.field, assessField(app.cur.field), safra?.data?.[ui.key], safra?.source)),
    calculo: () => app.openSheet('Como foi calculado', V.calculoBody(explainScenario(app.cur.sc, app.cur.field))),
  });
  Object.assign(app.ACTIONS, {
    async backup() {
      try { const b = await doBackup(); app.download(JSON.stringify(b), `schmidt_copia_${stamp()}.json`, 'application/json'); try { storage.setItem(LAST_BACKUP, String(Date.now())); } catch { /* só não lembra */ } app.toast('Cópia de segurança baixada.'); }
      catch (e) { app.toast(`Cópia não feita: ${/** @type {Error} */ (e).message}.`); }
    },
    'restore-pick': () => window.document.querySelector('#backup-input').click(),
    async 'restore-go'() {
      if (!pendingRestore) return;
      try { const before = await doBackup(); app.download(JSON.stringify(before), `schmidt_antes_de_restaurar_${stamp()}.json`, 'application/json'); } catch { /* sem cópia anterior possível: segue com o diário de restauração */ }
      try {
        const b = pendingRestore;
        if (!backupService) return;
        await backupService.restore({ data: b.dados, images: b.imagens.map(i => ({ key: i.chave, rec: { blob: fromBase64(i.base64, i.tipo), name: i.nome, world: i.world, width: i.largura, height: i.altura, crs: i.crs } })), history: b.historico || [], legacy: !!b.legado });
        app.toast('Restaurado. Abrindo de novo…'); setTimeout(() => window.location.reload(), 600);
      } catch (e) { app.toast(`Falha ao restaurar: ${/** @type {Error} */ (e).message}.`); }
    },
  });
  app.clicks.push(t => {
    if (t.dataset.ver) { versions.list(ui.key).then(rows => { const r = rows.find(x => String(x.id) === t.dataset.ver); if (r?.estado?.params) { app.closeSheet(); app.setParams(r.estado.params, 'Versão anterior em uso', r.estado.edits ?? null); } }); return true; }
    if (t.dataset.lot) {
      for (const f of app.onLotChange) f();
      ui.key = t.dataset.lot; pushRecent(ui.key); store.update({ fieldKey: ui.key }); app.closeSheet(); app.render(); return true;
    }
    return false;
  });
  app.changes.push(t => {
    if (t.id !== 'backup-input' || !t.files?.[0]) return false;
    t.files[0].text().then(text => readBackup(text, window.crypto.subtle)).then(({ backup, items }) => { pendingRestore = backup; app.openSheet('Restaurar cópia', V.backupBody(V.restoreConfirm(items, ITEM_LABELS), lastBackup())); })
      .catch(err => app.toast(`Cópia recusada: ${err.message}.`)).finally(() => { t.value = ''; });
    return true;
  });
  app.inputs.push(t => { if (!t.hasAttribute?.('data-search')) return false; app.host.querySelector('[data-lots]').innerHTML = lotList(t.value); return true; });
  backupService?.recover().catch(() => app.toast('Restauração anterior incompleta: faça uma nova cópia.'));
  pushRecent(ui.key);
}
