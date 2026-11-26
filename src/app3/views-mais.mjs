// 3.24 · menu Mais e Arquivos em HTML (dados, cálculo, versões, cópia, lotes, fichas, vitrine). Sem DOM.
import { esc, num } from './format.mjs';

/** 5.0 · dados do lote só com o essencial: área, cultura e variedade (2ª safra quando houver), rumo e alertas reais. */
export function dadosBody(field, findings, cult) {
  const rows = [['Área', `${num(field.areaOfficialHa, 2)} ha`], ['Cultura', cult?.cultura || 'a confirmar'], ['Variedade', cult?.variedade || 'a confirmar'],
    ...(cult?.segundaSafra ? [['2ª safra', cult.segundaSafra]] : []), ['Rumo da planilha', Number.isFinite(field.bearing) ? `${num(field.bearing, 1)}°` : '—']];
  const alerts = findings.filter(x => x.level !== 'info');
  return `<dl class="dl">${rows.map(([k, val]) => `<dt>${k}</dt><dd>${esc(val)}</dd>`).join('')}</dl>
${alerts.map(x => `<p class="ck ${x.level}">${esc(x.message)}</p>`).join('')}`;
}

export const calculoBody = steps => steps.map(s => `<details class="ex"><summary>${esc(s.etapa)}</summary>${s.texto.map(t => `<p>${esc(t)}</p>`).join('')}</details>`).join('');

/** Todos os lotes: pontos, tiros e alertas do plano salvo (ou recomendado). */
export const allLotsBody = rows => `<div class="card list">${rows.map(r => `<button class="li lotrow" data-lot="${esc(r.key)}"><span class="id">${esc(r.code)}</span><span class="x">${num(r.pontos)} pontos · ${num(r.tiros)} tiros<br><small>${esc(r.farm)} · 95% &lt; ${num(r.p95)} m</small></span><span class="r">${r.alerts ? `<span class="chip alerta">${r.alerts === 1 ? '1 aviso' : `${r.alerts} avisos`}</span>` : '<span class="chip ok">ok</span>'}</span></button>`).join('')}</div>`;

