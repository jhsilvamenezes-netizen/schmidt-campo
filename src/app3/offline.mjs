// 3.24 · "pronto sem internet": confere se o app inteiro já está guardado no celular (cache do service worker), para a
// equipe saber ANTES de ir para a lavoura sem sinal. Sem DOM: recebe a API de cache e o endereço base.

/** Arquivos sem os quais o app não abre sem internet (os mesmos que o service worker guarda). */
export const OFFLINE_FILES = ['index.html', 'motor.js', 'app.webmanifest', 'inter.woff2'];

/**
 * Estado do modo sem internet: 'pronto' (um cache da 3.x tem todos os arquivos), 'baixando' (ainda não) ou 'sem'
 * (navegador sem cache de service worker).
 * @param {any} cachesApi `window.caches` (ou nada)  @param {string} base endereço da página
 * @returns {Promise<{state:'pronto'|'baixando'|'sem', missing?:string[]}>}
 */
export async function offlineStatus(cachesApi, base) {
  if (!cachesApi?.keys) return { state: 'sem' };
  let missing = OFFLINE_FILES;
  try {
    for (const key of (await cachesApi.keys()).filter((/** @type {string} */ k) => k.startsWith('schmidt-3-'))) {
      const c = await cachesApi.open(key), miss = [];
      for (const f of OFFLINE_FILES) if (!(await c.match(new URL(f, base).href))) miss.push(f);
      if (!miss.length) return { state: 'pronto' };
      if (miss.length < missing.length) missing = miss;
    }
  } catch { return { state: 'baixando', missing }; }
  return { state: 'baixando', missing };
}

/** Texto do selo. */
export const offlineText = (/** @type {string} */ state) => state === 'pronto' ? 'Pronto para usar sem internet.'
  : state === 'sem' ? 'Este navegador não guarda o app para usar sem internet: abra com sinal.'
    : 'Ainda guardando o app para usar sem internet. Deixe aberto com sinal por alguns segundos.';
