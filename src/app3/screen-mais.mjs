// 3.1 (U02) · menu Mais e folhas: escolher lote (busca e recentes), todos os lotes, dados do lote e como foi calculado.
// 4.2: saíram vitrine, visual anterior, arquivos e fichas, versões, qualidade do GPS e cópia (pedido do proprietário).
import * as P from './planner.mjs';
import * as V from './views.mjs';
import { offlineText } from './offline.mjs';
import * as VX from './views-mais.mjs';
import { esc, num } from './format.mjs';
import { explainScenario } from '../engine3/explain.mjs';
import { assessField } from '../engine3/dataQuality.mjs';

const RECENT_KEY = 'schmidt3.recentes';

/** @param {any} app */
export function installMais(app) {
  const { fields, keys, ui, store, storage, safra } = app;
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
      // 4.2 · plano recomendado sem ajuste: a linha já vem pronta no arquivo (mesmos números, conferidos no teste)
      const pre = !st.paramsByField?.[k] && !edits ? app.recNow(f, {}, k)?.linha : null;
      if (pre) row = { key: k, code: f.code, farm: f.farm, ...pre };
      else try { const sc = P.planInUse(f, params, edits); row = { key: k, code: f.code, farm: f.farm, pontos: sc.samples.length, tiros: sc.selected.length, p95: sc.coverage.p95, alerts: sc.warnings.filter(w => w.level !== 'info').length }; }
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
      else app.openSheet('Todos os lotes', VX.allLotsBody(rows));
    };
    setTimeout(step, 0);
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
      ['Tiros', 'Quantos tiros o lote terá. O app recomenda; você pode escolher outro número e ele recalcula: divide a largura do lote em faixas iguais, um tiro no meio de cada, na passada da barra. O rumo e o mínimo de pontos não mudam.'],
      ['95% do lote', `95% da área está a menos desta distância de um ponto${f ? ` (${f.p95})` : ''}. Quanto menor, melhor coberto.`],
      ['Maior vazio', `O lugar do lote mais longe de qualquer ponto${a ? ` (${num(a.worstGapM)} m)` : ''}. Ligue a camada Área no mapa para ver onde fica.`],
      ['Área de cada ponto', `Parte do lote mais perto de cada ponto${a ? ` (${num(a.minHa, 1)} a ${num(a.maxHa, 1)} ha)` : ''}. Quanto mais iguais, mais equilibrada a amostragem.`],
      ['Bordadura', `Faixa junto à borda do lote feita no plantio (~${P.BORDADURA_M} m). O ideal é o ponto ficar a ${P.BORDADURA_M} m ou mais da borda; abaixo de ${P.BORDA_MIN_M} m o app alerta. Lote estreito ou irregular pode não permitir${bd ? `; aqui o ponto mais perto está a ${num(bd.minM)} m` : ''}.`],
      ['Distribuir melhor os pontos', 'Melhoria calculada em segundo plano: afasta da borda, diminui o maior vazio e iguala as áreas, sem piorar a cobertura. Tem Desfazer.'],
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
    menu: () => app.openSheet('Mais', `<div class="brand"><img src="marca-logo.png" alt="SCHMIDT" width="88" height="88"><span><b class="wm">SCHMIDT CAMPO</b><small>Planejamento de amostragem</small><small>Versão ${app.appVersion}</small></span></div>`
      // 3.24 · selo: o app já está guardado no celular para abrir sem sinal?
      + `<p class="ck${app.offline?.state === 'pronto' ? '' : ' alerta'}" data-offline="${esc(app.offline?.state || 'sem')}">${esc(offlineText(app.offline?.state || 'sem'))}</p>`
      // 4.2 · só o que a equipe usa: glossário, dados do lote, como foi calculado e todos os lotes
      + V.menuBody([['glossario', 'Glossário: o que cada medida quer dizer'], ['dados', 'Dados do lote'], ['calculo', 'Como foi calculado'], ['todos', 'Todos os lotes']])),
    glossario: () => app.openSheet('Glossário', `<dl class="glos">${glossTerms().map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`),
    todos: openAll,
    lote: () => app.openSheet('Escolher lote', lotPicker()),
    dados: () => app.openSheet(`Dados · ${app.cur.field.code}`, VX.dadosBody(app.cur.field, assessField(app.cur.field), safra?.data?.[ui.key], safra?.source)),
    calculo: () => app.openSheet('Como foi calculado', VX.calculoBody(explainScenario(app.cur.sc, app.cur.field))),
  });
  app.clicks.push(t => {
    if (t.dataset.lot) {
      for (const f of app.onLotChange) f();
      ui.key = t.dataset.lot; pushRecent(ui.key); store.update({ fieldKey: ui.key }); app.closeSheet(); app.render(); return true;
    }
    return false;
  });
  app.inputs.push(t => { if (!t.hasAttribute?.('data-search')) return false; app.host.querySelector('[data-lots]').innerHTML = lotList(t.value); return true; });
  pushRecent(ui.key);
}
