import { SCHMIDT_BACKUP_KEYS } from './backup-service.mjs';
// Mantém schema, manifesto e mensagens já existentes em 1.31.0.
export async function buildSchmidtBackup({ service, hash, encodeBlob, countState, version, engine, sanitizeParams }) {
  const snapshot = await service.collect();
  service.preflightExport(snapshot);
  const data = snapshot.data;
  const images = [];
  for (const { key, rec } of snapshot.images) {
    images.push({ chave: String(key), nome: rec.name, crs: rec.crs, largura: rec.width,
      altura: rec.height, world: rec.world, tipo: rec.blob?.type || 'image/png', base64: await encodeBlob(rec.blob) });
  }
  const versions = snapshot.history;
  const payload = versions.length ? { dados: data, imagens: images, historico: versions } : { dados: data, imagens: images };
  const result = { schema: 'schmidt.backup.v2', app: version, motor: engine,
    criado_em: new Date().toISOString(), manifesto: {
      itens: { ...countState(data['monitoramento.v03']), imagens: images.length,
        preferencias_mapa: +!!data['schmidt.v07.map.preferences'], versoes_planos: versions.length },
      chaves: SCHMIDT_BACKUP_KEYS,
      aviso: 'Cópia deste aparelho. Os pontos continuam SIMULADOS; marcações não substituem o registro no Cropwise.',
    }, ...payload, sha256: await hash(JSON.stringify(payload)) };
  validateSchmidtRestore(result, sanitizeParams);
  return service.assertExportable(result);
}

export function validateSchmidtRestore(backup, sanitizeParams) {
  if (!backup.dados || typeof backup.dados !== 'object' || Array.isArray(backup.dados)) throw new Error('configurações em formato inválido');
  for (const key of backup.legado ? ['monitoramento.v03'] : SCHMIDT_BACKUP_KEYS) {
    if (!Object.hasOwn(backup.dados, key)) throw new Error('configurações em formato inválido');
    const value = backup.dados[key];
    if (value !== null && (typeof value !== 'object' || Array.isArray(value))) throw new Error('configurações em formato inválido');
  }
  if (sanitizeParams) {
    for (const [key, params] of Object.entries(backup.dados['monitoramento.v03']?.paramsByField || {})) {
      const { removed } = sanitizeParams(params);
      if (removed.length) throw new Error(`parâmetros inválidos ou fora da faixa no lote ${key.split('|')[1] || key} (${removed[0]})`);
    }
  }
  if (backup.historico != null && (!Array.isArray(backup.historico)
    || backup.historico.some(row => typeof row?.lote !== 'string' || !Number.isFinite(row.em)
      || !row.estado || typeof row.estado !== 'object' || Array.isArray(row.estado)))) throw new Error('versões dos planos em formato inválido');
  if (!Array.isArray(backup.imagens)) throw new Error('imagem de fundo em formato inválido');
  const keys = new Set();
  for (const image of backup.imagens) {
    if (typeof image?.chave !== 'string' || !/^[^|]{1,40}\|[^|]{1,40}$/.test(image.chave) || keys.has(image.chave)
      || typeof image.base64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.base64)
      || !Array.isArray(image.world) || image.world.length !== 6 || !image.world.every(Number.isFinite)
      || !Number.isFinite(image.largura) || image.largura <= 0 || !Number.isFinite(image.altura) || image.altura <= 0) {
      throw new Error('imagem de fundo em formato inválido');
    }
    keys.add(image.chave);
  }
}
