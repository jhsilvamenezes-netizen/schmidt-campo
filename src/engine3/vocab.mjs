// Motor 2 · vocabulário: valores fixos usados pelo motor e pela tela (reescrita do módulo vocab do motor 0.5.1).
export const STATUS_TEXT = Object.freeze({ SIMULADO: 'SIMULAÇÃO · rastros não conferidos', TRAJETO_IMPORTADO: 'TRAJETO GPS IMPORTADO · pontos simulados' });
export const KIND = Object.freeze({ REFERENCIA_LINEAR: 'referencia_linear', CURVA_DESENHADA: 'curva_desenhada', PISTA_GNSS: 'pista_gnss', TRAJETO_GPS_EQUIPE: 'trajeto_gps_equipe' });
export const TRACK_MODE = Object.freeze({ ESPACAMENTO: 'espacamento', QUANTIDADE: 'quantidade', CIRCULAR: 'circular', IMPORTADO: 'importado' });
export const SELECTION_MODE = Object.freeze({ TODOS: 'todos', QUANTIDADE: 'quantidade', MANUAL: 'manual' });
export const POINT_MODE = Object.freeze({ TOTAL: 'total', POR_TIRO: 'por_tiro', ESPACAMENTO: 'espacamento' });
export const EDGE_POLICY = Object.freeze({ MEIA_MARGEM: 'meia_margem', MARGENS_IGUAIS: 'margens_iguais', MARGEM_FIXA: 'margem_fixa' });
export const OPT_MODE = Object.freeze({ QUALIDADE_ESPACIAL: 'qualidade_espacial', REGULARIDADE: 'regularidade', ESFORCO: 'esforco' });
export const ALLOC_STATUS = Object.freeze({ OK: 'ok', CONFLITO: 'conflito', SEM_TRECHOS: 'sem_trechos' });
