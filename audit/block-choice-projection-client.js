const D=JSON.parse(document.getElementById('data').textContent);
const $=id=>document.getElementById(id),fmt=(n,d=0)=>n.toLocaleString('pt-BR',{maximumFractionDigits:d});
let family=D.families[0],selected=new Set(['BB1']),mode='block',applied=false,focus=null,zoom=1;
const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const sv=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
function choose(code){
 if(applied){focus=code;render();return;}
 if(mode==='individual')selected=new Set([code]);else if(selected.has(code))selected.delete(code);else selected.add(code);
 render();
}
function dimension(svg,measure,shift,labelX){
 if(!measure)return;
 const[a,b]=measure.points,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 const p=[a[0]+nx*shift,a[1]+ny*shift],q=[b[0]+nx*shift,b[1]+ny*shift];
 const g=sv('g',{'pointer-events':'none'});svg.append(g);
 g.append(sv('path',{d:`M${a}L${p}L${q}L${b}M${p[0]-nx*10},${p[1]-ny*10}L${p[0]+nx*10},${p[1]+ny*10}M${q[0]-nx*10},${q[1]-ny*10}L${q[0]+nx*10},${q[1]+ny*10}`,fill:'none',stroke:'#0b4a5a','stroke-width':3}));
 const centerX=(p[0]+q[0])/2,y=(p[1]+q[1])/2,x=labelX;
 g.append(sv('path',{d:`M${centerX},${y}H${x}`,fill:'none',stroke:'#0b4a5a','stroke-width':2,'stroke-dasharray':'7 5'}));
 g.append(sv('rect',{x:x-92,y:y-25,width:184,height:48,rx:9,fill:'#fff',stroke:'#cadbd0','stroke-width':2}));
 const text=sv('text',{x,y:y+8,'text-anchor':'middle','font-size':34,'font-weight':700,fill:'#0b4a5a'});text.textContent=measure.label;g.append(text);
}
function render(){
 const members=[...selected].sort(),scene=D.scenes[members.join('+')],eligible=mode==='block'&&members.length>=2;
 $('individual').setAttribute('aria-pressed',mode==='individual');$('block').setAttribute('aria-pressed',mode==='block');
 $('lead').textContent=applied?'O bloco inteiro continua visível. Toque no lote para focar.':mode==='block'?'Toque nos lotes que quer fazer juntos.':'Escolha o lote que será feito sozinho.';
 $('tag').textContent=applied?'Em uso · simulação':eligible?'Prévia':'Seleção';
 $('total').textContent=scene?`${members.length} ${members.length===1?'lote':'lotes'} · ${scene.total} pontos`:'Nenhum lote selecionado';
 $('choices').replaceChildren();
 for(const code of family.members){const b=make('button',(selected.has(code)?'✓ ':'+ ')+code);b.className='lot';b.dataset.lot=code;b.setAttribute('aria-pressed',selected.has(code));b.onclick=()=>choose(code);$('choices').append(b);}
 const svg=$('map');svg.replaceChildren();
 const shown=mode==='individual'&&scene?members:applied?members:family.members;
 const bounds=shown.map(k=>D.fields[k].bounds),x0=Math.min(...bounds.map(b=>b[0])),y0=Math.min(...bounds.map(b=>b[1])),x1=Math.max(...bounds.map(b=>b[2])),y1=Math.max(...bounds.map(b=>b[3]));
 const scaleFactor=820/Math.max(x1-x0,y1-y0)*zoom,cx=(x0+x1)/2,cy=(y0+y1)/2;
 const project=p=>[500+(p[0]-cx)*scaleFactor,500+(p[1]-cy)*scaleFactor];
 for(const code of shown){const f=D.fields[code],isSelected=selected.has(code),p=sv('path',{d:f.path,transform:`translate(500 500) scale(${scaleFactor}) translate(${-cx} ${-cy})`,fill:isSelected?'#e3f0ea':'#edf0ee',stroke:isSelected?'#2f7553':'#aebbb4','stroke-width':(focus===code?7:3)/scaleFactor,'fill-rule':'evenodd',tabindex:0,'data-map-lot':code,role:'button','aria-label':`${code}, ${isSelected?'selecionado':'disponível'}`});
  p.style.cursor='pointer';p.onclick=()=>choose(code);p.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();choose(code);}};svg.append(p);}
 if(scene){
  for(const line of scene.lines)svg.append(sv('polyline',{points:line.points.map(p=>project(p).join(',')).join(' '),stroke:'#096f86','stroke-width':3,fill:'none','pointer-events':'none'}));
  for(const p of scene.points){const[x,y]=project(p.xy),c=sv('circle',{cx:x,cy:y,r:6,fill:'#95521c',stroke:'#fff','stroke-width':2,'pointer-events':'none'});const title=sv('title');title.textContent=p.field+' · '+p.id;c.append(title);svg.append(c);}
  const m=value=>value?{...value,points:value.points.map(project)}:null,measure=focus?scene.measurementsByField[focus]:scene;
  dimension(svg,m(measure.acrossMeasure),0,170);dimension(svg,m(measure.alongMeasure),45,770);
 }
 for(const code of shown){const f=D.fields[code],[x,y0]=project(f.label),y=y0+60;
  const g=sv('g',{'data-map-label':code});g.style.cursor='pointer';g.onclick=()=>choose(code);
  g.append(sv('rect',{x:x-76,y:y-26,width:152,height:52,rx:12,fill:'#fffffff2',stroke:selected.has(code)?'#17594a':'#aebbb4','stroke-width':2}));
  const text=sv('text',{x,y:y+11,'text-anchor':'middle','font-size':36,'font-weight':750,fill:selected.has(code)?'#17594a':'#78867e'});text.textContent=code;g.append(text);svg.append(g);
 }
 const north=sv('text',{x:82,y:90,'text-anchor':'middle','font-size':33,fill:'#17594a'});north.textContent='N';svg.append(north,sv('path',{d:'M82 175V110M72 124L82 110L92 124',stroke:'#17594a','stroke-width':3,fill:'none'}));
 const length=family.scaleBar.pixels*scaleFactor,halve=length>280?2:1;
 svg.append(sv('path',{d:`M65 920H${65+length/halve}`,stroke:'#17594a','stroke-width':4}));const scale=sv('text',{x:65,y:900,'font-size':30,fill:'#17594a'});scale.textContent=(500/halve)+' m';svg.append(scale);
 $('map-caption').textContent=applied?'Bloco · '+members.join(' + '):'Lotes '+family.members.join(' / ')+' · mesma referência';
 const along=focus?scene?.measurementsByField[focus]?.alongM:scene?.alongM;
 $('across').textContent=scene?fmt(scene.acrossM,2)+' m':'—';$('along').textContent=along?fmt(along[0])+'–'+fmt(along[1])+' m':'—';
 $('along-label').textContent=focus?'Entre pontos · '+focus:members.length>1?'Entre pontos no bloco':'Entre pontos';
 $('hint').textContent=applied?(focus?'Lote em foco: '+focus+'. O bloco continua enquadrado.':'Seleção confirmada apenas nesta demonstração.'):mode==='block'&&!eligible?'Escolha pelo menos dois lotes para formar o bloco.':eligible?'Passagem entre lotes: confirmar em campo.':'';
 $('apply').disabled=mode==='block'?!eligible:members.length!==1;$('apply').hidden=applied;
 $('apply').textContent=mode==='block'?'Usar bloco · '+(members.join(' + ')||'escolher lotes'):'Usar lote individual';$('edit').hidden=!applied;
 $('rows').replaceChildren();for(const row of scene?.rows||[]){const tr=make('tr');for(const v of [row.code,row.points,row.minimum,fmt(row.borderM,1)+' m'])tr.append(make('td',v));$('rows').append(tr);}
 document.body.dataset.selected=members.join('+');document.body.dataset.mode=mode;document.body.dataset.applied=String(applied);document.body.dataset.pointCount=scene?.total||0;
}
$('individual').onclick=()=>{mode='individual';applied=false;focus=null;selected=new Set([[...selected][0]||family.members[0]]);render();};
$('block').onclick=()=>{mode='block';applied=false;focus=null;render();};
$('example').onchange=()=>{family=D.families.find(f=>f.id===$('example').value);selected=new Set([family.members[0]]);applied=false;focus=null;zoom=1;render();};
$('apply').onclick=()=>{applied=true;focus=null;$('simulation').textContent='Aplicação simulada: nenhum plano ou coleta foi gravado no aplicativo.';render();};
$('edit').onclick=()=>{applied=false;focus=null;render();};
$('zoom-in').onclick=()=>{zoom=Math.min(2.5,zoom*1.2);render();};$('zoom-out').onclick=()=>{zoom=Math.max(.7,zoom/1.2);render();};$('fit').onclick=()=>{zoom=1;render();};
render();
for(const button of document.querySelectorAll('.bottom [data-v08-view]')){
 button.setAttribute('aria-pressed',button.dataset.v08View==='plano');
 button.onclick=()=>{if(button.dataset.v08View==='mapa')$('map').scrollIntoView({block:'center'});else if(button.dataset.v08View==='plano')document.querySelector('h1').scrollIntoView({block:'start'});};
}
