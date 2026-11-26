// 3.24 · menu Mais e Arquivos em HTML (dados, cálculo, versões, cópia, lotes, fichas, vitrine). Sem DOM.
import { esc, num } from './format.mjs';

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

/** Todos os lotes: pontos, tiros e alertas do plano salvo (ou recomendado). */
export const allLotsBody = rows => `<div class="card list">${rows.map(r => `<button class="li lotrow" data-lot="${esc(r.key)}"><span class="id">${esc(r.code)}</span><span class="x">${num(r.pontos)} pontos · ${num(r.tiros)} tiros<br><small>${esc(r.farm)} · 95% &lt; ${num(r.p95)} m</small></span><span class="r">${r.alerts ? `<span class="chip alerta">${r.alerts === 1 ? '1 aviso' : `${r.alerts} avisos`}</span>` : '<span class="chip ok">ok</span>'}</span></button>`).join('')}</div>`;

