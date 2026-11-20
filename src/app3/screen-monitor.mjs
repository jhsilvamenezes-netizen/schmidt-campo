// 3.1 (U02) · tela Monitorar: tiro e sentido, guia por GPS (política 2.0), tela acesa e vibração ao chegar.
import { routeFor, fixToPos, guideModel, nearEndFlipped, speedStep, modeStep, guideAlerts } from './monitor.mjs';
import { headingOf, smoothHeading, arrowAngle } from './compass.mjs';
import { toGPX } from '../engine3/exporters.mjs';

/** @param {any} app */
export function installMonitor(app) {
  const { document, window, ui } = app;
  /** Guia: tiro, sentido, GPS ligado, última posição, memória da sessão, trava de tela. */
  /** @type {any} */ const mon = { mode: 'pe', modeN: 0, voice: false, follow: true, heading: null, compass: false, compassAt: 0, trackId: null, flipped: false, active: false, watchId: null, pos: null, session: {}, wake: null, arrivedId: null, ticker: 0 };

  function monitorData() {
    const cur = app.cur, sc = cur.sc, tasks = new Map();
    (cur.split?.pessoas || []).forEach((p, i) => p.tarefas.forEach(t => tasks.set(t.id, `Pessoa ${i + 1}`)));
    const tracks = sc.selected.filter(t => sc.units.some(u => u.trackId === t.id)).map(t => ({ id: t.id, person: tasks.get(t.id) }));
    if (!tracks.some(t => t.id === mon.trackId)) mon.trackId = tracks[0]?.id ?? null;
    // 3.20 · antes do primeiro ponto, entra pela ponta mais perto (o "Inverter" à mão desliga a escolha automática)
    if (mon.active && mon.trackId && mon.pos && !mon.manualDir && !mon.startedTrack) {
      const f = nearEndFlipped(sc, cur.field, mon.trackId, mon.pos, mon.flipped, sc.params.monitor?.offLineWarnM ?? 25);
      if (f !== mon.flipped) { mon.flipped = f; mon.autoDir = true; mon.session = {}; mon.nearId = null; mon.stopId = null; }
    }
    const route = mon.trackId ? routeFor(sc, cur.field, mon.trackId, mon.flipped) : null;
    const model = route && mon.active ? guideModel(route, sc, cur.field, mon.pos, Date.now(), mon.session) : null;
    // 3.22 · avisos decididos no núcleo sem DOM (monitor.mjs); aqui só vibra e fala
    const al = guideAlerts(model, { offWarned: mon.offWarned, nearId: mon.nearId, stopId: mon.stopId, arrivedId: mon.arrivedId, startedTrack: mon.startedTrack },
      { arrivalRadiusM: cur.sc.params.monitor?.arrivalRadiusM ?? 10, speedMps: mon.pos?.speedMps ?? 0 });
    Object.assign(mon, al.mem);
    for (const e of al.effects) { try { window.navigator.vibrate?.(e.vibrate); } catch { /* sem vibração */ } say(e.say); }
    // 3.13 (V3) · terminou o tiro: oferece o próximo tiro da mesma pessoa (equipe do Plano); sem equipe, o seguinte da lista
    /** @type {any} */ let nextTrack = null;
    if (model && route && (model.state === 'done' || (model.state === 'arrived' && model.next?.seq === route.nPoints))) {
      const mine = (cur.split?.pessoas || []).find(p => p.tarefas.some(t => t.id === mon.trackId));
      const order = mine ? mine.tarefas.map(t => t.id) : tracks.map(t => t.id), i = order.indexOf(mon.trackId);
      const id = order[i + 1] ?? null, t = tracks.find(x => x.id === id);
      if (t) nextTrack = t;
    }
    return { nextTrack, mode: mon.pos ? (Date.now() - mon.pos.at > 5000 ? 'pe' : mon.pos.mode ?? null) : null, speed: mon.pos ? (Date.now() - mon.pos.at > 5000 ? 0 : mon.pos.speedMps ?? null) : null, lot: cur.field.code, acc: mon.pos?.accuracyM ?? null, tracks, trackId: mon.trackId, flipped: mon.flipped, autoDir: !!mon.autoDir && !mon.manualDir, active: mon.active, model, heading: mon.heading, voice: mon.voice, canSpeak: !!window.speechSynthesis, steps: route?.instructions || [], target: model?.next?.id ?? null };
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
      if (pos) { const sp = speedStep(mon.hist, mon.pos, pos), md = modeStep({ mode: mon.mode, n: mon.modeN }, sp.speed); mon.hist = sp.hist; mon.mode = md.mode; mon.modeN = md.n; pos.speedMps = sp.speed; pos.mode = md.mode; mon.pos = pos; if (ui.view === 'monitorar') app.render(); }
      // 3.17 · parado no ponto (coletando), o GPS não manda leitura nova: antes vinha "GPS indisponível" a cada 20 s.
      // Sem tempo-limite; leitura velha já aparece como "GPS sem atualização há N s" (guia)
    }, err => { if (err.code === 1) app.toast('Permita a localização para usar a guia.'); else if (!mon.pos) app.toast('Sem sinal do GPS ainda: fique a céu aberto.'); }, { enableHighAccuracy: true, maximumAge: 0 });
  }
  function unwatch() { if (mon.watchId !== null) window.navigator.geolocation?.clearWatch(mon.watchId); mon.watchId = null; }
  function gpsStart() {
    if (!window.navigator.geolocation) { app.toast('Este aparelho não oferece GPS ao navegador.'); return; }
    mon.active = true; mon.pos = null; mon.session = {}; mon.startedTrack = false; mon.arrivedId = null; mon.nearId = null; mon.stopId = null; mon.hist = [];
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
  app.clicks.push(t => { if (!t.dataset.track) return false; mon.trackId = t.dataset.track; mon.flipped = false; mon.manualDir = false; mon.autoDir = false; mon.startedTrack = false; mon.session = {}; mon.arrivedId = null; app.render(); return true; });
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
    flip: () => { mon.flipped = !mon.flipped; mon.manualDir = true; mon.autoDir = false; mon.session = {}; app.render(); },
    // 3.13 · segue para o próximo tiro sem parar a guia (sentido do plano, chegada e vibração zeradas)
    'next-track': () => { const n = monitorData().nextTrack; if (!n) return; mon.trackId = n.id; mon.flipped = false; mon.manualDir = false; mon.autoDir = false; mon.startedTrack = false; mon.session = {}; mon.arrivedId = null; mon.nearId = null; mon.stopId = null; app.render(); },
  });
}
