// 3.1 (U02) · tela Monitorar: tiro e sentido, guia por GPS (política 2.0), tela acesa e vibração ao chegar.
import { routeFor, fixToPos, guideModel } from './monitor.mjs';
import { headingOf, smoothHeading, arrowAngle } from './compass.mjs';
import { toGPX } from '../engine3/exporters.mjs';

/** @param {any} app */
export function installMonitor(app) {
  const { document, window, ui } = app;
  /** Guia: tiro, sentido, GPS ligado, última posição, memória da sessão, trava de tela. */
  /** @type {any} */ const mon = { voice: false, follow: true, heading: null, compass: false, compassAt: 0, trackId: null, flipped: false, active: false, watchId: null, pos: null, session: {}, wake: null, arrivedId: null, ticker: 0 };

  function monitorData() {
    const cur = app.cur, sc = cur.sc, tasks = new Map();
    (cur.split?.pessoas || []).forEach((p, i) => p.tarefas.forEach(t => tasks.set(t.id, `Pessoa ${i + 1}`)));
    const tracks = sc.selected.filter(t => sc.units.some(u => u.trackId === t.id)).map(t => ({ id: t.id, person: tasks.get(t.id) }));
    if (!tracks.some(t => t.id === mon.trackId)) mon.trackId = tracks[0]?.id ?? null;
    const route = mon.trackId ? routeFor(sc, cur.field, mon.trackId, mon.flipped) : null;
    const model = route && mon.active ? guideModel(route, sc, cur.field, mon.pos, Date.now(), mon.session) : null;
    if (model?.state === 'arrived' && model.next?.id !== mon.arrivedId) {
      mon.arrivedId = model.next.id;
      try { window.navigator.vibrate?.([200, 80, 200]); } catch { /* sem vibração */ }
      say(`Chegou ao ponto ${model.next.seq}, número ${model.next.number}.`);
    }
    return { tracks, trackId: mon.trackId, flipped: mon.flipped, active: mon.active, model, heading: mon.heading, voice: mon.voice, canSpeak: !!window.speechSynthesis, steps: route?.instructions || [], target: model?.next?.id ?? null };
  }
  async function keepAwake(on) {
    try {
      if (on && !mon.wake && window.navigator.wakeLock) mon.wake = await window.navigator.wakeLock.request('screen');
      else if (!on && mon.wake) { await mon.wake.release(); mon.wake = null; }
    } catch { mon.wake = null; /* aparelho sem permissão: a guia funciona igual */ }
  }
  // ---------- bússola: a seta aponta para onde andar com o celular na mão (se o aparelho tiver sensor) ----------
  function onOrientation(e) {
    const h = headingOf(e, window.screen?.orientation?.angle ?? window.orientation ?? 0);
    if (h === null) return;
    mon.heading = smoothHeading(mon.heading, h);
    const now = Date.now();
    if (now - mon.compassAt < 100) return;
    mon.compassAt = now;
    // gira só a seta e o cone do mapa (sem redesenhar a tela): leve e sem tremer
    const g = document.querySelector('.arrow [data-az]');
    if (g) g.setAttribute('transform', `rotate(${arrowAngle(+g.dataset.az, mon.heading).toFixed(0)})`);
    const lbl = document.querySelector('[data-compass-label]'); if (lbl) lbl.textContent = 'seta pelo celular';
    if (now - (mon.mapAt || 0) > 700) { mon.mapAt = now; app.drawMaps(); }
  }
  function compassOn() {
    // Ouve sempre; o pedido de licença só existe em alguns aparelhos (iPhone) e, se for negado, simplesmente não chegam leituras.
    window.addEventListener('deviceorientationabsolute', onOrientation);
    window.addEventListener('deviceorientation', onOrientation);
    mon.compass = true;
    try { const D = window.DeviceOrientationEvent; if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {}); } catch { /* sem bússola: seta com o norte para cima */ }
  }
  function compassOff() {
    window.removeEventListener('deviceorientationabsolute', onOrientation);
    window.removeEventListener('deviceorientation', onOrientation);
    mon.compass = false; mon.heading = null;
  }

  function watch() {
    const geo = window.navigator.geolocation;
    mon.watchId = geo.watchPosition(position => {
      const pos = fixToPos(position, app.cur.field, mon.pos?.at ?? 0, Date.now());
      if (pos) { mon.pos = pos; if (ui.view === 'monitorar') app.render(); }
    }, err => { app.toast(err.code === 1 ? 'Permita a localização para usar a guia.' : 'GPS indisponível agora.'); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }
  function unwatch() { if (mon.watchId !== null) window.navigator.geolocation?.clearWatch(mon.watchId); mon.watchId = null; }
  function gpsStart() {
    if (!window.navigator.geolocation) { app.toast('Este aparelho não oferece GPS ao navegador.'); return; }
    mon.active = true; mon.pos = null; mon.session = {}; mon.arrivedId = null;
    watch(); compassOn(); keepAwake(true); clearInterval(mon.ticker); mon.ticker = setInterval(() => { if (mon.active && ui.view === 'monitorar') app.render(); }, 5000);
    app.render();
  }
  function gpsStop() {
    unwatch(); mon.active = false; clearInterval(mon.ticker); compassOff(); keepAwake(false); window.speechSynthesis?.cancel?.(); app.render();
  }
  // Tela apagada ou app em segundo plano: GPS e bússola param (bateria); ao voltar, retomam sozinhos.
  document.addEventListener('visibilitychange', () => {
    if (!mon.active) return;
    if (document.visibilityState === 'hidden') { unwatch(); compassOff(); }
    else { if (mon.watchId === null) watch(); compassOn(); keepAwake(true); }
  });
  /** Voz (opcional): fala a chegada e o próximo ponto, para andar sem olhar a tela. */
  function say(text) {
    if (!mon.voice) return;
    try { const u = new window.SpeechSynthesisUtterance(text); u.lang = 'pt-BR'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch { /* aparelho sem voz */ }
  }

  app.monitorData = monitorData;
  app.guide = () => {
    const d = mon.active ? monitorData() : null, to = d?.model?.to || null;
    return { target: d?.target ?? null, pos: mon.pos, to, heading: mon.heading, follow: mon.follow, focus: mon.follow && mon.pos ? [[mon.pos.x, mon.pos.y], ...(to ? [to] : [])] : null };
  };
  app.onLotChange.push(() => { if (mon.active) gpsStop(); mon.trackId = null; });
  app.clicks.push(t => { if (!t.dataset.track) return false; mon.trackId = t.dataset.track; mon.session = {}; mon.arrivedId = null; app.render(); return true; });
  Object.assign(app.ACTIONS, {
    // arquivo só do tiro escolhido (no sentido escolhido), para abrir em outro app de GPS
    'gpx-track': () => {
      const cur = app.cur; if (!mon.trackId) return;
      const route = routeFor(cur.sc, cur.field, mon.trackId, mon.flipped), name = `${cur.field.farm}_${cur.field.code}_${mon.trackId}_SIMULADO`.replace(/[^\p{L}\p{N}_-]+/gu, '_');
      app.download(toGPX([route], cur.field, cur.sc, app.appVersion), `${name}.gpx`, 'application/gpx+xml'); app.toast(`GPX do ${mon.trackId} baixado.`);
    },
    'gps-start': () => gpsStart(),
    'gps-stop': () => gpsStop(),
    voice: () => { mon.voice = !mon.voice; if (mon.voice) say('Voz ligada.'); app.render(); },
    follow: () => { mon.follow = !mon.follow; app.drawMaps(); },
    flip: () => { mon.flipped = !mon.flipped; mon.session = {}; app.render(); },
  });
}
