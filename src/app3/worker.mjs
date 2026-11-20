// 3.22 · motor em segundo plano (Web Worker) como módulo de verdade: antes a lógica morava num texto dentro do script de
// build (sem tsc e sem teste). Agora a mesma função responde no worker do celular e no teste do Node. Nunca lança.
import * as P from './planner.mjs';

/**
 * Resposta a uma mensagem da tela.
 * - { kind: 'improve', id, field, params, edits, people } → sugestão do motor (min-max) e +1 ponto (só sem edições);
 * - { id, field, base, people, fitTeam } → recomendação do lote (ou o erro em texto).
 * @param {any} data
 */
export function reply(data) {
  if (data && data.kind === 'improve') {
    const { id, field, params, edits, people } = data;
    /** @type {any} */ let r = null, /** @type {any} */ plus = null;
    try { r = P.minimaxEdits(field, params, edits); } catch { r = null; }
    try { plus = edits ? null : P.plusOne(field, params, people); } catch { plus = null; }
    return { id, kind: 'improve', r, plus };
  }
  const { id, field, base, people, fitTeam } = data || {};
  /** @type {any} */ let rec = null, /** @type {string|null} */ error = null;
  try { rec = P.recommend(field, base, people, fitTeam); } catch (/** @type {any} */ x) { error = String((x && x.message) || x); }
  return { id, rec, error };
}
