// 3.0 (R4) · gera a página nova SÓ a partir de src/: motor 2 (src/engine) + tela (src/app3) + dados dos lotes.
// Sem HTML da 1.31, sem trocas de texto. Saída: build/3/index.html (fora do Git; não vai ao link até a R5).
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { bundleEngine, ENGINE_MODULES } from './bundle-engine.mjs';
import { ICONS } from '../src/app3/views.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const APP_MODULES = ['format', 'store', 'plan-file', 'planner', 'map', 'views', 'main'];
export const APP_VERSION = '3.0.0-dev';

/** Cada módulo da tela no seu escopo; importações do motor viram o namespace schmidtEngine2. */
async function bundleApp() {
  const parts = [];
  for (const name of APP_MODULES) {
    let src = await readFile(`${root}src/app3/${name}.mjs`, 'utf8');
    const binds = [];
    for (const line of src.match(/^import[^\n]*\n/gm) || []) {
      const m = /^import \{([^}]+)\} from '(\.\.\/engine|\.)\/([\w-]+)\.mjs';\s*$/.exec(line) || /^import \* as (\w+) from '(\.\.\/engine|\.)\/([\w-]+)\.mjs';\s*$/.exec(line);
      if (!m) throw Error(`Importação fora do contrato em ${name}: ${line.trim()}`);
      const from = m[2] === '.' ? `__app_${m[3].replace(/-/g, '_')}` : `schmidtEngine2.${m[3]}`;
      if (m[2] === '.' && APP_MODULES.indexOf(m[3]) >= APP_MODULES.indexOf(name)) throw Error(`Ordem: ${name} importa ${m[3]}`);
      if (m[2] !== '.' && !ENGINE_MODULES.includes(m[3])) throw Error(`Módulo do motor inexistente: ${m[3]}`);
      binds.push(line.includes('* as') ? `const ${m[1]} = ${from};` : `const { ${m[1].split(',').map(x => x.trim()).filter(Boolean).map(x => x.replace(/^(\w+) as (\w+)$/, '$1: $2')).join(', ')} } = ${from};`);
    }
    src = src.replace(/^import[^\n]*\n/gm, '');
    const exported = [...src.matchAll(/^export (?:async )?(?:function|const|class) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
    const reexp = [...src.matchAll(/^export \{([^}]+)\};?\s*$/gm)].flatMap(m => m[1].split(',').map(x => x.trim()));
    src = src.replace(/^export \{[^}]+\};?\s*$/gm, '').replace(/^export /gm, '');
    parts.push(`// src/app3/${name}.mjs\nconst __app_${name.replace(/-/g, '_')}=(()=>{\n${binds.join('\n')}\n${src}\nreturn Object.freeze({${[...exported, ...reexp].join(',')}});\n})();`);
  }
  return `(()=>{\n'use strict';\n${parts.join('\n')}\n__app_main.startApp({document,window,fields:JSON.parse(document.getElementById('fields-data').textContent).fields,appVersion:'${APP_VERSION}'});\n})();`;
}

const sha = t => `'sha256-${createHash('sha256').update(t).digest('base64')}'`;

export async function build3() {
  const current = await readFile(root + 'index.html', 'utf8');
  const fields = /<script id="fields-data" type="application\/json">([\s\S]*?)<\/script>/.exec(current)?.[1];
  if (!fields) throw Error('Dados dos lotes não encontrados');
  const [engine, app, css, shell] = [await bundleEngine(), await bundleApp(), await readFile(root + 'src/app3/styles.css', 'utf8'), await readFile(root + 'src/app3/shell.html', 'utf8')];
  for (const [n, t] of [['motor', engine], ['tela', app], ['dados', fields]]) if (/<\/script/i.test(t)) throw Error(`${n} contém </script>`);
  const nav = [['mapa', 'Mapa'], ['plano', 'Plano'], ['enviar', 'Enviar'], ['monitorar', 'Monitorar']]
    .map(([k, l]) => `<button data-tab="${k}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${l}</button>`).join('');
  const csp = `default-src 'self'; script-src ${sha(engine)} ${sha(app)}; style-src ${sha(css)}; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  const html = shell.replace('__CSP__', csp).replace('__CSS__', () => css).replace('__ICON_SOL__', ICONS.sol).replace('__ICON_MAIS__', ICONS.mais)
    .replace('__NAV__', nav).replace('__FIELDS__', () => fields).replace('__ENGINE__', () => engine).replace('__APP__', () => app);
  if (/__[A-Z_]+__/.test(html)) throw Error('Marcador do modelo sem valor');
  if (/\sstyle=/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) throw Error('Estilo inline no HTML (CSP)');
  await mkdir(root + 'build/3', { recursive: true });
  await writeFile(root + 'build/3/index.html', html);
  for (const f of ['icone.svg', 'manifest.webmanifest']) await copyFile(root + f, root + 'build/3/' + f);
  return { bytes: Buffer.byteLength(html), engine: engine.length, app: app.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log('3.0 gerada em build/3/index.html', await build3());
