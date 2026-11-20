// 3.0 · arquivo de plano enviado aos monitores ("monitoramento.plano.v1"), compatível com a 2.x nos dois sentidos.
import { sanitizeParams } from '../engine3/paramCatalog.mjs';

import { blocksFor, blockScenario, snapshotSamples } from './blocks.mjs';
import { schmidtBlockSourceSignature, validateSchmidtBlocks, SCHMIDT_BLOCK_SCHEMA } from '../application/block-planning.mjs';
import { tryPlan } from './planner.mjs';

export const BLOCK_PLAN_SCHEMA = 'monitoramento.plano.v2';
export const PLAN_SCHEMA = 'monitoramento.plano.v1';
export const MAX_PLAN_BYTES = 6 * 1024 * 1024;
const ID = /^[\p{L}\p{N}_ .-]{1,80}$/u, isNum = v => typeof v === 'number' && Number.isFinite(v);

/** @param {{engineVersion:string, appVersion:string, fieldKey:string, summary:any, params:any, edits?:any, names?:any, tracks?:any}} options */
export function buildPlanFile({ engineVersion, appVersion, fieldKey, summary, params, edits = null, names = {}, tracks = null }) {
  return { schema: PLAN_SCHEMA, criado_em: new Date().toISOString(), versao_motor: engineVersion, versao_app: appVersion, lote: fieldKey,
    resumo: summary, parametros: params, ajustes: edits, monitores: names, trajetos: tracks, aviso: 'Plano SIMULADO. Abra no simulador (botão "Abrir plano recebido").' };
}

/** Lê e confere um plano recebido; recusa com mensagem clara. Trajetos importados ainda não (3.0 R4.4). */
export function parsePlanFile(text, fields) {
  if (new TextEncoder().encode(String(text)).length > MAX_PLAN_BYTES) throw Error('Plano recusado: arquivo acima de 6 MB.');
  let o;
  try { o = JSON.parse(String(text).replace(/^﻿/, '')); } catch { throw Error('O arquivo não é um plano válido (não é JSON).'); }
  if (!o || ![PLAN_SCHEMA, BLOCK_PLAN_SCHEMA].includes(o.schema)) throw Error('O arquivo não é um plano deste simulador.');
  if (!Object.hasOwn(fields, o.lote)) throw Error(`O lote ${o.lote} não existe neste simulador.`);
  if (o.schema === BLOCK_PLAN_SCHEMA) return readBlock(o, fields);
  if (o.referencia && o.referencia !== schmidtBlockSourceSignature(fields, [o.lote])) throw Error('O cadastro do lote mudou. Peça um plano atualizado.');
  if (!o.parametros || typeof o.parametros !== 'object' || Array.isArray(o.parametros)) throw Error('Plano sem parâmetros.');
  const { clean, removed } = sanitizeParams(o.parametros);
  if (removed.length) throw Error(`Plano recusado: parâmetros inválidos ou fora da faixa (${removed.slice(0, 3).join('; ')}${removed.length > 3 ? '…' : ''}). Peça um novo arquivo a quem fez o plano.`);
  if (o.trajetos) throw Error('Este plano usa trajetos importados de GPS: abra na versão 2.5 por enquanto.');
  const e = o.ajustes;
  if (e && !(Array.isArray(e.samples) && typeof e.signature === 'string' && e.samples.length <= 5000 && e.samples.every(s => s && typeof s.id === 'string' && ID.test(s.id)
    && isNum(s.x) && isNum(s.y) && (s.unitId == null || (typeof s.unitId === 'string' && ID.test(s.unitId))) && (s.s == null || isNum(s.s)))))
    throw Error('Os ajustes de pontos do plano estão corrompidos.');
  const names = {};
  for (const [k, v] of Object.entries(o.monitores || {})) if (typeof v === 'string') names[k] = v.slice(0, 60);
  const result = tryPlan(fields[o.lote], clean, e);
  if (result.error || !result.sc) throw Error(result.error || 'Plano inválido.');
  if (e && (e.signature !== result.sc.signature || e.samples.length !== result.sc.samples.length)) throw Error('Os ajustes não correspondem a este plano.');
  if (result.sc.samples.length < result.sc.minPoints) throw Error('O plano recebido tem menos pontos que a regra do lote.');
  const regular = e ? tryPlan(fields[o.lote], clean, null).sc : null;
  const same = regular && e.samples.every((p, i) => {
    const q = regular.samples[i];
    return q && q.id === p.id && q.x === p.x && q.y === p.y && q.unitId === p.unitId && q.s === p.s && !p.manual && !p.offTrack && !p.extra;
  }) && e.samples.length === regular.samples.length;
  return { block: null, fieldKey: o.lote, pointCount: result.sc.samples.length, params: clean, edits: same ? null : e ?? null, names, createdAt: o.criado_em };
}

/** Leva a grade comum e os pontos efetivos de cada membro. Exclui histórico e dados da equipe. */
export function buildBlockFile(fields, record, fieldKey, appVersion) {
  const lots = {};
  for (const key of record.members) {
    const { sc } = blockScenario(fields, record, key);
    lots[key] = { params: sc.params, edits: snapshotSamples(sc) };
  }
  return { schema: BLOCK_PLAN_SCHEMA, versao_app: appVersion, criado_em: new Date().toISOString(), lote: fieldKey,
    grupo: record.catalogId || record.id, referencia: record.sourceSignature, grade: record.common, lotes: lots };
}

function readBlock(o, fields) {
  const group = blocksFor(fields, o.lote).find(g => g.id === o.grupo);
  if (!group || !o.lotes || Array.isArray(o.lotes) || Object.keys(o.lotes).length !== group.members.length ||
      o.referencia !== schmidtBlockSourceSignature(fields, group.members)) throw Error('O grupo ou o cadastro dos lotes mudou.');
  const anchor = fields[group.members[0]], grid = o.grade;
  if (!grid || !Array.isArray(grid.absoluteA) || grid.absoluteA.length !== 2 ||
      grid.absoluteA.some((v, i) => v !== anchor.referenceA[i] + anchor.centroidUTM[i]) ||
      grid.gridCorrection !== (anchor.bearingGridCorrection || 0) || grid.bearingDeg !== (anchor.bearing % 180 + 180) % 180)
    throw Error('A grade não corresponde à referência dos lotes.');
  const paramsByField = {}, editsByField = {};
  for (const k of group.members) {
    const entry = o.lotes[k];
    if (!entry?.params || !Array.isArray(entry.edits?.samples)) throw Error('Faltam os pontos de um lote do bloco.');
    paramsByField[k] = entry.params; editsByField[k] = entry.edits;
  }
  const block = { id: group.id, catalogId: group.id, members: group.members, common: grid, sourceSignature: o.referencia,
    state: { paramsByField, editsByField, monitor: {} }, assessment: { coverageTradeoff: false, routeValidated: false, timeSavingMeasured: false }, createdAt: o.criado_em };
  validateSchmidtBlocks({ planningBlocks: { schema: SCHMIDT_BLOCK_SCHEMA, records: { [group.id]: block } } }, sanitizeParams);
  for (const k of group.members) {
    const { sc } = blockScenario(fields, block, k);
    if (sc.samples.length !== paramsByField[k].totalPoints || sc.samples.length < sc.minPoints || sc.longitudinal.emptyUnits.length)
      throw Error('A contagem dos pontos não fecha para este bloco.');
    editsByField[k] = snapshotSamples(sc);
  }
  return { block, fieldKey: o.lote, pointCount: group.members.reduce((n, k) => n + editsByField[k].samples.length, 0), params: paramsByField[o.lote], edits: editsByField[o.lote], names: {}, createdAt: o.criado_em };
}
