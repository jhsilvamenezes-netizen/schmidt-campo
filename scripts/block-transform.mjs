// Transformação incremental sobre o build preservado. Sem gravação/publicação.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export const blockSourceFiles=['src/application/block-planning.mjs','src/ui/block-planning.mjs'];
export async function applySchmidtBlocks(input) {
const release=JSON.parse(await readFile(root+'audit/block-candidate.json','utf8'));
let html = input;
const changes = [];
function replace(before, after, label) {
  if (html.split(before).length !== 2) throw Error('Integração de bloco não única: ' + label);
  html = html.replace(before, () => after); changes.push(label);
}
const sources = blockSourceFiles;
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
replace('return Tt(),{}})());', 'SCHMIDT.navigateBlockField=bt;SCHMIDT.flushBlockParameters=Ve;return Tt(),{}})());', 'navegar-e-salvar-parametros-pendentes');
replace('function Fe(){let e=X.field,',
  'function Fe(){if(schmidtBlockController?.active)return schmidtBlockController.parametersFor(X.field);let e=X.field,', 'proteger-parametros-de-todas-as-etapas');
replace('function Te(e,t){let n=X.field,',
  'function Te(e,t){if(schmidtBlockController?.active){SCHMIDT.aviso(`Volte ao individual para alterar o desenho.`,!0);return}let n=X.field,', 'proteger-aplicacao-de-alternativas');
replace('SCHMIDT.restaurarVersao=(e,t)=>{if(!X.field',
  'SCHMIDT.restaurarVersao=(e,t)=>{if(schmidtBlockController?.active)return!1;if(!X.field', 'proteger-restauracao-de-versao-individual');
replace('W(X.saved)}function lt(){',
  'W(X.saved);if(schmidtBlockController?.active)A.emit(`bloco:pontos-mudaram`,{})}function lt(){', 'atualizar-visao-conjunta-apos-ajuste-manual');
replace('n.bearingDeg=Math.abs(a-e.bearing%180)<.25?null:a,',
  'n.bearingDeg=schmidtBlockController?.active?schmidtBlockController.commonBearing:Math.abs(a-e.bearing%180)<.25?null:a,', 'conservar-rumo-comum-na-regeneracao');
if (html.split('APP_VERSION:`1.31.0`,').length!==3) throw Error('Versões de página/worker mudaram');
html=html.replaceAll('APP_VERSION:`1.31.0`,','APP_VERSION:`'+release.version+'`,');
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
return {html,changes};
}
