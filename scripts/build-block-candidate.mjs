// Candidata isolada. Não grava index.html/sw.js da raiz e não publica.
import { buildCandidate } from './build-preserved.mjs';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = root + '../entregas-schmidt/1.31.0-r2-blocos-candidata/';
const base = await buildCandidate();
let html = base.html;
const changes = [];
function replace(before, after, label) {
  if (html.split(before).length !== 2) throw Error('Integração de bloco não única: ' + label);
  html = html.replace(before, () => after); changes.push(label);
}
const sources = ['src/application/block-planning.mjs', 'src/ui/block-planning.mjs'];
let modules = '';
for (const source of sources) {
  modules += `\n// ${source}\n` + (await readFile(root + source, 'utf8')).replace(/^import[^\n]+\n/gm, '').replace(/^export /gm, '');
}
replace('(async()=>{\n', '(async()=>{\n' + modules + '\n', 'fontes-blocos');
replace('localStorage.setItem(e,JSON.stringify(t)),SCHMIDT.salvoEm', 'localStorage.setItem(e,JSON.stringify(serializeSchmidtBlockState(t))),SCHMIDT.salvoEm', 'persistencia-canonica-atomica');
replace('function validateSchmidtRestore(backup, sanitizeParams) {',
  "function validateSchmidtRestore(backup, sanitizeParams) {\n  validateSchmidtBlocks(backup.dados?.['monitoramento.v03'], sanitizeParams);", 'validar-blocos-no-backup');
replace('installSchmidtOperationalPlan({document,schmidt:SCHMIDT,events:A,measurements:N});',
  `installSchmidtOperationalPlan({document,schmidt:SCHMIDT,events:A,measurements:N});
installSchmidtBlockPlanning({document,schmidt:SCHMIDT,engine:D,metrics:s,store:K,events:A});`, 'instalar-planejamento-bloco');
// Histórico legado não recebe revisões do bloco sob a identidade individual.
// Parâmetros, ajustes e coletas do bloco são preservados no registro e backup.
replace('J=(await initialiseSchmidtCorrections(q,z),', 'J=(installSchmidtBlockHistoryIsolation(q),await initialiseSchmidtCorrections(q,z),', 'isolar-historico-individual');
replace('return Tt(),{}})());', 'SCHMIDT.navigateBlockField=bt;return Tt(),{}})());', 'navegar-sem-lote-intermediario');
replace('n.bearingDeg=Math.abs(a-e.bearing%180)<.25?null:a,',
  'n.bearingDeg=schmidtBlockController?.active?schmidtBlockController.commonBearing:Math.abs(a-e.bearing%180)<.25?null:a,', 'conservar-rumo-comum-na-regeneracao');
if (html.split('APP_VERSION:`1.31.0`,').length!==3) throw Error('Versões de página/worker mudaram');
html=html.replaceAll('APP_VERSION:`1.31.0`,','APP_VERSION:`1.31.0-r2-blocos-candidata`,');
// Suspensão da observação visível do P6 a pedido do proprietário. Valores e
// fontes brutas permanecem idênticos; não declara correção do rumo/A/B.
const p6Flag = 'Array.isArray(l.flags)?l.flags:[]';
if (html.split(p6Flag).length !== 2) throw Error('Apresentação de flags mudou');
html = html.replaceAll(p6Flag, 'l.code===`P6`&&l.farm===`Rio de Janeiro`?[]:Array.isArray(l.flags)?l.flags:[]');
replace('(e.flags?.length||0)', '((e.code===`P6`&&e.farm===`Rio de Janeiro`?[]:e.flags)?.length||0)', 'p6-sem-observacao-no-indicador');
const divergence = 'n>t.bearingDivergenceDeg?';
if (!html.includes(divergence)) throw Error('Diagnóstico de rumo mudou');
html = html.replaceAll(divergence, 'n>t.bearingDivergenceDeg&&!(e.code===`P6`&&e.farm===`Rio de Janeiro`)?');
// O worker replica o diagnóstico usando outro nome para os limiares.
if (html.split('t>r.bearingDivergenceDeg?').length !== 2) throw Error('Diagnóstico do worker mudou');
html = html.replaceAll('t>r.bearingDivergenceDeg?', 't>r.bearingDivergenceDeg&&!(e.code===`P6`&&e.farm===`Rio de Janeiro`)?');
const hashes = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(m => !m[1].includes('application/json'))
  .map(m => `'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`).join(' ');
html = html.replace(/script-src [^;]+;/, `script-src ${hashes};`);
await mkdir(out, { recursive: true });
await writeFile(out + 'index.html', html);
// Cache próprio da candidata, servida e testada em origem separada do Pages.
const workerTemplate = await readFile(root + 'src/platform/service-worker.js', 'utf8');
const candidateHash = createHash('sha256').update(html).digest('hex');
const worker = workerTemplate.replace('__SCHMIDT_CACHE__', 'schmidt-blocos-r2-' + candidateHash.slice(0, 12))
  .replace('__SCHMIDT_INDEX_SHA256__', candidateHash);
await writeFile(out + 'sw.js', worker);
for (const name of ['manifest.webmanifest','icone.svg','icone-180.png','icone-192.png','icone-512.png']) await copyFile(root + name, out + name);
await writeFile(out + 'CANDIDATA.json', JSON.stringify({ version: '1.31.0-r2-blocos-candidata', production: false,
  htmlSha256: createHash('sha256').update(html).digest('hex'), changes,
  originalDatasetsUnchanged: true, publishedSiteChanged: false, apkPublished: false }, null, 2) + '\n');
console.log(out);
