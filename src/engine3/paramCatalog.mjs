// Motor 2 · catálogo dos parâmetros: rótulo, unidade, limites, nível, ajuda e origem; checagem, recusa e limpeza
// de parâmetros gravados (reescrita do módulo paramCatalog do motor 0.5.1).
import { DomainError, ERR } from './errors.mjs';
import { EDGE_POLICY, OPT_MODE, POINT_MODE, SELECTION_MODE, TRACK_MODE } from './vocab.mjs';
import { numBR } from './numero.mjs';

const OPERACIONAL = 'informação operacional', INICIAL = 'valor inicial de simulação';

export const CATALOG = Object.freeze({
  trackMode: { label: 'Como gerar os tiros', nivel: 'basico', options: Object.values(TRACK_MODE), ajuda: 'Retas na direção da planilha, nas passadas da barra (vale também para pivô), ou trajetos importados de um GPS.', calibrado: true, fonte: OPERACIONAL },
  trackSpacingM: { label: 'Distância máxima entre tiros', unit: 'm', min: 40, max: 2000, step: 10, nivel: 'basico', ajuda: 'Distância de um tiro ao vizinho, medida de lado (não é a distância entre pontos). Tiros vizinhos ficam no máximo a esta distância. Com "múltiplos da barra", o valor é arredondado para baixo.', calibrado: false, fonte: INICIAL },
  trackCount: { label: 'Quantidade de tiros', unit: 'tiros', min: 1, max: 60, step: 1, integer: true, nivel: 'basico', ajuda: 'Divide a largura do lote em faixas iguais, um tiro no meio de cada faixa.', calibrado: true, fonte: OPERACIONAL },
  selectionMode: { label: 'Tiros que recebem pontos', nivel: 'basico', options: Object.values(SELECTION_MODE), ajuda: 'Todos os tiros, um por pessoa (espalhados pelo lote) ou escolhidos à mão.', calibrado: true, fonte: OPERACIONAL },
  selectionCount: { label: 'Pessoas / tiros', unit: 'pessoas', min: 1, max: 60, step: 1, integer: true, nivel: 'basico', ajuda: 'Cada pessoa caminha um tiro.', calibrado: true, fonte: OPERACIONAL },
  haPerPoint: { label: 'Hectares por ponto', unit: 'ha', min: 1, max: 1000, step: 1, nivel: 'basico', ajuda: 'Regra da soja: 1 ponto a cada 20 ha, arredondando para cima. Outras culturas: exploratório.', calibrado: true, fonte: 'regra operacional informada para soja' },
  pointMode: { label: 'Como repartir os pontos', nivel: 'basico', options: Object.values(POINT_MODE), ajuda: 'Proporcional ao tamanho de cada tiro, o mesmo número por pessoa, ou pela distância desejada entre pontos.', calibrado: true, fonte: OPERACIONAL },
  totalPoints: { label: 'Total de pontos', unit: 'pontos', nivel: 'basico', ajuda: 'Vazio = mínimo da regra. Pode aumentar para dividir igual entre monitores; nunca é reduzido sozinho.', calibrado: true, fonte: OPERACIONAL, validadoNa: 'alocação' },
  pointsPerTrack: { label: 'Pontos por tiro', unit: 'pontos', min: 1, max: 100, step: 1, integer: true, nivel: 'basico', ajuda: 'Mesmo número de pontos em cada tiro. Tiros mais longos ficam com pontos mais espaçados.', calibrado: true, fonte: OPERACIONAL },
  targetSpacingM: { label: 'Distância desejada entre pontos', unit: 'm', min: 20, max: 5000, step: 10, nivel: 'basico', ajuda: 'Distância de um ponto ao seguinte, andando sobre o mesmo tiro (não é a distância entre tiros). O app calcula quantos pontos cabem em cada tiro e mostra a distância que de fato ficou.', calibrado: false, fonte: INICIAL },
  boomWidthM: { label: 'Largura da barra', unit: 'm', min: 1, max: 80, step: 0.01, nivel: 'avancado', ajuda: 'Barra do pulverizador M4040 (36,48 m). Não é a bitola entre rodas.', calibrado: true, fonte: OPERACIONAL },
  alignToBoom: { label: 'Tiros em múltiplos da barra', nivel: 'avancado', ajuda: 'Coloca os tiros a múltiplos da barra a partir do ponto A, imitando passadas da máquina (estimativa).', calibrado: false, fonte: INICIAL },
  bearingDeg: { label: 'Direção dos tiros', unit: '°', min: 0, max: 180, step: 0.5, nivel: 'avancado', ui: 'bearing', ajuda: 'Graus a partir do Norte. Vazio = direção da planilha. Mudar só se houver pista nessa direção.', calibrado: false, fonte: 'planilha de coordenadas (referência, não rastro)' },
  minPieceM: { label: 'Trecho mínimo com ponto', unit: 'm', min: 0, max: 1000, step: 10, nivel: 'avancado', ajuda: 'Partes de tiro mais curtas que isto não recebem ponto (aparecem listadas).', calibrado: false, fonte: INICIAL },
  edgePolicy: { label: 'Distância das pontas', nivel: 'avancado', options: Object.values(EDGE_POLICY), ajuda: 'Meia margem: o 1º ponto fica a meio intervalo da borda. Margens iguais: borda e intervalos iguais. Fixa: metros da borda.', calibrado: false, fonte: INICIAL },
  edgeMarginM: { label: 'Margem fixa da borda', unit: 'm', min: 0, max: 1000, step: 5, nivel: 'avancado', ajuda: 'Usada só com "margem fixa": distância do 1º e do último ponto até a borda.', calibrado: false, fonte: INICIAL },
  maxAcceptableGapM: { label: 'Distância máxima aceitável entre pontos', unit: 'm', min: 0, max: 5000, step: 10, nivel: 'avancado', ajuda: 'Se algum intervalo passar disto, o tiro aparece com alerta. Vazio = sem limite.', calibrado: false, fonte: INICIAL },
  'optimizer.mode': { label: 'Prioridade da busca', nivel: 'basico', ui: 'optMode', options: Object.values(OPT_MODE), ajuda: 'Qualidade espacial: reduz áreas longe de ponto. Regularidade: não mexe. Esforço: compara nº de tiros.', calibrado: true, fonte: OPERACIONAL },
  'optimizer.maxGapIncreaseFrac': { label: 'Busca: aumento máximo do maior intervalo', unit: '%', scale: 100, min: 0, max: 1, nivel: 'avancado', ui: 'maxGapIncreasePct', ajuda: 'A busca não pode deixar o maior intervalo de um tiro maior que isto.', calibrado: false, fonte: INICIAL },
  'optimizer.maxCvIncrease': { label: 'Busca: aumento máximo da irregularidade', unit: 'p.p.', scale: 100, min: 0, max: 1, nivel: 'avancado', ui: 'maxCvIncreasePp', ajuda: 'Quanto a variação dos intervalos (CV) pode crescer, em pontos percentuais.', calibrado: false, fonte: INICIAL },
  gapToleranceFrac: { label: 'Folga sobre o intervalo-alvo', unit: '%', scale: 100, min: 0, max: 1, nivel: 'especialista', ajuda: 'Intervalo acima do alvo + esta folga gera alerta.', calibrado: false, fonte: INICIAL },
  snapToleranceM: { label: 'Encaixe ao arrastar ponto', unit: 'm', min: 1, max: 500, nivel: 'especialista', ajuda: 'Ponto solto a até esta distância do tiro é puxado para a linha.', calibrado: false, fonte: INICIAL },
  maxPointsCap: { label: 'Teto de pontos por lote', unit: 'pontos', min: 1, max: 5000, integer: true, nivel: 'especialista', ajuda: 'Protege contra digitação errada (ex.: 5000 pontos).', calibrado: true, fonte: 'proteção do sistema' },
  'monitor.stepLengthM': { label: 'Comprimento do passo', unit: 'm', min: 0.3, max: 1.5, nivel: 'avancado', ui: 'monStepLengthM', ajuda: 'Converte metros em passos no roteiro do monitor.', calibrado: false, fonte: INICIAL },
  'monitor.arrivalRadiusM': { label: 'Distância para "chegou ao ponto"', unit: 'm', min: 1, max: 100, nivel: 'avancado', ui: 'monArrivalRadiusM', ajuda: 'O aviso de chegada dispara a esta distância do ponto.', calibrado: false, fonte: INICIAL },
  'monitor.gpsAccuracyMaxM': { label: 'Precisão de GPS aceitável', unit: 'm', min: 1, max: 200, nivel: 'avancado', ui: 'monGpsAccuracyMaxM', ajuda: 'Acima disto o app avisa que o GPS está impreciso.', calibrado: false, fonte: INICIAL },
  'monitor.offLineWarnM': { label: 'Aviso de saída da linha', unit: 'm', min: 1, max: 500, nivel: 'avancado', ui: 'monOffLineWarnM', ajuda: 'Avisa quando o monitor se afasta mais que isto da linha do tiro.', calibrado: false, fonte: INICIAL },
  trackPhaseM: { label: 'Deslocamento do conjunto de tiros', unit: 'm', min: -5000, max: 5000, nivel: 'sistema', ajuda: 'Escolhido pela recomendação: passadas inteiras da barra a partir do ponto A.', calibrado: true, fonte: 'recomendação do lote' },
  'coverage.gridTargetCells': { label: 'Cobertura: células da grade', unit: 'células', min: 200, max: 20000, integer: true, nivel: 'sistema', ajuda: 'Resolução da grade usada no P95.', calibrado: true, fonte: 'proteção do sistema' },
  'coverage.minStepM': { label: 'Cobertura: passo mínimo da grade', unit: 'm', min: 5, max: 500, nivel: 'sistema', ajuda: 'Menor lado de célula da grade de cobertura.', calibrado: true, fonte: 'proteção do sistema' },
  'coverage.maxStepM': { label: 'Cobertura: passo máximo da grade', unit: 'm', min: 5, max: 2000, nivel: 'sistema', ajuda: 'Maior lado de célula da grade de cobertura.', calibrado: true, fonte: 'proteção do sistema' },
  'optimizer.edgeShiftFrac': { label: 'Busca: deslocamento máximo da margem', unit: '%', scale: 100, min: 0, max: 1, nivel: 'sistema', ajuda: 'Quanto a busca pode mover a margem inicial.', calibrado: false, fonte: INICIAL },
  'optimizer.phaseSteps': { label: 'Busca: candidatos por trecho', unit: 'candidatos', min: 1, max: 41, integer: true, nivel: 'sistema', ajuda: 'Deslocamentos testados em cada trecho.', calibrado: true, fonte: 'proteção do sistema' },
  'optimizer.maxIterations': { label: 'Busca: rodadas', unit: 'rodadas', min: 1, max: 30, integer: true, nivel: 'sistema', ajuda: 'Rodadas de descida coordenada.', calibrado: true, fonte: 'proteção do sistema' },
  'optimizer.searchGridCells': { label: 'Busca: células da grade', unit: 'células', min: 100, max: 5000, integer: true, nivel: 'sistema', ajuda: 'Grade reduzida usada durante a busca.', calibrado: true, fonte: 'proteção do sistema' },
});

export const KNOWN_TOP = Object.freeze(['boomWidthM', 'trackMode', 'trackSpacingM', 'trackCount', 'alignToBoom', 'bearingDeg', 'minPieceM',
  'selectionMode', 'selectionCount', 'selectionIds', 'haPerPoint', 'pointMode', 'totalPoints', 'pointsPerTrack', 'targetSpacingM', 'edgePolicy',
  'edgeMarginM', 'gapToleranceFrac', 'maxAcceptableGapM', 'snapToleranceM', 'maxPointsCap', 'monitor', 'coverage', 'optimizer', 'trackPhaseM']);
export const KNOWN_NESTED = Object.freeze({
  monitor: ['stepLengthM', 'arrivalRadiusM', 'gpsAccuracyMaxM', 'offLineWarnM'],
  coverage: ['gridTargetCells', 'minStepM', 'maxStepM'],
  optimizer: ['mode', 'maxGapIncreaseFrac', 'maxCvIncrease', 'edgeShiftFrac', 'phaseSteps', 'maxIterations', 'allowCountMoves', 'searchGridCells'],
});

/** Valor por caminho com ponto ("optimizer.mode"). */
export const getParam = (params, path) => path.split('.').reduce((o, k) => o?.[k], params);

const withUnit = (def, v) => `${numBR(def.scale ? v * def.scale : v)}${def.unit ? ` ${def.unit}` : ''}`;
const isPlainObject = v => v && typeof v === 'object' && !Array.isArray(v);

/** Problemas {field, ui, message} dos valores presentes (opção inexistente, não número, não inteiro, fora dos limites). */
export function checkParams(params) {
  const out = [];
  for (const [path, d] of Object.entries(CATALOG)) {
    const def = /** @type {any} */ (d);
    if (def.validadoNa) continue;
    const v = getParam(params, path);
    if (v == null) continue;
    const bad = msg => out.push({ field: path, ui: def.ui ?? path, message: `${def.label}: ${msg}` });
    if (def.options) { if (!def.options.includes(v)) bad(`opção "${v}" não existe`); }
    else if (typeof v === 'boolean') continue;
    else if (typeof v !== 'number' || !Number.isFinite(v)) bad('precisa ser um número');
    else if (def.integer && !Number.isInteger(v)) bad('precisa ser um número inteiro');
    else if (def.min !== undefined && v < def.min) bad(`mínimo ${withUnit(def, def.min)}`);
    else if (def.max !== undefined && v > def.max) bad(`máximo ${withUnit(def, def.max)}`);
  }
  return out;
}

/** Recusa (DomainError PARAMETRO_INVALIDO) com todos os problemas; o campo apontado é o primeiro. */
export function assertParams(params) {
  const problems = checkParams(params);
  if (!problems.length) return;
  const first = problems[0];
  throw new DomainError(ERR.PARAMETRO_INVALIDO, problems.map(p => p.message).join('; '), { field: first.ui, value: getParam(params, first.field) });
}

/** Valor para exibir: "—", "sim"/"não", número com unidade ou texto. */
export function displayValue(path, v) {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  return typeof v === 'number' ? withUnit(/** @type {any} */ (CATALOG)[path], v) : String(v);
}

/** Limpa parâmetros gravados: tira chaves desconhecidas e valores inválidos; devolve {clean, removed}. */
export function sanitizeParams(given) {
  const removed = [], clean = {};
  if (!isPlainObject(given)) return { clean, removed: given == null ? [] : ['parâmetros (formato inválido)'] };
  for (const [key, value] of Object.entries(given)) {
    if (!KNOWN_TOP.includes(key)) removed.push(key);
    else if (KNOWN_NESTED[key]) {
      if (!isPlainObject(value)) { removed.push(key); continue; }
      const sub = {};
      for (const [k, v] of Object.entries(value)) if (KNOWN_NESTED[key].includes(k)) sub[k] = v; else removed.push(`${key}.${k}`);
      clean[key] = sub;
    } else if (key === 'selectionIds') {
      if (Array.isArray(value) && value.length <= 500 && value.every(id => typeof id === 'string' && id.length <= 64)) clean[key] = value; else removed.push(key);
    } else clean[key] = value;
  }
  for (const p of checkParams(clean)) {
    const [a, b] = p.field.split('.');
    if (b !== undefined) delete clean[a]?.[b]; else delete clean[a];
    removed.push(p.message);
  }
  const cov = clean.coverage;
  if (cov && cov.minStepM !== undefined && cov.maxStepM !== undefined && cov.minStepM > cov.maxStepM) {
    delete cov.minStepM; delete cov.maxStepM; removed.push('Cobertura: passo mínimo maior que o máximo');
  }
  return { clean, removed };
}
