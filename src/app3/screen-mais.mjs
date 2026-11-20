// 3.1 (U02) · menu Mais e folhas: escolher lote (busca e recentes), todos os lotes, dados do lote, como foi calculado,
// versões anteriores e cópia de segurança.
import * as P from './planner.mjs';
import * as V from './views.mjs';
import { offlineText } from './offline.mjs';
import { statsSummary, statsCsv } from './gps-stats.mjs';
import * as VX from './views-mais.mjs';
import { esc, num } from './format.mjs';
import { makeBackup, readBackup, ITEM_LABELS } from './backup.mjs';
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
      if (rowCache.size >= 128) rowCache.delete(rowCache.keys().next().value);
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
      else app.openSheet('Todos os lotes', VX.allLotsBody(rows));
    };
    setTimeout(step, 0);
  }

  // ---------- cópia de segurança (mesmo formato da 2.x) ----------
  const { backupService } = app;
  /** @type {any} */ let pendingRestore = null;
  const lastBackup = () => { try { const t = storage.getItem(LAST_BACKUP); return t ? new Date(+t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''; } catch { return ''; } };
  const stamp = () => { const d = new Date(), z = v => String(v).padStart(2, '0'); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}`; };
  const toBase64 = blob => new Promise((ok, ko) => { const r = new window.FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => ko(r.error); r.readAsDataURL(blob); });
  const fromBase64 = (b, type) => { const s = window.atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: type || 'image/png' }); };
  async function doBackup() {
    if (!backupService) throw Error('este navegador não guarda dados locais');
    return makeBackup({ service: backupService, subtle: window.crypto.subtle, encodeBlob: toBase64, version: app.appVersion, engine: P.ENGINE_LABEL });
  }

  // 3.9 · glossário: cada termo da tela em uma frase, com o número do lote em uso quando ajuda
  function glossTerms() {
    const cur = app.cur, f = cur ? P.figures(cur.sc) : null, a = cur ? P.pointAreas(cur.field, cur.sc) : null, bd = cur ? P.borderStats(cur.field, cur.sc) : null;
    const terms = [
      ['Tiro', 'Linha reta que a pessoa caminha dentro do lote, na direção das passadas da máquina. Cada pessoa anda o tiro inteiro.'],
      ['Passada', `Largura da barra do pulverizador (36,48 m). Os tiros ficam a um número inteiro de passadas um do outro${f ? ` — aqui, ${f.entreTiros}` : ''}.`],
      ['Ponto', 'Lugar onde se faz a amostra. O número do ponto segue a ordem de caminhada.'],
      ['Entre tiros', `Distância de lado de um tiro ao vizinho${f ? ` (${f.entreTiros})` : ''}.`],
      ['Entre pontos', `Distância andando no mesmo tiro de um ponto ao seguinte${f ? ` (${f.entrePontos})` : ''}.`],
      ['Hectares por ponto', 'A regra: 1 ponto a cada tantos hectares, arredondando para cima. Dá o mínimo de pontos do lote.'],
      ['95% do lote', `95% da área está a menos desta distância de um ponto${f ? ` (${f.p95})` : ''}. Quanto menor, melhor coberto.`],
      ['Maior vazio', `O lugar do lote mais longe de qualquer ponto${a ? ` (${num(a.worstGapM)} m)` : ''}. Ligue a camada Área no mapa para ver onde fica.`],
      ['Área de cada ponto', `Parte do lote mais perto de cada ponto${a ? ` (${num(a.minHa, 1)} a ${num(a.maxHa, 1)} ha)` : ''}. Quanto mais iguais, mais equilibrada a amostragem.`],
      ['Bordadura', `Faixa junto à borda do lote feita no plantio (~${P.BORDADURA_M} m). O ideal é o ponto ficar a ${P.BORDADURA_M} m ou mais da borda; abaixo de ${P.BORDA_MIN_M} m o app alerta. Lote estreito ou irregular pode não permitir${bd ? `; aqui o ponto mais perto está a ${num(bd.minM)} m` : ''}.`],
      ['Sugestão do motor', 'Melhoria calculada em segundo plano: afasta da borda, diminui o maior vazio e iguala as áreas, sem piorar a cobertura. Tem Desfazer.'],
      ['Simulação', 'Os pontos são planejados no app; a posição final é a que a equipe marcar em campo.'],
    ];
    return terms;
  }
  // 3.12 · "?" das medidas (Plano e painel do mapa): a frase do termo, com atalho para o glossário inteiro
  app.clicks.push(t => {
    if (!t.dataset.term) return false;
    const d = glossTerms().find(([n]) => n === t.dataset.term);
    if (d) app.openSheet(d[0], `<p class="glos1">${esc(d[1])}</p><button class="lnk" data-open="glossario">Ver o glossário inteiro</button>`);
    return true;
  });
  Object.assign(app.SHEETS, {
    menu: () => app.openSheet('Mais', `<div class="brand"><img src="marca-logo.png" alt="SCHMIDT" width="88" height="88"><span><b>SCHMIDT Campo</b><small>Planejamento de amostragem · versão ${app.appVersion}</small></span></div>`
      // 3.24 · selo: o app já está guardado no celular para abrir sem sinal?
      + `<p class="ck${app.offline?.state === 'pronto' ? '' : ' alerta'}" data-offline="${esc(app.offline?.state || 'sem')}">${esc(offlineText(app.offline?.state || 'sem'))}</p>`
      + `<button class="lrow" data-act="design4" role="switch" aria-checked="${!app.isDesign4()}"><span><b>Visual anterior (reserva)</b><small>o visual da 3.x, por mais uma versão; volta a qualquer hora</small></span><i class="tg" aria-hidden="true"></i></button>`
      + (app.isDesign4() ? '<button class="lnk" data-open="vitrine">Vitrine do design 4.0</button>' : '') + V.menuBody([['glossario', 'Glossário: o que cada medida quer dizer'], ['arquivos', 'Arquivos e fichas'], ['dados', 'Dados do lote'], ['calculo', 'Como foi calculado'], ['versoes', 'Versões anteriores'], ['gps', 'Qualidade do GPS (calibrar)'],
      ['copia', 'Cópia de segurança'], ['abrir', 'Abrir plano recebido']])),
    // 3.25 · qualidade do GPS: o que os celulares da equipe medem em campo (sem posição), para calibrar raio e precisão
    gps: () => {
      const st = app.gpsStats?.() ?? null, sm = statsSummary(st, app.cur.sc.params.monitor);
      app.openSheet('Qualidade do GPS', `<p class="mu">Contagem das leituras da guia neste aparelho: precisão, intervalo e moto ou a pé. Não guarda onde você esteve.</p>`
        + `<div class="card">${sm.lines.map(t => `<p>${esc(t)}</p>`).join('')}</div>`
        + (sm.n ? '<div class="two"><button class="btn p" data-act="gps-share">Compartilhar</button><button class="btn" data-act="gps-reset">Zerar</button></div>' : ''));
    },
    // 4.0-b · vitrine: todos os componentes num lugar só, para revisar o design 4.0 sem procurar caso a caso
    vitrine: () => app.openSheet('Vitrine do design 4.0', VX.vitrineBody()),
    glossario: () => app.openSheet('Glossário', `<dl class="glos">${glossTerms().map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`),
    todos: openAll,
    versoes: async () => {
      const key = ui.key, title = `Versões · ${fields[key].code}`;
      app.openSheet(title, '<p class="mu">…</p>');
      const sheet = app.host.firstElementChild, rows = await versions.list(key);
      if (ui.key === key && app.host.firstElementChild === sheet) app.openSheet(title, VX.versionsBody(rows));
    },
    copia: () => app.openSheet('Cópia de segurança', VX.backupBody('', lastBackup())),
    lote: () => app.openSheet('Escolher lote', lotPicker()),
    dados: () => app.openSheet(`Dados · ${app.cur.field.code}`, VX.dadosBody(app.cur.field, assessField(app.cur.field), safra?.data?.[ui.key], safra?.source)),
    calculo: () => app.openSheet('Como foi calculado', VX.calculoBody(explainScenario(app.cur.sc, app.cur.field))),
  });
  Object.assign(app.ACTIONS, {
    // 3.25 · arquivo da qualidade do GPS: compartilhar (WhatsApp etc.) quando o aparelho deixa; senão baixa
    'gps-share': async () => {
      const name = `schmidt_gps_${stamp()}.csv`, text = statsCsv(app.gpsStats?.(), app.appVersion);
      try {
        const file = typeof window.File === 'function' ? new window.File([text], name, { type: 'text/csv' }) : null;
        if (file && window.navigator.canShare?.({ files: [file] })) { await window.navigator.share({ title: 'Qualidade do GPS', files: [file] }); return; }
      } catch (/** @type {any} */ e) { if (e?.name === 'AbortError') return; }
      app.download(text, name, 'text/csv'); app.toast('Arquivo da qualidade do GPS baixado.');
    },
    'gps-reset': () => { app.resetGpsStats?.(); app.SHEETS.gps(); app.toast('Contagem do GPS zerada.'); },
    design4: () => { const on = !app.isDesign4(); app.setDesign4(on); app.SHEETS.menu(); app.toast(on ? 'Visual 4.0 de volta.' : 'Visual anterior ligado (reserva).'); },
    async backup() {
      if (store.unreadable()) {
        const raw = storage.getItem('monitoramento.v03');
        if (raw !== null) app.download(raw, `schmidt_estado_original_${stamp()}.txt`, 'text/plain');
        app.toast('Dados originais preservados para recuperação.'); return;
      }
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
        await app.freeze(); // o estado da memória é o de antes: não pode voltar a ser gravado
        await backupService.restore({ data: b.dados, images: b.imagens.map(i => ({ key: i.chave, rec: { blob: fromBase64(i.base64, i.tipo), name: i.nome, world: i.world, width: i.largura, height: i.altura, crs: i.crs } })), history: b.historico || [], legacy: !!b.legado });
        app.toast('Restaurado. Abrindo de novo…'); setTimeout(() => window.location.reload(), 600);
      } catch (e) { app.freeze(false); app.toast(`Falha ao restaurar: ${/** @type {Error} */ (e).message}.`); }
    },
  });
  app.selectLot = key => {
    if (!Object.hasOwn(fields, key)) return;
    for (const f of app.onLotChange) f();
    ui.key = key; pushRecent(key); store.update({ fieldKey: key }); app.closeSheet(); app.render();
  };
  app.clicks.push(t => {
    if (t.dataset.ver) { const key = ui.key, sheet = app.host.firstElementChild; versions.list(key).then(rows => { if (ui.key !== key || app.host.firstElementChild !== sheet) return; const r = rows.find(x => String(x.id) === t.dataset.ver); if (r?.estado?.params) { app.closeSheet(); app.setParams(r.estado.params, 'Versão anterior em uso', r.estado.edits ?? null); } }); return true; }
    if (t.dataset.lot) { app.selectLot(t.dataset.lot); return true; }
    return false;
  });
  app.changes.push(t => {
    if (t.id !== 'backup-input' || !t.files?.[0]) return false;
    t.files[0].text().then(text => readBackup(text, window.crypto.subtle)).then(({ backup, items }) => { pendingRestore = backup; app.openSheet('Restaurar cópia', VX.backupBody(VX.restoreConfirm(items, ITEM_LABELS), lastBackup())); })
      .catch(err => app.toast(`Cópia recusada: ${err.message}.`)).finally(() => { t.value = ''; });
    return true;
  });
  app.inputs.push(t => { if (!t.hasAttribute?.('data-search')) return false; app.host.querySelector('[data-lots]').innerHTML = lotList(t.value); return true; });
  pushRecent(ui.key);
}
