// Motor 2 · edição manual de pontos: mover, acrescentar e restaurar (reescrita do módulo editing do motor 0.5.1).
// Funções puras: devolvem a nova lista de pontos (ou {ok:false, code, error}); quem chama recalcula as métricas.
import { pointInGeom } from './geometry.mjs';
import { cumulative, locate, pointAt } from './polyline.mjs';
import { numberSamples, trackPosition } from './sampling.mjs';
import { TRACK_KINDS } from './tracks.mjs';

const fail = (code, error) => ({ ok: false, code, error });

function nearestUnit(units, x, y, onlyUnit) {
  let best = null;
  for (const u of units) {
    if (onlyUnit && u.id !== onlyUnit) continue;
    const hit = locate(u.line, [x, y]);
    if (!best || hit.dist < best.hit.dist) best = { u, hit };
  }
  return best;
}

const onUnit = (base, u, s, x, y) => ({ ...base, unitId: u.id, trackId: u.trackId, s, sTrack: trackPosition(u, s), x, y,
  kind: u.kind, confidence: u.confidence, manual: true, offTrack: false });

/** Move um ponto: `{deltaS}` desliza sobre o tiro; `{x, y}` reposiciona (gruda no tiro se perto, senão só com allowOffTrack). */
export function moveSample(sc, field, id, to, opts = {}) {
  const p = sc.params, cur = sc.samples.find(s => s.id === id);
  if (!cur) return fail('PONTO_NAO_ENCONTRADO', 'Ponto não encontrado');
  let next;
  if (to.deltaS !== undefined) {
    const u = sc.units.find(v => v.id === cur.unitId);
    if (!u || cur.offTrack) return fail('PONTO_FORA_DA_PISTA', 'Ponto fora da pista: arraste-o de volta ao tiro');
    const s = Math.min(u.len, Math.max(0, cur.s + to.deltaS)), [x, y] = pointAt(u.line, s, cumulative(u.line));
    next = { ...cur, s, sTrack: trackPosition(u, s), x, y, manual: true, offTrack: false };
  } else {
    if (!pointInGeom(to.x, to.y, field.geom)) return fail('FORA_DO_LOTE', 'Fora do limite do lote');
    const near = nearestUnit(sc.units, to.x, to.y);
    if (near && near.hit.dist <= p.snapToleranceM) next = onUnit(cur, near.u, near.hit.s, near.hit.x, near.hit.y);
    else if (opts.allowOffTrack) next = { ...cur, x: to.x, y: to.y, manual: true, offTrack: true };
    else return fail('LONGE_DO_TIRO', `Mais de ${p.snapToleranceM} m do tiro: ative "fora da pista" para posicionar livremente`);
  }
  return { ok: true, samples: sc.samples.map(s => (s.id === id ? next : s)) };
}

/** Acrescenta um ponto extra (X1, X2, …) no tiro mais próximo (ou na parte `opts.unitId`). */
export function addSample(sc, field, at, opts = {}) {
  if (!pointInGeom(at.x, at.y, field.geom)) return fail('FORA_DO_LOTE', 'Fora do limite do lote');
  const near = nearestUnit(sc.units, at.x, at.y, opts.unitId);
  if (!near) return fail('SEM_TIRO', 'O plano não tem tiro para receber o ponto');
  const used = new Set(sc.samples.map(s => s.id));
  let k = 1;
  while (used.has(`X${k}`)) k++;
  const sample = { ...onUnit({ seq: 0 }, near.u, near.hit.s, near.hit.x, near.hit.y), extra: true, id: `X${k}` };
  return { ok: true, samples: [...sc.samples, sample], sample, distM: near.hit.dist };
}

/** Cenário com outra lista de pontos (renumerada). `metrics(field, sc)` recalcula métricas e avisos. */
export const withSamples = (field, sc, samples, metrics) => metrics(field, { ...sc, samples: numberSamples(samples, sc.units) });

const ID_RE = /^[\p{L}\p{N}_ .-]{1,80}$/u, isNum = v => typeof v === 'number' && Number.isFinite(v);

/** Restaura pontos gravados (validação estrita; qualquer item inválido → null). */
export function restoreSamples(sc, saved) {
  if (!Array.isArray(saved) || saved.length > 5000) return null;
  const units = new Map(sc.units.map(u => [u.id, u])), seen = new Set(), out = [];
  for (const it of saved) {
    if (!it || typeof it !== 'object' || typeof it.id !== 'string' || !ID_RE.test(it.id) || seen.has(it.id) || !isNum(it.x) || !isNum(it.y)) return null;
    seen.add(it.id);
    const offTrack = it.offTrack === true, u = units.get(it.unitId);
    if (!u && !offTrack) return null;
    const base = { id: it.id, x: it.x, y: it.y, manual: it.manual === true, offTrack, ...(it.extra === true ? { extra: true } : {}) };
    if (!u) { out.push({ ...base, unitId: null, trackId: null, s: null, sTrack: null, kind: null, confidence: null }); continue; }
    if (!isNum(it.s)) return null;
    const s = Math.min(u.len, Math.max(0, it.s));
    out.push({ ...base, unitId: u.id, trackId: u.trackId, s, sTrack: trackPosition(u, s), kind: u.kind, confidence: TRACK_KINDS[u.kind]?.confidence ?? null });
  }
  return out;
}
