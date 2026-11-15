// Empacota o motor 2 (src/engine) num único bloco fechado para o index.html:
//   const schmidtEngine2 = (() => { ...módulos... ; return { geometry: {...}, ... } })();
// Cada módulo vira um namespace com exatamente os nomes que exporta. Importações entre módulos do motor são
// resolvidas pela ordem (dependências primeiro). Falha se dois módulos declararem o mesmo nome no topo.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const ENGINE_MODULES = ['tolerances', 'geometry', 'predicates', 'delaunay', 'voronoi', 'polyline', 'clip', 'tracks', 'sampling', 'allocation', 'metrics', 'optimize', 'params', 'plan', 'diagnostics', 'scenario'];

export async function bundleEngine() {
  const declared = new Map(), parts = [], namespaces = [];
  for (const name of ENGINE_MODULES) {
    let src = await readFile(`${root}src/engine/${name}.mjs`, 'utf8');
    for (const line of src.match(/^import[^\n]*\n/gm) || []) {
      const dep = /from '\.\/([\w-]+)\.mjs';/.exec(line)?.[1];
      if (!dep || ENGINE_MODULES.indexOf(dep) < 0 || ENGINE_MODULES.indexOf(dep) >= ENGINE_MODULES.indexOf(name)) throw Error(`Importação fora de ordem ou externa em ${name}: ${line.trim()}`);
    }
    src = src.replace(/^import[^\n]*\n/gm, '');
    const exported = [...src.matchAll(/^export (?:async )?(?:function|const|class) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
    const topLevel = [...src.matchAll(/^(?:export )?(?:async )?(?:function|const|let|class) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
    for (const id of topLevel) {
      if (declared.has(id)) throw Error(`Nome repetido no motor: ${id} (${declared.get(id)} e ${name})`);
      declared.set(id, name);
    }
    parts.push(`// src/engine/${name}.mjs\n` + src.replace(/^export /gm, ''));
    namespaces.push(`${name}:Object.freeze({${exported.join(',')}})`);
  }
  return `const schmidtEngine2=(()=>{\n${parts.join('\n')}\nreturn Object.freeze({${namespaces.join(',')}});\n})();`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const code = await bundleEngine();
  console.log(`motor 2 empacotado: ${code.length} bytes, ${ENGINE_MODULES.length} módulos`);
}
