// 3.0 · ajustes avançados: formulário curto, valores conferidos pelo catálogo do motor (mesmos limites da 2.x).
import { checkParams } from '../engine3/paramCatalog.mjs';
import { DEFAULT_PARAMS } from '../engine3/params.mjs';
import { esc, num } from './format.mjs';

const POINT_MODES = [['total', 'Pelo tamanho do tiro'], ['por_tiro', 'Mesmo número por tiro'], ['espacamento', 'Pela distância']];
const EDGES = [['meia_margem', 'Meio intervalo'], ['margens_iguais', 'Iguais'], ['margem_fixa', 'Fixa']];
const val = (p, k) => p[k] ?? DEFAULT_PARAMS[k];

const numberRow = (id, label, value, unit, hint = '') => `<label class="fr"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span><span class="in"><input name="${id}" inputmode="decimal" value="${value == null ? '' : esc(String(value).replace('.', ','))}">${unit ? `<i>${unit}</i>` : ''}</span></label>`;
const choice = (id, label, opts, cur) => `<fieldset class="fr col"><legend>${label}</legend><div class="seg s${opts.length}">${opts.map(([v, t]) => `<button type="button" data-set="${id}" data-v="${v}" class="${v === cur ? 'on' : ''}" aria-pressed="${v === cur}">${t}</button>`).join('')}</div></fieldset>`;

/** Formulário dos ajustes a partir dos parâmetros em uso e do cenário (para mostrar o efeito real). */
export function advancedForm(params, sc, fitTeam) {
  const pm = val(params, 'pointMode'), edge = val(params, 'edgePolicy');
  return `<form class="adv" data-adv novalidate>
${numberRow('trackSpacingM', 'Distância máxima entre tiros', val(params, 'trackSpacingM'), 'm', `no plano: ${num(sc.deltaM)} m · ${num(sc.selected.length)} tiros`)}
<label class="sw-row"><span>Tiros em múltiplos da barra</span><input type="checkbox" name="alignToBoom" ${val(params, 'alignToBoom') ? 'checked' : ''}></label>
${numberRow('boomWidthM', 'Largura da barra', val(params, 'boomWidthM'), 'm')}
${choice('pointMode', 'Repartir os pontos', POINT_MODES, pm)}
${pm === 'total' ? numberRow('totalPoints', 'Total de pontos', params.totalPoints, '', `vazio = mínimo (${num(sc.minPoints)})`) : ''}
${pm === 'por_tiro' ? numberRow('pointsPerTrack', 'Pontos por tiro', val(params, 'pointsPerTrack'), '') : ''}
${pm === 'espacamento' ? numberRow('targetSpacingM', 'Distância entre pontos', val(params, 'targetSpacingM'), 'm') : ''}
${choice('edgePolicy', 'Primeiro ponto a partir da borda', EDGES, edge)}
${edge === 'margem_fixa' ? numberRow('edgeMarginM', 'Margem da borda', val(params, 'edgeMarginM'), 'm') : ''}
<label class="sw-row"><span>Limitar tiros ao número de pessoas</span><input type="checkbox" name="fitTeam" ${fitTeam ? 'checked' : ''}></label>
<p class="err" role="alert" data-err></p>
<div class="two"><button type="button" class="btn" data-act="optimize">Buscar distribuição melhor</button><button type="button" class="btn" data-act="restore">Restaurar padrões</button></div>
</form>`;
}

const parseNum = t => { const s = String(t).trim().replace(/\./g, '').replace(',', '.'); return s === '' ? null : Number(s); };

/** Lê um campo do formulário e devolve {params} novos ou {error}. Nulo onde o catálogo aceita vazio. */
export function applyField(params, name, raw) {
  const next = { ...params };
  if (name === 'alignToBoom') next.alignToBoom = !!raw;
  else if (name === 'pointMode' || name === 'edgePolicy') next[name] = raw;
  else {
    const v = parseNum(raw);
    if (v === null && name !== 'totalPoints') return { error: 'Informe um número.' };
    if (v !== null && !Number.isFinite(v)) return { error: 'Informe um número.' };
    next[name] = v;
  }
  const problems = checkParams(next).filter(p => p.field === name);
  return problems.length ? { error: problems[0].message } : { params: next };
}
