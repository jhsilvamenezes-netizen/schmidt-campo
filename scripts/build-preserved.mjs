// Reconstrução parcial e declarada: aplica fontes novas a pontos de integração
// verificados do artefato imutável. Não assume que o minificado é fonte original.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = JSON.parse(await readFile(root+'audit/baseline.json'));
export const sourceFiles = ['src/persistence/backup-service.mjs','src/persistence/backup-format.mjs',
  'src/gps/fix-policy.mjs','src/platform/browser-backup-adapters.mjs','src/platform/legacy-integration.mjs'];
const sha = text => createHash('sha256').update(text).digest('hex');
export async function buildCandidate() {
  const original = execFileSync('git',['show',`${baseline.commit}:index.html`],{cwd:root,maxBuffer:4*1024*1024}).toString();
  if(sha(original)!==baseline.files['index.html'].sha256) throw new Error('Baseline HTML inesperado');
  const blocks=[];
  for(const file of sourceFiles) {
    const source=await readFile(root+file,'utf8');
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
  blocks.push(`function schmidtReportLegacyStoreFailure(e){${originalFailureBody}}`);
  function replace(before,after,label) {
    if(candidate.split(before).length!==2) throw new Error(`Integração não única: ${label}`);
    candidate=candidate.replace(before,()=>after); changes.push(label);
  }
  // async já é usado pelo baseline. Evita exigir suporte novo a top-level await
  // dos WebViews Android: o await de recuperação fica dentro desta função.
  replace('<script type="module" crossorigin>','<script type="module" crossorigin>\n(async()=>{\n'+blocks.join('\n')+'\n','fontes-legíveis');
  replace('__m_ui_lotes:ne,__m_main:J};</script>', '__m_ui_lotes:ne,__m_main:J};\n})();</script>', 'escopo-assíncrono-compatível-com-o-baseline');
  replace('catch(e){'+originalFailureBody+'}}return{loadState:t,saveState:n}',
    'catch(e){return schmidtReportLegacyStoreFailure(e)}}return{loadState:t,saveState:n}', 'reutilização-exata-do-erro-existente');
  replace('J=(()=>{let{buildScenario:e,','J=(await initialiseSchmidtCorrections(q),(()=>{let{buildScenario:e,','recuperação-antes-da-inicialização');
  replace('return Tt(),{}})();(()=>','return Tt(),{}})());(()=>','fechamento-inicialização');
  replace('saved:U(),ui:','saved:schmidtBackupService.loadAppState(),ui:','leitura-sem-destruir-JSON-corrompido');
  replace('function ae(e){let{field:n}=t.ctx(),','function ae(e){if(b.watchId===null)return;let fix=validateSchmidtGPSFix(e,{now:Date.now(),lastTimestamp:b.posAt,maxAgeMs:15e3});if(!fix)return;let{field:n}=t.ctx(),','validação-GPS');
  replace('b.posAt=Date.now(),b.leituras=','b.posAt=fix.timestamp,b.leituras=','horário-real-da-aquisição');
  replace('b.watchId=navigator.geolocation.watchPosition(ae,oe,v)', 'b.watchId=startSchmidtGPSWatch(navigator.geolocation,b,ae,oe,v)', 'isolar-callbacks-de-cada-sessão-GPS');
  replace('b.watchId!==null&&navigator.geolocation.clearWatch(b.watchId)', 'b.watchId!==null&&stopSchmidtGPSWatch(navigator.geolocation,b,b.watchId)', 'invalidar-sessão-GPS-ao-desligar');
  replace('timestamp:e.timestamp??Date.now()','timestamp:e.timestamp','GPS-nativo-sem-horário-fabricado');
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
  // Recalcula só os hashes CSP dos scripts; nenhuma política é afrouxada.
  const scripts=[...candidate.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('application/json'));
  const hashes=scripts.map(m=>`'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`).join(' ');
  candidate=candidate.replace(/script-src [^;]+;/,`script-src ${hashes};`);
  const presentation = value => value.replace(/<script type="module" crossorigin>[\s\S]*?<\/script>/,'<script type="module" crossorigin></script>').replace(/script-src [^;]+;/,'script-src HASHES;');
  if(presentation(candidate)!==presentation(original))throw new Error('Apresentação/dados fora do módulo foram alterados');
  if(!candidate.includes(`function schmidtReportLegacyStoreFailure(e){${originalFailureBody}}`))throw new Error('Tratamento visual original não preservado');
  const originalWorker=execFileSync('git',['show',`${baseline.commit}:sw.js`],{cwd:root}).toString();
  const worker=originalWorker.replace(/schmidt-1\.31-[a-f0-9]+/,`schmidt-1.31-${sha(candidate).slice(0,10)}`);
  return {html:candidate,worker,changes,presentationPreserved:true,originalFailureHandlerReused:true,
    sourceHashes:Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,sha(await readFile(root+f))])))};
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const result=await buildCandidate();
  if(process.argv.includes('--inspect')) {
    console.log(JSON.stringify({htmlSha256:sha(result.html),changes:result.changes,presentationPreserved:result.presentationPreserved,originalFailureHandlerReused:result.originalFailureHandlerReused}));
  } else if(process.argv.includes('--check')) {
    if(await readFile(root+'index.html','utf8')!==result.html || await readFile(root+'sw.js','utf8')!==result.worker) throw new Error('Artefatos diferentes das fontes de correção');
    console.log('Build determinístico conferido.');
  } else {
    await writeFile(root+'index.html',result.html);
    await writeFile(root+'sw.js',result.worker);
    console.log(`Candidata gerada com ${result.changes.length} integrações verificadas.`);
  }
}
