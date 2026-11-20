// 3.1 (U02) · planejar em bloco: escolher grupo, preparar (pode cancelar), usar e sair do bloco.
import * as P from './planner.mjs';
import * as VP from './views-plano.mjs';
import { esc } from './format.mjs';
import { blocksFor, prepareBlock, storeBlock, blockScenario } from './blocks.mjs';

const BLOCK_KEY = 'schmidt3.blocoAtivo';

/** @param {any} app */
export function installBloco(app) {
  const { fields, ui, store, storage } = app;
  /** @type {any} */ let blockUi = { groups: [], prepared: null, busy: false, abort: null };
  const activeBlockId = () => { if (Object.hasOwn(app.saved(), 'activeBlockId')) return app.saved().activeBlockId; try { return storage.getItem(BLOCK_KEY); } catch { return null; } };
  const activeBlock = () => { const id = activeBlockId(), r = id && app.saved().planningBlocks?.records?.[id]; return r && r.members.includes(ui.key) ? r : null; };

  /** Plano do lote dentro do bloco em uso; null se não há bloco (ou ele não abre: sai do bloco e avisa). */
  app.blockId = activeBlockId;
  app.computeBlock = () => {
    const block = activeBlock();
    if (!block) return null;
    try {
      const { field, sc } = blockScenario(fields, block, ui.key);
      const list = P.checks(sc, app.people(), P.uncovered(field, sc)), split = P.team(sc, app.people());
      const border = P.borderStats(field, sc);
      if (border?.minM < P.BORDA_MIN_M) list.push({ level: 'alerta', text: `Ponto ${border.min.number} abaixo de ${P.BORDA_MIN_M} m da borda` });
      const members = block.members.map(k => ({ key: k, code: fields[k].code, on: k === ui.key, pontos: block.state.paramsByField[k].totalPoints }));
      return { field, params: sc.params, base: P.baseOf(sc.params), rec: null, sc, f: P.figures(sc), list, split, inUseIsRec: true,
        block: { title: block.members.map(k => fields[k].code).join(' + '), members, passes: Math.round(block.common.spacingM / 36.48), spacingM: block.common.spacingM },
        others: block.members.filter(k => k !== ui.key).map(k => blockScenario(fields, block, k)) };
    } catch (e) { app.toast(/** @type {Error} */ (e).message); return null; }
  };
  app.onCloseSheet.push(() => blockUi?.abort?.abort());
  app.SHEETS.bloco = () => { blockUi = { groups: blocksFor(fields, ui.key), prepared: null, busy: false, abort: null }; app.openSheet('Planejar em bloco', VP.blockPickBody(blockUi.groups, null, false)); };
  app.ACTIONS['block-leave'] = () => { if (!store.update({ activeBlockId: null })) return; app.render(); app.toast('De volta ao plano do lote.'); };
  app.clicks.push(t => {
    if (t.dataset.block) {
      const g = blockUi.groups[+t.dataset.block], st = app.saved(), ctl = new AbortController();
      blockUi = { ...blockUi, busy: true, abort: ctl }; app.openSheet(`Bloco ${g.title}`, VP.blockPickBody([], null, true));
      const paramsOf = k => st.paramsByField?.[k] ?? { ...app.recNow(fields[k], {}, k).chosen.params };
      const sheet = app.host.firstElementChild;
      const current = () => !ctl.signal.aborted && blockUi.abort === ctl && app.host.firstElementChild === sheet;
      prepareBlock(fields, g, paramsOf, ctl.signal, k => st.editsByField?.[k]).then(rec => { if (!current()) return; blockUi = { ...blockUi, busy: false, prepared: rec }; if (app.host.innerHTML) app.openSheet(`Bloco ${g.title}`, VP.blockPickBody([], rec, false)); })
        .catch(err => { if (!current()) return; blockUi.busy = false; if (app.host.innerHTML) app.openSheet(`Bloco ${g.title}`, `<p class="ck alerta">${esc(err.message)}</p>`); });
      return true;
    }
    if (t.dataset.blockUse) {
      const rec = blockUi.prepared, alt = rec?.alternatives?.[+t.dataset.blockUse];
      if (!alt || alt.summary.coverageTradeoff) return true;
      try {
        const { store: blocks, id } = storeBlock(app.saved(), fields, alt.record || rec);
        if (!store.update({ planningBlocks: blocks, activeBlockId: id })) return true;
        app.closeSheet(); app.render(); app.toast('Bloco em uso. "Sair do bloco" volta ao plano de cada lote.');
      } catch (e) { app.toast(/** @type {Error} */ (e).message); }
      return true;
    }
    if (t.dataset.soon) { app.toast('Bloco de lotes: chega na próxima etapa da 3.0.'); return true; }
    return false;
  });
}
