// 3.0 · Monitorar: guia por GPS ao próximo ponto (só direção; nada é marcado como coletado). Regras da 2.x:
// próximo ponto à frente (src/gps/guide-next), fix válido (src/gps/fix-policy), aviso de saída da linha e de tiro
// errado com a tolerância "offLineWarnM". Sem DOM: o modelo da tela sai daqui e é testado no Node.
import { buildRoute, guide, tiroErrado } from '../engine/guidance.mjs';
import { lonLatToLocal } from '../engine/projection.mjs';
import { schmidtGuideNextPoint, schmidtGuideSession } from '../gps/guide-next.mjs';
import { validateSchmidtGPSFix } from '../gps/fix-policy.mjs';
import { num } from './format.mjs';

const NONE = new Set();

export const routeFor = (sc, field, trackId, flipped) => buildRoute(sc, field, trackId, { flipped: !!flipped });

/** Posição GPS → coordenadas locais do lote; null se o fix for inválido, antigo ou repetido. */
export function fixToPos(position, field, lastTimestamp, now) {
  const fix = validateSchmidtGPSFix(position, { now, lastTimestamp });
  if (!fix) return null;
  const [x, y] = lonLatToLocal(fix.coords.longitude, fix.coords.latitude, field.centroidUTM);
  return { x, y, accuracyM: fix.coords.accuracy, at: fix.timestamp };
}

/**
 * Modelo da tela da guia. `session` = memória da sessão (objeto mutável do chamador, ver schmidtGuideSession).
 * @returns {{state:string, title:string, big?:string, dir?:string, azimuth?:number, warn?:string[], next?:any, info?:string}}
 */
export function guideModel(route, sc, field, pos, now, session) {
  const monitor = sc.params.monitor;
  if (!pos) return { state: 'wait', title: 'Aguardando o GPS', info: 'Fique a céu aberto. A seta aparece com a primeira posição.' };
  const ageMs = now - pos.at, key = `${field.farm}|${field.code}|${sc.signature}|${route.trackId}|${route.flipped}`;
  const state = schmidtGuideSession(session, key);
  const g = /** @type {any} */ (guide(route, { ...pos, ageMs, guideState: state }, NONE, monitor, schmidtGuideNextPoint));
  if (g.done) return { state: 'done', title: 'Tiro sem pontos à frente' };
  const n = g.next, label = `Ponto ${n.seq} de ${route.nPoints}`, warn = [];
  if (g.stale) return { state: 'stale', title: label, big: 'Aguardando posição', warn: [`GPS sem atualização há ${num(ageMs / 1000)} s.`], next: n };
  if (!g.accuracyOk) warn.push(`GPS impreciso (± ${num(pos.accuracyM)} m).`);
  if (g.offLine) {
    const selected = new Set(sc.selected.map(t => t.id)), wrong = tiroErrado(sc.units.filter(u => selected.has(u.trackId)), route.trackId, pos, monitor.offLineWarnM);
    warn.push(wrong ? `Você está na linha do ${wrong.trackId}, não do ${route.trackId}. Ande de lado até o ${route.trackId} (${num(wrong.meuM)} m).`
      : `Você está ${num(g.lateralM)} m à ${g.lado} da linha: volte ${g.lado === 'direita' ? 'para a esquerda' : 'para a direita'}.`);
  }
  if (g.trecho?.passouM > 0) warn.push(`Passou do ponto ${n.seq} em ${num(g.trecho.passouM)} m: volte pela linha.`);
  if (g.arrived) return { state: 'arrived', title: `Chegou ao ponto ${n.seq} de ${route.nPoints}`, big: `nº ${n.number}`, warn: g.arrivalUncertain ? [`GPS impreciso (± ${num(pos.accuracyM)} m): confira pelos passos.`] : [], next: n };
  const a = g.alvo, entry = a.tipo === 'entrada';
  return { state: 'go', title: entry ? 'Primeiro: vá até a entrada do tiro' : `Próximo: ${label}`, big: `${num(a.distM)} m`, dir: `para o ${a.direction}`, azimuth: a.azimuthDeg,
    info: g.trecho && !entry ? `Faltam ${num(Math.max(0, g.trecho.faltaM))} m andando no tiro` : undefined, warn, next: n };
}
