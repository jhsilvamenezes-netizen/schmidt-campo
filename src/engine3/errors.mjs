// Motor 2 · erros de domínio com código estável (reescrita do módulo errors do motor 0.5.1).
export const ERR = Object.freeze({
  GEOMETRIA_INVALIDA: 'GEOMETRIA_INVALIDA', AREA_AUSENTE: 'AREA_AUSENTE', SEM_TRAJETO_IMPORTADO: 'SEM_TRAJETO_IMPORTADO',
  TOTAL_INVALIDO: 'TOTAL_INVALIDO', TOTAL_ACIMA_TETO: 'TOTAL_ACIMA_TETO', PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO', TIRO_SEM_PARTES: 'TIRO_SEM_PARTES',
});
/** Erro do domínio: `code` (ERR), `field` (parâmetro envolvido, ou null) e `value` (valor recusado). */
export class DomainError extends Error {
  constructor(code, message, info = {}) {
    super(message);
    this.name = 'DomainError'; this.code = code; this.field = info.field ?? null; this.value = info.value;
  }
}
