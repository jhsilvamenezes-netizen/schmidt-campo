import { createSchmidtBlockMap } from './block-map.mjs';
import { schmidtReferenceBlocks, prepareSchmidtBlock, createSchmidtBlockController, schmidtCommonBlockFields, schmidtBlockScenarios, schmidtBlockBorderDistance, selectSchmidtSavedBlock, schmidtBlockInputSignature, createSchmidtBlockScenarioReader } from '../application/block-planning.mjs';

export function installSchmidtBlockPlanning({ document, schmidt, engine, metrics, store, events }) {
  const stage = document.getElementById('param-stage-inicio');
  if (!stage || document.getElementById('block-planning')) return;
  const app = schmidt.app;
  if (!app?.field || !Object.keys(app.fields || {}).length) {
    events.on('plano:mudou', () => {
      if (!document.getElementById('block-planning') && schmidt.app?.field)
        installSchmidtBlockPlanning({ document, schmidt, engine, metrics, store, events });
    });
    return;
  }
  const make = (tag, text) => { const e = document.createElement(tag); if (text) e.textContent = text; return e; };
  const panel = make('section'); panel.id = 'block-planning'; panel.className = 'fx-params';
  const heading = make('strong', 'Planejamento');
  const modeLabel = make('label', 'Modo'); const mode = make('select'); mode.id = 'block-mode';
  for (const [value, text] of [['individual', 'Lote individual'], ['block', 'Bloco de lotes']]) {
    const o = make('option', text); o.value = value; mode.append(o);
  }
  modeLabel.append(mode);
  const choice = make('label', 'Lotes do bloco'); const groupSelect = make('select'); groupSelect.id = 'block-group'; choice.append(groupSelect);
  const groups = schmidtReferenceBlocks(app.fields).filter(g => g.compatible);
  for (const g of groups) { const o = make('option', `${g.farm} · ${g.title}`); o.value = g.id; groupSelect.append(o); }
  const prepare = make('button', 'Montar bloco'); prepare.id = 'block-prepare'; prepare.type = 'button';
  const apply = make('button', 'Usar bloco'); apply.id = 'block-apply'; apply.type = 'button'; apply.hidden = true;
  const viewGroup=make('button','Ver mapa do grupo');viewGroup.id='block-view-map';viewGroup.type='button';
  const cancel = make('button', 'Cancelar'); cancel.id = 'block-cancel'; cancel.type = 'button'; cancel.hidden = true;
  const exportGPX = make('button', 'Exportar pontos do bloco (GPX)'); exportGPX.id='block-export-gpx'; exportGPX.type='button'; exportGPX.hidden=true;
  const status = make('p'); status.id = 'block-status'; status.setAttribute('role', 'status');
  const details = make('div'); details.id = 'block-details';
  const controls = make('div'); controls.className = 'block-actions'; controls.append(prepare, apply, viewGroup, cancel);
  panel.append(heading, modeLabel, choice, controls, status, details, exportGPX);
  stage.querySelector('.op-current').after(panel);
  const badge = make('button'); badge.id = 'block-active'; badge.type = 'button'; badge.hidden = true;
  badge.title = 'Ver planejamento do bloco';
  document.querySelector('.top').append(badge);
  // 1.32: mesmos botões do resto do aplicativo (secundário com contorno; "Usar bloco" é a ação principal),
  // tokens de espaço/letra e selo do bloco em uma linha só no topo do celular.
  const style = make('style'); style.textContent = `
    #block-planning{display:grid;gap:var(--sx-sp-2);margin-bottom:10px;padding:10px 12px}
    #block-planning label{display:grid;gap:4px;font-size:var(--sx-fs-14)}
    #block-planning select{width:100%;min-width:0;min-height:var(--sx-touch)}
    #block-planning p{font-size:var(--sx-fs-13);line-height:1.4;margin:2px 0}
    #block-planning button{min-height:var(--sx-touch);white-space:normal;font:inherit;font-size:var(--sx-fs-14);font-weight:800;color:var(--sx-brand);background:var(--sx-surface);border:1px solid var(--sx-brand);border-radius:var(--sx-r);padding:8px 14px}
    #block-planning #block-apply{background:var(--sx-brand);color:#fff}
    #block-planning button:disabled{opacity:.45;cursor:not-allowed}
    #block-planning .block-actions,#block-members{display:flex;flex-wrap:wrap;gap:var(--sx-sp-2)}
    #block-details svg{display:block;width:100%;height:320px;background:var(--sx-surface)}
    #block-active{min-height:var(--sx-touch);margin:4px;padding:2px 8px;font:inherit;font-size:var(--sx-fs-12);font-weight:700;line-height:1.2;white-space:normal;background:var(--sx-brand);color:#fff;border:1px solid var(--sx-brand);border-radius:var(--sx-r)}
    #block-active[hidden],#block-planning [hidden]{display:none!important}
  `; document.head.append(style);
  let draft = null, draftInputSignature = null, abort = null, busy = false;
  const inputSignature=members=>schmidtBlockInputSignature({fields:app.fields,members,parametersFor:schmidt.parametrosDo,editsFor:f=>app.saved.editsByField?.[`${f.farm}|${f.code}`]});
  const disabledBefore = new Map();
  const stopGPS = () => {
    const gps = document.getElementById('gps-toggle');
    if (gps && (gps.getAttribute('aria-pressed') === 'true' || /desligar|parar/i.test(gps.textContent))) gps.click();
  };
  const refresh = key => {
    clearTimeout(app.timer); app.timer = 0; app.imported = null;
    const f = app.fields[key];
    schmidt.navigateBlockField(f.farm, f.code);
  };
  let controller;
  try{controller=createSchmidtBlockController({ app, save: store.saveState, refresh, stopGPS });}
  catch(error){mode.disabled=true;groupSelect.disabled=true;prepare.disabled=true;status.textContent='Não foi possível abrir os blocos salvos. Você pode usar um lote individual.';schmidt.aviso(error.message,true);return;}
  const lockControls = active => {
    for (const [node, disabled] of disabledBefore) if (node.isConnected) node.disabled = disabled;
    disabledBefore.clear();
    if (!active && !busy) return;
    // O bloco conserva uma grade única. Parâmetros individuais ficam disponíveis ao sair.
    for (const node of document.querySelectorAll('#panel-plano .param-stage:not(#param-stage-arquivos) input,#panel-plano .param-stage:not(#param-stage-arquivos) select,#panel-plano .param-stage:not(#param-stage-arquivos) button,#rec-card button,#plan-import,#plan-export,#reset-plan,#optimize')) {
      if (panel.contains(node)) continue;
      disabledBefore.set(node, node.disabled); node.disabled = true;
    }
    for (const id of ['farm', 'farm-mobile', 'theater-farm']) {
      const node = document.getElementById(id); if (node) { disabledBefore.set(node, node.disabled); node.disabled = true; }
    }
    if(busy){
      for(const id of ['field','field-mobile','theater-field']){const node=document.getElementById(id);if(node){disabledBefore.set(node,node.disabled);node.disabled=true;}}
      return;
    }
    const members = controller.snapshot().members;
    for (const id of ['field', 'field-mobile', 'theater-field']) for (const o of document.getElementById(id)?.options || []) {
      disabledBefore.set(o, o.disabled); o.disabled = !members.includes(o.value);
    }
  };
  const blockMap = createSchmidtBlockMap({document,selectMember:refresh});
  const previewGroup=()=>{const group=groups.find(g=>g.id===groupSelect.value);if(group)blockMap.preview(group,app.fields);};
  const readScenarios = createSchmidtBlockScenarioReader(engine);
  const draw = (record, live = false) => {
    details.replaceChildren();
    const summary = make('p'); summary.id = 'block-summary';
    const scenarios = readScenarios(app.fields,record);
    const count = scenarios.reduce((n, sc) => n + sc.samples.length, 0);
    summary.textContent = `${count} pontos · entre tiros: ${record.common.spacingM.toLocaleString('pt-BR', { maximumFractionDigits:2 })} m · barra: 36,48 m`;
    const extra = Object.values(record.assessment.addedPointsByField || {}).reduce((n,x)=>n+x,0);
    if (extra&&!record.members.some(k=>record.state.editsByField[k])) summary.textContent += ` · ${extra} ${extra===1?'ponto a mais':'pontos a mais'} para manter a cobertura dos lotes`;
    const gaps=[];
    for(const sc of scenarios)for(const u of sc.units){const ps=sc.samples.filter(p=>p.unitId===u.id).sort((a,b)=>a.s-b.s);for(let i=1;i<ps.length;i++)gaps.push(Math.hypot(ps[i].x-ps[i-1].x,ps[i].y-ps[i-1].y));}
    const distances=make('p');distances.id='block-distances';
    distances.textContent=gaps.length?`Entre pontos no mesmo trecho: ${Math.min(...gaps).toLocaleString('pt-BR',{maximumFractionDigits:1})} a ${Math.max(...gaps).toLocaleString('pt-BR',{maximumFractionDigits:1})} m`:'Um ponto em cada trecho.';
    const borders=scenarios.map((sc,i)=>schmidtBlockBorderDistance(app.fields[record.members[i]].geom,sc.samples)).filter(Number.isFinite);
    if(borders.length)distances.textContent+=` · menor distância de ponto à borda: ${Math.min(...borders).toLocaleString('pt-BR',{maximumFractionDigits:1})} m`;
    const members = make('div'); members.id = 'block-members';
    record.members.forEach((key, i) => {
      const button = make('button', `${app.fields[key].code} · ${scenarios[i].samples.length} pontos`); button.type = 'button'; button.dataset.blockMember = key;
      button.disabled = !live; button.onclick = () => blockMap.focus(key); members.append(button);
    });
    const note = make('p', 'Cada lote mantém a quantidade mínima de pontos. Confira as passagens entre os lotes.');
    details.append(summary, distances, members, note);
    if (record.assessment.coverageTradeoff) details.append(make('p', `Esta grade altera a cobertura: pior relação amostrada ${(record.assessment.worstRatio * 100 - 100).toFixed(1)}% acima do individual. Confira antes de usar.`));
    blockMap.update(record,app.fields,scenarios,live,app.field?`${app.field.farm}|${app.field.code}`:null);
  };
  const setState = () => {
    const active = !!controller.active;
    viewGroup.hidden=mode.value!=='block';viewGroup.disabled=busy;
    choice.hidden = active || mode.value !== 'block';
    prepare.hidden = active || mode.value !== 'block';
    groupSelect.disabled = busy;
    mode.disabled = busy;
    apply.hidden = active || !draft || mode.value !== 'block';
    apply.disabled = !!draft?.assessment.coverageTradeoff;
    badge.hidden = !active;
    exportGPX.hidden = !active;
    if (active) {
      const record = controller.snapshot();
      mode.value = 'block'; badge.textContent = `Bloco · ${record.members.map(k=>app.fields[k].code).join(' + ')}`;
      status.textContent = 'Bloco em uso. Escolha o lote. As coletas deste bloco ficam salvas separadamente.';
      draw(record, true);
    } else if (mode.value === 'individual') { readScenarios.clear(); blockMap.clear(); details.replaceChildren(); status.textContent = ''; }
    lockControls(active);
  };
  const fail = error => { status.textContent = error.message; schmidt.aviso(error.message, true); };
  mode.onchange = () => {
    abort?.abort(); draft = null; blockMap.clear();
    if (controller.active && mode.value === 'individual') {
      try { controller.leave(); } catch (e) { mode.value='block'; fail(e); return; }
    }
    setState();
    if(mode.value==='block'&&!controller.active)previewGroup();
  };
  viewGroup.onclick=()=>{if(!controller.active&&!draft)previewGroup();blockMap.showAll();};
  groupSelect.onchange = () => { blockMap.clear(); draft = null; details.replaceChildren(); status.textContent = ''; setState(); previewGroup(); };
  prepare.onclick = async () => {
    schmidt.flushBlockParameters();
    draft=null;draftInputSignature=null;
    if(document.querySelector('#panel-plano [aria-invalid="true"]')){setState();fail(Error('Revise os parâmetros destacados antes de preparar o bloco.'));return;}
    busy = true; prepare.disabled = true; cancel.hidden = false; apply.hidden = true;
    abort = new AbortController();
    draft=null;blockMap.clear();details.replaceChildren();setState();
    const group = groups.find(g => g.id === groupSelect.value);
    try {
      const selection=selectSchmidtSavedBlock(controller.records,group,app.fields),existing=selection.record;
      const signature=inputSignature(group.members);
      status.textContent = 'Calculando os tiros e pontos de cada lote…';
      const candidate = existing || await prepareSchmidtBlock({ group, fields: app.fields, parametersFor: schmidt.parametrosDo,
        editsFor:f=>app.saved.editsByField?.[`${f.farm}|${f.code}`], engine, metrics,
        signal: abort.signal, yieldTask: () => new Promise(resolve => setTimeout(resolve, 0)) });
      if (abort.signal.aborted) return;
      if(!existing&&signature!==inputSignature(group.members))throw Error('Os parâmetros mudaram. Prepare o bloco novamente.');
      draft = {...candidate,id:selection.id,catalogId:selection.catalogId};
      draftInputSignature=existing?null:signature;
      draw(draft); status.textContent = existing ? 'Bloco salvo. Continue de onde parou.' : 'Bloco pronto. Toque em Usar bloco para começar. As coletas individuais ficam guardadas.';
    } catch (e) { draft = null; fail(e); }
    finally { busy = false; prepare.disabled = false; cancel.hidden = true; setState(); }
  };
  cancel.onclick = () => { abort?.abort(); draft = null; blockMap.clear(); status.textContent='Preparação cancelada'; };
  apply.onclick = () => {
    try {
      schmidt.flushBlockParameters();
      if(draftInputSignature&&draftInputSignature!==inputSignature(draft.members)){
        draft=null;blockMap.clear();details.replaceChildren();setState();throw Error('Os parâmetros mudaram. Prepare o bloco novamente.');
      }
      if(schmidt.storageAccess&&!schmidt.storageAccess.canWrite()){blockMap.showAll();throw Error(schmidt.storageAccess.message());}
      controller.enter(draft);draft=null;draftInputSignature=null;setState();blockMap.showAll();
    }catch(e){fail(e);}
  };
  badge.onclick = () => { document.querySelector('[data-v08-view="plano"]')?.click(); schmidt.fluxo.go('plano'); panel.scrollIntoView({ block: 'nearest' }); };
  exportGPX.onclick=()=>{
    try{
      const persisted=controller.serialize(app.saved),record=persisted.planningBlocks.records[controller.active];
      const fields=schmidtCommonBlockFields(app.fields,record.members,record.common);
      const esc=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
      const project=schmidt.modulos.__m_engine_projection.localToLonLat;
      const points=[];
      const scenarios=schmidtBlockScenarios(fields,record,engine);
      for(const [i,key] of record.members.entries()){
        const sc=scenarios[i];
        for(const p of sc.samples){const coord=project(p.x,p.y,fields[key].centroidUTM);points.push(`<wpt lat="${coord[1]}" lon="${coord[0]}"><name>${esc(fields[key].code+'-'+p.id)}</name><desc>${esc(key+' · ponto simulado de bloco')}</desc></wpt>`);}
      }
      const blob=new Blob([`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SCHMIDT Campo" xmlns="http://www.topografix.com/GPX/1/1">${points.join('')}</gpx>`],{type:'application/gpx+xml'});
      const a=make('a');const url=URL.createObjectURL(blob);a.href=url;a.download='SCHMIDT_Bloco_'+record.members.map(k=>app.fields[k].code).join('_')+'_SIMULADO.gpx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){fail(e);}
  };
  let renderPending=false;
  const scheduleRender=() => {
    if(!controller.active||renderPending)return;
    renderPending=true;
    document.defaultView.requestAnimationFrame(()=>{renderPending=false;try{setState();}catch(e){fail(e);}});
  };
  events.on('plano:mudou',scheduleRender);
  events.on('bloco:pontos-mudaram',scheduleRender);
  setState();
  schmidt.blocks = { groups, controller, prepare: group => prepareSchmidtBlock({ group, fields:app.fields, parametersFor:schmidt.parametrosDo,
    editsFor:f=>app.saved.editsByField?.[`${f.farm}|${f.code}`], engine, metrics,
    yieldTask: () => new Promise(resolve=>setTimeout(resolve,0)) }) };
}
