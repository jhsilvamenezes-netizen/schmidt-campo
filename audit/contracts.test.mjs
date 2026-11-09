import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildCandidate, sourceFiles } from '../scripts/build-preserved.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(root + path);
const baseline = JSON.parse(read('audit/baseline.json'));

test('fontes legíveis têm imports ESM resolvidos e carregam sem DOM', async () => {
  for (const path of sourceFiles) {
    const module = await import(new URL('../'+path,import.meta.url));
    assert.ok(Object.values(module).some(value=>typeof value==='function'),path);
  }
});

for (const [path, expected] of Object.entries(baseline.files)) {
  if (['index.html','sw.js','app/package.json'].includes(path)) continue;
  test(`baseline 1.31.0 intacto: ${path}`, () => {
    const bytes = read(path);
    assert.equal(bytes.length, expected.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
  });
}

test('Capacitor e plugins preservados; alterações do pacote são só de ferramentas de build', () => {
  const original=JSON.parse(execFileSync('git',['show',`${baseline.commit}:app/package.json`],{cwd:root}));
  const candidate=JSON.parse(read('app/package.json'));
  assert.deepEqual(candidate.devDependencies,original.devDependencies);
  const metadata={...candidate};delete metadata.engines;delete metadata.overrides;
  assert.deepEqual(metadata,original);
  assert.deepEqual(candidate.overrides,{tar:'7.5.22',glob:'14.0.4',minimatch:'11.0.5'});
  assert.equal(candidate.engines.node,'>=22 <25');
});

test('HTML e worker correspondem ao build determinístico das correções', async () => {
  const built = await buildCandidate();
  assert.equal(read('index.html').toString(),built.html);
  assert.equal(read('sw.js').toString(),built.worker);
});
test('CSS/HTML estáticos, dados e scripts auxiliares preservam a referência; Plano muda por adaptador aprovado', () => {
  const original = execFileSync('git',['show',`${baseline.commit}:index.html`],{cwd:root,maxBuffer:4*1024*1024}).toString();
  const presentation = text => text.replace(/<script type="module" crossorigin>[\s\S]*?<\/script>/,'MODULE').replace(/script-src [^;]+;/,'HASHES');
  assert.equal(presentation(read('index.html').toString()),presentation(original));
  const worker=read('sw.js').toString();
  assert.ok(worker.includes(createHash('sha256').update(read('index.html')).digest('hex')));
  assert.doesNotMatch(worker,/self\.skipWaiting\s*\(/);
  assert.match(worker,/cache:'reload'/);
});
test('CSP contém hashes corretos de todos os scripts executáveis, sem liberar inline', () => {
  const html=read('index.html').toString();
  const policy=html.match(/script-src ([^;]+);/)[1];
  assert.doesNotMatch(policy,/unsafe-inline/);
  for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if(m[1].includes('application/json'))continue;
    assert.ok(policy.includes(`sha256-${createHash('sha256').update(m[2]).digest('base64')}`));
  }
});

test('contrato de dados históricos: 51 lotes, 18 Bananal e 33 RJ', () => {
  const html = read('index.html').toString();
  const match = html.match(/<script[^>]*id="fields-data"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(match);
  const { fields, provenance } = JSON.parse(match[1]);
  assert.equal(Object.keys(fields).length, 51);
  assert.equal(Object.keys(fields).filter(k => k.startsWith('Bananal|')).length, 18);
  assert.equal(Object.keys(fields).filter(k => !k.startsWith('Bananal|')).length, 33);
  assert.match(provenance.geometry_source, /2024\/25/);
  assert.match(provenance.geometry_source, /não homologado/);
  assert.match(provenance.crs, /EPSG:32723/);
  for (const code of ['BD3', 'BD4', 'RA9', 'RB8', 'RC8', 'P6']) {
    assert.ok(Object.keys(fields).some(k => k.endsWith(`|${code}`)), code);
  }
});

test('candidata não inclui chave nem instala assinatura histórica', () => {
  assert.equal(existsSync(root + 'app/chave/schmidt-debug.keystore'), false);
  const prepare = read('app/preparar.sh').toString();
  assert.doesNotMatch(prepare, /cp[^\n]*(?:keystore|\.jks)/);
});

test('CI de auditoria não tem capacidade declarada de publicação ou secrets', () => {
  const workflow = read('.github/workflows/app-android.yml').toString();
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /contents: write|secrets\.|pull_request_target|gh release|assembleDebug|assembleRelease|upload-artifact|deploy-pages|git push/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run test:browser/);
});
