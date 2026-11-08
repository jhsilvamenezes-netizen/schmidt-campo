import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildCandidate } from '../scripts/build-preserved.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(root + path);
const baseline = JSON.parse(read('audit/baseline.json'));

for (const [path, expected] of Object.entries(baseline.files)) {
  if (['index.html','sw.js'].includes(path)) continue;
  test(`baseline 1.31.0 intacto: ${path}`, () => {
    const bytes = read(path);
    assert.equal(bytes.length, expected.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
  });
}

test('HTML e worker correspondem ao build determinístico das correções', async () => {
  const built = await buildCandidate();
  assert.equal(read('index.html').toString(),built.html);
  assert.equal(read('sw.js').toString(),built.worker);
});
test('CSS, HTML das telas, dados e scripts auxiliares preservam a referência original', () => {
  const original = execFileSync('git',['show',`${baseline.commit}:index.html`],{cwd:root,maxBuffer:4*1024*1024}).toString();
  const presentation = text => text.replace(/<script type="module" crossorigin>[\s\S]*?<\/script>/,'MODULE').replace(/script-src [^;]+;/,'HASHES');
  assert.equal(presentation(read('index.html').toString()),presentation(original));
  const originalWorker = execFileSync('git',['show',`${baseline.commit}:sw.js`],{cwd:root}).toString();
  const policy = text => text.replace(/schmidt-1\.31-[a-f0-9]+/,'CACHE');
  assert.equal(policy(read('sw.js').toString()),policy(originalWorker));
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
