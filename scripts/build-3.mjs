// 3.0 (R4) · gera a página nova SÓ a partir de src/: motor 2 (src/engine) + tela (src/app3) + dados dos lotes.
// Sem HTML da 1.31, sem trocas de texto. Saída: build/3/index.html (fora do Git; não vai ao link até a R5).
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { bundleEngine, ENGINE_MODULES } from './bundle-engine.mjs';
import { ICONS } from '../src/app3/views.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
/** Módulos da tela, caminho relativo a src/ (ordem: dependências primeiro). Motor: src/engine via schmidtEngine2. */
export const APP_MODULES = ['gps/fix-policy', 'gps/guide-next', 'app3/format', 'app3/store', 'app3/plan-file', 'app3/planner', 'app3/map', 'app3/views',
  'app3/advanced', 'app3/gestures', 'app3/monitor', 'persistence/backup-service', 'persistence/backup-format', 'platform/browser-backup-adapters', 'platform/browser-session-lock',
  'engine/boundary', 'application/block-planning', 'app3/blocks', 'app3/versions', 'app3/backup', 'app3/main'];
export const APP_VERSION = '3.0.0';
const ident = id => `__m_${id.replace(/[^\w]/g, '_')}`;

/** Cada módulo no seu escopo; importações do motor viram o namespace schmidtEngine2. */
async function bundleApp() {
  const parts = [];
  for (const id of APP_MODULES) {
    let src = await readFile(`${root}src/${id}.mjs`, 'utf8');
    const dir = id.split('/')[0], binds = [];
    for (const line of src.match(/^import[^\n]*\n/gm) || []) {
      const m = /^import (?:\{([^}]+)\}|\* as (\w+)) from '(\.\.?)\/([\w-]+)(?:\/([\w-]+))?\.mjs';\s*$/.exec(line);
      if (!m) throw Error(`Importação fora do contrato em ${id}: ${line.trim()}`);
      const target = m[3] === '.' ? `${dir}/${m[4]}` : `${m[4]}/${m[5]}`;
      let from;
      if (target.startsWith('engine/') && !APP_MODULES.includes(target)) {
        if (!ENGINE_MODULES.includes(target.slice(7))) throw Error(`Módulo do motor inexistente: ${target}`);
        from = `schmidtEngine2.${target.slice(7)}`;
      } else {
        if (!(APP_MODULES.indexOf(target) >= 0 && APP_MODULES.indexOf(target) < APP_MODULES.indexOf(id))) throw Error(`Ordem ou módulo ausente: ${id} importa ${target}`);
        from = ident(target);
      }
      binds.push(m[2] ? `const ${m[2]} = ${from};` : `const { ${m[1].split(',').map(x => x.trim()).filter(Boolean).map(x => x.replace(/^(\w+) as (\w+)$/, '$1: $2')).join(', ')} } = ${from};`);
    }
    src = src.replace(/^import[^\n]*\n/gm, '');
    const exported = [...src.matchAll(/^export (?:async )?(?:function|const|class) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
    const reexp = [...src.matchAll(/^export \{([^}]+)\};?\s*$/gm)].flatMap(m => m[1].split(',').map(x => x.trim()));
    src = src.replace(/^export \{[^}]+\};?\s*$/gm, '').replace(/^export /gm, '');
    parts.push(`// src/${id}.mjs\nconst ${ident(id)}=(()=>{\n${binds.join('\n')}\n${src}\nreturn Object.freeze({${[...exported, ...reexp].join(',')}});\n})();`);
  }
  return `(()=>{\n'use strict';\n${parts.join('\n')}\n${ident('app3/main')}.startApp({document,window,fields:JSON.parse(document.getElementById('fields-data').textContent).fields,safra:JSON.parse(document.getElementById('safra-dados').textContent),appVersion:'${APP_VERSION}'});\n})();`;
}

const sha = t => `'sha256-${createHash('sha256').update(t).digest('base64')}'`;

export async function build3() {
  // Dados dos lotes e da safra: os mesmos da 2.5 (legado/index.html); antes da troca, do index.html da raiz.
  const source = await access(root + 'legado/index.html').then(() => 'legado/index.html', () => 'index.html');
  const current = await readFile(root + source, 'utf8');
  const fields = /<script id="fields-data" type="application\/json">([\s\S]*?)<\/script>/.exec(current)?.[1];
  if (!fields) throw Error('Dados dos lotes não encontrados');
  const safra = /<script id="safra-dados" type="application\/json">([\s\S]*?)<\/script>/.exec(current)?.[1];
  if (!safra) throw Error('Dados da safra não encontrados');
  const [engine, app, css, shell] = [await bundleEngine(), await bundleApp(), await readFile(root + 'src/app3/styles.css', 'utf8'), await readFile(root + 'src/app3/shell.html', 'utf8')];
  for (const [n, t] of [['motor', engine], ['tela', app], ['dados', fields], ['safra', safra]]) if (/<\/script/i.test(t)) throw Error(`${n} contém </script>`);
  const nav = [['mapa', 'Mapa'], ['plano', 'Plano'], ['enviar', 'Enviar'], ['monitorar', 'Monitorar']]
    .map(([k, l]) => `<button data-tab="${k}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${l}</button>`).join('');
  const csp = `default-src 'self'; script-src ${sha(engine)} ${sha(app)}; style-src ${sha(css)}; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  const html = shell.replace('__CSP__', csp).replace('__CSS__', () => css).replace('__ICON_SOL__', ICONS.sol).replace('__ICON_MAIS__', ICONS.mais)
    .replace('__NAV__', nav).replace('__FIELDS__', () => fields).replace('__SAFRA__', () => safra).replace('__ENGINE__', () => engine).replace('__APP__', () => app);
  if (/__[A-Z_]+__/.test(html)) throw Error('Marcador do modelo sem valor');
  if (/\sstyle=/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) throw Error('Estilo inline no HTML (CSP)');
  await mkdir(root + 'build/3', { recursive: true });
  await writeFile(root + 'build/3/index.html', html);
  for (const f of ['icone.svg', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png', 'icone-180.png']) await copyFile(root + f, root + 'build/3/' + f);
  // service worker: mesmo modelo da 2.x (cache conferido pelo SHA-256 da página; sem troca no meio do uso)
  const tpl = await readFile(root + 'src/platform/service-worker.js', 'utf8'), digest = createHash('sha256').update(html).digest('hex');
  let worker = tpl.replace('__SCHMIDT_CACHE__', `schmidt-3-${digest.slice(0, 10)}`).replace('__SCHMIDT_INDEX_SHA256__', digest);
  // A reserva 2.5 em legado/ não passa por este worker (senão a navegação cairia na página 3.0 do cache).
  const hook = "if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;";
  if (worker.split(hook).length !== 2) throw Error('Modelo do service worker mudou');
  worker = worker.replace(hook, hook + "if(new URL(request.url).pathname.includes('/legado/'))return;");
  await writeFile(root + 'build/3/sw.js', worker);
  return { html, worker, bytes: Buffer.byteLength(html), engine: engine.length, app: app.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await build3();
  if (process.argv.includes('--check')) {
    if (await readFile(root + 'index.html', 'utf8') !== r.html || await readFile(root + 'sw.js', 'utf8') !== r.worker) throw Error('index.html/sw.js diferentes do build da 3.0 (rode node scripts/build-3.mjs --root)');
    console.log('3.0 conferida: index.html e sw.js = build de src/.');
  } else if (process.argv.includes('--root')) {
    await writeFile(root + 'index.html', r.html); await writeFile(root + 'sw.js', r.worker);
    console.log('3.0 gravada na raiz', { bytes: r.bytes });
  } else console.log('3.0 gerada em build/3/index.html', { bytes: r.bytes, engine: r.engine, app: r.app });
}
