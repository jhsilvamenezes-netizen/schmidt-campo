// Registro local de retomada. Não executa testes, commit, push ou rede.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const statuses=new Set(['pronto_para_iniciar','em_andamento','bloqueado','pronto_para_revisao']);
const outputs=['docs/RETOMADA.json','docs/RETOMADA.md'];
export async function checkpoint(root,patch={}){
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:4*1024*1024}).trim();
 const top=git('rev-parse','--show-toplevel');if(resolve(top)!==resolve(root))throw Error('Execute na raiz do repositório');
 let previous={};try{previous=JSON.parse(await readFile(resolve(root,outputs[0]),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const allowed=['task','owner','status','nextAction'];
 for(const key of Object.keys(patch))if(!allowed.includes(key))throw Error('Campo desconhecido: '+key);
 const state={...previous,...patch};
 for(const k of ['task','owner','status','nextAction'])if(typeof state[k]!=='string'||!state[k].trim()||state[k].length>2000)throw Error('Campo inválido: '+k);
 if(!statuses.has(state.status))throw Error('Estado inválido');
 if(state.tests!==undefined&&(!Array.isArray(state.tests)||state.tests.some(t=>typeof t.command!=='string'||!['passou','falhou','nao_executado'].includes(t.result))))throw Error('Testes declarados inválidos');
 const tracked=git('diff','--name-only','HEAD','-z').split('\0').filter(Boolean).filter(p=>!outputs.includes(p));
 const untracked=git('ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean).filter(p=>!outputs.includes(p));
 state.snapshot={at:new Date().toISOString(),branch:git('branch','--show-current')||'HEAD (detached)',codeCommit:git('rev-parse','HEAD'),changedTrackedFiles:tracked,untrackedCount:untracked.length};
 const tests=(state.tests||[]).map(t=>`- ${t.result}: ${t.command}`).join('\n')||'- Nenhum resultado declarado.';
 const text=`# Retomada do trabalho\n\nGerado por scripts/checkpoint.mjs; registro não executa nem certifica testes.\n\n- Tarefa: ${state.task}\n- Responsável: ${state.owner}\n- Estado: ${state.status}\n- Branch: ${state.snapshot.branch}\n- Commit de código observado: ${state.snapshot.codeCommit}\n- Registro UTC: ${state.snapshot.at}\n\n## Próxima ação\n\n${state.nextAction}\n\n## Testes declarados pela sessão\n\n${tests}\n\n## Recuperação\n\nLeia RETOMADA.json para detalhes, bloqueios e decisões. O commit acima antecede o commit deste checkpoint. Arquivos alterados listados não foram publicados por este comando. Arquivos não rastreados: ${untracked.length}.\n\nSomente commit enviado ao GitHub fica disponível para outra sessão. Conferir branch/PR e diff, não apenas este registro. Não existe troca automática de IA.\n`;
 await mkdir(resolve(root,'docs'),{recursive:true});
 // JSON é o registro canônico; publicar os dois arquivos no mesmo commit.
 for(const [name,data] of [[outputs[0],JSON.stringify(state,null,2)+'\n'],[outputs[1],text]]){
  const temp=resolve(root,name+'.tmp');await writeFile(temp,data);await rename(temp,resolve(root,name));
 }
 return state;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const flags={task:'task',owner:'owner',status:'status',next:'nextAction'},patch={};
  for(let i=2;i<process.argv.length;i+=2){const key=flags[process.argv[i]?.replace(/^--/,'')];if(!key||!process.argv[i+1])throw Error('Use --task, --owner, --status e --next com valor');patch[key]=process.argv[i+1];}
  const result=await checkpoint(resolve(fileURLToPath(new URL('../',import.meta.url))),patch);
  console.log(JSON.stringify({task:result.task,branch:result.snapshot.branch,codeCommit:result.snapshot.codeCommit,published:false}));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
