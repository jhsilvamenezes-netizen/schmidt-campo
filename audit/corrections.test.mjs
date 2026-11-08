import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSchmidtBackupService, SCHMIDT_BACKUP_KEYS, SCHMIDT_RESTORE_MARKER } from '../src/persistence/backup-service.mjs';
import { buildSchmidtBackup, validateSchmidtRestore } from '../src/persistence/backup-format.mjs';
import { validateSchmidtGPSFix, startSchmidtGPSWatch, stopSchmidtGPSWatch } from '../src/gps/fix-policy.mjs';

function fixture() {
  const values = new Map(SCHMIDT_BACKUP_KEYS.map(key => [key, JSON.stringify({ original: key })]));
  const faults = {};
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { if (faults.key === key) throw new DOMException('quota', 'QuotaExceededError'); values.set(key, value); },
    removeItem: key => values.delete(key),
  };
  const state = { images: [{ key: 'TESTE|ANTIGA', rec: { blob: new Blob(['old']),name:'old.png',width:1,height:1,world:[1,0,0,-1,0,0],crs:'EPSG:32723' } }], history: [{ id: 1,lote:'TESTE|ANTIGA',em:1,estado:{} }], journal: null };
  const images = { readAll: async () => { if (faults.readImage) throw Error('imagem ilegível'); return structuredClone(state.images); },
    replaceAll: async value => { if (faults.writeImage) throw Error('imagem bloqueada'); state.images = structuredClone(value); } };
  const history = { readAll: async () => { if (faults.readHistory) throw Error('histórico ilegível'); return structuredClone(state.history); },
    replaceAll: async value => { if (faults.writeHistory) throw Error('histórico bloqueado'); state.history = structuredClone(value); } };
  const journal = { read: async () => structuredClone(state.journal),
    write: async value => { if (faults.journal) throw Error('journal bloqueado'); state.journal = structuredClone(value); },
    clear: async () => { state.journal = null; } };
  const ports = { storage, images, history, journal };
  const service = createSchmidtBackupService(ports);
  const incoming = { data: Object.fromEntries(SCHMIDT_BACKUP_KEYS.map(key => [key, { incoming: key }])),
    images: [{ key: 'TESTE|NOVA', rec: { blob: new Blob(['new']) } }], history: [{ id: 2 }] };
  return { values, faults, state, service, ports, incoming };
}

test('A03: erro de leitura de imagem impede exportação incompleta', async () => {
  const f = fixture(); f.faults.readImage = true;
  await assert.rejects(f.service.collect(), /imagem ilegível/);
});
test('erro de histórico também impede exportação incompleta', async () => {
  const f = fixture(); f.faults.readHistory = true;
  await assert.rejects(f.service.collect(), /histórico ilegível/);
});
test('A04: JSON corrompido é preservado e não vira null na cópia', async () => {
  const f = fixture(); f.values.set(SCHMIDT_BACKUP_KEYS[0], '{broken');
  await assert.rejects(f.service.collect(), /formato inválido/);
  assert.equal(f.service.isWriteBlocked(), true);
  assert.equal(f.values.get(SCHMIDT_BACKUP_KEYS[0]), '{broken');
  assert.deepEqual(f.service.loadAppState(), {});
  assert.equal(f.service.isWriteBlocked(), true);
});
test('chave ausente é distinguida de chave ilegível', () => {
  const f = fixture(); f.values.delete(SCHMIDT_BACKUP_KEYS[1]);
  assert.equal(f.service.readJSON(SCHMIDT_BACKUP_KEYS[1]), null);
  f.values.set(SCHMIDT_BACKUP_KEYS[1], '[]');
  assert.throws(() => f.service.readJSON(SCHMIDT_BACKUP_KEYS[1]), /formato inválido/);
});
test('A05: quota na segunda chave restaura as três chaves e ambas as bases', async () => {
  const f = fixture(), before = await f.service.collect(), raw = new Map(f.values);
  f.faults.key = SCHMIDT_BACKUP_KEYS[1];
  await assert.rejects(f.service.restore(f.incoming), { name: 'QuotaExceededError' });
  assert.deepEqual(f.values, raw);
  assert.deepEqual(f.state.images, before.images);
  assert.deepEqual(f.state.history, before.history);
  assert.equal(f.service.isWriteBlocked(), false);
});
test('snapshot durável indisponível impede qualquer escrita do estado', async () => {
  const f = fixture(), before = new Map(f.values), images = structuredClone(f.state.images);
  f.faults.journal = true;
  await assert.rejects(f.service.restore(f.incoming), /journal bloqueado/);
  assert.deepEqual(f.values, before); assert.deepEqual(f.state.images, images);
});
test('rollback pendente mantém snapshot e bloqueia novas gravações/exportação', async () => {
  const f = fixture(); f.faults.writeHistory = true;
  await assert.rejects(f.service.restore(f.incoming), /histórico bloqueado/);
  assert.equal(f.service.isWriteBlocked(), true);
  assert.equal(f.state.journal.stage, 'prepared');
  await assert.rejects(f.service.collect(), /formato inválido/);
  f.faults.writeHistory = false;
  const reopened = createSchmidtBackupService(f.ports);
  assert.equal(await reopened.recover(), true);
  assert.equal(reopened.isWriteBlocked(), false);
  assert.equal(f.state.images[0].key, 'TESTE|ANTIGA');
});
test('interrupção antes do commit é recuperada por nova instância', async () => {
  const f = fixture();
  const before = { raw: Object.fromEntries(SCHMIDT_BACKUP_KEYS.map(k => [k, f.values.get(k)])), images: structuredClone(f.state.images), history: structuredClone(f.state.history) };
  await f.ports.journal.write({ stage: 'prepared', before });
  f.values.set(SCHMIDT_RESTORE_MARKER, '1'); f.values.set(SCHMIDT_BACKUP_KEYS[0], '{partial');
  f.state.images = [];
  await createSchmidtBackupService(f.ports).recover();
  assert.equal(f.values.get(SCHMIDT_BACKUP_KEYS[0]), before.raw[SCHMIDT_BACKUP_KEYS[0]]);
  assert.deepEqual(f.state.images, before.images);
  assert.equal(f.values.has(SCHMIDT_RESTORE_MARKER), false);
});
test('commit durável conserva o novo estado depois de interrupção na limpeza', async () => {
  const f = fixture();
  await f.ports.journal.write({ stage: 'committed', before: { raw: {}, images: [], history: [] } });
  f.values.set(SCHMIDT_RESTORE_MARKER, '1'); f.values.set(SCHMIDT_BACKUP_KEYS[0], '{"committed":true}');
  await createSchmidtBackupService(f.ports).recover();
  assert.equal(f.values.get(SCHMIDT_BACKUP_KEYS[0]), '{"committed":true}');
});
test('journal ausente/inválido não apaga marcador ou estado parcial', async () => {
  const f = fixture(); f.values.set(SCHMIDT_RESTORE_MARKER, '1');
  const raw = new Map(f.values);
  await assert.rejects(f.service.recover(), /formato inválido/);
  assert.deepEqual(f.values, raw);
});
test('A08: restauração v2 substitui imagens e histórico pelo conjunto da cópia', async () => {
  const f = fixture(); await f.service.restore(f.incoming);
  assert.deepEqual(f.state.images, f.incoming.images);
  assert.deepEqual(f.state.history, f.incoming.history);
  for (const key of SCHMIDT_BACKUP_KEYS) assert.deepEqual(JSON.parse(f.values.get(key)), f.incoming.data[key]);
  assert.equal(f.state.journal, null);
});
test('backup legado de configurações conserva imagens, histórico e demais chaves', async () => {
  const f = fixture(), before = await f.service.collect();
  await f.service.restore({ data: { 'monitoramento.v03': { legacy: true } }, images: [], history: [], legacy: true });
  assert.deepEqual(f.state.images, before.images); assert.deepEqual(f.state.history, before.history);
  assert.deepEqual(JSON.parse(f.values.get(SCHMIDT_BACKUP_KEYS[1])), before.data[SCHMIDT_BACKUP_KEYS[1]]);
});
test('A07: teto considera bytes UTF-8 e aceita exatamente o limite', () => {
  const f = fixture(), value = { nome: 'ação' }, size = Buffer.byteLength(JSON.stringify(value));
  assert.equal(createSchmidtBackupService({ ...f.ports, maxBytes: size }).assertExportable(value), value);
  assert.throws(() => createSchmidtBackupService({ ...f.ports, maxBytes: size - 1 }).assertExportable(value), /80 MB/);
});
test('A07: três imagens de 25 MiB são recusadas antes de base64 ou SHA', async () => {
  const f=fixture();
  f.state.images=Array.from({length:3},(_,i)=>({key:`TESTE|${i}`,rec:{blob:{size:25*1024*1024,type:'image/png'}}}));
  let encoded=false;
  await assert.rejects(buildSchmidtBackup({service:f.service,encodeBlob:async()=>{encoded=true;throw Error('não deve executar');},
    hash:async()=>{throw Error('não deve executar');},countState:()=>({}),version:'1.31.0',engine:'test'}),/80 MB/);
  assert.equal(encoded,false);
});
test('cópia completa mantém schema v2 e hash verificável do conteúdo', async () => {
  const f = fixture();
  const backup = await buildSchmidtBackup({ service: f.service, hash: async s => createHash('sha256').update(s).digest('hex'),
    encodeBlob: async blob => Buffer.from(await blob.arrayBuffer()).toString('base64'), countState: () => ({}), version: '1.31.0', engine: '0.5.1-sim' });
  assert.equal(backup.schema, 'schmidt.backup.v2');
  assert.equal(backup.imagens.length, 1); assert.equal(backup.historico.length, 1);
  assert.equal(backup.sha256, createHash('sha256').update(JSON.stringify({ dados: backup.dados, imagens: backup.imagens, historico: backup.historico })).digest('hex'));
});
test('validação recusa conjunto incompleto e imagem duplicada antes de restaurar', () => {
  assert.throws(() => validateSchmidtRestore({ dados: {}, imagens: [] }), /formato inválido/);
  const image = { chave: 'TESTE|IMAGEM', base64: 'YQ==', world: [1,0,0,-1,0,0], largura: 1, altura: 1 };
  const data = Object.fromEntries(SCHMIDT_BACKUP_KEYS.map(k => [k, null]));
  assert.throws(() => validateSchmidtRestore({ dados: data, imagens: [image, image] }), /imagem de fundo/);
});
test('exportação recusa metadados de imagem ilegíveis em vez de criar cópia não importável', async () => {
  const f=fixture();f.state.images[0].rec.world=null;
  await assert.rejects(buildSchmidtBackup({service:f.service,hash:async()=>'',encodeBlob:async()=>'',countState:()=>({})}),/imagem de fundo/);
});
test('validação recusa histórico inválido e parâmetros recusados pelo motor', () => {
  const data=Object.fromEntries(SCHMIDT_BACKUP_KEYS.map(k=>[k,null]));
  assert.throws(()=>validateSchmidtRestore({dados:data,imagens:[],historico:[{id:1}]}),/versões dos planos/);
  data['monitoramento.v03']={paramsByField:{'TESTE|X':{invalid:1}}};
  assert.throws(()=>validateSchmidtRestore({dados:data,imagens:[]},()=>({removed:['invalid']})),/parâmetros inválidos/);
});

const now = 1800000000000;
const position = timestamp => ({ timestamp, coords: { longitude: 0, latitude: 0, accuracy: 5 } });
for (const [label, value] of [['antigo',now-600000],['ausente',undefined],['futuro',now+1],['NaN',NaN]]) {
  test(`A06: GPS ${label} é descartado`, () => assert.equal(validateSchmidtGPSFix(position(value), { now }), null));
}
test('GPS recente conserva timestamp de aquisição e precisão aproximada', () => {
  const p = position(now-5000); p.coords.accuracy=1000;
  assert.equal(validateSchmidtGPSFix(p,{now}).timestamp,now-5000);
});
test('GPS fora de ordem, repetido ou com coordenadas inválidas é descartado', () => {
  assert.equal(validateSchmidtGPSFix(position(now-2),{now,lastTimestamp:now-1}),null);
  assert.equal(validateSchmidtGPSFix(position(now),{now,lastTimestamp:now}),null);
  const p=position(now);p.coords.latitude=91;
  assert.equal(validateSchmidtGPSFix(p,{now}),null);
});
test('callback de sessão GPS anterior é ignorado após desligar e religar', () => {
  const callbacks=[], accepted=[], errors=[];
  const geo={ watchPosition(ok,fail) { callbacks.push({ok,fail}); return callbacks.length; }, clearWatch() {} };
  const state={watchId:null};
  state.watchId=startSchmidtGPSWatch(geo,state,p=>accepted.push(p),e=>errors.push(e),{});
  stopSchmidtGPSWatch(geo,state,state.watchId);state.watchId=null;
  state.watchId=startSchmidtGPSWatch(geo,state,p=>accepted.push(p),e=>errors.push(e),{});
  callbacks[0].ok('velho');callbacks[0].fail('erro velho');callbacks[1].ok('novo');
  assert.deepEqual(accepted,['novo']);assert.deepEqual(errors,[]);
});
