// 3.1 (U02) · tela Enviar: arquivo do plano, fichas de campo, resumo e arquivos (CSV, GeoJSON, KML, GPX); abrir plano recebido.
import { mapMarkup } from './map.mjs';
import * as P from './planner.mjs';
import * as VX from './views-mais.mjs';
import { buildPlanFile, parsePlanFile } from './plan-file.mjs';
import { buildRoute } from '../engine3/guidance.mjs';
import { toCSV, toGeoJSON, toGPX, toKML } from '../engine3/exporters.mjs';

/** @param {any} app */
export function installEnviar(app) {
  const { document, window, fields, ui, store, appVersion } = app;
  const status = msg => { const s = document.querySelector('#status'); if (s) s.textContent = msg; };
  const fileBase = () => `${app.cur.field.farm}_${app.cur.field.code}_SIMULADO`.replace(/[^\p{L}\p{N}_-]+/gu, '_');
  const routes = () => { const cur = app.cur; return cur.sc.selected.filter(t => cur.sc.units.some(u => u.trackId === t.id)).map(t => buildRoute(cur.sc, cur.field, t.id)); };
  const summary = () => P.summaryText(app.cur.field, app.cur.sc, app.people(), app.cur.list, app.cur.split);
  function printFichas() {
    const cur = app.cur, people = new Map(); (cur.split?.pessoas || []).forEach((p, i) => p.tarefas.forEach(t => people.set(t.id, `Pessoa ${i + 1}`)));
    const mapFor = id => mapMarkup(cur.field, { ...cur.sc, samples: cur.sc.samples.filter(s => s.trackId === id) }, 700, 240, { pad: 16 });
    let box = document.querySelector('#print'); if (!box) { box = document.createElement('div'); box.id = 'print'; document.body.append(box); }
    box.innerHTML = VX.fichasMarkup(cur.field, routes(), people, mapFor);
    window.print();
  }
  const dl = app.download;
  Object.assign(app.ACTIONS, {
    fichas: () => printFichas(),
    csv: () => dl(toCSV(app.cur.sc, app.cur.field), `${fileBase()}.csv`, 'text/csv'),
    geojson: () => dl(JSON.stringify(toGeoJSON(app.cur.sc, app.cur.field)), `${fileBase()}.geojson`, 'application/geo+json'),
    kml: () => dl(toKML(routes(), app.cur.field, app.cur.sc), `${fileBase()}.kml`, 'application/vnd.google-earth.kml+xml'),
    gpx: () => dl(toGPX(routes(), app.cur.field, app.cur.sc, appVersion), `${fileBase()}.gpx`, 'application/gpx+xml'),
    async copy() { try { await window.navigator.clipboard.writeText(summary()); status('Resumo copiado.'); } catch { status('Este navegador não deixou copiar.'); } },
    async share() {
      const cur = app.cur, st = app.saved(), plan = buildPlanFile({ engineVersion: cur.sc.engineVersion, appVersion, fieldKey: ui.key, summary: cur.f, params: cur.sc.params, edits: st.editsByField?.[ui.key] ?? null });
      const text = JSON.stringify(plan, null, 1), name = `${fileBase()}.plano.json`, file = typeof File === 'function' ? new File([text], name, { type: 'application/json' }) : null;
      try {
        if (file && window.navigator.canShare?.({ files: [file] })) { await window.navigator.share({ title: `Plano ${cur.field.code}`, text: summary(), files: [file] }); return; }
      } catch (e) { if (/** @type {any} */ (e)?.name === 'AbortError') return; }
      dl(text, name, 'application/json'); status('Arquivo do plano baixado: envie aos monitores.');
    },
  });
  app.SHEETS.arquivos = () => app.openSheet('Arquivos e fichas', VX.arquivosBody());
  app.SHEETS.abrir = () => { app.closeSheet(); document.querySelector('#plan-input').click(); };
  app.changes.push(t => {
    if (t.id !== 'plan-input' || !t.files?.[0]) return false;
    t.files[0].text().then(text => {
      const p = parsePlanFile(text, fields), st = app.saved();
      ui.key = p.fieldKey;
      store.update({ fieldKey: p.fieldKey, paramsByField: { ...(st.paramsByField || {}), [p.fieldKey]: p.params }, editsByField: Object.fromEntries(Object.entries({ ...(st.editsByField || {}), [p.fieldKey]: p.edits }).filter(([, v]) => v)) });
      ui.view = 'plano'; app.render(); app.toast(`Plano de ${fields[p.fieldKey].code} aberto.`);
    }).catch(err => { app.toast(err.message); }).finally(() => { t.value = ''; });
    return true;
  });
}
