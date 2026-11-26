// Motor 2 · avisos do cenário (nível erro/alerta/info), na ordem em que aparecem para a pessoa.
// Primeiro os avisos de qualidade dos dados do lote (assessField, injetado até a reescrita de dataQuality);
// depois os do plano. Reescrita do diagnostics do motor 0.5.1 (teste diferencial: mesmos avisos e textos).
import { TOLERANCES } from './tolerances.mjs';

export const LEVEL = Object.freeze({ ERRO: 'erro', ALERTA: 'alerta', INFO: 'info' });
const { BEARING_CHANGED_DEG } = TOLERANCES;

export function buildWarnings(field, sc, assessField) {
  const p = sc.params, out = [];
  const add = (level, code, message, action) => out.push({ level, code, message, ...(action ? { action } : {}) });
  for (const w of assessField(field)) add(w.level, w.code, w.message, w.action);
  // 5.0 · a regra escolhida (ha por ponto) vale para todas as culturas (decisão do proprietário, 27/11): sem alerta
  if (sc.samples.length < sc.minPoints)
    add(LEVEL.ERRO, 'abaixo_minimo', `Pontos planejados (${sc.samples.length}) abaixo do mínimo por área (${sc.minPoints}). Não reduzido automaticamente: aumente os pontos.`);
  if (sc.allocation.status === 'conflito') add(LEVEL.ERRO, 'conflito_tiros_pontos', `Conflito: ${sc.allocation.suggestions.join(' · ')}`);
  if (sc.longitudinal.emptyUnits.length) add(LEVEL.ERRO, 'trechos_sem_amostra', `Trechos sem amostra (visíveis no mapa): ${sc.longitudinal.emptyUnits.join(', ')}`);
  if (sc.allocation.status === 'ok' && p.pointMode === 'espacamento' && sc.allocation.suggestions.length)
    add(LEVEL.INFO, 'espacamento_ajustado', sc.allocation.suggestions.join(' '));
  const over = sc.trackRows.filter(r => r.outOfTolerance);
  if (over.length) add(LEVEL.ALERTA, 'intervalo_acima_alvo', `Intervalo acima do alvo (+${Math.round(p.gapToleranceFrac * 100)}%) em: ${over.map(r => r.trackId).join(', ')}`);
  if (sc.discarded.length)
    add(LEVEL.INFO, 'trechos_curtos', `${sc.discarded.length} trecho(s) < ${p.minPieceM} m sem amostra: ${sc.discarded.map(u => `${u.id} (${Math.round(u.len)} m)`).join(', ')}`);
  const split = sc.selected.filter(t => sc.units.filter(u => u.trackId === t.id).length > 1);
  if (split.length) add(LEVEL.INFO, 'trechos_desconectados', `Tiros cortados em trechos separados (medidos separadamente): ${split.map(t => t.id).join(', ')}`);
  if (p.bearingDeg !== null && Math.abs(p.bearingDeg - field.bearing % 180) > BEARING_CHANGED_DEG)
    add(LEVEL.ALERTA, 'rumo_alterado', 'Rumo alterado em relação à planilha: confirmar pista existente.');
  if (sc.anchored && sc.passes)
    add(LEVEL.INFO, 'malha_teorica', `Malha estimada: ${sc.passes} passadas × ${p.boomWidthM} m entre tiros, ancorada no ponto A. Não confirma rastros físicos.`);
  if (sc.units.some(u => u.kind === 'referencia_linear' || u.kind === 'curva_desenhada'))
    add(LEVEL.INFO, 'nao_e_rastro', 'Trajetos são estimativas geométricas, não rastros GNSS do M4040.');
  if (sc.selected.length < sc.tracksInside.length)
    add(LEVEL.INFO, 'tiros_inativos', `${sc.tracksInside.length - sc.selected.length} tiro(s) desativado(s) pela seleção; aparecem no mapa como inativos.`);
  return out;
}
