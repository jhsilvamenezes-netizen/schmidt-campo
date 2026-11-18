// 3.0 · arquivo de plano enviado aos monitores ("monitoramento.plano.v1"), compatível com a 2.x nos dois sentidos.
import { sanitizeParams } from '../engine3/paramCatalog.mjs';

export const PLAN_SCHEMA = 'monitoramento.plano.v1';
const MAX_BYTES = 6 * 1024 * 1024, ID = /^[\p{L}\p{N}_ .-]{1,80}$/u, isNum = v => typeof v === 'number' && Number.isFinite(v);

export function buildPlanFile({ engineVersion, appVersion, fieldKey, summary, params, edits = null, names = {}, tracks = null }) {
  return { schema: PLAN_SCHEMA, criado_em: new Date().toISOString(), versao_motor: engineVersion, versao_app: appVersion, lote: fieldKey,
    resumo: summary, parametros: params, ajustes: edits, monitores: names, trajetos: tracks, aviso: 'Plano SIMULADO. Abra no simulador (botão "Abrir plano recebido").' };
}

/** Lê e confere um plano recebido; recusa com mensagem clara. Trajetos importados ainda não (3.0 R4.4). */
export function parsePlanFile(text, fields) {
  if (String(text).length > MAX_BYTES) throw Error('Plano recusado: arquivo acima de 6 MB.');
  let o;
  try { o = JSON.parse(String(text).replace(/^﻿/, '')); } catch { throw Error('O arquivo não é um plano válido (não é JSON).'); }
  if (!o || o.schema !== PLAN_SCHEMA) throw Error('O arquivo não é um plano deste simulador.');
  if (!fields[o.lote]) throw Error(`O lote ${o.lote} não existe neste simulador.`);
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
  return { fieldKey: o.lote, params: clean, edits: e ?? null, names, createdAt: o.criado_em };
}
