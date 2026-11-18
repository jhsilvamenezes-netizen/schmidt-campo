// Empacota o motor 2 (src/engine) num único bloco fechado para o index.html:
//   const schmidtEngine2 = (() => { ...módulos... ; return { geometry: {...}, ... } })();
// Cada módulo vira um namespace com exatamente os nomes que exporta. Importações entre módulos do motor são
// resolvidas pela ordem (dependências primeiro); cada módulo tem escopo próprio.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const ENGINE_MODULES = ['tolerances', 'vocab', 'errors', 'numero', 'projection', 'geometry', 'predicates', 'delaunay', 'voronoi', 'polyline',
  'clip', 'tracks', 'sampling', 'allocation', 'metrics', 'optimize', 'params', 'plan', 'diagnostics', 'scenario', 'dataQuality', 'paramCatalog',
  'explain', 'guidance', 'team', 'tradeoffs', 'editing', 'presets', 'recommend', 'exporters'];

/** dir: 'engine' (motor congelado da 2.5) ou 'engine3' (motor próprio da 3.x, que evolui). */
export async function bundleEngine(dir = 'engine') {
  // Cada módulo roda no SEU escopo (função própria): nomes internos iguais em módulos diferentes não colidem.
  // Importações viram desestruturação do namespace do módulo de origem, que precisa vir antes na lista.
  const parts = [], namespaces = [];
  for (const name of ENGINE_MODULES) {
    let src = await readFile(`${root}src/${dir}/${name}.mjs`, 'utf8');
    const binds = [];
    for (const line of src.match(/^import[^\n]*\n/gm) || []) {
      const m = /^import \{([^}]+)\} from '\.\/([\w-]+)\.mjs';\s*$/.exec(line);
      if (!m || ENGINE_MODULES.indexOf(m[2]) < 0 || ENGINE_MODULES.indexOf(m[2]) >= ENGINE_MODULES.indexOf(name)) throw Error(`Importação fora de ordem ou externa em ${name}: ${line.trim()}`);
      const names = m[1].split(',').map(x => x.trim()).filter(Boolean).map(x => x.replace(/^(\w+) as (\w+)$/, '$1: $2'));
      binds.push(`const { ${names.join(', ')} } = __${m[2]};`);
    }
    src = src.replace(/^import[^\n]*\n/gm, '');
    const exported = [...src.matchAll(/^export (?:async )?(?:function|const|class) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
    if (/^export (?!(?:async )?(?:function|const|class) )/m.test(src)) throw Error(`Forma de export não suportada em ${name}`);
    parts.push(`// src/${dir}/${name}.mjs\nconst __${name}=(()=>{\n${binds.join('\n')}\n${src.replace(/^export /gm, '')}\nreturn Object.freeze({${exported.join(',')}});\n})();`);
    namespaces.push(`${name}:__${name}`);
  }
  return `const schmidtEngine2=(()=>{\n${parts.join('\n')}\nreturn Object.freeze({${namespaces.join(',')}});\n})();`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const code = await bundleEngine();
  console.log(`motor 2 empacotado: ${code.length} bytes, ${ENGINE_MODULES.length} módulos`);
}
