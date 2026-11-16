// Motor 2 · explicação do plano, etapa por etapa (reescrita do módulo explain do motor 0.5.1).
import { internalGap } from './sampling.mjs';
import { EDGE_POLICY, POINT_MODE, SELECTION_MODE, TRACK_MODE } from './vocab.mjs';
import { LEVEL } from './diagnostics.mjs';
import { numBR } from './numero.mjs';

const int = v => numBR(Math.round(v)), one = v => numBR(v, 1, 1), two = v => numBR(v, 2, 2);
const plural = (n, singular, pluralForm) => `${n} ${n === 1 ? singular : pluralForm}`;
/** Regularidade dos intervalos pelo coeficiente de variação. */
export const regularityWord = cv => (cv == null ? 'sem intervalos' : cv < 0.05 ? 'muito regular' : cv < 0.15 ? 'regular' : 'irregular');

export function explainScenario(sc, field) {
  const p = sc.params, steps = [], add = (etapa, lines) => steps.push({ etapa, texto: lines.filter(Boolean) });
  add('Lote e mínimo de pontos', [
    `${field.code} tem ${two(field.areaOfficialHa)} ha (área publicada).`,
    `Regra: 1 ponto a cada ${int(p.haPerPoint)} ha, arredondando para cima: ${two(field.areaOfficialHa)} ÷ ${int(p.haPerPoint)} = ${one(field.areaOfficialHa / p.haPerPoint)} → mínimo de ${sc.minPoints} pontos.`,
    field.isSoy ? '' : 'Atenção: essa regra foi informada para soja; nesta cultura o mínimo é só uma referência.',
  ]);
  const inside = sc.tracksInside.length;
  const trackLines = p.trackMode === TRACK_MODE.CIRCULAR
    ? [`Pivô: tiros em anéis ao redor do centro, a cada ${one(sc.deltaM)} m${sc.passes ? ` (${sc.passes} larguras de barra de ${two(p.boomWidthM)} m)` : ''}.`,
      `${plural(inside, 'anel cruza', 'anéis cruzam')} o lote. É uma estimativa, não o rastro real da máquina.`]
    : p.trackMode === TRACK_MODE.IMPORTADO
      ? [`${plural(sc.allTracks.length, 'trajeto importado', 'trajetos importados')} de arquivo de GPS.`]
      : p.trackMode === TRACK_MODE.QUANTIDADE
        ? [`Retas na direção ${one(sc.bearing)}°. A largura do lote foi dividida em ${p.trackCount} faixas iguais de ${int(sc.deltaM)} m, com um tiro no meio de cada uma${sc.anchored ? ', ajustado para o múltiplo de barra mais próximo' : ''}.`]
        : [`Retas na direção ${one(sc.bearing)}° (${p.bearingDeg === null ? 'da planilha' : 'alterada à mão'}).`,
          sc.anchored && sc.passes
            ? `Distância máxima pedida: ${int(p.trackSpacingM)} m → ${sc.passes} larguras de barra de ${two(p.boomWidthM)} m = ${two(sc.deltaM)} m entre tiros, contadas a partir do ponto A.`
            : `Tiros a cada ${int(sc.deltaM)} m (no máximo ${int(p.trackSpacingM)} m).`];
  add('Tiros', [...trackLines, `${plural(inside, 'tiro atravessa', 'tiros atravessam')} o lote.`]);
  const split = sc.selected.filter(t => sc.units.filter(u => u.trackId === t.id).length > 1);
  add('Partes de cada tiro', [
    'Cada tiro foi cortado no limite do lote; cada parte contínua é medida sozinha (nunca se soma uma parte com outra).',
    split.length ? `${split.map(t => t.id).join(', ')} ${split.length === 1 ? 'atravessa' : 'atravessam'} áreas fora do lote e ${split.length === 1 ? 'virou' : 'viraram'} mais de uma parte.` : 'Nenhum tiro foi cortado em partes.',
    sc.discarded.length ? `${plural(sc.discarded.length, 'parte ficou', 'partes ficaram')} sem ponto por ter menos de ${int(p.minPieceM)} m: ${sc.discarded.map(d => `${d.id} (${int(d.len)} m)`).join(', ')}.` : '',
  ]);
  const ids = sc.selected.map(t => t.id).join(', ');
  add('Tiros que recebem pontos', [p.selectionMode === SELECTION_MODE.TODOS ? `Todos os ${inside} tiros recebem pontos.`
    : p.selectionMode === SELECTION_MODE.QUANTIDADE ? `Um tiro por monitor (${p.selectionCount}), espalhados pela largura do lote: ${ids}.` : `Tiros escolhidos à mão: ${ids}.`]);
  const perTrack = sc.trackRows.filter(r => r.n > 0).map(r => `${r.trackId}: ${r.n}${r.medianGapM ? ` (a cada ${int(r.medianGapM)} m)` : ''}`).join(' · ');
  const pointLines = p.pointMode === POINT_MODE.POR_TIRO
    ? [`${p.pointsPerTrack} pontos em cada tiro (${sc.samples.length} no total).`, 'Com o mesmo número de pontos, tiros mais longos ficam com pontos mais espaçados.']
    : p.pointMode === POINT_MODE.ESPACAMENTO
      ? [`Pedido: um ponto a cada ${int(p.targetSpacingM)} m. O app calculou quantos cabem em cada parte.`, sc.allocation.suggestions.length ? sc.allocation.suggestions.join(' ') : '']
      : [`Total: ${sc.samples.length} pontos${p.totalPoints === null ? ' (o mínimo)' : ` (pedido: ${p.totalPoints})`}.`,
        'Os pontos foram repartidos pelo tamanho de cada parte, para que nenhum trecho fique muito mais longe de um ponto que os outros.'];
  add('Repartição dos pontos', [...pointLines, perTrack ? `Resultado: ${perTrack}.` : '', sc.allocation.status === 'conflito' ? `Conflito: ${sc.allocation.suggestions.join(' · ')}` : '']);
  const longest = sc.longitudinal.perUnit.filter(u => u.n >= 2).sort((a, b) => b.lengthM - a.lengthM)[0];
  const gap = longest ? internalGap(longest.lengthM, longest.n, p.edgePolicy, p.edgeMarginM) : null;
  const rule = { [EDGE_POLICY.MEIA_MARGEM]: 'o 1º ponto fica a meio intervalo da borda; depois, intervalos iguais.',
    [EDGE_POLICY.MARGENS_IGUAIS]: 'a borda e os intervalos têm a mesma distância.',
    [EDGE_POLICY.MARGEM_FIXA]: `o 1º e o último ponto ficam a ${int(p.edgeMarginM)} m da borda; intervalos iguais entre eles.` }[p.edgePolicy];
  add('Posição dos pontos', [`Regra das pontas: ${rule}`,
    longest ? `Exemplo: ${longest.unitId} tem ${int(longest.lengthM)} m e ${longest.n} pontos → um ponto a cada ${int(gap)} m, o 1º a ${int(longest.startMarginM)} m da borda.` : '',
    'As distâncias são medidas andando sobre o tiro (vale também para curvas).']);
  if (sc.optimization) {
    const o = sc.optimization;
    add('Busca de distribuição melhor', [
      o.accepted ? `Aceita: a maior distância até um ponto (95% do lote) caiu de ${int(o.baseline.p95M)} m para ${int(o.optimized.p95M)} m.` : 'Mantido o plano original: a busca não melhorou sem piorar a regularidade.',
      `Limites respeitados: maior intervalo até ${int(o.limits.maxGapM ?? 0)} m e nenhuma parte sem ponto.`,
      o.moves.length ? `Pontos trocados de tiro: ${o.moves.map(m => `${m.from}→${m.to}`).join(', ')}.` : '']);
  }
  const g = sc.longitudinal.global, nErr = sc.warnings.filter(w => w.level === LEVEL.ERRO).length, nWarn = sc.warnings.filter(w => w.level === LEVEL.ALERTA).length;
  add('Resultado', [
    g.max === null ? 'Nenhum tiro tem dois pontos (sem intervalos para medir).' : `Maior distância entre dois pontos do mesmo tiro: ${int(g.max)} m. Distribuição ${regularityWord(g.cv)}.`,
    sc.coverage.p95 === null ? '' : `95% do lote fica a menos de ${int(sc.coverage.p95)} m de algum ponto.`,
    nErr || nWarn ? `Antes de ir a campo: ${plural(nErr, 'erro', 'erros')} e ${plural(nWarn, 'alerta', 'alertas')} para conferir na lista abaixo.` : 'Nenhum erro ou alerta.']);
  return steps;
}
