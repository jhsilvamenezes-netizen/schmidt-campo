// Contratos de estudo: sem DOM, armazenamento, gerador geométrico ou integração ao app.
const nonempty = v => typeof v === 'string' && !!v.trim();
const finiteNonnegative = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const freeze = v => {
  if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); }
  return v;
};
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;

export function createPlanningRequest({ scope, fields, people, clearanceByField,
  operationRevision, accessRevision, startRef, endRef, samplingMode = 'uniform' }) {
  if (!['individual', 'block'].includes(scope)) throw Error('Escopo desconhecido');
  if (!Array.isArray(fields) || (scope === 'individual' ? fields.length !== 1 : fields.length < 2)) throw Error('Quantidade de lotes incompatível com escopo');
  if (!Number.isInteger(people) || people < 1 || people > 20) throw Error('Equipe deve ser inteira entre 1 e 20');
  if (!['uniform', 'directed'].includes(samplingMode)) throw Error('Amostragem desconhecida');
  if (![operationRevision, accessRevision, startRef, endRef].every(nonempty)) throw Error('Contexto de operação/acesso/partida/chegada ausente');
  const keys = fields.map(f => f?.key);
  if (!keys.every(nonempty) || new Set(keys).size !== keys.length) throw Error('Lotes inválidos ou repetidos');
  if (!clearanceByField || typeof clearanceByField !== 'object' || Array.isArray(clearanceByField) || Object.keys(clearanceByField).sort().join('\0') !== [...keys].sort().join('\0')) throw Error('Recuo deve identificar cada lote');
  const refs = fields.map(f => {
    if (![f.geometryRevision, f.parametersRevision, f.ruleRevision].every(nonempty) || !Number.isSafeInteger(f.minimumPoints) || f.minimumPoints < 1) throw Error('Snapshot do lote incompleto');
    const clearance = clearanceByField[f.key];
    if (clearance !== null && !finiteNonnegative(clearance)) throw Error('Recuo inválido; indefinido deve ser null');
    return { key: f.key, geometryRevision: f.geometryRevision, parametersRevision: f.parametersRevision,
      ruleRevision: f.ruleRevision, minimumPoints: f.minimumPoints, clearanceM: clearance };
  }).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const comparison = { fields: refs, people, operationRevision, accessRevision, startRef, endRef, samplingMode };
  // Assinatura canônica de comparação, não hash de segurança nem prova de campo.
  const comparisonKey = JSON.stringify(canonical(comparison));
  return freeze({ schema: 'schmidt.planning-request.v1-study', scope,
    strategy: scope === 'individual' ? 'existing-individual-engine' : 'shared-grid',
    ...comparison, comparisonKey,
    unresolvedClearance: refs.filter(f => f.clearanceM === null).map(f => f.key) });
}

export function assessAccessGraph(fieldKeys, links, { startField, requireReturn = false } = {}) {
  if (!Array.isArray(fieldKeys) || !fieldKeys.length || new Set(fieldKeys).size !== fieldKeys.length || !fieldKeys.every(nonempty) || !fieldKeys.includes(startField)) throw Error('Lotes/partida inválidos');
  if (!Array.isArray(links) || typeof requireReturn !== 'boolean') throw Error('Ligações/retorno inválidos');
  const graph = new Map(fieldKeys.map(k => [k, new Set()]));
  const reverse = new Map(fieldKeys.map(k => [k, new Set()]));
  const ids = new Set(), pending = [];
  const add = (a, b) => { graph.get(a).add(b); reverse.get(b).add(a); };
  for (const link of links) {
    if (!nonempty(link.id) || ids.has(link.id) || !graph.has(link.from) || !graph.has(link.to) || link.from === link.to || typeof link.bidirectional !== 'boolean' || !['pending', 'confirmed'].includes(link.state)) throw Error('Ligação inválida/repetida');
    ids.add(link.id);
    if (link.state !== 'confirmed') { pending.push(link.id); continue; }
    if (!nonempty(link.pathRevision) || !finiteNonnegative(link.distanceM)) throw Error('Ligação confirmada exige caminho e distância');
    add(link.from, link.to);
    if (link.bidirectional) add(link.to, link.from);
  }
  const visit = map => {
    const seen = new Set([startField]), queue = [startField];
    for (let i = 0; i < queue.length; i++) for (const next of map.get(queue[i])) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    return fieldKeys.filter(k => !seen.has(k));
  };
  const unreachable = visit(graph), cannotReturn = visit(reverse);
  return { allReachable: !unreachable.length, allCanReturn: !cannotReturn.length,
    eligibleForRouteSearch: !unreachable.length && (!requireReturn || !cannotReturn.length),
    unreachable, cannotReturn, pending, routeValidated: false };
}

export function compareEffort(request, individualBatch, block) {
  if (request.scope !== 'block') throw Error('Comparação conjunta exige pedido de bloco');
  const reasons = [];
  const total = metrics => {
    const distances = ['samplingM', 'withinFieldTransferM', 'betweenFieldTransferM', 'approachReturnM'].map(k => metrics?.[k]);
    if (!distances.every(finiteNonnegative)) return null;
    const sum = distances.reduce((a, b) => a + b, 0);
    return Number.isFinite(sum) ? sum : null;
  };
  for (const [name, candidate] of [['individual', individualBatch], ['block', block]]) {
    if (candidate?.comparisonKey !== request.comparisonKey) reasons.push(`${name}:stale-or-different-context`);
    if (candidate?.routeValidated !== true) reasons.push(`${name}:route-not-validated`);
    const counts = candidate?.pointsByField ?? {}, coverage = candidate?.coverageAcceptedByField ?? {};
    const expectedKeys = request.fields.map(f => f.key).sort();
    if (Object.keys(counts).sort().join('\0') !== expectedKeys.join('\0') || Object.keys(coverage).sort().join('\0') !== expectedKeys.join('\0')) reasons.push(`${name}:field-set-mismatch`);
    for (const field of request.fields) {
      if (!Number.isSafeInteger(counts[field.key]) || counts[field.key] < field.minimumPoints) reasons.push(`${name}:minimum:${field.key}`);
      if (coverage[field.key] !== true) reasons.push(`${name}:coverage:${field.key}`);
    }
    const sum = total(candidate?.distances), work = candidate?.workloadByPersonM;
    if (sum === null) reasons.push(`${name}:missing-distance-component`);
    if (!Array.isArray(work) || work.length !== request.people || !work.every(finiteNonnegative) || sum === null || Math.abs(work.reduce((a, b) => a + b, 0) - sum) > 1e-6) reasons.push(`${name}:workload-incomplete`);
  }
  if (request.unresolvedClearance.length) reasons.push('clearance-not-defined');
  if (reasons.length) return { status: 'not-comparable', reasons, timeSavingVerified: false };
  const a = total(individualBatch.distances), b = total(block.distances);
  const reduction = a - b;
  const maxWorkReduction = Math.max(...individualBatch.workloadByPersonM) - Math.max(...block.workloadByPersonM);
  const count = candidate => Object.values(candidate.pointsByField).reduce((x, y) => x + y, 0);
  return { status: 'comparable-estimates', individualDistanceM: a, blockDistanceM: b,
    distanceReductionM: reduction, distanceReductionPercent: a > 0 ? 100 * reduction / a : null,
    maxPersonDistanceReductionM: maxWorkReduction, sampleCountDelta: count(block) - count(individualBatch),
    tradeoff: reduction > 0 && (maxWorkReduction < 0 || count(block) > count(individualBatch)),
    recommendation: 'requires-operational-review', timeSavingVerified: false };
}
