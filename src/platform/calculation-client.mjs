/** Um worker por tarefa: cancelamento/falha nunca encerra o cálculo de outro consumidor. */
export function createSchmidtCalculationClient({ createWorker, buildScenario, schedule = setTimeout, unschedule = clearTimeout }) {
  let sequence = 0, unavailable = false;

  function request(type, payload, timeoutMs) {
    if (unavailable) return null;
    let worker;
    try { worker = createWorker(); } catch { unavailable = true; return null; }
    const id = ++sequence;
    let settled = false, timer, rejectTask;
    const cleanup = () => {
      unschedule(timer);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.removeEventListener('messageerror', onMessageError);
      try { worker.terminate(); } catch { /* Encerramento já realizado pelo ambiente. */ }
    };
    let resolveTask;
    const finish = (error, result) => {
      if (settled) return;
      settled = true; cleanup();
      if (error) rejectTask(error); else resolveTask(result);
    };
    const onMessage = event => {
      if (event.data?.id !== id) return;
      if (!event.data.ok) finish(Error(event.data.error || 'Falha no cálculo.'));
      else finish(null, type === 'optimize' ? event.data.scenario : event.data.rec);
    };
    const onError = event => finish(Error(`Falha no worker: ${event.message || 'desconhecida'}`));
    const onMessageError = () => finish(Error('Resposta do cálculo não pôde ser lida.'));
    const promise = new Promise((resolve, reject) => { resolveTask = resolve; rejectTask = reject; });
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.addEventListener('messageerror', onMessageError);
    timer = schedule(() => finish(Error(`Tempo limite de ${Math.round(timeoutMs / 1000)} s excedido; cálculo interrompido.`)), timeoutMs);
    try { worker.postMessage({ id, type, ...payload }); } catch (error) { finish(error); }
    return { promise, cancel: () => finish(Error('Cálculo cancelado pelo usuário.')), mode: 'web_worker' };
  }

  function optimizeAsync(field, params, opts, timeoutMs = 20000) {
    const task = request('optimize', { field, params, opts }, timeoutMs);
    if (task) return task;
    // Fallback explícito: é adiável/cancelável antes de começar; um laço JS síncrono
    // já iniciado não pode ser preemptado na thread principal.
    const signal = { cancelled: false };
    let timer, settled = false, rejectTask;
    const promise = new Promise((resolve, reject) => {
      rejectTask = reject;
      timer = schedule(() => {
        if (settled) return;
        try { const result = buildScenario(field, params, { ...opts, optimize: true, signal }); settled = true; resolve(result); }
        catch (error) { settled = true; reject(error); }
      }, 0);
    });
    return { promise, mode: 'thread_principal', cancel: () => {
      if (settled) return;
      signal.cancelled = true; settled = true; unschedule(timer); rejectTask(Error('Cálculo cancelado pelo usuário.'));
    } };
  }

  function recommendAsync(field, base, opts, timeoutMs = 20000) {
    return request('recommend', { field, base, opts }, timeoutMs)?.promise ?? null;
  }
  return { optimizeAsync, recommendAsync };
}
