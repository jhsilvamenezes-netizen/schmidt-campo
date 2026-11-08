import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdtempSync,copyFileSync,mkdirSync,existsSync,readdirSync,statSync,rmSync,symlinkSync,readlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const temp=()=>mkdtempSync(join(tmpdir(),'schmidt-prepare-test-'));
const run=(script,code)=>spawnSync('bash',[script,code],{encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024});
for(const code of ['0','-1','01','2100000001','999999999999999999999','1;touch injected']) {
  test(`versionCode inválido é recusado antes de gerar: ${code}`,()=>{
    const r=run(root+'app/preparar.sh',code);
    assert.equal(r.status,2);assert.match(r.stderr,/versionCode inválido/);
  });
}
test('preparador conserva projeto já existente sem sobrescrita',()=>{
  const dir=temp();
  try {
    copyFileSync(root+'app/preparar.sh',join(dir,'preparar.sh'));
    mkdirSync(join(dir,'android'));writeFileSync(join(dir,'android','preservar.txt'),'DADO EXISTENTE');
    const r=run(join(dir,'preparar.sh'),'104');
    assert.equal(r.status,2);assert.match(r.stderr,/já existe/);
    assert.equal(readFileSync(join(dir,'android','preservar.txt'),'utf8'),'DADO EXISTENTE');
    assert.equal(existsSync(join(dir,'www')),false);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('preparador conserva symlink pendente e não gera novos assets',()=>{
  const dir=temp();
  try {
    copyFileSync(root+'app/preparar.sh',join(dir,'preparar.sh'));
    symlinkSync('destino-inexistente',join(dir,'www'));
    const r=run(join(dir,'preparar.sh'),'104');
    assert.equal(r.status,2);assert.equal(readlinkSync(join(dir,'www')),'destino-inexistente');
    assert.equal(existsSync(join(dir,'android')),false);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('projeto Android gerado mantém bytes e modos dos 63 arquivos de referência',()=>{
  const dir=temp(),app=join(dir,'app');mkdirSync(app);
  try {
    for(const f of ['package.json','package-lock.json','capacitor.config.json','preparar.sh','splash.png','cli-compat.cjs'])copyFileSync(root+'app/'+f,join(app,f));
    for(const f of ['index.html','icone-192.png'])copyFileSync(root+f,join(dir,f));
    const before=JSON.parse(readFileSync(root+'audit/android-baseline-v1_31.json'));
    const r=run(join(app,'preparar.sh'),String(before.versionCodeForTest));
    assert.equal(r.status,0,`${r.stdout}\n${r.stderr}`);
    const walk=(dir,prefix='')=>readdirSync(dir).flatMap(name=>{
      const path=join(dir,name),relative=prefix+name;
      return statSync(path).isDirectory()?walk(path,relative+'/'):[relative];
    });
    const actual=walk(join(app,'android')).sort();
    assert.deepEqual(actual,Object.keys(before.files).sort());
    const nativeHTML=readFileSync(root+'index.html','utf8').replace('<meta name="schmidt-web" content="1">','').replace('<link rel="manifest" href="manifest.webmanifest">','').replace(/script-src [^;]*;/,"script-src 'self' 'unsafe-inline';");
    for(const path of actual){
      const file=join(app,'android',path),expected=before.files[path];
      assert.equal(sha(readFileSync(file)),path==='app/src/main/assets/public/index.html'?sha(nativeHTML):expected.sha256,path);
      assert.equal('0o'+(statSync(file).mode&0o777).toString(8),expected.mode,path);
      assert.doesNotMatch(path,/\.(apk|aab|keystore|jks)$/);
    }
    const settings=readFileSync(join(app,'android','capacitor.settings.gradle'),'utf8');
    assert.doesNotMatch(settings,/schmidt-android\.|workspace|\/tmp\//);
    for(const [,suffix] of settings.matchAll(/new File\('\.\.\/node_modules\/([^']+)'\)/g))assert.ok(existsSync(join(app,'node_modules',suffix)));
    const sync=spawnSync(process.execPath,['--require',join(app,'cli-compat.cjs'),join(app,'node_modules/@capacitor/cli/bin/capacitor'),'sync','android'],{cwd:app,encoding:'utf8',timeout:120000});
    assert.equal(sync.status,0,`${sync.stdout}\n${sync.stderr}`);
    assert.deepEqual(walk(join(app,'android')).sort(),actual);
    for(const path of actual){
      const file=join(app,'android',path);
      assert.equal(sha(readFileSync(file)),path==='app/src/main/assets/public/index.html'?sha(nativeHTML):before.files[path].sha256,path+' após sync');
      assert.equal('0o'+(statSync(file).mode&0o777).toString(8),before.files[path].mode,path+' modo após sync');
    }
    // Segunda execução é deliberadamente recusada; o projeto é mantido.
    const second=run(join(app,'preparar.sh'),'105');assert.equal(second.status,2);
    assert.equal(sha(readFileSync(join(app,'android','capacitor.settings.gradle'))),before.files['capacitor.settings.gradle'].sha256);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
