import { schmidtBlockBorderDistance } from '../application/block-planning.mjs';
// Visão conjunta de leitura; operar um membro usa o mapa original do aplicativo.
export function createSchmidtBlockMap({document,selectMember}) {
 const legacy=document.getElementById('map').parentElement,area=legacy.parentElement;
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const root=make('section');root.id='block-map-panel';root.hidden=true;
 const tabs=make('div');tabs.className='block-map-tabs';
 const box=make('div');box.className='block-map-canvas';
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='block-overview';svg.setAttribute('role','group');svg.setAttribute('aria-label','Mapa dos lotes do bloco');
 const tools=make('div');tools.className='block-map-tools';
 const title=make('div');title.className='block-map-title';
 const metrics=make('div');metrics.className='block-map-metrics';
 const info=make('div');info.id='block-map-point';info.hidden=true;
 const go=make('button','Abrir este lote');go.type='button';
 box.append(svg,title,tools);root.append(tabs,box,metrics,info);legacy.before(root);
 const style=make('style');style.textContent=`
 #block-map-panel{color:var(--sx-brand);background:var(--sx-surface);padding:8px;border-radius:10px;min-width:0;flex-shrink:0}
 #block-map-panel[hidden],#block-map-point[hidden]{display:none!important}
 .block-map-tabs{display:flex;gap:6px;margin-bottom:7px}.block-map-tabs button{flex:1;min-width:0;min-height:44px;padding:5px;font:inherit;font-size:12px;border:1px solid var(--sx-line-strong);border-radius:8px;color:var(--sx-brand);background:var(--sx-soft)}
 .block-map-tabs button[aria-pressed=true]{background:var(--sx-brand);color:white}
 .block-map-canvas{position:relative;border:1px solid var(--sx-line);border-radius:9px;overflow:hidden;background:var(--sx-soft)}
 #block-overview{display:block;width:100%;height:390px;touch-action:none}
 .block-map-tools{position:absolute;right:8px;top:8px;display:grid;gap:6px}.block-map-tools button{width:40px;height:40px;background:white;color:var(--sx-brand);border:1px solid var(--sx-line-strong);border-radius:8px;font-size:20px}
 .block-map-title{position:absolute;left:9px;top:8px;font-size:12px;font-weight:700;background:#fffffff0;padding:4px 7px;border-radius:5px;max-width:calc(100% - 68px)}
 .block-map-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:7px}.block-map-metrics div{background:var(--sx-soft);border:1px solid var(--sx-line);border-radius:8px;padding:7px;font-size:11px}.block-map-metrics strong{display:block;font-size:19px}
 #block-map-point{padding:8px;font-size:13px}#block-map-point button{display:block;margin-top:6px;min-height:42px;background:var(--sx-brand);color:white;border:0;border-radius:7px;padding:7px 12px}
 .map-area.schmidt-joint-map{height:auto!important;max-height:none!important;overflow:visible!important}.map-area.schmidt-joint-map #field-readout,.map-area.schmidt-joint-map>.legend{display:none}
 @media(max-width:999px){.layout .map-area.schmidt-joint-map{height:calc(100dvh - var(--top-h,52px) - var(--block-sheet-height,64px))!important;padding-bottom:8px!important;overflow-y:auto!important;min-height:0}}
 @media(max-width:370px){#block-overview{height:350px}}`;
 document.head.append(style);
 let record=null,fields=null,scenarios=null,live=false,focus=null,lastField=null,zoom=1,pan=[0,0],pointer=null,dragged=false,selected=null,frame=0;
 const fmt=(n,d=0)=>n.toLocaleString('pt-BR',{maximumFractionDigits:d});
 const sv=(tag,attrs,text)=>{const e=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
 const schedule=()=>{if(!frame)frame=document.defaultView.requestAnimationFrame(()=>{frame=0;paint();});};
 const view=key=>{focus=key;zoom=1;pan=[0,0];selected=null;info.hidden=true;if(key&&live)selectMember(key);render();};
 function render(){
  if(!record)return;
  root.hidden=false;tabs.replaceChildren();
  for(const [key,label]of [[null,'Bloco completo'],...record.members.map(k=>[k,fields[k].code])]){const b=make('button',label);b.type='button';b.dataset.blockView=key||'all';b.setAttribute('aria-pressed',String(focus===key));b.onclick=()=>view(key);tabs.append(b);}
  // A prévia sempre é de leitura. Só o bloco ativo pode abrir o mapa operacional.
  const memberView=!!focus&&live;
  box.hidden=memberView;metrics.hidden=memberView;legacy.hidden=!memberView;legacy.style.display=memberView?'':'none';
  area.classList.toggle('schmidt-joint-map',!memberView);
  title.textContent=(live?'Bloco · ':'Prévia · ')+record.members.map(k=>fields[k].code).join(' + ');
  schedule();
 }
 function paint(){
  if(!record)return;
  const focusedPoint=document.activeElement?.dataset?.blockPoint;svg.replaceChildren();const keys=focus&&!live?[focus]:record.members,w=svg.clientWidth||360,h=svg.clientHeight||390;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const vertices=keys.flatMap(k=>fields[k].geom.flat(2).map(p=>[p[0]+fields[k].centroidUTM[0],p[1]+fields[k].centroidUTM[1]]));
  const xs=vertices.map(p=>p[0]),ys=vertices.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min((w-110)/(x1-x0),(h-115)/(y1-y0))*zoom;
  const xy=(p,f)=>[w/2-8+(p[0]+f.centroidUTM[0]-(x0+x1)/2)*scale+pan[0],h/2+10-(p[1]+f.centroidUTM[1]-(y0+y1)/2)*scale+pan[1]];
  const labels=[],occupied=[{x:0,y:0,w:w-55,h:45},{x:w-57,y:0,w:57,h:145}];let total=0;const gaps=[];
  const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const label=(text,p,kind)=>{const width=text.length*7+10,height=19;const opts=kind==='field'?[[0,0],[35,0],[-35,0],[0,35],[0,-35],[70,0],[-70,0]]:[[11,-10],[-11,-10],[12,13],[-12,13]];
   for(const [dx,dy]of opts){const x=p[0]+dx,y=p[1]+dy,b={x:x-width/2,y:y-12,w:width,h:height};if(b.x<4||b.y<45||b.x+width>w-4||b.y+height>h-25||occupied.some(o=>overlaps(o,b)))continue;occupied.push(b);
    if(kind==='field')svg.append(sv('rect',{x:b.x,y:b.y,width,height,rx:4,fill:'white',stroke:'#abc5b5'}));svg.append(sv('text',{x,y:y+2,'text-anchor':'middle','font-size':kind==='field'?12:10,'font-weight':700,fill:kind==='point'?'#805021':'#17594a',stroke:kind==='field'?'none':'#f3f7f4','stroke-width':3,'paint-order':'stroke','pointer-events':'none','data-label':kind},text));return;}
  };
  for(const key of keys){const f=fields[key],sc=scenarios[record.members.indexOf(key)];total+=sc.samples.length;
   const d=f.geom.map(poly=>poly.map(ring=>'M'+ring.map(p=>xy(p,f).join(',')).join('L')+'Z').join('')).join('');svg.append(sv('path',{d,fill:'#e3f0ea',stroke:'#17594a','stroke-width':1.6,'fill-rule':'evenodd','data-block-field':key}));
   const byUnit=new Map();for(const p of sc.samples){if(!byUnit.has(p.unitId))byUnit.set(p.unitId,[]);byUnit.get(p.unitId).push(p);}
   for(const u of sc.units){svg.append(sv('polyline',{points:u.line.map(p=>xy(p,f).join(',')).join(' '),fill:'none',stroke:'#096f86','stroke-width':1.4}));labels.push([u.id,xy(u.line[0],f),'track']);const ps=(byUnit.get(u.id)||[]).sort((a,b)=>a.s-b.s);for(let i=1;i<ps.length;i++)gaps.push(Math.hypot(ps[i].x-ps[i-1].x,ps[i].y-ps[i-1].y));}
   for(const p of sc.samples){const pos=xy([p.x,p.y],f),point=sv('circle',{cx:pos[0],cy:pos[1],r:5,fill:'#95521c',stroke:'white','stroke-width':1.5,tabindex:0,role:'button','aria-label':`${f.code}, ${p.id}, ${p.trackId}`,'data-block-point':key+'::'+p.id});
    const choose=()=>{if(dragged)return;selected={key,p};info.replaceChildren();info.append(make('strong',`${f.code} · ${p.id} · ${p.trackId}`));const ps=(byUnit.get(p.unitId)||[]).slice().sort((a,b)=>a.s-b.s),i=ps.findIndex(q=>q.id===p.id),next=ps[i+1];const border=schmidtBlockBorderDistance(f.geom,[p]);if(Number.isFinite(border))info.append(make('p',`Até a borda mais próxima: ${fmt(border,1)} m`));info.append(make('p',next?`Até ${next.id}: ${fmt(Math.hypot(next.x-p.x,next.y-p.y),1)} m`:'Último ponto deste trecho.'));if(live){go.onclick=()=>view(key);info.append(go);}info.hidden=false;};point.onclick=choose;point.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};svg.append(point);labels.push([String(p.number??p.id),pos,'point']);}
   const center=f.geom[0][0].reduce((a,p)=>[a[0]+p[0]/f.geom[0][0].length,a[1]+p[1]/f.geom[0][0].length],[0,0]);labels.unshift([f.code,xy(center,f),'field']);
  }
  for(const l of labels)label(...l);
  svg.append(sv('text',{x:16,y:65,fill:'#17594a','font-size':12},'N'),sv('path',{d:'M20 92V70M15 77L20 70L25 77',fill:'none',stroke:'#17594a','stroke-width':1.5}));
  const exp=10**Math.floor(Math.log10(70/scale)),len=[1,2,5,10].map(n=>n*exp).filter(n=>n*scale<=70).at(-1)||exp;
  svg.append(sv('path',{d:`M15 ${h-16}h${len*scale}`,stroke:'#17594a','stroke-width':2}),sv('text',{x:15,y:h-23,'font-size':10,fill:'#17594a'},fmt(len)+' m'));
  metrics.replaceChildren();for(const [name,value]of [['Entre tiros',fmt(record.common.spacingM,2)+' m'],['Entre pontos · '+(focus?fields[focus].code:'bloco'),gaps.length?fmt(Math.min(...gaps))+'–'+fmt(Math.max(...gaps))+' m':'Um ponto por trecho']]){const cell=make('div',name);cell.append(make('strong',value));metrics.append(cell);}svg.dataset.total=String(total);if(focusedPoint){const node=[...svg.querySelectorAll('[data-block-point]')].find(n=>n.dataset.blockPoint===focusedPoint);node?.focus({preventScroll:true});}
 }
 for(const [label,name,action]of [['+','Aproximar',()=>zoom=Math.min(8,zoom*1.3)],['−','Afastar',()=>zoom=Math.max(.6,zoom/1.3)],['⌖','Enquadrar',()=>{zoom=1;pan=[0,0];}]]){const b=make('button',label);b.type='button';b.setAttribute('aria-label',name);b.onclick=()=>{action();schedule();};tools.append(b);}
 svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,pan:[...pan]};dragged=false;});
 svg.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(dx,dy)>6){dragged=true;svg.setPointerCapture(e.pointerId);pan=[pointer.pan[0]+dx,pointer.pan[1]+dy];schedule();}});
 const end=()=>{pointer=null;};svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);document.defaultView.addEventListener('pointerup',()=>{end();setTimeout(()=>{dragged=false;},0);});
 new document.defaultView.ResizeObserver(schedule).observe(svg);
 const sheet=document.getElementById('sheet');const sizeSheet=()=>area.style.setProperty('--block-sheet-height',Math.ceil(sheet.getBoundingClientRect().height)+'px');new document.defaultView.ResizeObserver(sizeSheet).observe(sheet);sizeSheet();
 return {update(next,allFields,plans,isLive,currentField){if(record?.id!==next.id||live!==isLive){focus=null;zoom=1;pan=[0,0];selected=null;info.hidden=true;}else if(isLive&&lastField&&currentField!==lastField)focus=currentField;record=next;fields=allFields;scenarios=plans;live=isLive;lastField=currentField;render();},focus:key=>view(key),clear(){record=null;root.hidden=true;legacy.hidden=false;legacy.style.display='';area.classList.remove('schmidt-joint-map');info.hidden=true;focus=null;}};
}
