// 3.1 (U02) · tela Monitorar: tiro e sentido, guia por GPS (política 2.0), tela acesa e vibração ao chegar.
import { routeFor, fixToPos, guideModel } from './monitor.mjs';

/** @param {any} app */
export function installMonitor(app) {
  const { document, window, ui } = app;
  /** Guia: tiro, sentido, GPS ligado, última posição, memória da sessão, trava de tela. */
  /** @type {any} */ const mon = { trackId: null, flipped: false, active: false, watchId: null, pos: null, session: {}, wake: null, arrivedId: null, ticker: 0 };

  function monitorData() {
    const cur = app.cur, sc = cur.sc, tasks = new Map();
    (cur.split?.pessoas || []).forEach((p, i) => p.tarefas.forEach(t => tasks.set(t.id, `Pessoa ${i + 1}`)));
    const tracks = sc.selected.filter(t => sc.units.some(u => u.trackId === t.id)).map(t => ({ id: t.id, person: tasks.get(t.id) }));
    if (!tracks.some(t => t.id === mon.trackId)) mon.trackId = tracks[0]?.id ?? null;
    const route = mon.trackId ? routeFor(sc, cur.field, mon.trackId, mon.flipped) : null;
    const model = route && mon.active ? guideModel(route, sc, cur.field, mon.pos, Date.now(), mon.session) : null;
    if (model?.state === 'arrived' && model.next?.id !== mon.arrivedId) { mon.arrivedId = model.next.id; try { window.navigator.vibrate?.([200, 80, 200]); } catch { /* sem vibração */ } }
    return { tracks, trackId: mon.trackId, flipped: mon.flipped, active: mon.active, model, steps: route?.instructions || [], target: model?.next?.id ?? null };
  }
  async function keepAwake(on) {
    try {
      if (on && !mon.wake && window.navigator.wakeLock) mon.wake = await window.navigator.wakeLock.request('screen');
      else if (!on && mon.wake) { await mon.wake.release(); mon.wake = null; }
    } catch { mon.wake = null; /* aparelho sem permissão: a guia funciona igual */ }
  }
  function gpsStart() {
    const geo = window.navigator.geolocation;
    if (!geo) { app.toast('Este aparelho não oferece GPS ao navegador.'); return; }
    mon.active = true; mon.pos = null; mon.session = {}; mon.arrivedId = null;
    mon.watchId = geo.watchPosition(position => {
      const pos = fixToPos(position, app.cur.field, mon.pos?.at ?? 0, Date.now());
      if (pos) { mon.pos = pos; if (ui.view === 'monitorar') app.render(); }
    }, err => { app.toast(err.code === 1 ? 'Permita a localização para usar a guia.' : 'GPS indisponível agora.'); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    keepAwake(true); clearInterval(mon.ticker); mon.ticker = setInterval(() => { if (mon.active && ui.view === 'monitorar') app.render(); }, 5000);
    app.render();
  }
  function gpsStop() {
    if (mon.watchId !== null) window.navigator.geolocation?.clearWatch(mon.watchId);
    mon.watchId = null; mon.active = false; clearInterval(mon.ticker); keepAwake(false); app.render();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && mon.active) keepAwake(true); });

  app.monitorData = monitorData;
  app.guide = () => ({ target: mon.active ? monitorData().target : null, pos: mon.pos });
  app.onLotChange.push(() => { if (mon.active) gpsStop(); mon.trackId = null; });
  app.clicks.push(t => { if (!t.dataset.track) return false; mon.trackId = t.dataset.track; mon.session = {}; mon.arrivedId = null; app.render(); return true; });
  Object.assign(app.ACTIONS, {
    'gps-start': () => gpsStart(),
    'gps-stop': () => gpsStop(),
    flip: () => { mon.flipped = !mon.flipped; mon.session = {}; app.render(); },
  });
}
