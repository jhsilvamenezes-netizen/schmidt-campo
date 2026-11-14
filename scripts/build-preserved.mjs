// Reconstrução parcial e declarada: aplica fontes novas a pontos de integração
// verificados do artefato imutável. Não assume que o minificado é fonte original.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { posix } from 'node:path';
import { applySchmidtBlocks, blockSourceFiles } from './block-transform.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = JSON.parse(await readFile(root+'audit/baseline.json'));
const preservedSourceFiles = ['src/persistence/backup-service.mjs','src/persistence/backup-format.mjs',
  'src/gps/fix-policy.mjs','src/platform/browser-backup-adapters.mjs','src/platform/browser-session-lock.mjs','src/platform/browser-write-barrier.mjs','src/platform/legacy-integration.mjs',
  'src/application/operational-summary.mjs','src/ui/plan-presentation.mjs','src/ui/operational-plan.mjs','src/ui/refinements.mjs','src/ui/lot-map.mjs','src/platform/bounded-response.mjs','src/ui/satellite-map.mjs',
  'src/application/adjust-alternatives.mjs','src/ui/adjust-compare.mjs'];
export const sourceFiles=[...preservedSourceFiles,...blockSourceFiles];
const sha = text => createHash('sha256').update(text).digest('hex');
export async function buildCandidate({includeBlocks}={}) {
  if(includeBlocks===undefined)includeBlocks=!!JSON.parse(await readFile(root+'VERSAO.json','utf8')).runtimeBlocks;
  const original = execFileSync('git',['show',`${baseline.commit}:index.html`],{cwd:root,maxBuffer:4*1024*1024}).toString();
  if(sha(original)!==baseline.files['index.html'].sha256) throw new Error('Baseline HTML inesperado');
  const blocks=[];
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
  replace('__m_ui_lotes:ne,__m_main:J};</script>', '__m_ui_lotes:ne,__m_main:J};\ninstallSchmidtRefinements(document);\ninstallSchmidtLotMap({document,events:A});\ninstallSchmidtSatelliteMap({document});\ninstallSchmidtOperationalPlan({document,schmidt:SCHMIDT,events:A,measurements:N});\ninstallSchmidtAdjustCompare({document,schmidt:SCHMIDT,events:A,measurements:N});\n})();</script>', 'escopo-assíncrono-e-plano-aprovado');
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
  const presentation = value => value.replace("connect-src 'self' blob: data: https://services.arcgisonline.com;", "connect-src 'self' blob: data:;").replace(/<script type="module" crossorigin>[\s\S]*?<\/script>/,'<script type="module" crossorigin></script>').replace(/script-src [^;]+;/,'script-src HASHES;');
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
