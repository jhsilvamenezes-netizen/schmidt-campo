// Oráculo do motor ANTIGO (0.5.1-sim) no Node, sem navegador: recorta do index.html publicado o trecho
// contínuo dos módulos __m_engine_* (funções puras, sem DOM) e o executa isolado. Serve para comparação
// diferencial com o motor reescrito em src/engine. Não altera o aplicativo.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const NAMES = { e: 'tolerances', t: 'geometry', n: 'polyline', r: 'clip', i: 'tracks', a: 'sampling', o: 'allocation', s: 'metrics',
  c: 'optimize', l: 'params', d: 'dataQuality', f: 'vocab', u: 'numero', p: 'diagnostics', m: 'evaluate', h: 'errors', g: 'paramCatalog',
  _: 'scenario', v: 'recommend', y: 'editing', b: 'tradeoffs', x: 'route', S: 'team', C: 'projection', w: 'exporters', T: 'explain', E: 'presets', D: 'index' };

export async function loadLegacyEngine(htmlPath = fileURLToPath(new URL('../index.html', import.meta.url))) {
  const html = await readFile(htmlPath, 'utf8');
  const start = html.indexOf('var e={SEGMENT_T_EPS:');
  const end = html.indexOf(',O=(()=>{', start); // basemapGeo (usa navegador) fica de fora
  if (start < 0 || end < 0) throw Error('Trecho do motor antigo não encontrado no index.html');
  const code = 'let ' + html.slice(start + 4, end) + `;return {${Object.keys(NAMES).join(',')}};`;
  const mods = new Function(code)();
  return Object.fromEntries(Object.entries(NAMES).map(([k, name]) => [name, mods[k]]));
}

// Os 51 lotes como o aplicativo os carrega (bloco <script id="fields-data">), chave "Fazenda|Lote".
export async function loadFields(htmlPath = fileURLToPath(new URL('../index.html', import.meta.url))) {
  const html = await readFile(htmlPath, 'utf8');
  const m = /<script id="fields-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw Error('fields-data não encontrado');
  return JSON.parse(m[1]).fields;
}
