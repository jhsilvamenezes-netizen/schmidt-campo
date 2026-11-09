import { readOperationalSummary } from '../application/operational-summary.mjs';
import { operationalAlternativeLabel, operationalComparisonNote, operationalParameterHint } from './plan-presentation.mjs';

// Projeção do Plano aprovada pelo proprietário: implementação local em 09/11/2026.
// Mantém os nós e eventos originais; nenhuma fórmula ou gravação é adicionada.
export function installSchmidtOperationalPlan({ document, schmidt, events, measurements }) {
  const stage=document.getElementById('param-stage-inicio');
  const card=document.getElementById('rec-card');
  const params=stage?.querySelector('.fx-params');
  const row=params?.querySelector('.fx-row');
  const people=document.getElementById('qMonitors');
  const fieldInfo=document.getElementById('field-info');
  if(!stage||!card||!params||!row||!people||!fieldInfo||!measurements?.malhaDoPlano||!measurements?.faixa||!events?.on||stage.querySelector('.op-current'))return false;
  const make=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
  const style=make('style','');
  style.textContent=`
    #param-stage-inicio>.stage-intro {padding:5px 0 0}
    #param-stage-inicio>.stage-intro>p {display:none}
    #param-stage-inicio>.fx-guide {display:none!important}
    #param-stage-inicio .op-context {font-size:13px;line-height:1.4;margin:2px 0 7px;color:var(--sx-muted)}
    #param-stage-inicio .fx-params>legend {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    #param-stage-inicio .fx-params {padding:8px 12px;margin:0 0 8px}
    #param-stage-inicio .fx-params>.fx-row {grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:10px}
    #param-stage-inicio .fx-row>label {display:grid;grid-template-rows:44px 44px auto;gap:3px;align-content:start}
    #param-stage-inicio .fx-row>label>.sx-lbl,#param-stage-inicio .op-people-label {min-height:44px;display:flex;align-items:center;font-size:14px;line-height:18px}
    #param-stage-inicio .fx-row .fx-stepper {margin:0}
    #param-stage-inicio .fx-row #meta-haPerPoint {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    #param-stage-inicio .fx-row #real-haPerPoint {display:none}
    #param-stage-inicio .op-density-help {font-size:12px;line-height:16px;font-weight:400;color:var(--sx-muted);margin:0}
    #param-stage-inicio .op-current {margin-top:7px;padding-top:7px;border-top:1px solid var(--sx-line)}
    #param-stage-inicio .op-plan-head {display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px}
    #param-stage-inicio .op-active-tag {font-size:12px;font-weight:700;color:var(--sx-brand)}
    #param-stage-inicio .op-counts {font-size:20px;font-weight:750;margin:0;line-height:1.25;color:var(--sx-brand)}
    #param-stage-inicio .op-caption {font-size:13px;line-height:18px;margin:3px 0 6px;color:var(--sx-muted)}
    #param-stage-inicio .op-distances {display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:5px 0}
    #param-stage-inicio .op-distance {border:1px solid var(--sx-line);border-radius:10px;padding:8px;min-width:0}
    #param-stage-inicio .op-distance span {display:block;font-size:13px;line-height:17px}
    #param-stage-inicio .op-distance strong {display:block;font-size:20px;line-height:25px;color:var(--sx-brand);margin:3px 0}
    #param-stage-inicio .op-distance small {font-size:13px;line-height:17px;display:block;color:var(--sx-muted)}
    #param-stage-inicio .op-crew {padding:7px;border-radius:8px;background:var(--sx-warn-soft);color:var(--sx-warn);font-size:13px;line-height:18px;margin:7px 0}
    #param-stage-inicio .op-schematic {margin:10px 0;padding:8px;border:1px solid var(--sx-line);border-radius:10px}
    #param-stage-inicio .op-schematic figcaption {font-size:13px;font-weight:650;margin:0 0 4px}
    #param-stage-inicio .op-schematic svg {display:block;width:100%;height:auto;max-height:88px;color:var(--sx-brand)}
    #param-stage-inicio .op-settings,#param-stage-inicio .op-origin {margin-top:9px;border-top:1px solid var(--sx-line);padding-top:4px}
    #param-stage-inicio .op-settings>summary,#param-stage-inicio .op-origin>summary,#param-stage-inicio .op-recommendation>summary {cursor:pointer;font-weight:650;padding:8px 0;display:flex;align-items:center;gap:8px;white-space:normal;overflow-wrap:anywhere}
    #param-stage-inicio .op-settings summary small {display:block;font-size:13px;line-height:18px;font-weight:400;margin-top:3px;color:var(--sx-warn)}
    #param-stage-inicio .op-support {font-size:13px;line-height:1.4;margin:8px 0;color:var(--sx-muted)}
    #param-stage-inicio .op-recommendation-status {font-size:14px;font-weight:700;color:var(--sx-brand);margin:0 0 10px}
    #param-stage-inicio .is-changed>.param-meta:before {content:none}
    #param-stage-inicio .is-changed input:not([aria-invalid=true]) {box-shadow:none;border-color:var(--sx-line-strong)!important}
    @media(max-width:999px){#param-stage-inicio>.param-lot-source{display:none}}
  `;
  document.head.append(style);
  const context=make('p','op-context');stage.querySelector('.stage-intro').after(context);
  const origin=make('details','op-origin');origin.append(make('summary','','Origem da área e rumo'),fieldInfo);
  const guide=stage.querySelector('.fx-guide');if(guide)origin.append(guide);
  const protocol=document.getElementById('protocol-info');if(protocol)origin.append(protocol);
  const settings=make('details','op-settings');
  const settingsTitle=make('summary','');const settingsLabel=make('span','');
  const settingsText=make('span','');const calibration=make('small','');settingsLabel.append(settingsText,calibration);settingsTitle.append(settingsLabel);settings.append(settingsTitle);
  for(const child of [...params.children])if(child!==row&&child.tagName!=='LEGEND')settings.append(child);
  const support=make('p','op-support');origin.append(support);
  const peopleLabel=people.closest('label');
  for(const text of [...peopleLabel.childNodes])if(text.nodeType===3&&text.textContent.trim()){const label=make('span','op-people-label',text.textContent.trim());text.replaceWith(label);}
  const densityHelp=make('small','op-density-help','Define o mínimo');densityHelp.id='op-density-help';
  document.getElementById('haPerPoint').closest('label').append(densityHelp);
  const densityInput=document.getElementById('haPerPoint');densityInput.setAttribute('aria-describedby',[densityInput.getAttribute('aria-describedby'),'op-density-help'].filter(Boolean).join(' '));
  const current=make('div','op-current');const head=make('div','op-plan-head');
  const counts=make('p','op-counts');head.append(make('span','op-active-tag','Plano em uso'),counts);
  const caption=make('p','op-caption');const crew=make('p','op-crew');const distances=make('div','op-distances');
  const across=make('div','op-distance'),acrossLabel=make('span','','Entre tiros'),acrossValue=make('strong','');
  across.append(acrossLabel,acrossValue,make('small','','De um ao vizinho, de lado'));
  const along=make('div','op-distance'),alongValue=make('strong',''),alongHint=make('small','');
  along.append(make('span','','Entre pontos'),alongValue,alongHint);distances.append(across,along);
  const schema=make('figure','op-schematic');schema.append(make('figcaption','','Esquema das distâncias'));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 -6 300 90');svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<path d="M20 24H280M20 68H280" stroke="currentColor" stroke-width="2"/><g fill="var(--sx-map-point)"><circle cx="20" cy="24" r="5"/><circle cx="150" cy="24" r="5"/><circle cx="280" cy="24" r="5"/><circle cx="20" cy="68" r="5"/><circle cx="150" cy="68" r="5"/><circle cx="280" cy="68" r="5"/></g><path d="M37 32V60M33 36L37 32L41 36M33 56L37 60L41 56M165 12H265M169 8L165 12L169 16M261 8L265 12L261 16" fill="none" stroke="currentColor" stroke-width="1.5"/><g fill="currentColor" font-size="13" font-family="system-ui,sans-serif"><text x="46" y="49">De lado</text><text x="186" y="9">Ao longo</text></g>';
  schema.append(svg);current.append(head,caption,distances,crew,schema);
  params.append(current,settings,origin);stage.insertBefore(params,card);
  let drawingOpen=false;
  function organizeRecommendation(){
    if(card.querySelector('.op-recommendation')||!card.firstElementChild)return;
    const details=make('details','op-recommendation');details.open=drawingOpen;
    details.append(make('summary','','Desenho e comparação de planos'));
    const status=make('p','op-recommendation-status');const recHead=card.querySelector('.rec-head');
    if(recHead)status.textContent=recHead.querySelector('.rec-on')?'Recomendado · em uso':'Recomendado · não aplicado';else status.hidden=true;
    details.append(status);
    for(const label of card.querySelectorAll('.rec-opt>b'))label.textContent=operationalAlternativeLabel(label.textContent);
    for(const note of card.querySelectorAll('.rec-opt>span:not(.rec-opt-nums)')){note.textContent=operationalComparisonNote(note.textContent);if(!note.textContent)note.remove();}
    for(const child of [...card.children])details.append(child);
    const alternatives=details.querySelector('.rec-alts');if(alternatives)alternatives.open=true;
    details.addEventListener('toggle',()=>{drawingOpen=details.open;});card.append(details);
  }
  function render(){
    organizeRecommendation();
    const field=schmidt.app.field;const area=field?.areaOfficialHa;
    context.textContent=typeof area==='number'&&Number.isFinite(area)&&area>0?`${field.code} · área da regra: ${area.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} ha`:String(field?.code||'Plano do lote');
    const model=readOperationalSummary(schmidt.app.sc,people.value,measurements);current.hidden=!model;
    if(model){counts.textContent=model.counts;caption.textContent=`Mínimo pela área: ${model.minimum} pontos`;acrossLabel.textContent=model.acrossLabel;acrossValue.textContent=model.across;alongValue.textContent=model.along;alongHint.textContent=model.alongHint;crew.textContent=model.crew;crew.hidden=!model.crew;}
    settingsText.textContent='Ajustes';
    calibration.textContent=model?.boomNeedsReview?'Conferir barra':'';calibration.hidden=!model?.boomNeedsReview;
    for(const marker of params.querySelectorAll('.param-uncal')){marker.textContent='Alinhamento estimado';marker.title='Referência de alinhamento; conferir direção e limites em campo.';}
    for(const meta of params.querySelectorAll('.param-meta'))for(const text of meta.childNodes)if(text.nodeType===3)text.textContent=operationalParameterHint(text.textContent);
    support.textContent=document.getElementById('real-haPerPoint')?.textContent||'';
    if(stage.querySelector('[aria-invalid="true"]')){settings.open=true;origin.open=true;}
  }
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;document.defaultView.requestAnimationFrame(()=>{scheduled=false;render();});};
  for(const event of ['plano:mudou','aba:mudou','etapa:mudou'])events.on(event,schedule);
  stage.addEventListener('input',schedule);stage.addEventListener('change',schedule);settings.addEventListener('toggle',schedule);
  new document.defaultView.MutationObserver(()=>{organizeRecommendation();schedule();}).observe(card,{childList:true});
  new document.defaultView.MutationObserver(schedule).observe(params,{subtree:true,attributes:true,attributeFilter:['aria-invalid']});
  render();return true;
}
