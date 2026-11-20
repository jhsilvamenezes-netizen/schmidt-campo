// 3.0 · estado salvo. Mesma chave e mesmo formato da 2.x ("monitoramento.v03"): a 3.0 lê o que a 2.x gravou e
// grava só os campos que usa, preservando os demais (blocos, ajustes manuais, monitor, imagem de fundo...).
export const STATE_KEY = 'monitoramento.v03';

/** Armazenamento do navegador; se ele não existir ou estiver bloqueado, um substituto em memória (vale até fechar). */
export function safeStorage(get) {
  try { const s = get(); s.getItem(STATE_KEY); return { storage: s, persistent: true }; } catch {
    const m = new Map();
    return { storage: { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }, persistent: false };
  }
}

/** `canWrite()`: trava entre abas (outra janela aberta grava; esta só lê). `onBlocked()` avisa a pessoa.
 *  `onFail()`: a gravação falhou (memória cheia ou bloqueada); o estado em memória volta ao que estava gravado. */
export function createStore(storage, { canWrite = () => true, onBlocked = () => {}, onFail = () => {} } = {}) {
  function read() {
    const raw = storage.getItem(STATE_KEY);
    if (raw === null) return {};
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Estado inválido');
    return value;
  }
  let state = {}, unreadable = false;
  try { state = read(); } catch { unreadable = true; }
  return {
    get: () => state,
    unreadable: () => unreadable,
    /** Aplica `patch` sobre o estado mais recente do armazenamento (outra aba pode ter gravado) e grava. */
    update(patch) {
      if (!canWrite()) { onBlocked(); return false; }
      try { state = read(); unreadable = false; } catch { unreadable = true; onFail(); return false; }
      const next = { ...state, ...patch };
      try { storage.setItem(STATE_KEY, JSON.stringify(next)); state = next; return true; } catch { onFail(); return false; }
    },
  };
}
