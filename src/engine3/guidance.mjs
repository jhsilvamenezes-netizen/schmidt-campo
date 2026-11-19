// Motor 2 · roteiro do tiro e direção ao próximo ponto (reescrita do módulo route do motor 0.5.1).
// Só direciona: não registra coleta. O próximo ponto vem de `nextPoint` (src/gps/guide-next.mjs), injetado.
import { geomCentroid } from './geometry.mjs';
import { locate, pointAt } from './polyline.mjs';

export const CARDINAIS = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
export const GPS_MAX_AGE_MS = 15e3;
/** Azimute em graus (0 = norte, sentido horário) do deslocamento (dx, dy). */
export const azimuth = (dx, dy) => ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
export const cardinal = deg => CARDINAIS[Math.round(deg / 45) % 8];
/** Passos estimados, arredondados de 5 em 5 (até 100) ou de 10 em 10. */
export function stepsFor(meters, stepLengthM) {
  if (!(stepLengthM > 0)) throw Error('Comprimento do passo deve ser positivo');
  const steps = meters / stepLengthM, unit = steps < 100 ? 5 : 10;
  return Math.max(0, Math.round(steps / unit) * unit);
}
const metersText = m => `${Math.round(m).toLocaleString('pt-BR')} m`;

/** Roteiro de um tiro: partes na ordem de caminhada, pontos com distância desde a entrada e passos. */
export function buildRoute(sc, field, trackId, opts = {}) {
  const stepLengthM = opts.stepLengthM ?? sc.params.monitor.stepLengthM, flipped = !!opts.flipped, center = geomCentroid(field.geom);
  let units = sc.units.filter(u => u.trackId === trackId).sort((a, b) => a.s0Track - b.s0Track);
  if (!units.length) throw Error(`Tiro ${trackId} sem partes ativas`);
  if (flipped) units = units.slice().reverse();
  const parts = [], points = [];
  let seq = 0;
  units.forEach((unit, index) => {
    const line = flipped ? unit.line.slice().reverse() : unit.line, entry = line[0], exit = line[line.length - 1];
    const second = line[Math.min(1, line.length - 1)], walkAzimuthDeg = azimuth(second[0] - entry[0], second[1] - entry[1]);
    const along = sc.samples.filter(s => s.unitId === unit.id && !s.offTrack).map(q => ({ q, d: flipped ? unit.len - q.s : q.s })).sort((a, b) => a.d - b.d);
    let previous = 0;
    const partPoints = along.map(({ q, d }, i) => {
      const deltaM = d - previous; previous = d;
      return { id: q.id, number: q.number, seq: ++seq, unitId: unit.id, partIndex: index, firstInPart: i === 0, fromEntryM: d, deltaM, steps: stepsFor(deltaM, stepLengthM), x: q.x, y: q.y };
    });
    points.push(...partPoints);
    const next = units[index + 1], nextEntry = next ? (flipped ? next.line[next.line.length - 1] : next.line[0]) : null;
    parts.push({ unitId: unit.id, index, lengthM: unit.len, line, entry, exit, curved: line.length > 2,
      entrySide: cardinal(azimuth(entry[0] - center[0], entry[1] - center[1])), exitSide: cardinal(azimuth(exit[0] - center[0], exit[1] - center[1])),
      walkDir: cardinal(walkAzimuthDeg), walkAzimuthDeg, afterLastM: along.length ? unit.len - along[along.length - 1].d : unit.len,
      toNextPartM: nextEntry ? Math.hypot(nextEntry[0] - exit[0], nextEntry[1] - exit[1]) : null, nPoints: partPoints.length });
  });
  const offTrack = sc.samples.filter(s => s.trackId === trackId && s.offTrack).map(s => ({ id: s.id, number: s.number, seq: ++seq, unitId: null,
    partIndex: null, firstInPart: false, fromEntryM: null, deltaM: null, steps: null, x: s.x, y: s.y }));
  points.push(...offTrack);
  const route = { trackId, fieldCode: field.code, flipped, stepLengthM, totalLengthM: units.reduce((sum, u) => sum + u.len, 0), nPoints: points.length, parts, points };
  return { ...route, instructions: instructions(route) };
}
export const pointLabel = (p, route) => `Ponto ${p.seq} de ${route.nPoints} (nº ${p.number})`;

/** Roteiro em frases, na ordem de caminhada. */
export function instructions(route) {
  const out = [], step = route.stepLengthM;
  out.push(`Tiro ${route.trackId}: ${metersText(route.totalLengthM)} dentro do lote, ${route.nPoints} ponto${route.nPoints === 1 ? '' : 's'}.`);
  for (const part of route.parts) {
    const prefix = route.parts.length > 1 ? `Parte ${part.index + 1} (${metersText(part.lengthM)}): ` : '';
    const walk = part.curved ? `siga a linha (curva), começando para o ${part.walkDir}` : `caminhe para o ${part.walkDir}`;
    out.push(`${prefix}${prefix ? 'entre' : 'Entre'} pela borda ${part.entrySide} e ${walk}.`);
    const pts = route.points.filter(p => p.partIndex === part.index);
    if (!pts.length) out.push('Esta parte não tem ponto: apenas atravesse.');
    const gaps = pts.slice(1).map(p => Math.round(p.deltaM));
    if (gaps.length > 1 && gaps.every(g => g === gaps[0])) out.push(`Pontos a cada ${metersText(gaps[0])} (≈ ${pts[1].steps} passos), começando a ${metersText(pts[0].deltaM)} da borda.`);
    pts.forEach((p, i) => out.push(i === 0 ? `${pointLabel(p, route)}: ande ${metersText(p.deltaM)} desde a borda (≈ ${p.steps} passos).` : `${pointLabel(p, route)}: mais ${metersText(p.deltaM)} (≈ ${p.steps} passos).`));
    if (pts.length) out.push(`Depois do último ponto faltam ${metersText(part.afterLastM)} até a borda ${part.exitSide} (≈ ${stepsFor(part.afterLastM, step)} passos).`);
    if (part.toNextPartM !== null) out.push(`Saia do lote e vá até a próxima parte (≈ ${metersText(part.toNextPartM)} em linha reta).`);
  }
  for (const p of route.points.filter(q => q.unitId === null)) out.push(`${pointLabel(p, route)}: fora da linha do tiro — use o GPS para chegar.`);
  out.push(`Passos estimados com passo de ${step.toLocaleString('pt-BR')} m; confira com o GPS quando possível.`);
  return out;
}

/** Direção ao próximo ponto a partir da posição `pos`. `nextPoint(route, pos, collected, monitor, state)` escolhe o alvo. */
export function guide(route, pos, collected, monitor, nextPoint) {
  const nCollected = route.points.filter(p => collected.has(p.id)).length, next = nextPoint(route, pos, collected, monitor, pos.guideState);
  const accuracyOk = Number.isFinite(pos.accuracyM) && pos.accuracyM <= monitor.gpsAccuracyMaxM, stale = Number.isFinite(pos.ageMs) && pos.ageMs > GPS_MAX_AGE_MS;
  if (!next) return { done: true, collected: nCollected, total: route.points.length, accuracyOk, stale };
  const dx = next.x - pos.x, dy = next.y - pos.y, distM = Math.hypot(dx, dy), az = azimuth(dx, dy);
  /** @type {any} */ let lateralM = null, /** @type {any} */ lado = null, /** @type {any} */ voltaDir = null, /** @type {any} */ along = null;
  const part = next.partIndex === null ? null : route.parts[next.partIndex];
  if (part) {
    const near = locate(part.line, [pos.x, pos.y]);
    lateralM = near.dist; along = near.s;
    if (lateralM > 0.5) voltaDir = cardinal(azimuth(near.x - pos.x, near.y - pos.y));
    const a = pointAt(part.line, Math.max(0, near.s - 1)), b = pointAt(part.line, Math.min(part.lengthM, near.s + 1));
    const cross = (b[0] - a[0]) * (pos.y - near.y) - (b[1] - a[1]) * (pos.x - near.x);
    if (lateralM > 0.5) lado = cross > 0 ? 'esquerda' : 'direita';
  }
  const offLine = lateralM !== null && lateralM > monitor.offLineWarnM;
  let alvo = { tipo: 'ponto', distM, azimuthDeg: az, direction: cardinal(az), x: next.x, y: next.y };
  if (part && next.firstInPart && offLine) {
    const ex = part.entry[0] - pos.x, ey = part.entry[1] - pos.y, toEntry = Math.hypot(ex, ey);
    if (toEntry < distM) { const azE = azimuth(ex, ey); alvo = { tipo: 'entrada', distM: toEntry, azimuthDeg: azE, direction: cardinal(azE), x: part.entry[0], y: part.entry[1] }; }
  }
  /** @type {any} */ let trecho = null;
  if (part && !offLine && Number.isFinite(next.fromEntryM)) {
    const prev = next.firstInPart ? null : route.points.find(p => p.partIndex === next.partIndex && p.seq === next.seq - 1);
    const from = prev ? prev.fromEntryM : 0, total = next.fromEntryM - from, left = next.fromEntryM - along;
    trecho = { desde: prev ? { tipo: 'ponto', seq: prev.seq } : { tipo: 'entrada' }, totalM: total, andadoM: Math.min(total, Math.max(0, along - from)),
      faltaM: Math.max(0, left), passouM: left < -monitor.arrivalRadiusM ? -left : 0 };
  }
  // 3.16 · o GPS não separa posições mais próximas que a sua precisão: com ± 13 m e raio de 10 m a pessoa podia estar no
  // ponto sem nunca "chegar". Raio efetivo = maior entre o raio de chegada e a precisão (até a precisão aceita, 15 m);
  // quando a precisão passa do raio, a chegada vem com o aviso de conferir pelos passos.
  // 3.19 · de moto o raio de chegada NÃO cresce (a amostra é no ponto): a 1,5 s do ponto (até 25 m) vem "pare aqui";
  // a chegada continua pelo raio normal (ou pela precisão do GPS), depois de parar ou descer
  const acc = Number.isFinite(pos.accuracyM) ? pos.accuracyM : 0, spd = Number.isFinite(pos.speedMps) ? pos.speedMps : 0;
  const radiusM = Math.max(monitor.arrivalRadiusM, Math.min(acc, monitor.gpsAccuracyMaxM));
  const stopHere = spd >= 2.5 && distM > radiusM && distM <= Math.min(25, radiusM + spd * 1.5) && !stale;
  return { done: false, next, distM, azimuthDeg: az, direction: cardinal(az), arrived: distM <= radiusM && !stale, radiusM, stopHere,
    arrivalUncertain: distM <= radiusM && (!accuracyOk || acc > monitor.arrivalRadiusM), accuracyOk, stale, lateralM, lado, voltaDir, offLine, alvo, trecho,
    collected: nCollected, total: route.points.length };
}

/** Se a pessoa está a até `toleranceM` de OUTRO tiro e longe do seu, devolve esse tiro (aviso de tiro errado). */
export function tiroErrado(units, trackId, pos, toleranceM) {
  const nearest = new Map();
  for (const u of units) { const d = locate(u.line, [pos.x, pos.y]).dist; if (!(nearest.get(u.trackId) <= d)) nearest.set(u.trackId, d); }
  const mine = nearest.get(trackId);
  if (mine === undefined || mine <= toleranceM) return null;
  /** @type {{trackId:any, distM:number}|null} */ let best = null;
  for (const [id, d] of nearest) if (id !== trackId && d <= toleranceM && (!best || d < best.distM)) best = { trackId: id, distM: d };
  return best ? { ...best, meuM: mine } : null;
}
