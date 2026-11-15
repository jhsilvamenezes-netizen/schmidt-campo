// Motor 2 · atalhos de parâmetros e comparação das duas formas de dividir pontos na equipe (reescrita de presets).
import { minimumPoints } from './allocation.mjs';
import { regularityWord } from './explain.mjs';
import { POINT_MODE, SELECTION_MODE, TRACK_MODE } from './vocab.mjs';

export const PRESETS = Object.freeze({
  equipe: { titulo: 'Um tiro por monitor', ajuda: 'Cada monitor caminha um tiro com o mesmo número de pontos.' },
  soja: { titulo: 'Soja padrão', ajuda: 'Todos os tiros, total = mínimo de 1 ponto a cada 20 ha.' },
  pivo: { titulo: 'Pivô (anéis)', ajuda: 'Tiros em anéis ao redor do centro do pivô.' },
  distancia: { titulo: 'Distância entre pontos', ajuda: 'Um ponto a cada 400 m ao longo dos tiros (ajustável).' },
});

export const pointsPerMonitor = (field, monitors, haPerPoint = 20) => Math.ceil(minimumPoints(field.areaOfficialHa, haPerPoint) / Math.max(1, monitors));

export function presetParams(id, field, opts = {}) {
  const monitors = Math.max(1, Math.round(opts.monitors ?? 5)), haPerPoint = opts.haPerPoint ?? 20;
  switch (id) {
    case 'equipe': return { trackMode: TRACK_MODE.QUANTIDADE, trackCount: monitors, selectionMode: SELECTION_MODE.TODOS,
      pointMode: POINT_MODE.POR_TIRO, pointsPerTrack: pointsPerMonitor(field, monitors, haPerPoint) };
    case 'pivo': return { trackMode: TRACK_MODE.CIRCULAR, trackSpacingM: 150, pointMode: POINT_MODE.TOTAL };
    case 'distancia': return { pointMode: POINT_MODE.ESPACAMENTO, targetSpacingM: 400 };
    case 'soja': return {};
    default: throw Error(`Atalho desconhecido: ${id}`);
  }
}

const summary = sc => {
  const g = sc.longitudinal.global;
  return { pontos: sc.samples.length, minimo: sc.minPoints, maiorIntervaloM: g.max, regularidade: regularityWord(g.cv), cv: g.cv,
    cobertura95M: sc.coverage.p95, porTiro: sc.trackRows.map(r => ({ tiro: r.trackId, pontos: r.n, aCadaM: r.medianGapM })) };
};

/** Mesmo número de pontos por monitor × proporcional ao tamanho do tiro. `build(field, params)` monta o cenário. */
export function compareTeamSplits(field, monitors, given = {}, build) {
  const equal = presetParams('equipe', field, { monitors, haPerPoint: given.haPerPoint }), total = equal.pointsPerTrack * equal.trackCount;
  const options = [{ id: 'igual', titulo: 'Mesmo número por monitor', params: equal },
    { id: 'proporcional', titulo: 'Proporcional ao tamanho do tiro', params: { ...equal, pointMode: POINT_MODE.TOTAL, totalPoints: total } }]
    .map(o => ({ ...o, ...summary(build(field, { ...given, ...o.params })) }));
  const [a, b] = options, better = (a.maiorIntervaloM ?? Infinity) <= (b.maiorIntervaloM ?? Infinity) ? a : b;
  const diff = Math.abs((a.maiorIntervaloM ?? 0) - (b.maiorIntervaloM ?? 0));
  return { monitores: monitors, total, options,
    resumo: diff < 1 ? 'As duas formas dão o mesmo maior intervalo: prefira a mais simples para a equipe (mesmo número por pessoa).'
      : `"${better.titulo}" reduz a maior distância entre pontos em ${Math.round(diff)} m; a outra é mais simples de combinar com a equipe.` };
}
