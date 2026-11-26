// 3.24 · aba Monitorar em HTML (guia por GPS). Sem DOM; recebe dados prontos.
import { esc, num } from './format.mjs';
import { GRAB } from './views.mjs';


/** Guia por GPS: escolha do tiro, seta, distância e avisos. Sem marcação de coleta. */
export function monitorView({ mode = /** @type {string|null} */ (null), nextTrack = /** @type {any} */ (null), speed = /** @type {number|null} */ (null), lot = '', acc = null, tracks, trackId, flipped, autoDir = false, active, model, steps, heading = null, voice = false, canSpeak = false }) {
  const pick = `<div class="chips" role="group" aria-label="Tiro">${tracks.map(t => `<button class="chipb${t.id === trackId ? ' on' : ''}" data-track="${esc(t.id)}" aria-pressed="${t.id === trackId}">${esc(t.id)}${t.person ? `<small>${esc(t.person)}</small>` : ''}</button>`).join('')}</div>`;
  const head = `<section class="card"><h2 class="h">Tiro</h2>${pick}<div class="row-sb"><p class="mu">Sentido: ${autoDir ? 'pela ponta mais perto' : flipped ? 'invertido' : 'do plano'}</p><button class="link" data-act="flip">Inverter</button></div></section>`;
  if (!active) return `<div class="map sm" data-map="guide"></div><div class="scroll">${GRAB}${head}<button class="btn p" data-act="gps-start">Iniciar guia</button>
<details class="card fold list" data-k="semguia"><summary class="sumc"><span class="x"><b>Sem o guia</b><small class="sub">GPX para outro app ou roteiro a pé</small></span></summary><button class="lnk" data-act="gpx-track"><span>GPX do ${esc(trackId || 'tiro')}<small>para outro app de GPS</small></span></button>
<details class="ex trk"><summary class="sumc">Roteiro sem GPS</summary>${steps.map(t => `<p>${esc(t)}</p>`).join('')}</details></details></div>`;
  const cur = tracks.find(t => t.id === trackId), m = model;
  // seta pequena ao lado da distância: o mapa (grande, acima) fica livre para contornar e se orientar
  // com bússola, a seta aponta para onde andar com o celular na mão; sem ela, norte para cima
  const rel = Number.isFinite(m.azimuth) ? (Number.isFinite(heading) ? (((m.azimuth - Number(heading)) % 360) + 360) % 360 : m.azimuth) : null;
  // 3.16 · anel em volta da seta: quanto do trecho até o ponto já foi andado (cheio = chegando)
  const C = 2 * Math.PI * 28, seg = Number.isFinite(m.seg) ? m.seg : null;
  const ring = seg === null ? '' : `<circle class="ring" r="28" transform="rotate(-90)" stroke-dasharray="${(C * seg).toFixed(1)} ${C.toFixed(1)}"/>`;
  const arrow = rel === null ? '' : `<svg class="arrow" viewBox="-32 -32 64 64" aria-hidden="true"><circle r="28"/>${ring}<g data-az="${m.azimuth.toFixed(1)}" transform="rotate(${rel.toFixed(0)})"><path d="M0 -20L12 13L0 6L-12 13Z"/></g></svg>`;
  // 3.4 · modo navegação: mapa em tela cheia (topo some), etiqueta do tiro e do GPS por cima do mapa, barra de progresso,
  // distância grande e botões grandes (luva, sol, uma mão)
  const pr = m.progress, gps = acc === null ? '' : `<span class="gps ${acc <= 5 ? 'ok' : acc <= 15 ? 'al' : 'er'}">GPS ± ${num(acc)} m</span>`;
  // 3.17 · de moto ou a pé (pela velocidade); de moto mostra km/h
  const v = Number(speed), modo = mode === 'moto' ? `<span class="modo">Moto ${num(Math.max(0, v) * 3.6)} km/h</span>` : mode === 'pe' && speed !== null ? '<span class="modo">A pé</span>' : '';
  const bar = pr ? `<div class="prog" role="img" aria-label="${pr.done} de ${pr.total} pontos">${Array.from({ length: pr.total }, (_, i) => `<i class="${i < pr.done ? 'd' : i === pr.done ? 'n' : ''}"></i>`).join('')}</div>` : '';
  return `<h1 class="sr">Guia · ${esc(lot)} · ${esc(trackId)}</h1><div class="map nav" data-map="guide"></div><div class="navpill"><b>${esc(lot)} · ${esc(trackId)}</b>${cur?.person && mode !== 'moto' ? `<span>${esc(cur.person)}</span>` : ''}${modo}${gps}</div><section class="sheet gsheet${mode === 'moto' ? ' moto' : ''}">${bar}
<div class="guide ${m.state}" aria-live="polite">${arrow}<div class="gtxt"><p class="mu">${esc(m.title)}${pr ? ` <b class="cnt">${pr.done}/${pr.total}</b>` : ''}</p>${m.big ? `<p class="big">${esc(m.big)}${m.dir ? ` <span class="dir">${esc(m.dir)}</span>` : ''}</p>` : ''}${m.info ? `<p class="mu">${esc(m.info)}</p>` : ''}${pr && pr.done === 0 && m.state !== 'arrived' ? `<div class="row-sb"><p class="mu">${autoDir ? 'Pela ponta mais perto.' : flipped ? 'Pela outra ponta.' : 'Pela entrada do plano.'}</p><button class="link" data-act="flip">Outra ponta</button></div>` : ''}${rel === null ? '' : `<p class="sr" data-compass-label>${Number.isFinite(heading) ? 'seta pelo celular' : 'seta com o norte para cima'}</p>`}</div></div>
${(m.warn || []).map(w => `<p class="ck alerta">${esc(w)}</p>`).join('')}
${nextTrack ? `<button class="btn p" data-act="next-track">Próximo tiro: ${esc(nextTrack.id)}${nextTrack.person ? ` · ${esc(nextTrack.person)}` : ''}</button>` : ''}<div class="two gbtns">${canSpeak ? `<button class="btn" data-act="voice" aria-pressed="${voice}">${voice ? 'Voz ligada' : 'Ligar voz'}</button>` : `<button class="btn" data-act="flip">Inverter</button>`}<button class="btn stop" data-act="gps-stop">Parar guia</button></div></section>`;
}
