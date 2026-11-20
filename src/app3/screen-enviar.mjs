// 3.1 (U02) · tela Enviar: arquivo do plano, fichas de campo, resumo e arquivos (CSV, GeoJSON, KML, GPX); abrir plano recebido.
import { esc, plural } from './format.mjs';
import { mapMarkup } from './map.mjs';
import * as P from './planner.mjs';
import * as VX from './views-mais.mjs';
import { schmidtBlockSourceSignature } from '../application/block-planning.mjs';
import { snapshotSamples, storeBlock } from './blocks.mjs';
import { buildPlanFile, buildBlockFile, parsePlanFile, MAX_PLAN_BYTES } from './plan-file.mjs';
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
      const cur = app.cur, st = app.saved(), plan = cur.block
        ? buildBlockFile(fields, st.planningBlocks.records[app.blockId()], ui.key, appVersion)
        : { referencia: schmidtBlockSourceSignature(fields, [ui.key]), ...buildPlanFile({ engineVersion: cur.sc.engineVersion, appVersion, fieldKey: ui.key, summary: cur.f, params: cur.sc.params, edits: snapshotSamples(cur.sc) }) };
      const text = JSON.stringify(plan, null, 1), name = `${fileBase()}.plano.json`, file = typeof File === 'function' ? new File([text], name, { type: 'application/json' }) : null;
      try {
        if (file && window.navigator.canShare?.({ files: [file] })) { await window.navigator.share({ title: `Plano ${cur.field.code}`, text: summary(), files: [file] }); return; }
      } catch (e) { if (/** @type {any} */ (e)?.name === 'AbortError') return; }
      dl(text, name, 'application/json'); status('Arquivo do plano baixado: envie aos monitores.');
    },
  });
  app.SHEETS.arquivos = () => app.openSheet('Arquivos e fichas', VX.arquivosBody());
  app.SHEETS.abrir = () => { app.closeSheet(); document.querySelector('#plan-input').click(); };
  let fileRevision = 0;
  /** @type {ReturnType<typeof parsePlanFile>|null} */ let pending = null;
  app.onCloseSheet.push(() => { pending = null; fileRevision++; });
  app.ACTIONS['import-plan'] = () => {
    if (!pending) return;
    try { applyPlan(pending); } catch (err) { app.toast(/** @type {Error} */ (err).message); }
  };
  function applyPlan(p) {
    const key = p.fieldKey, st = app.saved();
    const previousKey = ui.key, previousBlock = app.blockId(), oldParams = st.paramsByField?.[key], oldEdits = st.editsByField?.[key];
    let patch, undo;
    if (p.block) {
      const { store: blocks, id } = storeBlock(st, fields, p.block, true);
      const old = st.planningBlocks?.records?.[id];
      patch = { planningBlocks: blocks, activeBlockId: id, fieldKey: key };
      undo = () => {
        const now = app.saved().planningBlocks, records = { ...now.records };
        if (old) records[id] = old; else delete records[id];
        return { planningBlocks: { ...now, records } };
      };
    } else {
      const paramsBy = { ...st.paramsByField, [key]: p.params }, editsBy = { ...st.editsByField };
      if (p.edits) editsBy[key] = p.edits; else delete editsBy[key];
      patch = { paramsByField: paramsBy, editsByField: editsBy, activeBlockId: null, fieldKey: key };
      undo = () => {
        const params = { ...app.saved().paramsByField }, edits = { ...app.saved().editsByField };
        if (oldParams) params[key] = oldParams; else delete params[key];
        if (oldEdits) edits[key] = oldEdits; else delete edits[key];
        return { paramsByField: params, editsByField: edits };
      };
    }
    if (!store.update(patch)) return;
    app.closeSheet();
    for (const change of app.onLotChange) change();
    ui.key = key; ui.view = 'plano'; app.render();
    app.toast(`Plano de ${fields[key].code} aberto.`, { label: 'Desfazer', run: () => {
      if (!store.update({ ...undo(), fieldKey: previousKey, activeBlockId: previousBlock })) return;
      for (const change of app.onLotChange) change();
      ui.key = previousKey; app.render(); app.toast('Desfeito');
    } });
  }
  app.changes.push(t => {
    if (t.id !== 'plan-input' || !t.files?.[0]) return false;
    const file = t.files[0], revision = ++fileRevision;
    pending = null;
    if (file.size > MAX_PLAN_BYTES) { t.value = ''; app.toast('Plano recusado: arquivo acima de 6 MB.'); return true; }
    file.text().then(text => {
      if (revision !== fileRevision) return;
      const parsed = parsePlanFile(text, fields);
      const title = parsed.block ? parsed.block.members.map(k => fields[k].code).join(' + ') : fields[parsed.fieldKey].code;
      const detail = plural(parsed.pointCount, 'ponto', 'pontos');
      pending = parsed;
      app.openSheet('Abrir plano recebido', `<p><b>${esc(title)}</b> · ${esc(detail)}</p><button class="btn p" data-act="import-plan">Usar este plano</button>`);
    }).catch(err => { app.toast(err.message); }).finally(() => { t.value = ''; });
    return true;
  });
}
