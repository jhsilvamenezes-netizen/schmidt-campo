// Oráculo do motor ANTIGO (0.5.1-sim) no Node, sem navegador: recorta do index.html publicado o trecho
// contínuo dos módulos __m_engine_* (funções puras, sem DOM) e o executa isolado. Serve para comparação
// diferencial com o motor reescrito em src/engine. Não altera o aplicativo.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// O oráculo é o último index.html com o motor 0.5.1 inteiro. Desde a 2.2.0 o index.html atual usa o motor 2;
// então, sem caminho explícito, o HTML vem do commit ENGINE_ORACLE_REF (padrão: cd25d4b, 2.1.0 publicada).
const root = fileURLToPath(new URL('../', import.meta.url));
async function oracleHtml(htmlPath) {
  if (htmlPath) return readFile(htmlPath, 'utf8');
  const current = await readFile(root + 'index.html', 'utf8');
  if (!current.includes('const schmidtEngine2=')) return current;
  return execFileSync('git', ['show', `${process.env.ENGINE_ORACLE_REF || 'cd25d4b'}:index.html`], { cwd: root, maxBuffer: 1 << 26 }).toString();
}

const NAMES = { e: 'tolerances', t: 'geometry', n: 'polyline', r: 'clip', i: 'tracks', a: 'sampling', o: 'allocation', s: 'metrics',
  c: 'optimize', l: 'params', d: 'dataQuality', f: 'vocab', u: 'numero', p: 'diagnostics', m: 'evaluate', h: 'errors', g: 'paramCatalog',
  _: 'scenario', v: 'recommend', y: 'editing', b: 'tradeoffs', x: 'route', S: 'team', C: 'projection', w: 'exporters', T: 'explain', E: 'presets', D: 'index' };

export async function loadLegacyEngine(htmlPath) {
  const html = await oracleHtml(htmlPath);
  const start = html.indexOf('var e={SEGMENT_T_EPS:');
  const end = html.indexOf(',O=(()=>{', start); // basemapGeo (usa navegador) fica de fora
  if (start < 0 || end < 0) throw Error('Trecho do motor antigo não encontrado no index.html');
  const code = 'let ' + html.slice(start + 4, end) + `;return {${Object.keys(NAMES).join(',')}};`;
  const mods = new Function(code)();
  return Object.fromEntries(Object.entries(NAMES).map(([k, name]) => [name, mods[k]]));
}

// Os 51 lotes como o aplicativo os carrega (bloco <script id="fields-data">), chave "Fazenda|Lote".
export async function loadFields(htmlPath) {
  const html = await oracleHtml(htmlPath);
  const m = /<script id="fields-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw Error('fields-data não encontrado');
  return JSON.parse(m[1]).fields;
}
