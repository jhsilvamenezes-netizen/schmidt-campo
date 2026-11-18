/* Caderno de Campo | Núcleo independente e testável — sem dados reais no código */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CampoCore=api;})(typeof window!=='undefined'?window:null,function(){'use strict';
const FARMS=['Rio de Janeiro','Bananal'];
const empty=()=>({schema:'schmidt-caderno-1',version:'2026-11-17',season:'2026/27',lots:[],catalog:[],records:[],reports:[],audit:[],quarantine:[],revision:0});
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const copy=x=>JSON.parse(JSON.stringify(x));
const validDate=s=>/^\d{4}-\d\d-\d\d$/.test(s||'')&&!Number.isNaN(new Date(s+'T00:00:00Z').getTime())&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const key=r=>[r.farm,r.os,r.start||'',r.end||'',r.type||'',(r.lots||[]).slice().sort().join(',')].map(norm).join('|');
const visible=r=>!r.voided;
const validLot=id=>/^(?:P|RA|RB|RC|BA|BB|BC|BD|BE)\d{1,2}$/.test(norm(id));
function validateRecord(r){const e=[];if(!r||typeof r!=='object')return ['Registro inválido'];if(!String(r.os||'').trim())e.push('Número da OS obrigatório');if(!FARMS.includes(r.farm))e.push('Fazenda inválida');if(!validDate(r.start))e.push('Data inicial ausente ou inválida');if(r.end&&!validDate(r.end))e.push('Data de término inválida');if(r.complete!==false&&!validDate(r.end))e.push('Informe o término ou marque como em aberto');if(validDate(r.start)&&validDate(r.end)&&r.end<r.start)e.push('Término anterior ao início');if(!Array.isArray(r.lots)||!r.lots.length)e.push('Informe pelo menos um talhão');else if(r.lots.some(id=>!validLot(id)))e.push('Identificador de talhão inválido');if(!Array.isArray(r.products)||!r.products.length)e.push('Informe pelo menos um produto');else for(const [i,p] of r.products.entries()){if(!String(p.name||'').trim())e.push(`Produto ${i+1} sem nome`);if(p.dose!=null&&(p.dose===''||!Number.isFinite(Number(String(p.dose).replace(',','.')))||Number(String(p.dose).replace(',','.'))<0))e.push(`Produto ${i+1} com dose inválida`);for(const f of ['used','left'])if(p[f]!==''&&p[f]!=null&&!/^\d+(?:[.,]\d+)?$/.test(String(p[f]).trim()))e.push(`Quantidade ${f} inválida no produto ${i+1}`);}return e;}
function normalizedRecord(r){const x=copy(r);x.os=String(x.os||'').trim();x.lots=[...new Set((x.lots||[]).map(norm))];x.products=(x.products||[]).map(p=>({...p,name:String(p.name||'').trim(),dose:p.dose===''||p.dose==null?null:Number(String(p.dose).replace(',','.'))}));return x;}
/* Importação não descarta silenciosamente itens: preserva o legado com lacunas
   operacionais (datas de término, unidade), mas põe linhas quebradas em quarentena. */
function safeImport(existing,source){
 if(!source||source.schema!=='schmidt-caderno-1'||!Array.isArray(source.records)||!Array.isArray(source.lots)||!Array.isArray(source.catalog))throw Error('Formato JSON incompatível');
 if(source.records.length>100000||source.lots.length>100000||source.catalog.length>100000)throw Error('Arquivo acima do limite permitido');
 const out=copy(existing),details=[];out.quarantine||=[];out.audit||=[];
 const seen=new Set(out.records.map(key)),ids=new Set(out.records.map(r=>r.id).filter(Boolean));let added=0,skipped=0;
 for(let i=0;i<source.records.length;i++){
  const raw=source.records[i];let reason='';
  if(!raw||typeof raw!=='object')reason='Registro não é objeto';
  else if(!String(raw.os||'').trim())reason='OS ausente';
  else if(!FARMS.includes(raw.farm))reason='Fazenda não reconhecida';
  else if(!Array.isArray(raw.products)||!raw.products.length)reason='Produtos ausentes';
  else if(raw.products.some(p=>!p||typeof p!=='object'||!String(p.name||'').trim()))reason='Produto sem identificação';
  else if(!Array.isArray(raw.lots)||!raw.lots.length)reason='Talhões ausentes';
  else if(!raw.start||!validDate(raw.start))reason='Data inicial inválida';
  if(reason){skipped++;const entry={type:'registro',index:i,os:raw?.os||'',reason,raw:copy(raw)};details.push(entry);out.quarantine.push(entry);continue;}
  const r=normalizedRecord(raw);const equivalent=seen.has(key(r))||Boolean(r.id&&ids.has(r.id));
  if(equivalent){skipped++;details.push({type:'duplicado',index:i,os:r.os,reason:'Registro equivalente ou mesmo identificador'});continue;}
  // O legado não é corrigido sem autorização: indicadores isolam identificadores ruins.
  out.records.push(r);seen.add(key(r));if(r.id)ids.add(r.id);added++;
 }
 const lots=new Set(out.lots.map(l=>`${l.farm}|${l.id}`));for(const l of source.lots)if(l?.id&&FARMS.includes(l.farm)&&!lots.has(`${l.farm}|${l.id}`)){out.lots.push(copy(l));lots.add(`${l.farm}|${l.id}`)}
 const products=new Set(out.catalog.map(p=>norm(p.name)));for(const p of source.catalog)if(p?.name&&!products.has(norm(p.name))){out.catalog.push(copy(p));products.add(norm(p.name));}
 const reports=new Set(out.reports.map(r=>[r.farm,r.os,r.start,r.end,(r.lots||[]).slice().sort().join(',')].join('|')));
 for(const q of source.reports||[]){const k=[q.farm,q.os,q.start,q.end,(q.lots||[]).slice().sort().join(',')].join('|');if(q.os&&FARMS.includes(q.farm)&&!reports.has(k)){out.reports.push(copy(q));reports.add(k)}}
 const auditSet=new Set(out.audit.map(a=>[a.at,a.action,a.detail].join('|')));
 for(const event of source.audit||[]){if(!event||typeof event!=='object')continue;const k=[event.at,event.action,event.detail].join('|');if(!auditSet.has(k)){out.audit.push(copy(event));auditSet.add(k)}}
 if(!existing.records.length)out.season=source.season||out.season;
 return {data:out,added,skipped,details,quarantined:details.filter(x=>x.type==='registro').length};
}
function frequentBlocks(data,farm,limit=6){
 const counts=new Map();for(const r of data.records||[]){if(r.voided||r.farm!==farm||!Array.isArray(r.lots)||r.lots.length<2||r.lots.some(l=>!validLot(l)))continue;
 const id=[...new Set(r.lots)].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join('|');counts.set(id,(counts.get(id)||0)+1)}
 return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([id,count])=>({lots:id.split('|'),count}));
}
function suggestDose(data,name,farm,lots=[]){
 const matches=[];for(const r of data.records||[]){if(r.voided||r.farm!==farm||!r.products)continue;for(const p of r.products){if(norm(p.name)!==norm(name)||p.dose==null||p.dose==='')continue;
 const score=(r.lots||[]).filter(x=>lots.includes(x)).length;
 matches.push({dose:p.dose,unit:p.doseUnit||'',os:r.os,date:r.end||r.start,score});}}
 matches.sort((a,b)=>b.score-a.score||String(b.date).localeCompare(String(a.date)));
 return matches.slice(0,3);
}
const dateOf=r=>r.end||r.start||'';
function filter(records,opts={}){const q=norm(opts.search||'');return (records||[]).filter(r=>opts.includeVoided?true:visible(r)).filter(r=>!opts.farm||opts.farm==='Todas'||r.farm===opts.farm).filter(r=>!opts.type||opts.type==='Todos'||r.type===opts.type).filter(r=>!opts.status||opts.status==='Todos'||(opts.status==='Concluídas'?!!r.complete:!r.complete)).filter(r=>!opts.lot||r.lots?.includes(opts.lot)).filter(r=>!opts.from||dateOf(r)>=opts.from).filter(r=>!opts.to||dateOf(r)<=opts.to).filter(r=>!opts.product||(r.products||[]).some(p=>norm(p.name)===norm(opts.product))).filter(r=>!q||norm([r.os,r.farm,r.start,r.end,r.type,(r.lots||[]).join(' '),(r.products||[]).map(x=>x.name).join(' '),r.notes||''].join(' ')).includes(q));}
function analytics(data,opts={}){const rs=filter(data.records,opts);const lots=new Set();const prod=new Map(),months=new Map(),methods=new Map(),farms=new Map();let productLines=0,doseMissing=0,quantityWithoutUnit=0,registered=0,unregistered=new Set(),invalidLots=new Set();const have=new Set(data.lots.map(l=>`${l.farm}|${l.id}`));for(const r of rs){methods.set(r.type||'Não informada',(methods.get(r.type||'Não informada')||0)+1);farms.set(r.farm,(farms.get(r.farm)||0)+1);const mo=dateOf(r).slice(0,7)||'Sem data';let bucket=months.get(mo)||{label:mo,total:0,rj:0,bananal:0};bucket.total++;if(r.farm==='Bananal')bucket.bananal++;else bucket.rj++;months.set(mo,bucket);for(const l of r.lots||[]){if(!validLot(l)){invalidLots.add(l);continue;}const id=`${r.farm}|${l}`;lots.add(id);if(!have.has(id))unregistered.add(id);}for(const p of r.products||[]){productLines++;if(p.dose==null||p.dose==='')doseMissing++;if(p.used!==''&&p.used!=null&&!p.usedUnit)quantityWithoutUnit++;const k=norm(p.name);const v=prod.get(k)||{name:p.name,count:0};v.count++;prod.set(k,v);}}
 const reportUnknownUnits=(data.reports||[]).filter(q=>!opts.farm||opts.farm==='Todas'||q.farm===opts.farm).flatMap(q=>q.products||[]).filter(p=>/^\s*\d+(?:[.,]\d+)?\s*$/.test(String(p.used||''))||/unidade\s+n[aã]o\s+informada/i.test(String(p.used||''))).length;
 return {total:rs.length,reportUnknownUnits,distinctLots:lots.size,registeredLots:data.lots.length,productLines,doseMissing,quantityWithoutUnit,unregistered:[...unregistered],invalidLots:[...invalidLots],months:[...months.values()].sort((a,b)=>a.label.localeCompare(b.label)),methods:[...methods].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count),farms:[...farms].map(([name,count])=>({name,count})),topProducts:[...prod.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR')).slice(0,10),open:rs.filter(r=>!r.complete).length,records:rs};}
function reportMatch(data,r){return (data.reports||[]).find(q=>q.farm===r.farm&&String(q.os)===String(r.os)&&q.start===r.start&&q.end===r.end&&(q.lots||[]).slice().sort().join('|')===(r.lots||[]).slice().sort().join('|'))||null;}
function issues(data,r){const arr=[];if(!r.start||(r.complete!==false&&!r.end))arr.push('Período ausente');if(!(r.products||[]).length)arr.push('Sem produtos');for(const p of r.products||[]){if(p.dose==null||p.dose==='')arr.push(`Dose ausente: ${p.name}`);if(p.used!==''&&p.used!=null&&!p.usedUnit)arr.push(`Unidade de consumo ausente: ${p.name}`);}for(const l of r.lots||[]){if(!validLot(l))arr.push(`Identificador de talhão para revisar: ${l}`);else if(!(data.lots||[]).some(t=>t.farm===r.farm&&t.id===l))arr.push(`Talhão não cadastrado: ${l}`);}return arr;}
return {FARMS,empty,norm,copy,validDate,validLot,key,visible,validateRecord,normalizedRecord,safeImport,filter,analytics,reportMatch,issues,dateOf,frequentBlocks,suggestDose};});
