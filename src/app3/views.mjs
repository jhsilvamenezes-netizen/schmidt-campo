// 3.0 · telas em HTML (sem estilo inline: CSP). Recebem dados prontos do planner; não calculam nada.
import { esc, num, km } from './format.mjs';

export const ICONS = {
  mapa: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  plano: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  enviar: '<path d="M4 12l16-8-6 16-3-7z"/><path d="M11 13l9-9"/>',
  lotes: '<path d="M3 7l6-3 6 2 6-2v13l-6 3-6-2-6 2z"/><path d="M9 4l-1 16M15 6l1 16M3 13l18-1"/>',
  monitorar: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" class="fill"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  mais: '<circle cx="5" cy="12" r="1.6" class="fill"/><circle cx="12" cy="12" r="1.6" class="fill"/><circle cx="19" cy="12" r="1.6" class="fill"/>',
};
export const icon = name => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

const metric = (label, value) => `<div class="m"><small>${label}</small><b>${esc(value)}</b></div>`;
export const metrics = f => `<div class="m3">${metric('Entre tiros', f.entreTiros)}${metric('Entre pontos', f.entrePontos)}${metric('95% do lote', f.p95)}</div>`;
const chip = (level, text) => `<span class="chip ${level}">${esc(text)}</span>`;

/** Selo do lote: alertas do motor (dados) ou "Sem alertas". */
export function badge(sc) {
  const e = sc.warnings.filter(w => w.level === 'erro').length, a = sc.warnings.filter(w => w.level === 'alerta').length;
  return e ? chip('erro', e === 1 ? '1 erro' : `${e} erros`) : a ? chip('alerta', a === 1 ? '1 alerta' : `${a} alertas`) : chip('ok', 'Sem alertas');
}

export const mapaView = ({ f, sc }) => `<div class="map" data-map="full"></div>
<section class="sheet"><div class="grab"></div><div class="row-sb"><p class="big">${num(f.pontos)} pontos <span>· ${num(f.tiros)} tiros</span></p><button class="badge" data-open="dados">${badge(sc)}</button></div>
<p class="mu">95% do lote ${esc(f.p95)} · caminhada ${esc(f.caminhada)}</p><button class="btn p" data-go="plano">Ver plano</button></section>`;

/** Legenda do mapa (como na 2.5): cada medida com a marca da sua cor no desenho. */
export function legend(field, f, areas, showGap = false) {
  const ha = areas ? (Math.abs(areas.maxHa - areas.minHa) < 0.05 ? `${num(areas.minHa, 1)}` : `${num(areas.minHa, 1)} a ${num(areas.maxHa, 1)}`) : null;
  return `<div class="leg"><b>${esc(field.code)} · ${num(field.areaOfficialHa, 1)} ha</b>
<span><i class="sw t" aria-hidden="true"></i>Entre tiros <b>${esc(f.entreTiros)}</b></span>
<span><i class="sw p" aria-hidden="true"></i>Entre pontos <b>${esc(f.entrePontos.replace('–', ' a '))}</b></span>
${ha ? `<span><i class="sw a" aria-hidden="true"></i>Cada ponto <b>${ha} ha</b></span>` : ''}${showGap && areas?.worstGapM ? `<span><i class="sw v" aria-hidden="true"></i>Maior vazio <b>${num(areas.worstGapM)} m</b></span>` : ''}</div>`;
}

/** 3.8 · ferramentas do mapa num canto: enquadrar, onde estou e o botão de camadas (abre o painel). Sem quadro fixo de
 *  medidas sobre o mapa: elas ficam no painel e no Plano. */
const LAYER_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17.5l9 5 9-5" opacity=".55"/></svg>';
const sw = (act, label, on, hint = '') => `<button class="lrow" data-act="${act}" role="switch" aria-checked="${!!on}"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span><i class="tg" aria-hidden="true"></i></button>`;
/** @param {any} layers @param {boolean} zoomed @param {boolean} [here] @param {boolean} [open] @param {any} [sum] */
export function mapTools(layers, zoomed, here = false, open = false, sum = null) {
  const btns = `<div class="mtools v">${zoomed ? '<button class="mt" data-act="fit" aria-label="Enquadrar o lote">⤢</button>' : ''}<button class="mt" data-act="where" aria-label="Onde estou" aria-pressed="${here}">◎</button>`
    + `<button class="mt lyr" data-act="layers" aria-expanded="${open}" aria-label="Camadas e medidas">${LAYER_ICON}</button></div>`;
  if (!open || !sum) return btns;
  const row = (k, v, cls = '') => `<div class="lsum${cls}"><span>${k}</span><b>${v}</b></div>`;
  return btns + `<div class="lpanel" role="dialog" aria-label="Camadas e medidas"><p class="lh">${esc(sum.code)} · ${num(sum.ha, 1)} ha</p>
${row('Entre tiros', esc(sum.entreTiros))}${row('Entre pontos', esc(sum.entrePontos.replace('–', ' a ')))}${sum.cada ? row('Cada ponto', `${sum.cada} ha`) : ''}${row('Maior vazio', `${num(sum.vazio)} m`)}${row('Mais perto da borda', `${num(sum.borda)} m · ponto ${num(sum.bordaPt)}`, sum.borda < sum.bordMin ? ' al' : '')}
<p class="lh">Camadas</p>${sw('layer-medidas', 'Medidas no mapa', layers.medidas, 'entre tiros e entre pontos')}${sw('layer-areas', 'Área de cada ponto', layers.areas, 'e onde fica o maior vazio')}${sw('layer-borda', 'Bordadura', layers.borda, 'distância das pontas até a borda')}${sw('layer-grade', 'Grade em metros', layers.grade, 'um quadrado = a escala')}</div>`;
}

const stepper = (id, label, hint, value) => `<div class="step"><label for="${id}">${label}${hint ? `<small>${hint}</small>` : ''}</label><div class="stp">
<button data-dec="${id}" aria-label="Diminuir ${label.toLowerCase()}">−</button><input id="${id}" inputmode="numeric" value="${esc(value)}"><button data-inc="${id}" aria-label="Aumentar ${label.toLowerCase()}">+</button></div></div>`;

/** Sugestão do motor pronta (ganho e "Aplicar") ou o botão para calcular na hora. Também trocada sozinha, sem redesenhar a tela. */
export const hintMarkup = hint => (hint ? `<button class="sug" data-act="minimax"><span class="x"><b>Sugestão do motor</b><small class="sub">${esc(hint.text)}</small></span><span class="go">Aplicar</span></button>` : '<button class="lnk" data-act="minimax">Melhorar a distribuição dos pontos</button>');

/** @param {any} o */
export function planoView({ f, sc, haPerPoint, people, rec, inUseIsRec, rows, busy, block, hiTrack = null, list = [], split = null, hint = null, border = null }) {
  if (block) return blockPlanoView({ f, sc, rows, block });
  const alts = (rec?.alternatives || []).filter(a => a);
  return `<div class="map sm" data-map="small"></div><div class="scroll">
<section class="card">${stepper('ha', 'Hectares por ponto', `mínimo ${num(sc.minPoints)} pontos`, haPerPoint)}<div class="presets" role="group" aria-label="Regras comuns">${[10, 15, 20, 25, 30].map(v => `<button data-ha-set="${v}" aria-pressed="${String(v) === String(haPerPoint)}">${v} ha</button>`).join('')}</div>${stepper('people', 'Pessoas', '', people)}
<div class="seg" role="group" aria-label="Planejar"><button class="on" aria-pressed="true">Lote</button><button data-open="bloco" aria-pressed="false">Bloco</button></div></section>
<section class="card"><div class="row-sb"><h2 class="h">${inUseIsRec ? 'Plano recomendado' : 'Plano em uso'}</h2>${inUseIsRec ? '<span class="tag">em uso</span>' : rec ? '<button class="link" data-use="rec">Usar recomendado</button>' : '<span class="mu">calculando o recomendado…</span>'}</div>
${metrics(f)}<p class="mu">Caminhada ${esc(f.caminhada)}${f.tiros ? ` · ${km(sc.route.totalEstimatedM / f.tiros)} km por tiro` : ''}${border ? (border.near ? ` · <span class="warn">ponto ${num(border.n)} a ${num(border.minM)} m da borda</span>` : ` · borda a ${num(border.minM)} m ou mais`) : ''}</p>${busy ? '<p class="mu">Calculando…</p>' : ''}
<div data-hint>${hintMarkup(hint)}</div></section>
${trackRows(rows, hiTrack)}
${checkAndTeam(list, split)}
<section class="card list"><h2 class="h">Outras opções</h2>${alts.length ? alts.map((a, i) => `<div class="li"><span class="x">${num(a.m.tiros)} tiros · ${num(a.m.pontos)} pontos<br><small>95% &lt; ${num(a.m.p95M)} m · ${num(a.m.caminhadaKm, 1)} km${a.id === 'equipe' ? ' · igual por pessoa' : ''}</small></span><button class="use" data-alt="${i}">Usar</button></div>`).join('') : '<p class="mu">Sem outra opção melhor.</p>'}
<button class="lnk" data-open="ajustes">Ajustes avançados</button><button class="lnk" data-open="calculo">Como foi calculado</button></section></div>`;
}

/** Equipe: cada pessoa com o(s) tiro(s) inteiro(s), pontos e entrada. */
const teamList = split => split.pessoas.map((p, i) => `<div class="li"><span class="id">${esc(p.tarefas.map(t => t.id).join('+'))}</span><span class="x"><b>Pessoa ${i + 1}</b><small class="sub">${esc(p.tarefas.map(t => `pontos\u00a0${t.de ?? '—'}–${t.ate ?? '—'}${t.entra ? ` · entra a ${t.entra}` : ''}`).join(' · '))}</small></span><span class="r">${km(p.m)} km</span></div>`).join('');

/** Conferência e equipe no Plano (antes na aba Enviar): fechadas, com o resumo à vista. */
export function checkAndTeam(list, split) {
  const ok = list.filter(c => c.level === 'ok').length, all = ok === list.length;
  const kms = split ? split.pessoas.map(p => p.m / 1000) : [];
  return `<details class="card fold"><summary class="sumc"><span class="x"><b>${all ? 'Plano conferido' : 'Conferir o plano'}</b><small class="sub">${esc(list.filter(c => c.level !== 'ok').map(c => c.text).join(' · ') || list.map(c => c.text).slice(0, 2).join(' · '))}</small></span>${chip(all ? 'ok' : 'alerta', `${ok} de ${list.length}`)}</summary>${list.map(c => `<p class="ck ${c.level}">${esc(c.text)}</p>`).join('')}</details>`
    + (split ? `<details class="card fold list"><summary class="sumc"><span class="x"><b>Equipe</b><small class="sub">${num(split.pessoas.length)} ${split.pessoas.length === 1 ? 'pessoa' : 'pessoas'} · ${num(Math.min(...kms), 1)} a ${num(Math.max(...kms), 1)} km cada</small></span></summary>${teamList(split)}</details>` : '');
}

/** Folha "Arquivos e fichas" (menu): enviar o plano, fichas impressas, resumo e arquivos de GPS/SIG. */
export const arquivosBody = () => `<button class="btn p" data-act="share">Compartilhar o plano</button>
<div class="two"><button class="btn" data-act="fichas">Fichas de campo</button><button class="btn" data-act="copy">Copiar resumo</button></div>
<p class="center"><button class="link" data-act="gpx">GPX</button> · <button class="link" data-act="kml">KML</button> · <button class="link" data-act="csv">CSV</button> · <button class="link" data-act="geojson">GeoJSON</button></p>
<p class="status" role="status" id="status"></p>`;

export const sheet = (title, body) => `<div class="ov" data-close><section class="sheet menu" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div><div class="row-sb"><h2 class="big md">${esc(title)}</h2><button class="close" data-close aria-label="Fechar">×</button></div>${body}</section></div>`;

export const menuBody = items => items.map(([id, label]) => `<button class="lnk" data-open="${id}">${esc(label)}</button>`).join('');

const dateBR = d => (d ? d.split('-').reverse().join('/') : '—');
export function dadosBody(field, findings, safra, source) {
  const c = safra?.cadastro || {}, st = safra?.stand || {}, rain = safra?.chuva || [], mm = rain.reduce((a, r) => a + (r.mm || 0), 0);
  const rows = [['Área publicada', `${num(field.areaOfficialHa, 2)} ha`], ['Desenho (KML)', field.areaKMLHa ? `${num(field.areaKMLHa, 2)} ha` : '—'],
    ['Rumo da planilha', Number.isFinite(field.bearing) ? `${num(field.bearing, 1)}°` : '—']];
  if (safra) rows.push(['Cultivar', c.variety || '—'], ['Sistema', c.system || '—'], ['Plantio', c.sowingStart ? `${dateBR(c.sowingStart)}${c.sowingEnd && c.sowingEnd !== c.sowingStart ? ` a ${dateBR(c.sowingEnd)}` : ''}` : '—'],
    ['Sementes/ha', c.seedsHa ? num(c.seedsHa) : '—'], ['Germinação', c.germinationFraction ? `${num(c.germinationFraction * 100)}%` : '—'],
    ['Stand', st.plantsHa ? `${num(st.plantsHa)} pl/ha (meta ${num(st.goalPlantsHa)})` : 'não medido'], ['Chuva registrada', rain.length ? `${num(mm, 1)} mm em ${rain.length} registros` : '—']);
  return `<dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
${findings.length ? findings.map(x => `<p class="ck ${x.level === 'info' ? 'info' : x.level}">${esc(x.message)}</p>`).join('') : '<p class="ck ok">Sem alertas nos dados do lote.</p>'}
<p class="mu">Limites do KML 2024/25, não homologados.${source ? ` Safra: ${esc(source.filename)} (${dateBR(source.asOf)}).` : ''}</p>`;
}

export const calculoBody = steps => steps.map(s => `<details class="ex"><summary>${esc(s.etapa)}</summary>${s.texto.map(t => `<p>${esc(t)}</p>`).join('')}</details>`).join('');

/** Guia por GPS: escolha do tiro, seta, distância e avisos. Sem marcação de coleta. */
export function monitorView({ lot = '', acc = null, tracks, trackId, flipped, active, model, steps, heading = null, voice = false, canSpeak = false }) {
  const pick = `<div class="chips" role="group" aria-label="Tiro">${tracks.map(t => `<button class="chipb${t.id === trackId ? ' on' : ''}" data-track="${esc(t.id)}" aria-pressed="${t.id === trackId}">${esc(t.id)}${t.person ? `<small>${esc(t.person)}</small>` : ''}</button>`).join('')}</div>`;
  const head = `<section class="card">${pick}<div class="row-sb"><p class="mu">Sentido: ${flipped ? 'invertido' : 'do plano'}</p><button class="link" data-act="flip">Inverter</button></div></section>`;
  if (!active) return `<div class="map sm" data-map="guide"></div><div class="scroll">${head}<button class="btn p" data-act="gps-start">Iniciar guia</button><button class="btn" data-act="gpx-track">GPX do ${esc(trackId || 'tiro')} (para outro app de GPS)</button>
<details class="ex card trk"><summary class="sumc">Roteiro sem GPS</summary>${steps.map(t => `<p>${esc(t)}</p>`).join('')}</details></div>`;
  const cur = tracks.find(t => t.id === trackId), m = model;
  // seta pequena ao lado da distância: o mapa (grande, acima) fica livre para contornar e se orientar
  // com bússola, a seta aponta para onde andar com o celular na mão; sem ela, norte para cima
  const rel = Number.isFinite(m.azimuth) ? (Number.isFinite(heading) ? (((m.azimuth - Number(heading)) % 360) + 360) % 360 : m.azimuth) : null;
  const arrow = rel === null ? '' : `<svg class="arrow" viewBox="-30 -30 60 60" aria-hidden="true"><circle r="28"/><g data-az="${m.azimuth.toFixed(1)}" transform="rotate(${rel.toFixed(0)})"><path d="M0 -20L12 13L0 6L-12 13Z"/></g></svg>`;
  // 3.4 · modo navegação: mapa em tela cheia (topo some), etiqueta do tiro e do GPS por cima do mapa, barra de progresso,
  // distância grande e botões grandes (luva, sol, uma mão)
  const pr = m.progress, gps = acc === null ? '' : `<span class="gps ${acc <= 5 ? 'ok' : acc <= 15 ? 'al' : 'er'}">GPS ± ${num(acc)} m</span>`;
  const bar = pr ? `<div class="prog" role="img" aria-label="${pr.done} de ${pr.total} pontos">${Array.from({ length: pr.total }, (_, i) => `<i class="${i < pr.done ? 'd' : i === pr.done ? 'n' : ''}"></i>`).join('')}</div>` : '';
  return `<div class="map nav" data-map="guide"></div><div class="navpill"><b>${esc(lot)} · ${esc(trackId)}</b>${cur?.person ? `<span>${esc(cur.person)}</span>` : ''}${gps}</div><section class="sheet gsheet">${bar}
<div class="guide ${m.state}" aria-live="polite">${arrow}<div class="gtxt"><p class="mu">${esc(m.title)}${pr ? ` <b class="cnt">${pr.done}/${pr.total}</b>` : ''}</p>${m.big ? `<p class="big">${esc(m.big)}${m.dir ? ` <span class="dir">${esc(m.dir)}</span>` : ''}</p>` : ''}${m.info ? `<p class="mu">${esc(m.info)}</p>` : ''}${rel === null ? '' : `<p class="mu sm" data-compass-label>${Number.isFinite(heading) ? 'seta pelo celular' : 'seta com o norte para cima'}</p>`}</div></div>
${(m.warn || []).map(w => `<p class="ck alerta">${esc(w)}</p>`).join('')}
<div class="two gbtns">${canSpeak ? `<button class="btn" data-act="voice" aria-pressed="${voice}">${voice ? 'Voz ligada' : 'Ligar voz'}</button>` : `<button class="btn" data-act="flip">Inverter</button>`}<button class="btn stop" data-act="gps-stop">Parar guia</button></div></section>`;
}

/** Versões anteriores do lote (mais recente primeiro). */
export const versionsBody = rows => (rows.length ? rows.map((r, i) => `<div class="li"><span class="x">${new Date(r.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}<br><small>${esc(r.resumo || '')}</small></span>${i === 0 ? '<span class="tag">atual</span>' : `<button class="use" data-ver="${r.id}">Usar</button>`}</div>`).join('')
  : '<p class="mu">Nenhuma versão guardada ainda neste aparelho. Elas são guardadas sozinhas quando o plano para de mudar.</p>');

export const backupBody = (info, last) => `<p class="mu">Tudo deste aparelho num arquivo: planos, ajustes, versões e imagens.${last ? ` Última cópia: ${esc(last)}.` : ''}</p>
<button class="btn p" data-act="backup">Fazer cópia de segurança</button><button class="btn" data-act="restore-pick">Restaurar de um arquivo</button>${info || ''}`;

export const restoreConfirm = (items, labels) => `<div class="card"><p><b>Esta cópia traz:</b></p>${Object.entries(items).filter(([, v]) => v).map(([k, v]) => `<p class="ck info">${num(v)} ${esc(labels[k] || k)}</p>`).join('') || '<p class="mu">Nada além das configurações.</p>'}
<p class="mu">O estado atual deste aparelho é baixado antes, por segurança.</p><button class="btn p" data-act="restore-go">Restaurar agora</button></div>`;

/** Todos os lotes: pontos, tiros e alertas do plano salvo (ou recomendado). */
export const allLotsBody = rows => `<div class="card list">${rows.map(r => `<button class="li lotrow" data-lot="${esc(r.key)}"><span class="id">${esc(r.code)}</span><span class="x">${num(r.pontos)} pontos · ${num(r.tiros)} tiros<br><small>${esc(r.farm)} · 95% &lt; ${num(r.p95)} m</small></span><span class="r">${r.alerts ? `<span class="chip alerta">${r.alerts}</span>` : '<span class="chip ok">ok</span>'}</span></button>`).join('')}</div>`;

/** Fichas de campo (impressão): uma por tiro, com o roteiro em passos e a tabela de pontos. */
export function fichasMarkup(field, routes, people, mapFor) {
  return routes.map(r => `<section class="ficha"><header><h1>${esc(field.code)} · ${esc(field.farm)} — Tiro ${esc(r.trackId)}${people.get(r.trackId) ? ` · ${esc(people.get(r.trackId))}` : ''}</h1>
<p>${num(r.totalLengthM)} m dentro do lote · ${num(r.nPoints)} pontos · SIMULAÇÃO: pontos planejados</p></header><div class="fmap">${mapFor(r.trackId)}</div>
<table><thead><tr><th>Ponto</th><th>nº</th><th>Desde a entrada</th><th>Do anterior</th><th>Passos</th></tr></thead><tbody>${r.points.map(p => `<tr><td>${p.seq}</td><td>${p.number}</td><td>${p.fromEntryM == null ? '—' : `${num(p.fromEntryM)} m`}</td><td>${p.deltaM == null ? '—' : `${num(p.deltaM)} m`}</td><td>${p.steps ?? '—'}</td></tr>`).join('')}</tbody></table>
<ol>${r.instructions.map(t => `<li>${esc(t)}</li>`).join('')}</ol></section>`).join('');
}

/** U04 · lista de tiros que abre cada um, como na 2.5: régua (borda → pontos → borda), vizinhos e por onde entrar. */
const ruler = steps => `<div class="ruler" aria-label="Distâncias ao longo do tiro">${steps.map(st => `<span class="rs"><b>${esc(String(st.de === 'borda' ? 'borda' : st.de))}</b><i>${num(st.m)} m</i></span>`).join('')}<span class="rs"><b>borda</b></span></div>`;
function trackRows(rows, hiTrack) {
  return `<section class="card list"><h2 class="h">Tiros</h2>${rows.map(r => {
    const d = r.d, head = `<span class="id">${esc(r.trackId)}</span><span class="x">${num(r.lengthM)} m <small>· ${r.n === 1 ? '1 ponto' : `${num(r.n)} pontos`}</small></span><span class="r">${r.medianGapM ? `a cada ${num(r.medianGapM)} m` : r.n ? '1 ponto' : 'sem ponto'}</span>`;
    if (!d) return `<div class="li">${head}</div>`;
    const on = hiTrack === r.trackId;
    return `<details class="trk"${on ? ' open' : ''}><summary class="li">${head}</summary><div class="trkb">
${d.parts.map((pt, i) => `${d.parts.length > 1 ? `<p class="mu sm">Parte ${i + 1} · ${num(pt.lengthM)} m</p>` : ''}<p class="mu sm">Entra a ${esc(pt.entra)} e anda para ${esc(pt.anda)}</p>${ruler(pt.steps)}`).join('')}
${d.neighbors.length ? `<p class="mu sm">${d.neighbors.length > 1 ? 'Tiros vizinhos' : 'Tiro vizinho'}: ${d.neighbors.map(nb => `${esc(nb.id)} a ${num(nb.m)} m`).join(' · ')} (de lado)</p>` : ''}
<button class="link" data-hitrack="${esc(r.trackId)}" aria-pressed="${on}">${on ? 'Destacado no mapa' : 'Ver no mapa'}</button></div></details>`;
  }).join('')}</section>`;
}

const tracksList = rows => `<section class="card list"><h2 class="h">Tiros</h2>${rows.map(r => `<div class="li"><span class="id">${esc(r.trackId)}</span><span class="x">${num(r.lengthM)} m <small>· ${r.n === 1 ? '1 ponto' : `${num(r.n)} pontos`}</small></span><span class="r">${r.medianGapM ? `a cada ${num(r.medianGapM)} m` : r.n ? '1 ponto' : 'sem ponto'}</span></div>`).join('')}</section>`;

function blockPlanoView({ f, sc, rows, block }) {
  return `<div class="map sm" data-map="small"></div><div class="scroll">
<section class="card"><div class="row-sb"><h2 class="h">Bloco ${esc(block.title)}</h2><button class="link" data-act="block-leave">Sair do bloco</button></div>
<div class="chips">${block.members.map(m => `<button class="chipb${m.on ? ' on' : ''}" data-lot="${esc(m.key)}" aria-pressed="${m.on}">${esc(m.code)}<small>${num(m.pontos)} pontos</small></button>`).join('')}</div>
<p class="mu">Tiros na mesma grade: ${num(block.passes)} passadas da barra (${num(block.spacingM)} m), mesma direção e mesmo ponto A.</p></section>
<section class="card"><h2 class="h">${esc(f.pontos ? sc.field.code : '')} no bloco</h2>${metrics(f)}<p class="mu">Caminhada ${esc(f.caminhada)}</p></section>
${tracksList(rows)}<section class="card list"><button class="lnk" data-open="calculo">Como foi calculado</button></section></div>`;
}

/** Escolha do bloco e, depois de preparado, as opções por espaçamento. */
export function blockPickBody(groups, prepared, busy) {
  if (busy) return '<p class="mu">Preparando a grade comum…</p>';
  if (prepared) {
    const pct = r => `${num((r - 1) * 100, 1)}%`;
    const tol = num((prepared.tolerance ?? 0) * 100, 0), anyOk = prepared.alternatives.some(a => !a.summary.coverageTradeoff);
    const worst = prepared.alternatives.reduce((m, a) => (a.summary.worstRatio < (m?.summary.worstRatio ?? Infinity) ? a : m), null);
    // sem opção: diz por quê e o que fazer, em vez de uma lista sem botão
    const none = anyOk ? '' : `<p class="ck alerta">Nenhuma grade comum mantém a cobertura destes lotes: a melhor ainda perde ${pct(worst.summary.worstRatio)} em ${esc(worst.summary.worstCode)}. Os espaçamentos ideais dos lotes são diferentes demais — planeje cada lote no próprio plano.</p>`;
    return `${none}<p class="mu">Mesma regra de pontos; os lotes passam a usar a mesma grade de tiros. Só dá para usar a opção que mantém a cobertura de cada lote (diferença de até ${tol}%).</p>
${prepared.alternatives.map((a, i) => [a, i]).sort((x, y) => Number(y[0].chosen) - Number(x[0].chosen)).map(([a, i]) => { const m = a.summary; return `<div class="li"><span class="x">${num(m.passes)} passadas · ${num(m.tracks)} tiros · ${num(m.points)} pontos${m.added ? ` (+${num(m.added)})` : ''}${a.chosen ? ' <b>· recomendada</b>' : ''}<br><small>${m.coverageTradeoff ? `perde cobertura em ${esc(m.worstCode)} (${pct(m.worstRatio)})` : m.worstRatio > 1 + 1e-6 ? `cobertura mantida (diferença de ${pct(m.worstRatio)} em ${esc(m.worstCode)})` : 'cobertura igual ou melhor em todos'}</small></span>${m.coverageTradeoff ? '' : `<button class="use" data-block-use="${i}">Usar</button>`}</div>`; }).join('')}`;
  }
  return groups.length ? groups.map((g, i) => `<button class="lnk" data-block="${i}">${esc(g.title)}</button>`).join('') : '<p class="mu">Este lote não tem vizinho com a mesma referência A/B.</p>';
}
