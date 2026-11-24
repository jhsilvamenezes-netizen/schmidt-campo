// 3.24 · aba Plano em HTML (resultado, ajustes, tiros, equipe e bloco). Sem DOM; recebe dados prontos.
import { esc, num, km, plural } from './format.mjs';
import { GRAB, chip, metrics } from './views.mjs';


const stepper = (id, label, hint, value) => `<div class="step"><label for="${id}">${label}${hint ? `<small>${hint}</small>` : ''}</label><div class="stp">
<button data-dec="${id}" aria-label="Diminuir ${label.toLowerCase()}">−</button><input id="${id}" inputmode="numeric" value="${esc(value)}"><button data-inc="${id}" aria-label="Aumentar ${label.toLowerCase()}">+</button></div></div>`;

/** Sugestão do motor pronta (ganho e "Aplicar") ou o botão para calcular na hora. Também trocada sozinha, sem redesenhar a tela. */
export const hintMarkup = hint => (hint?.r ? `<button class="sug" data-act="minimax"><span class="x"><b>Distribuir melhor os pontos</b><small class="sub">${esc(hint.text)}</small></span><span class="go">Aplicar</span></button>` : '<button class="lnk" data-act="minimax">Melhorar a distribuição dos pontos</button>')
  // 3.15 · lote irregular: 1 ponto acima do mínimo, quando encurta de verdade o maior vazio ou o 95%
  + (hint?.plus ? `<button class="sug" data-act="plus1"><span class="x"><b>${hint.plus.reason === 'meio' ? 'Sugestão' : hint.plus.reason === 'vazio' ? 'Ponto no maior vazio' : 'Lote irregular'}: ${hint.plus.n} pontos (1 a mais)</b><small class="sub">${esc(hint.plus.text)}</small></span><span class="go">Usar</span></button>` : '');

/** @param {any} o */
export function planoView({ f, sc, haPerPoint, people, rec, inUseIsRec, rows, busy, block, hiTrack = null, list = [], split = null, hint = null, border = null, bigMap = false }) {
  if (block) return blockPlanoView({ f, sc, rows, block });
  const alts = (rec?.alternatives || []).filter(a => a);
  return `<div class="map sm${bigMap ? ' big' : ''}" data-map="small"></div><div class="scroll">${GRAB}
<section class="card res"><div class="row-sb"><h2 class="h">${inUseIsRec ? 'Plano recomendado' : 'Plano em uso'}</h2>${inUseIsRec ? '<span class="tag">em uso</span>' : rec ? '<button class="link" data-use="rec">Usar recomendado</button>' : '<span class="mu sk">calculando o recomendado…</span>'}</div>
<p class="big">${plural(f.pontos, 'ponto', 'pontos')} <span>· ${plural(f.tiros, 'tiro', 'tiros')}</span></p>${metrics(f)}<p class="mu">Caminhada ${esc(f.caminhada)}${border ? (border.near ? ` · <span class="${border.low ? 'warn' : 'note'}">ponto ${num(border.n)} a ${num(border.minM)} m da borda</span>` : ` · borda ≥ ${num(border.minM)} m`) : ''}</p>${busy ? '<p class="mu"><span class="sk">Calculando…</span></p>' : ''}
<div data-hint>${hintMarkup(hint)}</div></section>
<section class="card regra">${stepper('ha', 'Hectares por ponto', `mínimo ${num(sc.minPoints)} pontos`, haPerPoint)}<div class="presets" role="group" aria-label="Regras comuns">${[10, 15, 20, 25, 30].map(v => `<button data-ha-set="${v}" aria-pressed="${String(v) === String(haPerPoint)}">${v} ha</button>`).join('')}</div>${stepper('people', 'Pessoas', '', people)}
<div class="seg" role="group" aria-label="Planejar"><button class="on" aria-pressed="true">Lote</button><button data-open="bloco" aria-pressed="false">Bloco</button></div></section>
${trackRows(rows, hiTrack)}
${checkAndTeam(list, split)}
<section class="card list"><h2 class="h">Outras opções</h2>${alts.length ? alts.map((a, i) => `<div class="li"><span class="x">${plural(a.m.tiros, 'tiro', 'tiros')} · ${plural(a.m.pontos, 'ponto', 'pontos')}<br><small>95% &lt; ${num(a.m.p95M)} m · ${num(a.m.caminhadaKm, 1)} km${a.id === 'equipe' ? ' · igual por pessoa' : ''}</small></span><button class="use" data-alt="${i}">Usar</button></div>`).join('') : '<p class="mu">Sem outra opção melhor.</p>'}
<button class="lnk" data-open="ajustes">Ajustes avançados</button><button class="lnk" data-open="calculo">Como foi calculado</button></section></div>`;
}

/** Equipe: cada pessoa com o(s) tiro(s) inteiro(s), pontos e entrada. */
const teamList = split => split.pessoas.map((p, i) => `<div class="li"><span class="id">${esc(p.tarefas.map(t => t.id).join('+'))}</span><span class="x"><b>Pessoa ${i + 1}</b><small class="sub">${esc(p.tarefas.map(t => `pontos\u00a0${t.de ?? '—'}–${t.ate ?? '—'}${t.entra ? ` · entra a ${t.entra}` : ''}`).join(' · '))}</small></span><span class="r">${km(p.m)} km</span></div>`).join('');

/** Conferência e equipe no Plano (antes na aba Enviar): fechadas, com o resumo à vista. */
export function checkAndTeam(list, split) {
  const ok = list.filter(c => c.level === 'ok').length, all = ok === list.length;
  const kms = split ? split.pessoas.map(p => p.m / 1000) : [];
  return `<details class="card fold" data-k="conf"><summary class="sumc"><span class="x"><b>${all ? 'Plano conferido' : 'Conferir o plano'}</b><small class="sub">${esc(list.filter(c => c.level !== 'ok').map(c => c.text).join(' · ') || list.map(c => c.text).slice(0, 2).join(' · '))}</small></span>${chip(all ? 'ok' : 'alerta', `${ok} de ${list.length}`)}</summary>${list.map(c => `<p class="ck ${c.level}">${esc(c.text)}</p>`).join('')}</details>`
    + (split ? `<details class="card fold list" data-k="equipe"><summary class="sumc"><span class="x"><b>Equipe</b><small class="sub">${num(split.pessoas.length)} ${split.pessoas.length === 1 ? 'pessoa' : 'pessoas'} · ${num(Math.min(...kms), 1)} a ${num(Math.max(...kms), 1)} km cada</small></span></summary>${teamList(split)}</details>` : '');
}

/** U04 · lista de tiros que abre cada um, como na 2.5: régua (borda → pontos → borda), vizinhos e por onde entrar. */
const ruler = steps => `<div class="ruler" aria-label="Distâncias ao longo do tiro">${steps.map(st => `<span class="rs"><b>${esc(String(st.de === 'borda' ? 'borda' : st.de))}</b><i>${num(st.m)} m</i></span>`).join('')}<span class="rs"><b>borda</b></span></div>`;
function trackRows(rows, hiTrack) {
  return `<section class="card list"><h2 class="h">Tiros</h2>${rows.map(r => {
    const d = r.d, head = `<span class="id">${esc(r.trackId)}</span><span class="x">${num(r.lengthM)} m <small>· ${r.n === 1 ? '1 ponto' : `${num(r.n)} pontos`}</small></span><span class="r">${r.medianGapM ? `a cada ${num(r.medianGapM)} m` : r.n ? '1 ponto' : 'sem ponto'}</span>`;
    if (!d) return `<div class="li">${head}</div>`;
    const on = hiTrack === r.trackId;
    return `<details class="trk" data-k="trk:${esc(r.trackId)}"${on ? ' open' : ''}><summary class="li">${head}</summary><div class="trkb">
${d.parts.map((pt, i) => `${d.parts.length > 1 ? `<p class="mu sm">Parte ${i + 1} · ${num(pt.lengthM)} m</p>` : ''}<p class="mu sm">Entra a ${esc(pt.entra)} e anda para ${esc(pt.anda)}</p>${ruler(pt.steps)}`).join('')}
${d.neighbors.length ? `<p class="mu sm">${d.neighbors.length > 1 ? 'Tiros vizinhos' : 'Tiro vizinho'}: ${d.neighbors.map(nb => `${esc(nb.id)} a ${num(nb.m)} m`).join(' · ')} (de lado)</p>` : ''}
<button class="link" data-hitrack="${esc(r.trackId)}" aria-pressed="${on}">${on ? 'Destacado no mapa' : 'Ver no mapa'}</button></div></details>`;
  }).join('')}</section>`;
}

const tracksList = rows => `<section class="card list"><h2 class="h">Tiros</h2>${rows.map(r => `<div class="li"><span class="id">${esc(r.trackId)}</span><span class="x">${num(r.lengthM)} m <small>· ${r.n === 1 ? '1 ponto' : `${num(r.n)} pontos`}</small></span><span class="r">${r.medianGapM ? `a cada ${num(r.medianGapM)} m` : r.n ? '1 ponto' : 'sem ponto'}</span></div>`).join('')}</section>`;

function blockPlanoView({ f, sc, rows, block }) {
  return `<div class="map sm" data-map="small"></div><div class="scroll">${GRAB}
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
