import { schmidtReferenceBlocks, prepareSchmidtBlock, createSchmidtBlockController, schmidtCommonBlockFields } from '../application/block-planning.mjs';

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
  for (const [value, text] of [['individual', 'Lote individual'], ['block', 'Bloco por referência comum']]) {
    const o = make('option', text); o.value = value; mode.append(o);
  }
  modeLabel.append(mode);
  const choice = make('label', 'Lotes com a mesma referência'); const groupSelect = make('select'); groupSelect.id = 'block-group'; choice.append(groupSelect);
  const groups = schmidtReferenceBlocks(app.fields).filter(g => g.compatible);
  for (const g of groups) { const o = make('option', `${g.farm} · ${g.title}`); o.value = g.id; groupSelect.append(o); }
  const prepare = make('button', 'Preparar bloco'); prepare.id = 'block-prepare'; prepare.type = 'button';
  const apply = make('button', 'Usar bloco'); apply.id = 'block-apply'; apply.type = 'button'; apply.hidden = true;
  const cancel = make('button', 'Cancelar'); cancel.id = 'block-cancel'; cancel.type = 'button'; cancel.hidden = true;
  const exportGPX = make('button', 'Exportar pontos do bloco (GPX)'); exportGPX.id='block-export-gpx'; exportGPX.type='button'; exportGPX.hidden=true;
  const status = make('p'); status.id = 'block-status'; status.setAttribute('role', 'status');
  const details = make('div'); details.id = 'block-details';
  const controls = make('div'); controls.className = 'block-actions'; controls.append(prepare, apply, cancel);
  panel.append(heading, modeLabel, choice, controls, status, details, exportGPX);
  stage.querySelector('.op-current').after(panel);
  const badge = make('button'); badge.id = 'block-active'; badge.type = 'button'; badge.hidden = true;
  badge.title = 'Voltar ao planejamento do bloco';
  document.querySelector('.top').append(badge);
  const style = make('style'); style.textContent = `
    #block-planning{display:grid;gap:8px;margin-bottom:10px;padding:10px 12px}
    #block-planning label{display:grid;gap:4px;font-size:14px}
    #block-planning select{width:100%;min-width:0;min-height:44px}
    #block-planning p{font-size:13px;line-height:1.4;margin:2px 0}
    #block-planning button,#block-active{min-height:44px;white-space:normal}
    #block-planning button{font:inherit;color:var(--sx-brand);background:var(--sx-soft);border:1px solid var(--sx-line-strong);border-radius:8px;padding:8px 12px}
    #block-planning .block-actions,#block-members{display:flex;flex-wrap:wrap;gap:6px}
    #block-details svg{display:block;width:100%;height:320px;background:var(--sx-surface)}
    #block-active{font-size:12px;background:var(--sx-brand);color:var(--sx-surface);border-radius:8px;margin:4px}
    #block-active[hidden],#block-planning [hidden]{display:none!important}
  `; document.head.append(style);
  let draft = null, abort = null, busy = false;
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
  const controller = createSchmidtBlockController({ app, save: store.saveState, refresh, stopGPS });
  const lockControls = active => {
    for (const [node, disabled] of disabledBefore) if (node.isConnected) node.disabled = disabled;
    disabledBefore.clear();
    if (!active) return;
    // O bloco conserva uma grade única. Parâmetros individuais ficam disponíveis ao sair.
    for (const node of document.querySelectorAll('#param-stage-inicio input,#param-stage-inicio select,#param-stage-inicio button,#rec-card button,#plan-import,#plan-export,#reset-plan,#optimize')) {
      if (panel.contains(node)) continue;
      disabledBefore.set(node, node.disabled); node.disabled = true;
    }
    for (const id of ['farm', 'farm-mobile', 'theater-farm']) {
      const node = document.getElementById(id); if (node) { disabledBefore.set(node, node.disabled); node.disabled = true; }
    }
    const members = controller.records[controller.active].members;
    for (const id of ['field', 'field-mobile', 'theater-field']) for (const o of document.getElementById(id)?.options || []) {
      disabledBefore.set(o, o.disabled); o.disabled = !members.includes(o.value);
    }
  };
  const draw = (record, live = false) => {
    details.replaceChildren();
    const summary = make('p'); summary.id = 'block-summary';
    const displayFields = schmidtCommonBlockFields(app.fields, record.members, record.common);
    const scenarios = record.members.map(key => engine.buildScenario(displayFields[key], record.state.paramsByField[key]));
    const count = scenarios.reduce((n, sc) => n + sc.samples.length, 0);
    summary.textContent = `${count} pontos · entre tiros: ${record.common.spacingM.toLocaleString('pt-BR', { maximumFractionDigits:2 })} m · barra: 36,48 m`;
    const extra = Object.values(record.assessment.addedPointsByField || {}).reduce((n,x)=>n+x,0);
    if (extra) summary.textContent += ` · ${extra} ponto(s) adicional(is) para preservar a cobertura amostrada`;
    const gaps=[];
    for(const sc of scenarios)for(const u of sc.units){const ps=sc.samples.filter(p=>p.unitId===u.id).sort((a,b)=>a.s-b.s);for(let i=1;i<ps.length;i++)gaps.push(Math.hypot(ps[i].x-ps[i-1].x,ps[i].y-ps[i-1].y));}
    const distances=make('p');distances.id='block-distances';
    distances.textContent=gaps.length?`Entre pontos no mesmo trecho: ${Math.min(...gaps).toLocaleString('pt-BR',{maximumFractionDigits:1})} a ${Math.max(...gaps).toLocaleString('pt-BR',{maximumFractionDigits:1})} m`:'Um ponto por trecho; sem intervalo interno.';
    const borders=Object.values(record.assessment.minimumBorderMByField||{}).filter(Number.isFinite);
    if(borders.length)distances.textContent+=` · menor distância de ponto à borda: ${Math.min(...borders).toLocaleString('pt-BR',{maximumFractionDigits:1})} m`;
    const members = make('div'); members.id = 'block-members';
    record.members.forEach((key, i) => {
      const button = make('button', `${app.fields[key].code} · ${scenarios[i].samples.length} pontos`); button.type = 'button'; button.dataset.blockMember = key;
      button.disabled = !live; button.onclick = () => refresh(key); members.append(button);
    });
    const note = make('p', 'Cada lote mantém seu mínimo. As passagens entre lotes precisam ser conferidas pela equipe.');
    details.append(summary, distances, members, note);
    if (record.assessment.coverageTradeoff) details.append(make('p', `Esta grade altera a cobertura: pior relação amostrada ${(record.assessment.worstRatio * 100 - 100).toFixed(1)}% acima do individual. Confira antes de usar.`));
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.id = 'block-overview'; svg.setAttribute('viewBox','0 0 1000 1000'); svg.setAttribute('role','img'); svg.setAttribute('aria-label','Visão conjunta de lotes, tiros e pontos');
    const vertices = record.members.flatMap(key => app.fields[key].geom.flatMap(poly => poly[0].map(p => p.map((v,i) => v + app.fields[key].centroidUTM[i]))));
    const xs=vertices.map(p=>p[0]), ys=vertices.map(p=>p[1]), x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys), scale=900/Math.max(x1-x0,y1-y0);
    const xy=(p,field)=>[500+(p[0]+field.centroidUTM[0]-(x0+x1)/2)*scale,500-(p[1]+field.centroidUTM[1]-(y0+y1)/2)*scale];
    const sv=(tag, attrs)=>{const n=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);return n;};
    record.members.forEach((key,index)=>{
      const field=app.fields[key],sc=scenarios[index];
      const d=field.geom.map(poly=>poly.map(ring=>'M'+ring.map(p=>xy(p,field).join(',')).join('L')+'Z').join('')).join('');
      sv('path',{d,fill:'var(--sx-brand-soft)',stroke:'var(--sx-map-field-line)','stroke-width':2,'fill-rule':'evenodd'});
      for(const u of sc.units)sv('polyline',{points:u.line.map(p=>xy(p,field).join(',')).join(' '),stroke:'var(--sx-map-track)','stroke-width':2,fill:'none'});
      for(const p of sc.samples){const[x,y]=xy([p.x,p.y],field);sv('circle',{cx:x,cy:y,r:4,fill:'var(--sx-map-point)'});}
    });
    details.append(svg);
  };
  const setState = () => {
    const active = !!controller.active;
    choice.hidden = active || mode.value !== 'block';
    prepare.hidden = active || mode.value !== 'block';
    groupSelect.disabled = busy;
    apply.hidden = active || !draft || mode.value !== 'block';
    apply.disabled = !!draft?.assessment.coverageTradeoff;
    badge.hidden = !active;
    exportGPX.hidden = !active;
    if (active) {
      const record = controller.records[controller.active];
      mode.value = 'block'; badge.textContent = `Bloco · ${record.members.map(k=>app.fields[k].code).join(' + ')}`;
      status.textContent = 'Bloco em uso · selecione o lote para operar. Coletas separadas do individual.';
      draw(record, true);
    } else if (mode.value === 'individual') { details.replaceChildren(); status.textContent = ''; }
    lockControls(active);
  };
  const fail = error => { status.textContent = error.message; schmidt.aviso(error.message, true); };
  mode.onchange = () => {
    abort?.abort(); draft = null;
    if (controller.active && mode.value === 'individual') {
      try { controller.leave(); } catch (e) { mode.value='block'; fail(e); return; }
    }
    setState();
  };
  groupSelect.onchange = () => { draft = null; details.replaceChildren(); status.textContent = ''; setState(); };
  prepare.onclick = async () => {
    busy = true; prepare.disabled = true; cancel.hidden = false; apply.hidden = true;
    abort = new AbortController();
    const group = groups.find(g => g.id === groupSelect.value);
    try {
      const existing = controller.records[group.id];
      status.textContent = 'Conferindo a grade comum e o mínimo de cada lote…';
      const candidate = existing || await prepareSchmidtBlock({ group, fields: app.fields, parametersFor: schmidt.parametrosDo,
        editsFor:f=>app.saved.editsByField?.[`${f.farm}|${f.code}`], engine, metrics,
        signal: abort.signal, yieldTask: () => new Promise(resolve => setTimeout(resolve, 0)) });
      if (abort.signal.aborted) return;
      draft = candidate;
      draw(draft); status.textContent = existing ? 'Bloco salvo: retomar sem substituir coletas.' : 'Grade preparada. Usar bloco cria coletas próprias; os individuais ficam preservados.';
    } catch (e) { draft = null; fail(e); }
    finally { busy = false; prepare.disabled = false; cancel.hidden = true; setState(); }
  };
  cancel.onclick = () => { abort?.abort(); draft = null; status.textContent='Preparação cancelada'; };
  apply.onclick = () => { try { controller.enter(draft); draft = null; setState(); } catch (e) { fail(e); } };
  badge.onclick = () => { document.querySelector('[data-v08-view="plano"]')?.click(); schmidt.fluxo.go('plano'); panel.scrollIntoView({ block: 'nearest' }); };
  exportGPX.onclick=()=>{
    try{
      const persisted=controller.serialize(app.saved),record=persisted.planningBlocks.records[controller.active];
      const fields=schmidtCommonBlockFields(app.fields,record.members,record.common);
      const esc=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
      const project=schmidt.modulos.__m_engine_projection.localToLonLat;
      const points=[];
      for(const key of record.members){
        let sc=engine.buildScenario(fields[key],record.state.paramsByField[key]);
        const edits=record.state.editsByField[key];
        if(edits){const editing=schmidt.modulos.__m_engine_editing,restored=editing.restoreSamples(sc,edits.samples);if(!restored)throw Error('Ajustes do bloco inválidos; exportação cancelada');sc=editing.withSamples(fields[key],sc,restored);}
        for(const p of sc.samples){const coord=project(p.x,p.y,fields[key].centroidUTM);points.push(`<wpt lat="${coord[1]}" lon="${coord[0]}"><name>${esc(fields[key].code+'-'+p.id)}</name><desc>${esc(key+' · ponto simulado de bloco')}</desc></wpt>`);}
      }
      const blob=new Blob([`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="SCHMIDT Campo" xmlns="http://www.topografix.com/GPX/1/1">${points.join('')}</gpx>`],{type:'application/gpx+xml'});
      const a=make('a');const url=URL.createObjectURL(blob);a.href=url;a.download='SCHMIDT_Bloco_'+record.members.map(k=>app.fields[k].code).join('_')+'_SIMULADO.gpx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){fail(e);}
  };
  events.on('plano:mudou', () => { if (controller.active) document.defaultView.requestAnimationFrame(()=>lockControls(!!controller.active)); });
  setState();
  schmidt.blocks = { groups, controller, prepare: group => prepareSchmidtBlock({ group, fields:app.fields, parametersFor:schmidt.parametrosDo,
    editsFor:f=>app.saved.editsByField?.[`${f.farm}|${f.code}`], engine, metrics,
    yieldTask: () => new Promise(resolve=>setTimeout(resolve,0)) }) };
}
