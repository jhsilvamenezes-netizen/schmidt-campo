// Projeção r5: estado transitório, sem acesso ao aplicativo ou armazenamento.
const D=JSON.parse(document.getElementById('data').textContent),$=id=>document.getElementById(id);
const fmt=(n,d=0)=>n.toLocaleString('pt-BR',{maximumFractionDigits:d}),metres=(n,d=0)=>fmt(n,d)+' m';
const svgNS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},text)=>{const e=document.createElementNS(svgNS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
let scene=D.scenes['Bananal|BB1-BC1'],mode='block',view=null,selectedPoint=null,zoom=1,pan=[0,0],editing=false,applied=false;
let candidateMembers=new Set(scene.members.map(f=>f.key)),familyKeys=[...candidateMembers],drag=null,dragged=false;
const pointOf=id=>scene.members.flatMap(f=>f.points).find(p=>p.id===id);
const titleOf=s=>s.members.map(f=>f.code).join(' + ');
const currentMembers=()=>view?scene.members.filter(f=>f.key===view):scene.members;
function resetView(){selectedPoint=null;zoom=1;pan=[0,0];}
function setView(key){view=key;resetView();render();}
function chooseScene(id){scene=D.scenes[id];mode=scene.kind;view=null;resetView();editing=false;applied=false;candidateMembers=new Set(scene.members.map(f=>f.key));
 const full=D.groups.filter(g=>scene.members.every(f=>g.members.includes(f.key))).sort((a,b)=>b.members.length-a.members.length)[0];familyKeys=full?.members||[...candidateMembers];render();}
function chooseMembers(key){
 if(candidateMembers.has(key))candidateMembers.delete(key);else candidateMembers.add(key);
 const group=D.groups.find(g=>g.members.length===candidateMembers.size&&g.members.every(k=>candidateMembers.has(k)));
 if(group){scene=D.scenes[group.id];view=null;resetView();applied=false;}
 render();
}
function button(text,fn,attrs={}){const e=document.createElement('button');e.textContent=text;e.onclick=fn;for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
function rectOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function path(geom,project){return geom.map(poly=>poly.map(ring=>'M'+ring.map(p=>project(p).join(',')).join('L')+'Z').join('')).join('');}
function makeProjection(members,w,h,padding=50){
 const bs=members.map(f=>f.bounds),x0=Math.min(...bs.map(b=>b[0])),y0=Math.min(...bs.map(b=>b[1])),x1=Math.max(...bs.map(b=>b[2])),y1=Math.max(...bs.map(b=>b[3]));
 const base=Math.min((w-padding*2)/(x1-x0),(h-padding*2-18)/(y1-y0));
 const scale=base*zoom,cx=(x0+x1)/2,cy=(y0+y1)/2;
 return {scale,project:p=>[w/2-8+(p[0]-cx)*scale+pan[0],h/2+9-(p[1]-cy)*scale+pan[1]],bounds:[x0,y0,x1,y1]};
}
function drawMap(){
 const svg=$('map'),w=svg.clientWidth,h=svg.clientHeight;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.replaceChildren();
 const members=currentMembers(),{project,scale}=makeProjection(members,w,h),used=[];
 const reserve=r=>used.push(r);
 reserve({x:0,y:0,w:w-60,h:48});reserve({x:w-57,y:0,w:57,h:160});reserve({x:0,y:h-42,w:100,h:42});
 const point=selectedPoint?pointOf(selectedPoint):null,unit=point?members.flatMap(f=>f.units).find(u=>u.id===point.unit):null;
 for(const f of members){
  const shape=el('path',{d:path(f.geom,project),fill:'#e3f0ea',stroke:'#17594a','stroke-width':1.7,'fill-rule':'evenodd','data-field':f.key});svg.append(shape);
  for(const u of f.units){svg.append(el('polyline',{points:u.line.map(p=>project(p).join(',')).join(' '),fill:'none',stroke:unit?.id===u.id?'#17594a':'#096f86','stroke-width':unit?.id===u.id?3:1.4,'data-unit':u.id}));}
 }
 // Cotas do ponto selecionado: próximo do mesmo trecho e perpendicular à borda.
 const measure=(a,b,label,kind)=>{
  const A=project(a),B=project(b);svg.append(el('path',{d:`M${A}L${B}`,stroke:kind==='border'?'#805021':'#0b4a5a','stroke-width':2,'stroke-dasharray':'5 4',fill:'none','pointer-events':'none','data-measure':kind}));
  const x=(A[0]+B[0])/2,y=(A[1]+B[1])/2;
  const width=label.length*6.2+12,pointBoxes=members.flatMap(f=>f.points.map(p=>{const q=project(p.xy);return {x:q[0]-7,y:q[1]-7,w:14,h:14};}));
  for(const[dx,dy]of [[0,-16],[0,16],[24,0],[-24,0],[0,-34],[0,34],[38,-20],[-38,20]]){const tx=x+dx,ty=y+dy,box={x:tx-width/2,y:ty-11,w:width,h:22};
   if(box.x<8||box.x+width>w-8||box.y<55||box.y+22>h-22||[...used,...pointBoxes].some(b=>rectOverlap(box,b)))continue;
   reserve(box);svg.append(el('path',{d:`M${x},${y}L${tx},${ty}`,stroke:'#56685f','stroke-width':.8,fill:'none','pointer-events':'none'}),el('rect',{x:box.x,y:box.y,width:width,height:22,rx:4,fill:'white',stroke:'#cadbd0'}),el('text',{x:tx,y:ty+4,'text-anchor':'middle',fill:'#163e2f','font-size':11,'font-weight':700,'pointer-events':'none'},label));break;
  }
 };
 if(point){if(point.next){const next=pointOf(point.next);measure(point.xy,next.xy,metres(point.nextM,1),'next');}measure(point.xy,point.border.xy,metres(point.border.metres,1),'border');}
 for(const f of members)for(const p of f.points){
  const[x,y]=project(p.xy);if(x<0||x>w||y<0||y>h)continue;
  const active=p.id===selectedPoint,g=el('g',{'data-point':p.id,role:'button',tabindex:0,'aria-label':`${f.code}, ${p.sourceId}, ${p.track}`,style:'cursor:pointer'});
  g.append(el('circle',{cx:x,cy:y,r:13,fill:'transparent','data-hit':p.id}));
  if(active)g.append(el('circle',{cx:x,cy:y,r:9,fill:'white',stroke:'#17594a','stroke-width':2}));
  g.append(el('circle',{cx:x,cy:y,r:active?5:4.6,fill:active?'#17594a':'#95521c',stroke:'white','stroke-width':1.5}));
  const select=()=>{if(!dragged){selectedPoint=p.id;render();}};g.onclick=select;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectedPoint=p.id;render();}};svg.append(g);
 }
 // Colocação por candidatos em pixels: não desenhar texto quando colidir.
 const dots=members.flatMap(f=>f.points.map(p=>{const q=project(p.xy);return {x:q[0]-5,y:q[1]-5,w:10,h:10};}));
 let labelCount=0;
 function label(text,xy,kind,candidates){
  const font=kind==='field'?12:kind==='track'?10:10,width=text.length*font*.63+9,height=kind==='field'?23:17;
  for(const[dx,dy]of candidates){const x=xy[0]+dx,y=xy[1]+dy,box={x:x-width/2,y:y-height/2,w:width,h:height};
   if(box.x<6||box.y<6||box.x+width>w-6||box.y+height>h-6||[...used,...dots].some(b=>rectOverlap(b,box)))continue;
   reserve(box);if(kind==='field'&&Math.hypot(dx,dy)>24)svg.append(el('path',{d:`M${xy}L${x},${y}`,stroke:'#78948a','stroke-width':.8,'stroke-dasharray':'3 3',fill:'none','pointer-events':'none'}));const g=el('g',{'data-label-kind':kind,'data-label-text':text,'pointer-events':'none'});
   if(kind==='field')g.append(el('rect',{x:box.x,y:box.y,width,height,rx:5,fill:'#ffffffed',stroke:'#9cbba9','stroke-width':.8}));
   const t=el('text',{x,y:y+font*.35,'text-anchor':'middle',fill:kind==='point'?'#805021':kind==='track'?'#096f86':'#17594a','font-size':font,'font-weight':kind==='field'?750:650,stroke:kind==='field'?'none':'#f3f7f4','stroke-width':3,'paint-order':'stroke'},text);g.append(t);svg.append(g);labelCount++;return;
  }
 }
 for(const f of members){
  const interior=f.points.reduce((best,p)=>p.border.metres>best.border.metres?p:best,f.points[0]),center=project(interior.xy),candidates=[[0,0],[0,30],[30,0],[-30,0],[0,-30],[0,60],[0,-60],[40,30],[-40,-30],[60,0],[-60,0],[80,0],[-80,0],[110,0],[-110,0],[0,90],[0,-90]];
  const free=[];for(let yy=70;yy<h-40;yy+=28)for(let xx=34;xx<w-34;xx+=52)free.push([xx-center[0],yy-center[1]]);free.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));label(f.code,center,'field',[...candidates,...free]);
 }
 for(const f of members)for(const u of f.units){
  const a=project(u.line[0]),b=project(u.line.at(-1)),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  const near=[a[0]+dx*.06,a[1]+dy*.06];label(u.sourceId,near,'track',[[12,-12],[-12,-12],[12,12],[-12,12],[24,0]]);
 }
 for(const f of members)for(const p of f.points){const xy=project(p.xy);label(String(p.number??p.sourceId),xy,'point',[[11,-9],[-11,-9],[11,12],[-11,12],[0,-15],[18,0],[-18,0],[22,-12],[-22,12],[0,-25],[22,16],[-22,-16]]);}
 // Nord et échelle déterminés par la transformation métrique effective.
 svg.append(el('path',{d:`M20 77V54M15 61L20 54L25 61`,stroke:'#17594a','stroke-width':1.6,fill:'none'}),el('text',{x:20,y:49,'text-anchor':'middle',fill:'#17594a','font-size':10,'font-weight':700},'N'));
 const target=75/scale,exp=10**Math.floor(Math.log10(target)),size=[1,2,5,10].map(n=>n*exp).filter(n=>n<=target).at(-1)||exp;
 svg.append(el('path',{d:`M15 ${h-18}h${size*scale}m0 -4v8m${-size*scale} 0v-8`,stroke:'#17594a','stroke-width':1.5,fill:'none'}),el('text',{x:15,y:h-26,fill:'#17594a','font-size':10},metres(size)));
 svg.dataset.labelCount=labelCount;svg.dataset.scale=scale;svg.dataset.pointCount=members.reduce((n,f)=>n+f.points.length,0);svg.dataset.scene=scene.id;svg.dataset.view=view||'all';
 $('mini').hidden=mode!=='block'||!view;$('legend-detail').hidden=!$('mini').hidden;
 if(!$('mini').hidden){
  const mini=$('mini-map');mini.replaceChildren();mini.setAttribute('viewBox','0 0 90 80');
  const bs=scene.members.map(f=>f.bounds),x0=Math.min(...bs.map(b=>b[0])),y0=Math.min(...bs.map(b=>b[1])),x1=Math.max(...bs.map(b=>b[2])),y1=Math.max(...bs.map(b=>b[3])),s=Math.min(70/(x1-x0),62/(y1-y0));
  const pp=p=>[45+(p[0]-(x0+x1)/2)*s,40-(p[1]-(y0+y1)/2)*s];
  for(const f of scene.members)mini.append(el('path',{d:path(f.geom,pp),fill:f.key===view?'#17594a':'#e3f0ea',stroke:'#17594a','stroke-width':1,'fill-rule':'evenodd'}));
 }
}
function render(){
 $('individual').setAttribute('aria-pressed',mode==='individual');$('block').disabled=!D.groups.some(g=>g.members.includes(scene.members[0].key));$('block').setAttribute('aria-pressed',mode==='block');
 $('header-scope').textContent=scene.members[0].farm+' · '+(mode==='block'?'bloco':'individual');
 $('selection-title').textContent=(mode==='block'?'Bloco · ':'Lote · ')+titleOf(scene);
 $('selection-summary').textContent=scene.points+' pontos · '+scene.members.length+' '+(scene.members.length===1?'lote':'lotes')+(applied?' · em uso na simulação':' · prévia');
 $('edit').hidden=mode==='individual';$('edit').textContent=editing?'Concluir escolha':'Alterar lotes';$('editor').hidden=!editing;
 $('members').replaceChildren();
 for(const key of familyKeys)$('members').append(button((candidateMembers.has(key)?'✓ ':'+ ')+D.scenes[key].members[0].code,()=>chooseMembers(key),{'data-member':key,'aria-pressed':candidateMembers.has(key)}));
 const valid=mode==='individual'||D.groups.some(g=>g.members.length===candidateMembers.size&&g.members.every(k=>candidateMembers.has(k)));
 $('editor-hint').textContent=valid?'':'Escolha pelo menos dois lotes compatíveis. A prévia aguarda uma seleção válida.';
 $('views').replaceChildren();
 if(mode==='block')$('views').append(button('Conjunto',()=>setView(null),{'data-view':'all','aria-pressed':!view}));
 for(const f of scene.members){const b=button(f.code,()=>setView(f.key),{'data-view':f.key,'aria-pressed':view===f.key||mode==='individual'});const small=document.createElement('small');small.textContent=f.points.length+' pontos';b.append(small);$('views').append(b);}
 const members=currentMembers(),range=view?members[0].along:scene.along;
 $('map-title').replaceChildren();const strong=document.createElement('strong');strong.textContent=view?members[0].code+' · '+(mode==='block'?'dentro do bloco':'individual'):mode==='block'?'Visão conjunta · '+titleOf(scene):scene.members[0].code+' · individual';$('map-title').append(strong);
 $('across').textContent=metres(scene.spacingM,2);$('along').textContent=range?metres(range[0])+'–'+metres(range[1]):'Sem intervalo';
 // Uma unidade única e inequívoca no intervalo.
 if(range)$('along').textContent=fmt(range[0])+'–'+fmt(range[1])+' m';
 $('along-title').textContent='Entre pontos · '+(view?members[0].code:mode==='block'?'bloco':scene.members[0].code);
 $('scope').textContent=mode==='block'?(view?'Grade do bloco preservada · '+members[0].points.length+' de '+scene.points+' pontos':'Grade comum · divisas e pontos identificados por lote'):'Plano individual · '+scene.points+' pontos';
 const p=selectedPoint?pointOf(selectedPoint):null;
 $('point-info').hidden=!p;$('empty-point').hidden=!!p;
 if(p){const f=scene.members.find(f=>f.key===p.field);$('point-name').textContent=f.code+' · '+p.sourceId+' · '+p.track;$('point-next').textContent=p.nextM===null?'Fim do trecho':metres(p.nextM,1);$('point-border').textContent=metres(p.border.metres,1);$('point-note').textContent=p.next?'Próximo: '+pointOf(p.next).sourceId+' · no mesmo trecho.':'Não ligar automaticamente ao próximo lote ou fragmento.';}
 $('apply').textContent=applied?'Seleção confirmada nesta simulação':mode==='block'?'Usar bloco · '+titleOf(scene):'Usar lote · '+scene.members[0].code;$('apply').disabled=!valid||applied;
 $('status').textContent=!valid?'Aguardando uma seleção válida.':applied?'Nenhum plano ou coleta foi gravado no aplicativo.':'';
 $('rows').replaceChildren();for(const f of scene.members){const tr=document.createElement('tr');for(const text of [f.code,f.points.length,f.minimum,metres(Math.min(...f.points.map(p=>p.border.metres)),1)]){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('rows').append(tr);}
 document.body.dataset.mode=mode;document.body.dataset.scene=scene.id;document.body.dataset.view=view||'all';document.body.dataset.valid=valid;
 drawMap();
 $('map').style.visibility=valid?'visible':'hidden';
 if(!valid){$('map-title').textContent='Selecione ao menos dois lotes compatíveis';$('across').textContent='—';$('along').textContent='—';$('selection-title').textContent='Escolha dos lotes';$('selection-summary').textContent=candidateMembers.size+' selecionado(s) · cálculo pendente';$('scope').textContent='Sem prévia válida para esta seleção';$('mini').hidden=true;}
 $('point-pick').replaceChildren();const first=document.createElement('option');first.value='';first.textContent='Escolher ponto para consultar';$('point-pick').append(first);for(const f of currentMembers())for(const p of f.points){const o=document.createElement('option');o.value=p.id;o.textContent=f.code+' · '+p.sourceId+' · '+p.track;$('point-pick').append(o);}$('point-pick').value=selectedPoint||'';
}
const blockOptions=document.createElement('optgroup');blockOptions.label='Blocos';$('example').append(blockOptions);
for(const g of D.groups){const o=document.createElement('option');o.value=g.id;o.textContent=g.members[0].split('|')[0]+' · '+g.members.map(k=>k.split('|')[1]).join(' + ');blockOptions.append(o);}
const individualOptions=document.createElement('optgroup');individualOptions.label='Individuais';$('example').append(individualOptions);for(const s of Object.values(D.scenes).filter(s=>s.kind==='individual')){const o=document.createElement('option');o.value=s.id;o.textContent=s.members[0].farm+' · '+s.members[0].code;individualOptions.append(o);}
$('example').value=scene.id;$('example').onchange=()=>chooseScene($('example').value);
$('individual').onclick=()=>chooseScene(view||scene.members[0].key);
$('block').onclick=()=>{const g=D.groups.find(g=>g.members.includes(scene.members[0].key));if(g){$('example').value=g.id;chooseScene(g.id);}};
$('edit').onclick=()=>{editing=!editing;render();};$('mini').onclick=()=>setView(null);
$('point-pick').onchange=()=>{selectedPoint=$('point-pick').value||null;render();};
$('point-close').onclick=()=>{selectedPoint=null;render();};
$('apply').onclick=()=>{applied=true;editing=false;render();};
$('zoom-in').onclick=()=>{zoom=Math.min(8,zoom*1.4);drawMap();};$('zoom-out').onclick=()=>{zoom=Math.max(.65,zoom/1.4);drawMap();};$('fit').onclick=()=>{zoom=1;pan=[0,0];drawMap();};
$('map').addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:[...pan]};dragged=false;});
$('map').addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6){dragged=true;pan=[drag.pan[0]+dx,drag.pan[1]+dy];drawMap();}});
window.addEventListener('pointerup',()=>{drag=null;setTimeout(()=>{dragged=false;},0);});
$('map').addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.65,Math.min(8,zoom*(e.deltaY<0?1.15:1/1.15)));drawMap();},{passive:false});
new ResizeObserver(()=>drawMap()).observe($('map'));
for(const b of document.querySelectorAll('.bottom button')){b.setAttribute('aria-pressed',b.dataset.v08View==='plano');b.onclick=()=>{if(b.dataset.v08View==='mapa')$('map').scrollIntoView({block:'center'});};}
render();
