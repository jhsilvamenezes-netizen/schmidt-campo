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
  const hd = fix.coords.heading;
  return { x, y, accuracyM: fix.coords.accuracy, at: fix.timestamp, speedMps: Number.isFinite(sp) && sp >= 0 ? sp : null,
    gpsHeading: Number.isFinite(hd) && hd >= 0 ? hd : null };
}

/** 4.6 · filtro de Kalman da posição (velocidade constante, eixos x/y independentes). O ruído de cada leitura vem da
 *  precisão que o GPS informa; `q` = quanto a velocidade pode mudar (m²/s³). Medido em simulação (1 leitura/s, ruído
 *  4–8 m, 900 trajetos a pé e de moto com parada no ponto): erro da posição −35 a −55%, chegada ao ponto sem atraso
 *  (a pé o aviso deixou de sair ~1,4 s antes por causa do tremor) e nenhum aviso falso. Recomeça depois de 10 s sem
 *  leitura ou de um salto grande (o filtro nunca "segura" a pessoa num lugar antigo). */
export const KALMAN = Object.freeze({ q: 0.3, gapS: 10 });
export function kalmanStep(st, pos) {
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return { st, pos };
  const r = Math.max(1, pos.accuracyM || 5) ** 2, dt = st ? (pos.at - st.at) / 1000 : 0;
  const fresh = () => ({ st: { at: pos.at, x: [pos.x, 0], y: [pos.y, 0], px: [r, 0, 25], py: [r, 0, 25] }, pos });
  if (!st || !(dt > 0) || dt > KALMAN.gapS) return fresh();
  const q = KALMAN.q, axis = (/** @type {number[]} */ s, /** @type {number[]} */ P, /** @type {number} */ m) => {
    const x0 = s[0] + dt * s[1], p00 = P[0] + 2 * dt * P[1] + dt * dt * P[2] + (q * dt ** 3) / 3, p01 = P[1] + dt * P[2] + (q * dt * dt) / 2, p11 = P[2] + q * dt;
    const S = p00 + r, k0 = p00 / S, k1 = p01 / S, e = m - x0;
    return { s: [x0 + k0 * e, s[1] + k1 * e], P: [(1 - k0) * p00, (1 - k0) * p01, p11 - k1 * p01], e };
  };
  const ax = axis(st.x, st.px, pos.x), ay = axis(st.y, st.py, pos.y);
  // salto muito maior que o esperado (ex.: GPS voltou depois de túnel de árvores): recomeça na leitura nova
  if (Math.hypot(ax.e, ay.e) > 50 + 5 * Math.sqrt(r)) return fresh();
  return { st: { at: pos.at, x: ax.s, y: ay.s, px: ax.P, py: ay.P }, pos: { ...pos, x: ax.s[0], y: ay.s[0], rawX: pos.x, rawY: pos.y } };
}

/** 4.1 · rumo do deslocamento (graus, 0 = norte da grade, horário) para girar o mapa da guia "rumo para cima".
 *  Com o celular andando (≥ 1,5 m/s) vale o rumo do próprio GPS; senão, o da reta entre a última âncora e a posição
 *  nova, só quando andou o bastante para não ser tremor (≥ 8 m e ≥ 2 × a precisão). Parado, mantém o último rumo.
 *  Na moto a bússola do celular erra (ímã e motor perto); o rumo do GPS não. */
export const COURSE = Object.freeze({ gpsMinMps: 1.5, minM: 8, kfMinMps: 0.6, kfAlpha: 0.3 });
/** 4.10 · `vel` ([vx, vy] m/s do filtro de Kalman): sem rumo do GPS, a velocidade filtrada é suavizada (30% da nova a
 *  cada leitura) e, passando de 0,6 m/s, dá o rumo. Simulação a pé, curva de 90°, ± 5–8 m: o mapa acerta o rumo novo em
 *  9–11 s (antes 12–19 s; pior caso 11–15 s, antes 20–30 s), mesmo tremor; parado, giro falso em ≤ 0,2% das leituras. */
/** @param {any} st @param {any} pos @param {number[]|null} [vel] */
export function courseStep(st, pos, vel = null) {
  const s = st || { at: null, deg: null };
  if (!pos) return s;
  if (Number.isFinite(pos.gpsHeading) && (pos.speedMps ?? 0) >= COURSE.gpsMinMps) return { ...s, at: [pos.x, pos.y], deg: pos.gpsHeading };
  if (vel) {
    const a = COURSE.kfAlpha, v0 = s.v || [0, 0], v = [v0[0] + a * (vel[0] - v0[0]), v0[1] + a * (vel[1] - v0[1])];
    return { at: [pos.x, pos.y], v, deg: Math.hypot(v[0], v[1]) >= COURSE.kfMinMps ? ((Math.atan2(v[0], v[1]) * 180) / Math.PI + 360) % 360 : s.deg };
  }
  if (!s.at) return { at: [pos.x, pos.y], deg: s.deg };
  const dx = pos.x - s.at[0], dy = pos.y - s.at[1];
  if (Math.hypot(dx, dy) < Math.max(COURSE.minM, 2 * (pos.accuracyM ?? 0))) return s;
  return { at: [pos.x, pos.y], deg: (((Math.atan2(dx, dy) * 180) / Math.PI) + 360) % 360 };
}

/**
 * Modelo da tela da guia. `session` = memória da sessão (objeto mutável do chamador, ver schmidtGuideSession).
 * @returns {{state:string, title:string, distM?:number|null, goM?:number, seg?:number|null, progress?:any, big?:string, dir?:string, azimuth?:number, warn?:string[], next?:any, info?:string, to?:number[]}}
 */
export function guideModel(route, sc, field, pos, now, session, opts = {}) {
  const m = guideModelCore(route, sc, field, pos, now, session, opts);
  // 3.4: progresso do tiro (pontos já passados), para a barra do modo navegação
  if (m.next) m.progress = { done: m.next.seq - (m.state === 'arrived' ? 0 : 1), total: route.nPoints };
  return m;
}

// ---------- 3.22 · núcleo da guia sem DOM (a tela só executa os efeitos: vibrar, falar, redesenhar) ----------

/** Velocidade (m/s): a do GPS quando existe; senão o deslocamento numa janela de ~3–6 s (3.19).
 *  Parado, o GPS "treme" 3–6 m entre leituras, mas o tremor vai e volta e não acumula: medindo da leitura de ~3 s atrás
 *  até a atual, e só acima de 1,5 × a precisão (mín. 6 m), tremor fica 0 e moto (≥ 20 m em 3 s) aparece.
 *  @param {any[]} hist leituras anteriores  @param {any} prev posição anterior (com speedMps)  @param {any} pos nova posição
 *  @returns {{hist:any[], speed:number|null}} */
export function speedStep(hist, prev, pos) {
  const h = [...(hist || []).filter(x => pos.at - x.at <= 6000), pos];
  let v = pos.speedMps;
  if (Number.isFinite(v) && v < 0.5) v = 0;
  if (!Number.isFinite(v)) {
    const old = h.find(x => pos.at - x.at >= 2500) || null;
    if (!old) return { hist: h, speed: prev?.speedMps ?? null };
    const dt = (pos.at - old.at) / 1000, d = Math.hypot(pos.x - old.x, pos.y - old.y), noise = Math.max(6, 1.5 * Math.max(old.accuracyM || 0, pos.accuracyM || 0));
    v = d <= noise ? 0 : d / dt;
  }
  return { hist: h, speed: Number.isFinite(prev?.speedMps) ? 0.5 * prev.speedMps + 0.5 * v : v };
}

/** Moto ou a pé com histerese (3.19): vira moto acima de 2,5 m/s por 2 leituras; volta a pé abaixo de 1,5 m/s por 2.
 *  @param {{mode:string, n:number}} st  @param {number|null} v  @returns {{mode:string, n:number}} */
export function modeStep(st, v) {
  const want = !Number.isFinite(v) ? st.mode : Number(v) >= MOTO_MPS ? 'moto' : Number(v) < 1.5 ? 'pe' : st.mode;
  if (want === st.mode) return { mode: st.mode, n: 0 };
  const n = (st.n || 0) + 1;
  return n >= 2 ? { mode: want, n: 0 } : { mode: st.mode, n };
}

/** 4.0-e · vibrações com nome (o mesmo padrão em todo lugar; dá para sentir sem olhar): fora da linha = 3 toques curtos,
 *  chegando = 1 toque, pare aqui = 1 longo, chegou = 3 pulsos longos. */
export const VIBRA = Object.freeze({ foraDaLinha: [70, 60, 70, 60, 70], chegando: 150, pare: 600, chegou: [300, 100, 300, 100, 300] });

/** Avisos da guia, uma vez por saída da linha / por ponto: fora da linha (3 toques), chegando (1 toque; de moto ~8 s
 *  antes), pare aqui (vibração longa, de moto) e chegou (3 pulsos). `mem` = o que já foi avisado.
 *  @param {any} model modelo da tela (guideModel)  @param {any} mem {offWarned, nearId, stopId, arrivedId, startedTrack}
 *  @param {{arrivalRadiusM?:number, speedMps?:number|null}} [o]
 *  @returns {{mem:any, effects:{vibrate:any, say:string}[]}} — vibrate null = só falar */
export function guideAlerts(model, mem, o = {}) {
  const m = { ...mem }, effects = [];
  const off = !!model?.warn?.some(w => /da linha|linha do|Passou do ponto/.test(w));
  if (off && !m.offWarned) effects.push({ vibrate: VIBRA.foraDaLinha, say: 'Atenção: fora da linha.' });
  m.offWarned = off;
  const nearM = Math.max(3 * (o.arrivalRadiusM ?? 10), 8 * (o.speedMps ?? 0)), dM = model?.distM ?? NaN;
  if (model?.state === 'go' && Number.isFinite(dM) && dM <= nearM && model.next?.id !== m.nearId) {
    m.nearId = model.next.id; effects.push({ vibrate: VIBRA.chegando, say: `Chegando ao ponto ${model.next.seq}: ${Math.round(dM)} metros.` });
  }
  // 3.24 · a caminho (sobretudo de moto, sem olhar a tela): com a voz ligada, "faltam N metros" a cada 100 m, até o
  // aviso de chegando assumir. Só fala (sem vibrar); a primeira leitura de cada alvo só marca a faixa
  const gM = model?.goM ?? dM;
  if (model?.state === 'go' && Number.isFinite(gM) && model.next) {
    const band = Math.floor(gM / 100), key = model.next.id + (model.title?.startsWith('Primeiro') ? '|entrada' : '');
    if (m.bandKey !== key) { m.bandKey = key; m.band = band; }
    else if (band < m.band && gM > nearM) { m.band = band; effects.push({ vibrate: null, say: `Faltam ${(band + 1) * 100} metros.` }); }
    else if (band > m.band) m.band = band; // afastou: volta a contar dali
  }
  if (model?.state === 'stop' && model.next?.id !== m.stopId) {
    m.stopId = model.next.id; effects.push({ vibrate: VIBRA.pare, say: `Pare. Ponto ${model.next.seq} a ${Math.round(model.distM ?? 0)} metros.` });
  }
  if (model?.state === 'arrived') m.startedTrack = true; // chegou a um ponto: o sentido do tiro fica (3.20)
  if (model?.state === 'arrived' && model.next?.id !== m.arrivedId) {
    m.arrivedId = model.next.id; effects.push({ vibrate: VIBRA.chegou, say: `Chegou ao ponto ${model.next.seq}, número ${model.next.number}.` });
  }
  return { mem: m, effects };
}

/** 3.23 · a entrada do tiro conta como alcançada a até 30 m (3 × o raio de chegada padrão). */
export const ENTRY_REACHED_M = 30;

/** 3.17 · de moto ou a pé, pela velocidade (≥ 2,5 m/s ≈ 9 km/h: moto; parado ou andando: a pé). */
export const MOTO_MPS = 2.5;
export const modeOf = speedMps => (Number.isFinite(speedMps) && speedMps >= MOTO_MPS ? 'moto' : 'pe');
/** Tempo até o ponto na velocidade atual (só em movimento). */
const eta = (m, speedMps) => {
  if (!Number.isFinite(speedMps) || speedMps < 0.8 || !(m > 0)) return '';
  const s = m / speedMps;
  return s < 60 ? ` ·\u00a0~${num(Math.max(5, Math.round(s / 5) * 5))}\u00a0s` : ` ·\u00a0~${num(Math.round(s / 60))}\u00a0min`;
};

/** @returns {any} */
/** @param {{toEntry?:boolean}} [opts] toEntry: ponta escolhida à mão e ainda não alcançada (3.23) */
function guideModelCore(route, sc, field, pos, now, session, opts = {}) {
  const monitor = sc.params.monitor;
  if (!pos) return { state: 'wait', title: 'Aguardando o GPS', info: 'Fique a céu aberto. A seta aparece com a primeira posição.' };
  const ageMs = now - pos.at, key = `${field.farm}|${field.code}|${sc.signature}|${route.trackId}|${route.flipped}`;
  const state = schmidtGuideSession(session, key);
  const g = /** @type {any} */ (guide(route, { ...pos, ageMs, guideState: state }, NONE, monitor, schmidtGuideNextPoint));
  if (g.done) return { state: 'done', title: 'Tiro sem pontos à frente' };
  const n = g.next, label = `Ponto ${n.seq} de ${route.nPoints}`, warn = [];
  if (g.stale) return { state: 'stale', title: label, big: 'Aguardando posição', warn: [`GPS sem atualização há ${num(ageMs / 1000)} s.`], next: n };
  // 4.8 · N5 · GPS fraco (> 15 m) antes da 1ª posição boa da guia: espera firmar, sem seta. Antes, a 1ª leitura ruim
  // caía no ponto 1 e, no meio do tiro, mandava "voltar" centenas de metros. Depois de firmar, só o aviso curto.
  if (!g.accuracyOk && !state.targetId) return { state: 'wait', title: 'Aguardando o GPS firmar', big: `± ${num(pos.accuracyM)} m`, dir: 'de erro', info: `A guia começa com até ${num(monitor.gpsAccuracyMaxM)} m. Fique a céu aberto.`, warn: [], next: n };
  if (!g.accuracyOk) warn.push(`GPS impreciso (± ${num(pos.accuracyM)} m).`);
  // Longe do tiro (chegando ao lote): a guia leva à entrada do tiro, no início do sentido escolhido, sem avisos de linha.
  const farM = Math.max(150, 5 * (monitor.offLineWarnM || 0)), start = route.parts?.[0]?.entry;
  // 3.23 · ponta escolhida à mão ("Outra ponta"): leva até a entrada antes de tudo (a pessoa pode estar perto da outra
  // ponta, onde a escolha normal do próximo ponto já daria o tiro como andado)
  if (start && opts.toEntry && Math.hypot(start[0] - pos.x, start[1] - pos.y) > ENTRY_REACHED_M && !g.stale) {
    const dx = start[0] - pos.x, dy = start[1] - pos.y, az = azimuth(dx, dy);
    return { state: 'go', goM: Math.hypot(dx, dy), title: `Primeiro: vá até a entrada do ${route.trackId}`, big: `${num(Math.hypot(dx, dy))} m`, dir: `para o ${cardinal(az)}`, azimuth: az, to: [start[0], start[1]], warn, next: route.points[0] ?? n };
  }
  if (start && Number.isFinite(g.lateralM) && g.lateralM > farM && !g.arrived) {
    const dx = start[0] - pos.x, dy = start[1] - pos.y, az = azimuth(dx, dy);
    return { state: 'go', goM: Math.hypot(dx, dy), title: `Primeiro: vá até a entrada do ${route.trackId}`, big: `${num(Math.hypot(dx, dy))} m`, dir: `para o ${cardinal(az)}`, azimuth: az, to: [start[0], start[1]], warn, next: n };
  }
  const entry = g.alvo?.tipo === 'entrada';
  // Indo para a entrada do tiro, "fora da linha" não ajuda (ainda não se está nela): só a seta até a entrada.
  if (g.offLine && !entry) {
    const selected = new Set(sc.selected.map(t => t.id)), wrong = tiroErrado(sc.units.filter(u => selected.has(u.trackId)), route.trackId, pos, monitor.offLineWarnM);
    warn.push(wrong ? `Você está na linha do ${wrong.trackId}, não do ${route.trackId}. Ande de lado até o ${route.trackId} (${num(wrong.meuM)} m).`
      : `Você está ${num(g.lateralM)} m à ${g.lado} da linha: volte ${g.lado === 'direita' ? 'para a esquerda' : 'para a direita'}.`);
  }
  // 4.8 · ponto já alcançado nesta guia não gera "volte": seguindo após o último, o tiro está concluído (antes, quem
  // andava até a cabeceira para o próximo tiro via "Passou do ponto N: volte" em ~10% das leituras, na simulação)
  if (g.arrived) state.reached = n.id;
  if (g.trecho?.passouM > 0 && state.reached === n.id && n.seq === route.nPoints) return { state: 'done', title: `Tiro ${route.trackId} concluído`, big: `${route.nPoints} de ${route.nPoints}`, dir: 'pontos', info: 'Todos os pontos do tiro foram alcançados.', next: n };
  if (g.trecho?.passouM > 0 && state.reached !== n.id) warn.push(`Passou do ponto ${n.seq} em ${num(g.trecho.passouM)} m: volte pela linha.`);
  // 3.4: ao chegar, já diz o que vem depois (ponto seguinte e a distância andando no tiro)
  const after = route.points.find(p => p.seq === n.seq + 1);
  if (g.arrived) return { state: 'arrived', title: `Chegou ao ponto ${n.seq} de ${route.nPoints}`, big: `nº ${n.number}`, info: after ? `Depois: ponto ${after.seq} de ${route.nPoints}${Number.isFinite(after.deltaM) ? `, a ${num(after.deltaM)} m` : ''}` : 'Último ponto do tiro', warn: g.arrivalUncertain ? [`GPS impreciso (± ${num(pos.accuracyM)} m): confira pelos passos.`] : [], next: n };
  // 3.19 · de moto, perto do ponto: pare aqui (a chegada vem depois, a pé ou parado no raio normal)
  if (g.stopHere) return { state: 'stop', distM: g.distM, to: [n.x, n.y], title: `Pare aqui: ponto ${n.seq} de ${route.nPoints}`, big: `${num(g.distM)} m`, dir: `para o ${g.direction}`, azimuth: g.azimuthDeg, info: 'Pare a moto e vá até o ponto.', warn, next: n };
  const a = g.alvo;
  return { state: 'go', distM: entry ? null : a.distM, goM: a.distM, to: [a.x, a.y], title: entry ? 'Primeiro: vá até a entrada do tiro' : `Próximo: ${label}`, big: `${num(a.distM)} m`, dir: `para o ${a.direction}`, azimuth: a.azimuthDeg,
    info: g.trecho && !entry ? `Faltam ${num(Math.max(0, g.trecho.faltaM))} m andando no tiro${eta(Math.max(0, g.trecho.faltaM), pos.speedMps)}` : undefined, warn, next: n,
    // 3.16 · quanto do trecho até o ponto já foi andado (0–1), para o anel em volta da seta
    seg: g.trecho && !entry && g.trecho.totalM > 0 ? Math.max(0, Math.min(1, g.trecho.andadoM / g.trecho.totalM)) : null };
}
