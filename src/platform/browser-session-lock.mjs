// Clientes desta versão mantêm presença compartilhada durante a vida da página.
// Uma operação destrutiva exige presença exclusiva; não usa prazo/lease renovável.
export function createSchmidtSessionLock(locks) {
  const presence = 'schmidt.storage.session.v1';
  const gate = 'schmidt.storage.operation.v1';
  const writer = 'schmidt.storage.writer.v1';
  let writerChecked = false, writeOwner = false, releaseWriter, invalidated = false;
  let releasePresence, presenceDone, busy = false;
  const invalid = () => {
    const error=new Error('IndexedDB bloqueado');
    error.name='SchmidtWriteBlockedError';error.code='SCHMIDT_WRITE_BLOCKED';
    error.reason=invalidated?'stale':busy?'busy':!writeOwner?'other-window':'operation';
    error.userMessage=invalidated?'Esta página foi retomada sem permissão para salvar. Reabra o SCHMIDT para carregar os dados atuais. Não limpe os dados.':busy?'Aguarde a operação de dados terminar antes de salvar.':'Outra janela do SCHMIDT está aberta. Use a janela original ou feche as outras e reabra esta página. Não limpe os dados.';
    return error;
  };

  async function enter() {
    if (invalidated || !locks?.request || releasePresence) return;
    let ready;
    const acquired = new Promise(resolve => { ready = resolve; });
    presenceDone = locks.request(presence, { mode: 'shared' }, async () => {
      await new Promise(resolve => { releasePresence = resolve; ready(); });
    });
    await Promise.race([acquired, presenceDone.then(() => { throw invalid(); })]);
    if (!writerChecked) {
      // A aquisição ocorre antes de carregar estado na memória. Sem promoção
      // automática: uma aba antiga precisa recarregar para ler o estado atual.
      let inspected;
      const checked = new Promise(resolve => { inspected = resolve; });
      const held = locks.request(writer, { ifAvailable: true }, lock => {
        writerChecked = true;
        writeOwner = !!lock && !invalidated;
        inspected();
        if (writeOwner) return new Promise(resolve => { releaseWriter = resolve; });
      });
      await Promise.race([checked, held]);
    }
  }

  async function exclusive(operation) {
    if (busy || !writeOwner || !locks?.request) throw invalid();
    busy = true;
    try {
      return await locks.request(gate, { ifAvailable: true }, async token => {
        if (!token) throw invalid();
        releasePresence?.();
        releasePresence = undefined;
        await presenceDone;
        try {
          return await locks.request(presence, { ifAvailable: true }, lock => {
            if (!lock || invalidated) throw invalid();
            return operation();
          });
        } finally { await enter(); }
      });
    } finally { busy = false; }
  }
  function invalidate() {
    // Um documento mantido no histórico não pode retomar com estado antigo.
    invalidated = true;
    writeOwner = false;
    releaseWriter?.();
    if (!busy) { releasePresence?.(); releasePresence = undefined; }
  }
  // Sem Web Locks, conserva gravações comuns legadas; não promete exclusividade.
  // Snapshot/restauração continuam recusados por exclusive().
  return { enter, exclusive, invalidate, writeError:invalid, isBusy: () => busy, canWrite: () => !invalidated && (!locks?.request || writeOwner) };
}

// A volta pelo histórico pode restaurar o mesmo documento, já invalidado.
// Recarregar recupera a permissão antes de ler os dados atuais; nunca promove
// uma cópia antiga da memória a escritora sobre dados de outra sessão.
// 1.31.4: a invalidação no pagehide precisa rodar DEPOIS dos gravadores do
// aplicativo ("gravar ao sair"). Ouvintes do mesmo alvo rodam na ordem de
// registro; com deferEnd o chamador arma o encerramento quando o aplicativo
// já registrou os seus. Sem deferEnd o comportamento é o anterior.
export function installSchmidtSessionLifecycle(target,session,{deferEnd=false}={}) {
 let reloading=false,armed=false;
 const armEnd=()=>{if(armed)return;armed=true;target.addEventListener('pagehide',()=>session.invalidate(),{once:true});};
 if(!deferEnd)armEnd();
 target.addEventListener('pageshow',event=>{
  if(!event.persisted||reloading)return;
  reloading=true;session.invalidate();target.location.reload();
 });
 return armEnd;
}
