import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {checkpoint} from '../scripts/checkpoint.mjs';
test('checkpoint conserva trabalho, identifica commit e não altera índice nem publica',async()=>{
 const root=await mkdtemp(join(tmpdir(),'schmidt-checkpoint-'));
 const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
 try{
  git('init','-q');await writeFile(join(root,'source.txt'),'original');git('add','source.txt');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','base');
  const head=git('rev-parse','HEAD');await writeFile(join(root,'source.txt'),'trabalho em andamento');await writeFile(join(root,'private-note.txt'),'não publicar');
  const index=git('diff','--cached');
  const state=await checkpoint(root,{task:'E1',owner:'Claude',status:'em_andamento',nextAction:'Comparar cenário'});
  assert.equal(state.snapshot.codeCommit,head);assert.deepEqual(state.snapshot.changedTrackedFiles,['source.txt']);assert.equal(state.snapshot.untrackedCount,1);
  assert.equal(git('rev-parse','HEAD'),head);assert.equal(git('diff','--cached'),index);assert.equal(await readFile(join(root,'source.txt'),'utf8'),'trabalho em andamento');
  assert(!JSON.stringify(state).includes('private-note'));assert(!JSON.stringify(state).includes('não publicar'));
  const json=await readFile(join(root,'docs/RETOMADA.json'),'utf8');await assert.rejects(checkpoint(root,{status:'inventado'}),/Estado inválido/);assert.equal(await readFile(join(root,'docs/RETOMADA.json'),'utf8'),json);
  const next=await checkpoint(root,{owner:'Codex',nextAction:'Revisar teste'});assert.equal(next.task,'E1');assert.equal(next.owner,'Codex');
 }finally{await rm(root,{recursive:true,force:true});}
});
