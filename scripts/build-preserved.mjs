// Reconstrução parcial e declarada: aplica fontes novas a pontos de integração
// verificados do artefato imutável. Não assume que o minificado é fonte original.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { posix } from 'node:path';
import { applySchmidtBlocks, blockSourceFiles } from './block-transform.mjs';
import { bundleEngine, ENGINE_MODULES } from './bundle-engine.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = JSON.parse(await readFile(root+'audit/baseline.json'));
const preservedSourceFiles = ['src/engine/boundary.mjs','src/persistence/backup-service.mjs','src/persistence/backup-format.mjs',
  'src/gps/fix-policy.mjs','src/platform/browser-backup-adapters.mjs','src/platform/browser-session-lock.mjs','src/platform/browser-write-barrier.mjs','src/platform/legacy-integration.mjs',
  'src/application/operational-summary.mjs','src/ui/plan-presentation.mjs','src/ui/operational-plan.mjs','src/ui/refinements.mjs','src/ui/lot-map.mjs','src/platform/bounded-response.mjs','src/ui/satellite-map.mjs',
  'src/application/adjust-alternatives.mjs','src/ui/adjust-compare.mjs','src/gps/guide-next.mjs','src/ui/monitor-direction.mjs'];
export const sourceFiles=[...preservedSourceFiles,...blockSourceFiles,...ENGINE_MODULES.map(m=>`src/engine/${m}.mjs`)];
const sha = text => createHash('sha256').update(text).digest('hex');
export async function buildCandidate({includeBlocks}={}) {
  if(includeBlocks===undefined)includeBlocks=!!JSON.parse(await readFile(root+'VERSAO.json','utf8')).runtimeBlocks;
  const original = execFileSync('git',['show',`${baseline.commit}:index.html`],{cwd:root,maxBuffer:4*1024*1024}).toString();
  if(sha(original)!==baseline.files['index.html'].sha256) throw new Error('Baseline HTML inesperado');
  const blocks=[await bundleEngine()]; // motor 2 primeiro: os módulos abaixo e o motor da página o usam
  const available = new Set();
  for(const file of preservedSourceFiles) {
    const source=await readFile(root+file,'utf8');
    for (const line of source.match(/^import[^\n]*(?:\n|$)/gm) || []) {
      const match = /^import \{[^}]+\} from ['"]([^'"]+)['"];?\s*$/.exec(line);
      if (!match) throw new Error(`Importação fora do contrato de integração: ${file}`);
      const dependency = posix.normalize(posix.join(posix.dirname(file), match[1]));
      if (!available.has(dependency)) throw new Error(`Dependência ausente ou fora de ordem: ${file} → ${dependency}`);
    }
    available.add(file);
    blocks.push(`// ${file}\n`+source.replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,''));
  }
  let candidate=original;
  const changes=[];
  // Extrai o corpo EXISTENTE do tratamento de falhas para reutilizá-lo sem
  // acrescentar markup/mensagens. Esse corpo volta byte a byte no HTML gerado.
  const storeStart=original.indexOf('K=(()=>{let e=`monitoramento.v03`');
  const catchStart=original.indexOf('catch(e){return SCHMIDT.falhaArmazenamento=',storeStart);
  const catchEnd=original.indexOf('}}return{loadState:t,saveState:n}',catchStart);
  if(storeStart<0||catchStart<0||catchEnd<0)throw new Error('Tratamento original de erro não encontrado');
  const originalFailureBody=original.slice(catchStart+'catch(e){'.length,catchEnd);
  if(!originalFailureBody.endsWith('!1'))throw new Error('Corpo inesperado de tratamento de erro');
  blocks.push(`function schmidtReportStoreFailure(e){if(e?.code==='SCHMIDT_WRITE_BLOCKED'){SCHMIDT.falhaArmazenamento=e.name;queueMicrotask(()=>{let node=document.getElementById('schmidt-storage-warning');if(!node){node=document.createElement('div');node.id='schmidt-storage-warning';node.setAttribute('role','alert');document.body.append(node);}node.hidden=false;node.textContent=e.userMessage;});return false;}return schmidtReportLegacyStoreFailure(e);}
function schmidtReportLegacyStoreFailure(e){${originalFailureBody}}`);
  function replace(before,after,label) {
    if(candidate.split(before).length!==2) throw new Error(`Integração não única: ${label}`);
    candidate=candidate.replace(before,()=>after); changes.push(label);
  }
  // async já é usado pelo baseline. Evita exigir suporte novo a top-level await
  // dos WebViews Android: o await de recuperação fica dentro desta função.
  replace('<script type="module" crossorigin>','<script type="module" crossorigin>\n(async()=>{\n'+blocks.join('\n')+'\n','fontes-legíveis');
  // Motor 2 no lugar do motor 0.5.1 DA PÁGINA. Cada módulo antigo (do seu início até o início do seguinte) vira
  // o namespace equivalente; validação de parâmetros (g) e qualidade dos dados (d) seguem do antigo, injetadas.
  // Marcadores únicos e ordem conferidos: qualquer mudança no artefato base interrompe o build.
  const ENGINE_SWAPS=[
    ['t',',t=(()=>{let{MIN_RING_AREA_M2',',n=(()=>{let{ALONG_S_EPS_M','schmidtEngine2.geometry'],
    ['n',',n=(()=>{let{ALONG_S_EPS_M',',r=(()=>{let{geomEdges:r','schmidtEngine2.polyline'],
    ['r',',r=(()=>{let{geomEdges:r',',i=(()=>{let{geomCentroid:i}','schmidtEngine2.clip'],
    ['i',',i=(()=>{let{geomCentroid:i}',',a=(()=>{let{cumulative:e,pointAt:t}=n','schmidtEngine2.tracks'],
    ['a',',a=(()=>{let{cumulative:e,pointAt:t}=n',',o=(()=>{let{alongCoverageRadius','schmidtEngine2.sampling'],
    ['o',',o=(()=>{let{alongCoverageRadius',',s=(()=>{let{geomArea:e,geomBounds:r}','schmidtEngine2.allocation'],
    ['s',',s=(()=>{let{geomArea:e,geomBounds:r}',',c=(()=>{let{cumulative:t,pointAt:r}=n','schmidtEngine2.metrics'],
    ['c',',c=(()=>{let{cumulative:t,pointAt:r}=n',',l=(()=>{let e=Object.freeze({boomWidthM','schmidtEngine2.optimize'],
    ['p',',p=(()=>{let{assessField:t}',',m=(()=>{let{coverage:e,long','{buildWarnings:(f,sc)=>schmidtEngine2.diagnostics.buildWarnings(f,sc,d.assessField)}'],
    ['m',',m=(()=>{let{coverage:e,long',',h=(()=>{let e=Object.freeze({GEOMETRIA','{withMetrics:(f,sc)=>schmidtEngine2.scenario.withMetrics(f,sc,p.buildWarnings),trackRows:schmidtEngine2.scenario.trackRows}'],
    ['_',',_=(()=>{let{validateGeom:e}',',v=(()=>{let{buildScenario:e','{buildScenario:(f,q={},o={})=>schmidtEngine2.scenario.buildScenario(f,q,o,{assertParams:g.assertParams,buildWarnings:p.buildWarnings,optimizeDistribution:schmidtEngine2.optimize.optimizeDistribution,engineVersion:`2.0.0`})}'],
  ];
  {
    const engineStart=candidate.indexOf('var e={SEGMENT_T_EPS:'),engineEnd=candidate.indexOf(',O=(()=>{',engineStart);
    if(engineStart<0||engineEnd<0)throw new Error('Motor da página não encontrado');
    let engine=candidate.slice(engineStart,engineEnd);
    for(const [v,from,to,value] of ENGINE_SWAPS){
      const a=engine.indexOf(from),b=engine.indexOf(to);
      if(a<0||b<0||engine.indexOf(from,a+1)>=0||engine.indexOf(to,b+1)>=0||b<=a)throw new Error(`Troca do motor: marcador ausente, repetido ou fora de ordem (${v})`);
      engine=engine.slice(0,a)+`,${v}=${value}`+engine.slice(b);
    }
    if(engine.split('ENGINE_VERSION:`0.5.1-sim`').length!==2)throw new Error('Versão do motor não encontrada');
    engine=engine.replace('ENGINE_VERSION:`0.5.1-sim`','ENGINE_VERSION:`2.0.0`');
    candidate=candidate.slice(0,engineStart)+engine+candidate.slice(engineEnd);changes.push('motor-2-na-pagina');
  }
  // Motor 2 também no WORKER (recomendação e otimização em segundo plano), que guarda o motor como texto
  // entre aspas simples. O pacote entra escapado no início da função do worker; as trocas usam as letras do worker.
  {
    const head="H='(function(){let e={SEGMENT_T_EPS:";
    const at=candidate.indexOf(head);
    if(at<0||candidate.indexOf(head,at+1)>=0)throw new Error('Worker: início não único');
    let end=at+3;
    for(;;){const q=candidate.indexOf("'",end);let k=q-1,bs=0;while(candidate[k]==='\\'){bs++;k--;}if(bs%2===0){end=q;break;}end=q+1;}
    let lit=candidate.slice(at+3,end);
    const WORKER_SWAPS=[
      ['t',',t=(()=>{let{ALONG_S_EPS_M',',n=(()=>{let{cumulative:e,pointAt:n}=t','schmidtEngine2.polyline'],
      ['n',',n=(()=>{let{cumulative:e,pointAt:n}=t',',r=(()=>{let{alongCoverageRadius','schmidtEngine2.sampling'],
      ['r',',r=(()=>{let{alongCoverageRadius',',i=(()=>{let e=Object.freeze({GEOMETRIA','schmidtEngine2.allocation'],
      ['a',',a=(()=>{let{MIN_RING_AREA_M2',',o=(()=>{let e=','schmidtEngine2.geometry'],
      ['l',',l=(()=>{let{assessField:t}=s',',u=(()=>{let{geomArea:e,geomBounds:n}=a','{buildWarnings:(f,sc)=>schmidtEngine2.diagnostics.buildWarnings(f,sc,s.assessField)}'],
      ['u',',u=(()=>{let{geomArea:e,geomBounds:n}=a',',d=(()=>{let{coverage:e,long','schmidtEngine2.metrics'],
      ['d',',d=(()=>{let{coverage:e,long',',f=(()=>{let{cumulative:r,pointAt:i}=t','{withMetrics:(f,sc)=>schmidtEngine2.scenario.withMetrics(f,sc,l.buildWarnings),trackRows:schmidtEngine2.scenario.trackRows}'],
      ['f',',f=(()=>{let{cumulative:r,pointAt:i}=t',',p=(()=>{let{DomainError:e,ERR:t}=i','schmidtEngine2.optimize'],
      ['h',',h=(()=>{let{geomEdges:n',',g=(()=>{let{geomCentroid:n}=a','schmidtEngine2.clip'],
      ['g',',g=(()=>{let{geomCentroid:n}=a',',_=(()=>{let{validateGeom:e}=a','schmidtEngine2.tracks'],
      ['_',',_=(()=>{let{validateGeom:e}=a',',v=(()=>{let{buildScenario:e}=_','{buildScenario:(f,q={},o={})=>schmidtEngine2.scenario.buildScenario(f,q,o,{assertParams:p.assertParams,buildWarnings:l.buildWarnings,optimizeDistribution:schmidtEngine2.optimize.optimizeDistribution,engineVersion:`2.0.0`})}'],
    ];
    for(const [v,from,to,value] of WORKER_SWAPS){
      const a=lit.indexOf(from),b=lit.indexOf(to);
      if(a<0||b<0||lit.indexOf(from,a+1)>=0||lit.indexOf(to,b+1)>=0||b<=a)throw new Error(`Troca do motor no worker: marcador ausente, repetido ou fora de ordem (${v})`);
      lit=lit.slice(0,a)+`,${v}=${value}`+lit.slice(b);
    }
    if(lit.split('ENGINE_VERSION:`0.5.1-sim`').length!==2)throw new Error('Worker: versão do motor não encontrada');
    lit=lit.replace('ENGINE_VERSION:`0.5.1-sim`','ENGINE_VERSION:`2.0.0`');
    const bundle=(await bundleEngine()).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n');
    if(!lit.startsWith('(function(){let e='))throw new Error('Worker: forma inesperada');
    lit='(function(){'+bundle+'let e='+lit.slice('(function(){let e='.length);
    candidate=candidate.slice(0,at+3)+lit+candidate.slice(end);changes.push('motor-2-no-worker');
  }
  replace('__m_ui_lotes:ne,__m_main:J};</script>', '__m_ui_lotes:ne,__m_main:J};\ninstallSchmidtRefinements(document);\ninstallSchmidtLotMap({document,events:A});\ninstallSchmidtSatelliteMap({document});\ninstallSchmidtOperationalPlan({document,schmidt:SCHMIDT,events:A,measurements:N});\ninstallSchmidtAdjustCompare({document,schmidt:SCHMIDT,events:A,measurements:N});\ninstallSchmidtMonitorDirection({document});\n})();</script>', 'escopo-assíncrono-e-plano-aprovado');
  // 2.0 (E4): sem marcação de coleta, o guia orienta ao próximo ponto à frente (src/gps/guide-next.mjs).
  replace('l=e.points.find(e=>!n.has(e.id)),u=Number.isFinite(t.accuracyM)','l=schmidtGuideNextPoint(e,t,n,a,t.guideState),u=Number.isFinite(t.accuracyM)','guia-sem-marcacao-orienta-ao-ponto-a-frente');
  replace('let l=s.points.find(e=>!o.has(e.id)),u=s.points.length,','let l=c&&!c.done?c.next:s.points.find(e=>!o.has(e.id)),u=s.points.length,','monitor-mostra-o-ponto-que-o-guia-escolheu');
  // 2.0.1: seleção temporária por sessão/rota; nunca escreve coleta ou progresso.
  replace('c=i(s,{...b.pos,ageMs:Date.now()-b.posAt},o,a)',
    'c=i(s,{...b.pos,ageMs:Date.now()-b.posAt,guideState:schmidtGuideSession(b,r.farm+`|`+r.code+`|`+e.signature+`|`+b.trackId+`|`+s.parts.map(part=>part.entry.join(`,`)).join(`;`)+`|`+b.schmidtGPSGeneration)},o,a)', 'guia-com-histerese-por-sessao');
  replace('else if(c&&c.arrived)f.classList.add(`is-arrived`)',
    'else if(c&&c.stale)p=`<p class="mg-label">Ponto ${l.seq} de ${s.nPoints}</p><p class="mg-big">Aguardando posição atual</p><p class="mg-warn">GPS sem atualização há ${h((Date.now()-b.posAt)/1e3)} s. Aguarde o sinal para seguir a orientação.</p>`+W(s,l);else if(c&&c.arrived)f.classList.add(`is-arrived`)', 'guia-antigo-sem-seta-ou-distancia-atual');
  replace(':b.pos?`GPS ${b.pos.accuracyM', ':b.pos&&Date.now()-b.posAt>15e3?`GPS sem atualização`:b.pos?`GPS ${b.pos.accuracyM', 'qualidade-GPS-distingue-idade');
  replace('nextId:l?.id??null,pos:b.pos,heading:b.compass?b.heading:null,alvo:c&&!c.arrived?c.alvo:null',
    'nextId:l?.id??null,pos:c?.stale?null:b.pos,heading:c?.stale?null:b.compass?b.heading:null,alvo:c&&!c.stale&&!c.arrived?c.alvo:null', 'mapa-nao-orienta-com-posicao-antiga');
  replace('function z(e){if(!b.pos)return null;', 'function z(e){if(!b.pos||Date.now()-b.posAt>15e3)return null;', 'tiro-proximo-exige-posicao-atual');
  replace('<p>Faça a avaliação e toque em <b>Ponto coletado</b>.</p>', '<p>Confira abaixo a distância até o próximo ponto ou a borda.</p>', 'chegada-com-foco-no-direcionamento');
  replace('c&&!c.arrived&&(b.arrivedId=null)', 'c&&b.arrivedId!==c.next?.id&&(b.arrivedId=null)', 'chegada-sem-repetir-alerta-no-mesmo-alvo');
  replace('b.mapUi={trackId:null,pos:b.pos}', 'b.mapUi={trackId:null,pos:Date.now()-b.posAt>15e3?null:b.pos}', 'selecao-de-tiro-sem-marcador-antigo');
  replace("connect-src 'self' blob: data:;", "connect-src 'self' blob: data: https://services.arcgisonline.com;", 'satellite-single-origin-opt-in');
  replace('t.innerHTML=L.join(``),A.emit(`mapa:desenhado`,{monitor:!!H})',
    't.innerHTML=L.join(``),publishSchmidtSatelliteFrame({svg:t,layer:t.querySelector(`.m-rot`),scope:e.key||e.farm+`|`+e.code,width:d.W,height:d.H,scale:d.s,angle:d.rot,origin:[d.W/2-(d.cx+e.centroidUTM[0])*d.s,d.H/2+(d.cy+e.centroidUTM[1])*d.s]}),A.emit(`mapa:desenhado`,{monitor:!!H})', 'individual-map-georeferenced-frame');
  replace('catch(e){'+originalFailureBody+'}}return{loadState:t,saveState:n}',
    'catch(e){return schmidtReportStoreFailure(e)}}return{loadState:t,saveState:n}', 'reutilização-exata-do-erro-existente');
  replace('J=(()=>{let{buildScenario:e,','J=(await initialiseSchmidtCorrections(q,z),(()=>{let{buildScenario:e,','recuperação-antes-da-inicialização');
  replace('return Tt(),{}})();(()=>','return Tt(),{}})());(()=>','fechamento-inicialização');
  replace('saved:U(),ui:','saved:schmidtBackupService.loadAppState(),ui:','leitura-sem-destruir-JSON-corrompido');
  replace('function ae(e){let{field:n}=t.ctx(),','function ae(e){if(b.watchId===null)return;let fix=validateSchmidtGPSFix(e,{now:Date.now(),lastTimestamp:b.posAt,maxAgeMs:15e3});if(!fix)return;let{field:n}=t.ctx(),','validação-GPS');
  replace('b.posAt=Date.now(),b.leituras=','b.posAt=fix.timestamp,b.leituras=','horário-real-da-aquisição');
  replace('b.watchId=navigator.geolocation.watchPosition(ae,oe,v)', 'b.watchId=startSchmidtGPSWatch(navigator.geolocation,b,ae,oe,v)', 'isolar-callbacks-de-cada-sessão-GPS');
  replace('b.watchId!==null&&navigator.geolocation.clearWatch(b.watchId)', 'b.watchId!==null&&stopSchmidtGPSWatch(navigator.geolocation,b,b.watchId)', 'invalidar-sessão-GPS-ao-desligar');
  replace('timestamp:e.timestamp??Date.now()','timestamp:e.timestamp','GPS-nativo-sem-horário-fabricado');
  // Somente o retorno normal de regeneração: preserva avisos pendentes/erros
  // e a mesma closure de Desfazer. IDs, parâmetros e motor ficam intactos.
  replace('$(`${r}${t.join(` · `)}`,!1,e?{label:`Desfazer`,run:()=>Je(i,e)}:null);return',
    'e&&$(``,!1,{label:`Desfazer`,run:()=>Je(i,e)});return', 'retorno-do-plano-sem-histórico-com-desfazer');
  replace('$(`${r}${i.pontos} ponto${i.pontos===1?``:`s`} em ${i.tiros} tiro${i.tiros===1?``:`s`} · 95% do lote a menos de ${J(i.p95)} m`,!1,null,!r)',
    '$(`${i.pontos} ponto${i.pontos===1?``:`s`} em ${i.tiros} tiro${i.tiros===1?``:`s`} · 95% do lote a menos de ${J(i.p95)} m`,!1,null,!0)', 'resumo-normal-sem-aviso-repetido');
  const exportStart=candidate.indexOf('async function f(){let e={};for(let t of n)e[t]=o(t);');
  const exportEnd=candidate.indexOf('function p(e,t){let n=URL.createObjectURL',exportStart);
  if(exportStart<0||exportEnd<0) throw new Error('Exportação original não encontrada');
  replace(candidate.slice(exportStart,exportEnd),
    'async function f(){return buildSchmidtBackup({service:schmidtBackupService,hash:a,encodeBlob:s,countState:u,version:l.APP_VERSION,engine:l.ENGINE_VERSION,sanitizeParams:g.sanitizeParams})}', 'backup-estrito-completo-e-limitado');
  const restoreStart=candidate.indexOf('async function _(e){SCHMIDT.restaurando=!0;for(let t of n)');
  const restoreEnd=candidate.indexOf('let v=e(`param-stage-arquivos`)',restoreStart);
  if(restoreStart<0||restoreEnd<0) throw new Error('Restauração original não encontrada');
  replace(candidate.slice(restoreStart,restoreEnd),
    'async function _(e){SCHMIDT.restaurando=!0;await schmidtBackupService.restore({data:e.dados,images:e.imagens.map(t=>({key:t.chave,rec:{blob:c(t.base64,t.tipo),name:t.nome,world:t.world,width:t.largura,height:t.altura,crs:t.crs}})),history:e.historico||[],legacy:!!e.legado})}', 'restauração-com-journal-e-rollback');
  replace('SCHMIDT.restaurando=!1,n.textContent=`Falha ao restaurar: `','SCHMIDT.restaurando=schmidtBackupService.isWriteBlocked(),n.textContent=`Falha ao restaurar: `','preservar-bloqueio-se-recuperação-pendente');
  replace('else{if(n?.schema!==t)throw Error(`formato de cópia desconhecido`);','else{delete n.legado;if(n?.schema!==t)throw Error(`formato de cópia desconhecido`);','legado-somente-pelo-decoder');
  replace('Array.isArray(n.imagens)||(n.imagens=[]);','if(!Array.isArray(n.imagens))throw Error(`imagem de fundo em formato inválido`);','importação-sem-normalizar-imagens-inválidas');
  replace('return n.itensReais={...u(r),imagens:n.imagens.length,','validateSchmidtRestore(n);return n.itensReais={...u(r),imagens:n.imagens.length,','validação-completa-antes-da-prévia');
  if(includeBlocks){const blocks=await applySchmidtBlocks(candidate);candidate=blocks.html;changes.push(...blocks.changes);}
  // Recalcula só os hashes CSP dos scripts; nenhuma política é afrouxada.
  const scripts=[...candidate.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('application/json'));
  const hashes=scripts.map(m=>`'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`).join(' ');
  candidate=candidate.replace(/script-src [^;]+;/,`script-src ${hashes};`);
  // 2.3: cabeçalho público declarado (título sem versão antiga e prévia de compartilhamento para o WhatsApp).
  // Única mudança permitida fora do módulo; a conferência de apresentação abaixo a aplica também ao original.
  const HEAD_FROM='<title>SCHMIDT · Planejamento de amostragem v1.31.0</title>';
  const HEAD_TO='<title>SCHMIDT Campo · Planejamento de amostragem</title>'
    +'<meta property="og:type" content="website"><meta property="og:title" content="SCHMIDT Campo">'
    +'<meta property="og:description" content="Planejamento de tiros e pontos de amostragem por lote, no celular e offline.">'
    +'<meta property="og:image" content="https://jhsilvamenezes-netizen.github.io/schmidt-campo/icone-512.png">'
    +'<meta property="og:url" content="https://jhsilvamenezes-netizen.github.io/schmidt-campo/">';
  replace(HEAD_FROM,HEAD_TO,'cabecalho-publico-titulo-e-previa');
  const presentation = value => value.replace(HEAD_FROM,HEAD_TO).replace("connect-src 'self' blob: data: https://services.arcgisonline.com;", "connect-src 'self' blob: data:;").replace(/<script type="module" crossorigin>[\s\S]*?<\/script>/,'<script type="module" crossorigin></script>').replace(/script-src [^;]+;/,'script-src HASHES;');
  if(presentation(candidate)!==presentation(original))throw new Error('Apresentação/dados fora do módulo foram alterados');
  if(!candidate.includes(`function schmidtReportLegacyStoreFailure(e){${originalFailureBody}}`))throw new Error('Tratamento visual original não preservado');
  const workerTemplate=await readFile(root+'src/platform/service-worker.js','utf8');
  for(const token of ['__SCHMIDT_CACHE__','__SCHMIDT_INDEX_SHA256__'])if(workerTemplate.split(token).length!==2)throw new Error('Token de worker não único: '+token);
  const worker=workerTemplate.replace('__SCHMIDT_CACHE__',`schmidt-1.31-${sha(candidate+workerTemplate).slice(0,10)}`).replace('__SCHMIDT_INDEX_SHA256__',sha(candidate));
  return {html:candidate,worker,changes,staticPresentationPreserved:true,approvedVisualScope:includeBlocks?'param-stage-inicio-and-active-block-indicator':'param-stage-inicio',approvedTextScope:includeBlocks?'plan-and-owner-requested-P6-note-suspension':'normal-plan-regeneration-notice',originalFailureHandlerReused:true,
    sourceHashes:Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,sha(await readFile(root+f))])))};
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const result=await buildCandidate();
  if(process.argv.includes('--inspect')) {
    console.log(JSON.stringify({htmlSha256:sha(result.html),changes:result.changes,staticPresentationPreserved:result.staticPresentationPreserved,approvedVisualScope:result.approvedVisualScope,approvedTextScope:result.approvedTextScope,originalFailureHandlerReused:result.originalFailureHandlerReused}));
  } else if(process.argv.includes('--check')) {
    if(await readFile(root+'index.html','utf8')!==result.html || await readFile(root+'sw.js','utf8')!==result.worker) throw new Error('Artefatos diferentes das fontes de correção');
    console.log('Build determinístico conferido.');
  } else {
    await writeFile(root+'index.html',result.html);
    await writeFile(root+'sw.js',result.worker);
    console.log(`Candidata gerada com ${result.changes.length} integrações verificadas.`);
  }
}
