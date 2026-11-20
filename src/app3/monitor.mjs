// 3.0 · Monitorar: guia por GPS ao próximo ponto (só direção; nada é marcado como coletado). Regras da 2.x:
// próximo ponto à frente (src/gps/guide-next), fix válido (src/gps/fix-policy), aviso de saída da linha e de tiro
// errado com a tolerância "offLineWarnM". Sem DOM: o modelo da tela sai daqui e é testado no Node.
import { buildRoute, guide, tiroErrado, azimuth, cardinal } from '../engine3/guidance.mjs';
import { lonLatToLocal } from '../engine3/projection.mjs';
import { locate } from '../engine3/polyline.mjs';
import { schmidtGuideNextPoint, schmidtGuideSession } from '../gps/guide-next.mjs';
import { validateSchmidtGPSFix } from '../gps/fix-policy.mjs';
import { num } from './format.mjs';

const NONE = new Set();

export const routeFor = (sc, field, trackId, flipped) => buildRoute(sc, field, trackId, { flipped: !!flipped });

/** 3.20 · o tiro pode ser feito pelas duas pontas. Antes do primeiro ponto, e fora da linha do tiro, a guia entra pela
 * ponta mais perto da pessoa (sem andar o tiro inteiro por fora até a outra ponta). Troca só com folga (30 m e 15% mais
 * perto), para o GPS não ficar trocando de ponta. Devolve o sentido (flipped) a usar. */
export function nearEndFlipped(sc, field, trackId, pos, flipped, offLineM = 25) {
  if (!pos) return !!flipped;
  const a = routeFor(sc, field, trackId, !!flipped), b = routeFor(sc, field, trackId, !flipped);
  if (a.parts.some(p => locate(p.line, [pos.x, pos.y]).dist <= offLineM)) return !!flipped; // já na linha: segue o sentido
  const d = e => Math.hypot(e[0] - pos.x, e[1] - pos.y), cur = d(a.parts[0].entry), other = d(b.parts[0].entry);
  return other < cur - Math.max(30, 0.15 * cur) ? !flipped : !!flipped;
}

/** Posição GPS → coordenadas locais do lote; null se o fix for inválido, antigo ou repetido. */
export function fixToPos(position, field, lastTimestamp, now) {
  const fix = validateSchmidtGPSFix(position, { now, lastTimestamp });
  if (!fix) return null;
  const [x, y] = lonLatToLocal(fix.coords.longitude, fix.coords.latitude, field.centroidUTM);
  // 3.17 · velocidade do próprio GPS (m/s), quando o aparelho informa; senão a tela calcula pela distância entre leituras
  const sp = fix.coords.speed;
  return { x, y, accuracyM: fix.coords.accuracy, at: fix.timestamp, speedMps: Number.isFinite(sp) && sp >= 0 ? sp : null };
}

/**
 * Modelo da tela da guia. `session` = memória da sessão (objeto mutável do chamador, ver schmidtGuideSession).
 * @returns {{state:string, title:string, distM?:number|null, seg?:number|null, progress?:any, big?:string, dir?:string, azimuth?:number, warn?:string[], next?:any, info?:string, to?:number[]}}
 */
export function guideModel(route, sc, field, pos, now, session) {
  const m = guideModelCore(route, sc, field, pos, now, session);
  // 3.4: progresso do tiro (pontos já passados), para a barra do modo navegação
  if (m.next) m.progress = { done: m.next.seq - (m.state === 'arrived' ? 0 : 1), total: route.nPoints };
  return m;
}

/** 3.17 · de moto ou a pé, pela velocidade (≥ 2,5 m/s ≈ 9 km/h: moto; parado ou andando: a pé). */
export const MOTO_MPS = 2.5;
export const modeOf = speedMps => (Number.isFinite(speedMps) && speedMps >= MOTO_MPS ? 'moto' : 'pe');
/** Tempo até o ponto na velocidade atual (só em movimento). */
const eta = (m, speedMps) => {
  if (!Number.isFinite(speedMps) || speedMps < 0.8 || !(m > 0)) return '';
  const s = m / speedMps;
  return s < 60 ? ` · ~${num(Math.max(5, Math.round(s / 5) * 5))} s` : ` · ~${num(Math.round(s / 60))} min`;
};

/** @returns {any} */
function guideModelCore(route, sc, field, pos, now, session) {
  const monitor = sc.params.monitor;
  if (!pos) return { state: 'wait', title: 'Aguardando o GPS', info: 'Fique a céu aberto. A seta aparece com a primeira posição.' };
  const ageMs = now - pos.at, key = `${field.farm}|${field.code}|${sc.signature}|${route.trackId}|${route.flipped}`;
  const state = schmidtGuideSession(session, key);
  const g = /** @type {any} */ (guide(route, { ...pos, ageMs, guideState: state }, NONE, monitor, schmidtGuideNextPoint));
  if (g.done) return { state: 'done', title: 'Tiro sem pontos à frente' };
  const n = g.next, label = `Ponto ${n.seq} de ${route.nPoints}`, warn = [];
  if (g.stale) return { state: 'stale', title: label, big: 'Aguardando posição', warn: [`GPS sem atualização há ${num(ageMs / 1000)} s.`], next: n };
  if (!g.accuracyOk) warn.push(`GPS impreciso (± ${num(pos.accuracyM)} m).`);
  // Longe do tiro (chegando ao lote): a guia leva à entrada do tiro, no início do sentido escolhido, sem avisos de linha.
  const farM = Math.max(150, 5 * (monitor.offLineWarnM || 0)), start = route.parts?.[0]?.entry;
  if (start && Number.isFinite(g.lateralM) && g.lateralM > farM && !g.arrived) {
    const dx = start[0] - pos.x, dy = start[1] - pos.y, az = azimuth(dx, dy);
    return { state: 'go', title: `Primeiro: vá até a entrada do ${route.trackId}`, big: `${num(Math.hypot(dx, dy))} m`, dir: `para o ${cardinal(az)}`, azimuth: az, to: [start[0], start[1]], warn, next: n };
  }
  const entry = g.alvo?.tipo === 'entrada';
  // Indo para a entrada do tiro, "fora da linha" não ajuda (ainda não se está nela): só a seta até a entrada.
  if (g.offLine && !entry) {
    const selected = new Set(sc.selected.map(t => t.id)), wrong = tiroErrado(sc.units.filter(u => selected.has(u.trackId)), route.trackId, pos, monitor.offLineWarnM);
    warn.push(wrong ? `Você está na linha do ${wrong.trackId}, não do ${route.trackId}. Ande de lado até o ${route.trackId} (${num(wrong.meuM)} m).`
      : `Você está ${num(g.lateralM)} m à ${g.lado} da linha: volte ${g.lado === 'direita' ? 'para a esquerda' : 'para a direita'}.`);
  }
  if (g.trecho?.passouM > 0) warn.push(`Passou do ponto ${n.seq} em ${num(g.trecho.passouM)} m: volte pela linha.`);
  // 3.4: ao chegar, já diz o que vem depois (ponto seguinte e a distância andando no tiro)
  const after = route.points.find(p => p.seq === n.seq + 1);
  if (g.arrived) return { state: 'arrived', title: `Chegou ao ponto ${n.seq} de ${route.nPoints}`, big: `nº ${n.number}`, info: after ? `Depois: ponto ${after.seq} de ${route.nPoints}${Number.isFinite(after.deltaM) ? `, a ${num(after.deltaM)} m` : ''}` : 'Último ponto do tiro', warn: g.arrivalUncertain ? [`GPS impreciso (± ${num(pos.accuracyM)} m): confira pelos passos.`] : [], next: n };
  // 3.19 · de moto, perto do ponto: pare aqui (a chegada vem depois, a pé ou parado no raio normal)
  if (g.stopHere) return { state: 'stop', distM: g.distM, to: [n.x, n.y], title: `Pare aqui: ponto ${n.seq} de ${route.nPoints}`, big: `${num(g.distM)} m`, dir: `para o ${g.direction}`, azimuth: g.azimuthDeg, info: 'Pare a moto e vá até o ponto.', warn, next: n };
  const a = g.alvo;
  return { state: 'go', distM: entry ? null : a.distM, to: [a.x, a.y], title: entry ? 'Primeiro: vá até a entrada do tiro' : `Próximo: ${label}`, big: `${num(a.distM)} m`, dir: `para o ${a.direction}`, azimuth: a.azimuthDeg,
    info: g.trecho && !entry ? `Faltam ${num(Math.max(0, g.trecho.faltaM))} m andando no tiro${eta(Math.max(0, g.trecho.faltaM), pos.speedMps)}` : undefined, warn, next: n,
    // 3.16 · quanto do trecho até o ponto já foi andado (0–1), para o anel em volta da seta
    seg: g.trecho && !entry && g.trecho.totalM > 0 ? Math.max(0, Math.min(1, g.trecho.andadoM / g.trecho.totalM)) : null };
}
