// 3.24 · menu Mais e Arquivos em HTML (dados, cálculo, versões, cópia, lotes, fichas, vitrine). Sem DOM.
import { esc, num } from './format.mjs';
import { metrics, sw } from './views.mjs';


/** Folha "Arquivos e fichas" (menu): enviar o plano, fichas impressas, resumo e arquivos de GPS/SIG. */
export const arquivosBody = () => `<button class="btn p" data-act="share">Compartilhar o plano</button>
<div class="two"><button class="btn" data-act="fichas">Fichas de campo</button><button class="btn" data-act="copy">Copiar resumo</button></div>
<p class="center"><button class="link" data-act="gpx">GPX</button> · <button class="link" data-act="kml">KML</button> · <button class="link" data-act="csv">CSV</button> · <button class="link" data-act="geojson">GeoJSON</button></p>
<p class="status" role="status" id="status"></p>`;

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

/** 4.0-b · vitrine dos componentes (estados lado a lado), só para revisar o design. */
export function vitrineBody() {
  const sw = ['bg', 'sf', 'sf2', 'ln', 'mu', 'ink', 'br2', 'br', 'act', 'hd', 'gold', 'ptf', 'pt', 'oks', 'ok', 'als', 'al', 'ers', 'er', 'mapbg', 'fd', 'tr'];
  return `<p class="eyebrow">Cores (tokens)</p><div class="vt-sw">${sw.map(k => `<span class="vt-c vt-${k}"><i></i>${k}</span>`).join('')}</div>
<p class="eyebrow">Números</p><p class="big">24 pontos <span>· 5 tiros</span></p>${metrics({ entreTiros: '438 m', entrePontos: '438–515 m', p95: '< 261 m' })}
<p class="eyebrow">Ações</p><button class="btn p" type="button">Ação principal</button><div class="two"><button class="btn" type="button">Secundária</button><button class="btn stop" type="button">Parar</button></div>
<div class="seg" role="group" aria-label="Exemplo"><button class="on" type="button" aria-pressed="true">Lote</button><button type="button" aria-pressed="false">Bloco</button></div>
<div class="presets" role="group" aria-label="Exemplo"><button type="button" aria-pressed="false">10 ha</button><button type="button" aria-pressed="true">20 ha</button><button type="button" aria-pressed="false">30 ha</button></div>
<div class="chips"><button class="chipb on" type="button" aria-pressed="true">T1<small>Pessoa 1</small></button><button class="chipb" type="button" aria-pressed="false">T2<small>Pessoa 2</small></button></div>
<p class="eyebrow">Estados</p><p><span class="chip ok">Sem alertas</span> <span class="chip alerta">2 alertas</span> <span class="chip erro">1 erro</span> <span class="tag">em uso</span></p>
<p class="ck ok">Pontos fora da bordadura</p><p class="ck alerta">Ponto 21 a 11 m da borda</p><p class="ck erro">Faltam 2 pontos</p>
<button class="sug" type="button"><span class="x"><b>Sugestão do motor</b><small class="sub">maior vazio 391 → 345 m</small></span><span class="go">Aplicar</span></button>
<p class="eyebrow">Lista</p><div class="li"><span class="id">T1</span><span class="x">1.990 m <small>· 4 pontos</small></span><span class="r">a cada 498 m</span></div>
<p class="mu"><span class="sk">calculando…</span></p>`;
}
