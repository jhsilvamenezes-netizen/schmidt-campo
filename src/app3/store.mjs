// 3.0 · estado salvo. Mesma chave e mesmo formato da 2.x ("monitoramento.v03"): a 3.0 lê o que a 2.x gravou e
// grava só os campos que usa, preservando os demais (blocos, ajustes manuais, monitor, imagem de fundo...).
export const STATE_KEY = 'monitoramento.v03';

/** `canWrite()`: trava entre abas (outra janela aberta grava; esta só lê). `onBlocked(msg)` avisa a pessoa. */
export function createStore(storage, { canWrite = () => true, onBlocked = () => {} } = {}) {
  const read = () => { try { const t = storage.getItem(STATE_KEY); const v = t ? JSON.parse(t) : {}; return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
  let state = read();
  return {
    get: () => state,
    /** Aplica `patch` sobre o estado mais recente do armazenamento (outra aba pode ter gravado) e grava. */
    update(patch) {
      if (!canWrite()) { onBlocked(); return false; }
      state = { ...read(), ...patch };
      try { storage.setItem(STATE_KEY, JSON.stringify(state)); return true; } catch { return false; }
    },
  };
}
