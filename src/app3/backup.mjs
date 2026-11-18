// 3.0 · cópia de segurança no formato da 2.x ("schmidt.backup.v2", com hash SHA-256 do conteúdo). O serviço
// transacional (diário de restauração e volta atrás) é o mesmo da 2.x: src/persistence.
import { buildSchmidtBackup, validateSchmidtRestore } from '../persistence/backup-format.mjs';
import { sanitizeParams } from '../engine3/paramCatalog.mjs';

export const BACKUP_SCHEMA = 'schmidt.backup.v2';
export const ITEM_LABELS = { lotes_com_parametros: 'lotes com parâmetros próprios', lotes_com_ajustes: 'lotes com ajustes manuais', monitores_nomeados: 'nomes de monitores',
  marcacoes_coleta: 'marcações de coleta', registros_diario: 'registros do diário do piloto', imagens: 'imagens de fundo', preferencias_mapa: 'preferências do mapa',
  versoes_planos: 'versões anteriores de planos' };

export function countState(state) {
  const t = state || {}, mons = Object.values(t.monitor || {}), sum = f => mons.reduce((a, m) => a + f(m), 0);
  return { lotes_com_parametros: Object.keys(t.paramsByField || {}).length, lotes_com_ajustes: Object.keys(t.editsByField || {}).length,
    monitores_nomeados: sum(m => Object.values(m?.names || {}).filter(v => String(v).trim()).length),
    marcacoes_coleta: sum(m => Object.values(m?.collected || {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0)),
    registros_diario: sum(m => Object.values(m?.log || {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0)) };
}

export async function sha256Hex(text, subtle) {
  const d = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export const makeBackup = ({ service, subtle, encodeBlob, version, engine }) =>
  buildSchmidtBackup({ service, hash: t => sha256Hex(t, subtle), encodeBlob, countState, version, engine, sanitizeParams });

/** Lê e confere um arquivo de cópia (inclui o formato antigo "schmidt.config.backup.v1"); devolve o conteúdo e o que ele traz. */
export async function readBackup(text, subtle) {
  if (text.length > 80 * 1024 * 1024) throw Error('arquivo acima de 80 MB');
  let n;
  try { n = JSON.parse(text); } catch { throw Error('o arquivo não é JSON'); }
  if (n?.schema === 'schmidt.config.backup.v1' && n.sourceKey === 'monitoramento.v03') n = { schema: BACKUP_SCHEMA, legado: true, manifesto: { itens: {} }, dados: { 'monitoramento.v03': n.prefs }, imagens: [] };
  else {
    delete n.legado;
    if (n?.schema !== BACKUP_SCHEMA) throw Error('formato de cópia desconhecido');
    const payload = n.historico ? { dados: n.dados, imagens: n.imagens, historico: n.historico } : { dados: n.dados, imagens: n.imagens };
    if (await sha256Hex(JSON.stringify(payload), subtle) !== n.sha256) throw Error('o conteúdo não confere com o hash (arquivo alterado ou incompleto)');
  }
  validateSchmidtRestore(n, sanitizeParams);
  const state = n.dados?.['monitoramento.v03'];
  return { backup: n, items: { ...countState(state), imagens: n.imagens.length, preferencias_mapa: +!!n.dados?.['schmidt.v07.map.preferences'], ...(n.historico ? { versoes_planos: n.historico.length } : {}) } };
}
