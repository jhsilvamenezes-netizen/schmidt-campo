import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchmidtCalculationClient } from '../src/platform/calculation-client.mjs';
function setup() {
  const workers = [], timers = new Map(); let seq = 0;
  const createWorker = () => {
    const listeners = new Map();
    const worker = { listeners, stopped: false, sent: null,
      addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); },
      terminate() { this.stopped = true; }, postMessage(value) { this.sent = value; },
      emit(type, value) { listeners.get(type)?.(value); } };
    workers.push(worker); return worker;
  };
  const schedule = fn => { timers.set(++seq, fn); return seq; }, unschedule = id => timers.delete(id);
  const client = createSchmidtCalculationClient({ createWorker, buildScenario: () => ({ fallback: true }), schedule, unschedule });
  return { client, workers, timers, schedule, unschedule };
}

test('cancelar otimização resolve sua promessa sem interromper recomendação concorrente', async () => {
  const { client, workers, timers } = setup();
  const task = client.optimizeAsync({}, {}, {}), rec = client.recommendAsync({}, {}, {});
  const cancelled = assert.rejects(task.promise, /cancelado/);
  task.cancel(); task.cancel(); await cancelled;
  assert.equal(workers[0].stopped, true); assert.equal(workers[1].stopped, false);
  workers[1].emit('message', { data: { id: workers[1].sent.id, ok: true, rec: { chosen: 1 } } });
  assert.deepEqual(await rec, { chosen: 1 }); assert.equal(timers.size, 0);
  assert.ok(workers.every(w => w.stopped && w.listeners.size === 0));
});

test('resposta de outro id é ignorada; conclusão e cancelamento tardio são idempotentes', async () => {
  const { client, workers } = setup(), task = client.optimizeAsync({}, {}, {}), worker = workers[0];
  worker.emit('message', { data: { id: -1, ok: true, scenario: 'wrong' } }); assert.equal(worker.stopped, false);
  worker.emit('message', { data: { id: worker.sent.id, ok: true, scenario: 'right' } });
  assert.equal(await task.promise, 'right'); task.cancel();
});

test('timeout, erro e mensagem ilegível encerram tarefa e limpam listeners', async () => {
  for (const kind of ['timeout', 'error', 'messageerror']) {
    const { client, workers, timers } = setup(), task = client.optimizeAsync({}, {}, {}, 100), worker = workers[0];
    const failure = assert.rejects(task.promise);
    if (kind === 'timeout') [...timers.values()][0](); else worker.emit(kind, { message: 'test' });
    await failure; assert.equal(worker.stopped, true); assert.equal(worker.listeners.size, 0); assert.equal(timers.size, 0);
  }
});

test('falha de postMessage não deixa promessa, timer ou worker pendurados', async () => {
  const state = setup();
  const client = createSchmidtCalculationClient({ createWorker() {
    const worker = { addEventListener() {}, removeEventListener() {}, terminate() { state.stopped = true; }, postMessage() { throw Error('clone'); } }; return worker;
  }, schedule: state.schedule, unschedule: state.unschedule });
  await assert.rejects(client.optimizeAsync({}, {}, {}).promise, /clone/);
  assert.equal(state.stopped, true); assert.equal(state.timers.size, 0);
});

test('fallback cancelado antes de começar não executa cálculo nem resolve resultado antigo', async () => {
  const state = setup(); let builds = 0;
  const client = createSchmidtCalculationClient({ createWorker() { throw Error('CSP'); }, buildScenario() { builds++; }, schedule: state.schedule, unschedule: state.unschedule });
  const task = client.optimizeAsync({}, {}, {}), cancelled = assert.rejects(task.promise, /cancelado/);
  assert.equal(task.mode, 'thread_principal'); task.cancel(); await cancelled;
  assert.equal(builds, 0); assert.equal(state.timers.size, 0); assert.equal(client.recommendAsync({}, {}, {}), null);
});
