// Planejamento conjunto usa somente os dados já embarcados no aplicativo.
// A/B igual identifica referência; não prova passagem entre lotes.
export const SCHMIDT_BLOCK_SCHEMA = 'schmidt.blocks.v1';
export const SCHMIDT_BLOCK_MAPS = ['paramsByField', 'editsByField', 'monitor'];
const blockCopy = value => JSON.parse(JSON.stringify(value));
const blockKey = field => `${field.farm}|${field.code}`;
const blockAxisDifference = (a, b) => Math.abs(((a - b + 270) % 180 + 180) % 180 - 90);
const blockAbsoluteA = f => f.referenceA?.map((v, i) => v + f.centroidUTM[i]);

export function schmidtBlockSourceSignature(fields, members) {
  return JSON.stringify(members.map(key => {
    const f = fields[key];
    if (!f) throw Error('Lote do bloco não está disponível');
    return [key, f.ref, f.referenceA, f.centroidUTM, f.bearing, f.bearingGridCorrection, f.geom, f.areaOfficialHa];
  }));
}

export function schmidtReferenceBlocks(fields) {
  const groups = new Map();
  for (const [key, f] of Object.entries(fields)) {
    if (!f.ref || !Array.isArray(f.referenceA) || f.referenceA.length !== 2 || !blockAbsoluteA(f).every(Number.isFinite)) continue;
    const groupKey = `${f.farm}|${f.ref}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(key);
  }
  const fullGroups = [...groups.entries()].filter(([, members]) => members.length > 1).map(([id, members]) => {
    members.sort();
    const first = fields[members[0]], a = blockAbsoluteA(first);
    const compatible = members.every(key => {
      const f = fields[key], b = blockAbsoluteA(f);
      return f.farm === first.farm && Math.hypot(a[0] - b[0], a[1] - b[1]) <= .05
        && Number.isFinite(f.bearing) && blockAxisDifference(f.bearing, first.bearing) <= .05;
    });
    return { id, members, compatible, reference: first.ref, farm: first.farm,
      title: members.map(key => fields[key].code).join(' + ') };
  }).sort((a, b) => a.id.localeCompare(b.id));
  return fullGroups.flatMap(group => {
    if (group.members.length > 10) return [{ ...group, compatible:false, fullGroup:true, sourceGroup:group.id }];
    const subsets = [];
    for (let mask=1;mask<2**group.members.length;mask++) {
      const members=group.members.filter((_,i)=>mask&(1<<i));
      if (members.length<2) continue;
      const fullGroup=members.length===group.members.length;
      subsets.push({ ...group, members, fullGroup, sourceGroup:group.id,
        id:fullGroup?group.id:group.id+'::'+members.map(k=>fields[k].code).join('+'),
        title:members.map(k=>fields[k].code).join(' + ') });
    }
    return subsets.sort((a,b)=>Number(b.fullGroup)-Number(a.fullGroup)||a.title.localeCompare(b.title));
  });
}

export function schmidtBlockBorderDistance(geom, samples) {
  let minimum=Infinity;
  for (const p of samples) for (const poly of geom) for (const ring of poly) for (let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
    const t=len?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/len)):0;
    minimum=Math.min(minimum,Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy));
  }
  return Number.isFinite(minimum)?minimum:null;
}

export function schmidtCommonBlockFields(fields, members, common) {
  return Object.fromEntries(members.map(key => {
    const f = fields[key];
    if (!f) throw Error('Lote ausente');
    return [key, { ...f, referenceA: common.absoluteA.map((v, i) => v - f.centroidUTM[i]),
      bearingGridCorrection: common.gridCorrection }];
  }));
}

export function validateSchmidtBlocks(state, sanitizeParams) {
  const store = state?.planningBlocks;
  if (store === undefined) return;
  if (!store || store.schema !== SCHMIDT_BLOCK_SCHEMA || !store.records || Array.isArray(store.records)
      || typeof store.records !== 'object' || Object.keys(store.records).length > 64) throw Error('Arquivo de blocos inválido');
  for (const [id, record] of Object.entries(store.records)) {
    if (!record || record.id !== id || !Array.isArray(record.members) || record.members.length < 2 || record.members.length > 10
        || record.members.some(k => typeof k !== 'string' || !/^[^|]{1,40}\|[^|]{1,40}$/.test(k))
        || new Set(record.members).size !== record.members.length || new Set(record.members.map(k => k.split('|')[0])).size !== 1
        || typeof record.sourceSignature !== 'string' || !record.common || !Array.isArray(record.common.absoluteA)
        || record.common.absoluteA.length !== 2 || !record.common.absoluteA.every(Number.isFinite)
        || ![record.common.gridCorrection, record.common.bearingDeg, record.common.spacingM, record.common.phaseM].every(Number.isFinite)
        || record.common.spacingM <= 0 || record.common.phaseM < 0 || record.common.phaseM >= record.common.spacingM
        || !record.state || typeof record.state !== 'object' || !record.assessment
        || typeof record.assessment.coverageTradeoff !== 'boolean') throw Error('Plano do bloco inválido');
    for (const name of SCHMIDT_BLOCK_MAPS) {
      const map = record.state[name];
      if (!map || typeof map !== 'object' || Array.isArray(map)
          || Object.keys(map).some(k => !record.members.includes(k))) throw Error('Dados de lote fora do bloco');
    }
    if (record.members.some(k => !record.state.paramsByField[k])) throw Error('Parâmetros de lote ausentes no bloco');
    for (const p of Object.values(record.state.paramsByField)) {
      if (![p.trackSpacingM,p.trackPhaseM,p.bearingDeg].every(Number.isFinite)
          || p.trackMode !== 'espacamento' || p.alignToBoom !== true || p.boomWidthM !== 36.48
          || Math.abs(Math.floor(p.trackSpacingM / 36.48) * 36.48 - record.common.spacingM) > 1e-7
          || Math.abs(p.trackPhaseM - record.common.phaseM) > 1e-7 || Math.abs(p.bearingDeg - record.common.bearingDeg) > 1e-7
          || p.selectionMode !== 'todos' || p.pointMode !== 'total' || !Number.isInteger(p.totalPoints) || p.totalPoints < 1) throw Error('Parâmetros não mantêm a grade comum do bloco');
    }
    if (sanitizeParams) for (const p of Object.values(record.state.paramsByField)) {
      if (sanitizeParams(p).removed.length) throw Error('Parâmetros do bloco inválidos');
    }
  }
}

// Redistribui pontos pelo motor real em vez de só deslocar os pontos antigos.
// Busca limitada e cancelável; mede cobertura nas mesmas células por lote.
export async function prepareSchmidtBlock({ group, fields, parametersFor, editsFor = () => null, engine, metrics, signal, yieldTask = () => Promise.resolve() }) {
  if (signal?.aborted) throw Error('Preparação cancelada');
  if (!group.compatible) throw Error('Referências diferentes: usar os lotes individualmente');
  const anchor = fields[group.members[0]];
  const common = { absoluteA: blockAbsoluteA(anchor), gridCorrection: anchor.bearingGridCorrection || 0,
    bearingDeg: ((anchor.bearing % 180) + 180) % 180 };
  const commonFields = schmidtCommonBlockFields(fields, group.members, common);
  const originals = {}, cells = {}, baseline = {}, counts = {}, input = {};
  const distanceStats = (grid, samples) => {
    const ds = grid.map(p => Math.min(...samples.map(s => Math.hypot(p[0] - s.x, p[1] - s.y)))).sort((a, b) => a - b);
    if (!ds.length) throw Error('Sem células para comparar cobertura');
    return { p95: ds[Math.min(ds.length - 1, Math.floor(.95 * ds.length))], max: ds.at(-1) };
  };
  for (const key of group.members) {
    const p = blockCopy(parametersFor(fields[key])); input[key] = p;
    if (p.trackMode === 'importado') throw Error('Trajeto importado: manter individual até conferir sua referência');
    let sc = engine.buildScenario(fields[key], p);
    const edits=editsFor(fields[key]);
    if(edits){
      const restored=edits.signature===sc.signature&&engine.restoreSamples(sc,edits.samples);
      if(!restored)throw Error('Ajustes individuais precisam de conferência antes de preparar este bloco');
      sc=engine.withSamples(fields[key],sc,restored);
    }
    originals[key] = sc;
    counts[key] = Math.max(sc.minPoints, sc.samples.length);
    const step = metrics.gridStep(fields[key].geom, { gridTargetCells: 1500, minStepM: 15, maxStepM: 150 });
    const grid = metrics.coverageGrid(fields[key].geom, step);
    cells[key] = Array.from(grid.x, (x, i) => [x, grid.y[i]]);
    baseline[key] = distanceStats(cells[key], sc.samples);
  }
  let best, tested = 0, redistributionCandidates = 0;
  const shortlist = [];
  const bestPerSpacing = new Map();
  // Espaçamentos inteiros da barra confirmada. Inclui os espaçamentos individuais.
  const passes = [...new Set([...Object.values(originals).map(sc => Math.max(3, Math.round(sc.deltaM / 36.48))), 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22])].sort((a, b) => a - b);
  for (const bars of passes) for (let phase = 0; phase < bars; phase++) {
    if (signal?.aborted) throw Error('Preparação cancelada');
    const spacingM = bars * 36.48, phaseM = phase * 36.48;
    const scenarios = {}, params = {}, coverage = {};
    let valid = true, worstRatio = 0, meanRatio = 0;
    for (const key of group.members) {
      const p = { ...input[key], trackMode: 'espacamento', trackSpacingM: spacingM + .000001,
        trackPhaseM: phaseM, alignToBoom: true, boomWidthM: 36.48, bearingDeg: common.bearingDeg,
        selectionMode: 'todos', selectionIds: [], pointMode: 'total', totalPoints: counts[key] };
      let sc;
      try { sc = engine.buildScenario(commonFields[key], p); } catch { valid = false; break; }
      // Recusa o fallback do motor para linha no meio do lote sem fase comum.
      const v = sc.frame.v, origin = commonFields[key].referenceA;
      const offset = origin[0] * v[0] + origin[1] * v[1] + phaseM;
      const aligned = sc.allTracks.every(t => Math.abs((t.offsetM - offset) / spacingM - Math.round((t.offsetM - offset) / spacingM)) < 1e-7);
      if (!aligned || sc.samples.length !== counts[key] || sc.samples.length < sc.minPoints || !sc.units.length) { valid = false; break; }
      const stats = distanceStats(cells[key], sc.samples);
      const ratio = Math.max(stats.p95 / baseline[key].p95, stats.max / baseline[key].max);
      worstRatio = Math.max(worstRatio, ratio); meanRatio += ratio / group.members.length;
      scenarios[key] = sc; params[key] = p; coverage[key] = { before: baseline[key], after: stats, ratio };
    }
    tested++;
    if (valid) {
      const candidate = { scenarios, params, coverage, worstRatio, meanRatio, common: { ...common, spacingM, phaseM } };
      if (!bestPerSpacing.has(bars) || worstRatio < bestPerSpacing.get(bars).worstRatio) bestPerSpacing.set(bars, candidate);
      shortlist.push(candidate);
      shortlist.sort((a,b)=>a.worstRatio-b.worstRatio||a.meanRatio-b.meanRatio);
      shortlist.splice(6);
    }
    if (tested % 2 === 0) await yieldTask();
  }
  if (!shortlist.length) throw Error('Não foi encontrada grade comum com o mínimo de cada lote; individual preservado');
  for (const candidate of bestPerSpacing.values()) if (!shortlist.includes(candidate)) shortlist.push(candidate);
  // A grade comum não deve esconder perda de cobertura. Redistribui pelo
  // motor e acrescenta somente o necessário dentro de um orçamento explícito.
  // Se não resolver, mantém como revisão e não libera aplicação pela UI.
  for (const candidate of shortlist) {
   const addedPointsByField = {};
   for (const key of group.members) {
    const originalCount = counts[key];
    const cap = Math.min(input[key].maxPointsCap, Math.max(originalCount + 10, Math.ceil(originalCount * 1.5)));
    for (let n = originalCount + 1; candidate.coverage[key].ratio > 1 + 1e-6 && n <= cap; n++) {
      if (signal?.aborted) throw Error('Preparação cancelada');
      const p = { ...candidate.params[key], totalPoints: n };
      const sc = engine.buildScenario(commonFields[key], p);
      redistributionCandidates++;
      if (sc.samples.length !== n) continue;
      const stats = distanceStats(cells[key], sc.samples);
      const ratio = Math.max(stats.p95 / baseline[key].p95, stats.max / baseline[key].max);
      // Não troca por uma alternativa que piora a comparação anterior.
      if (ratio < candidate.coverage[key].ratio) {
        candidate.params[key] = p; candidate.scenarios[key] = sc;
        candidate.coverage[key] = { before: baseline[key], after: stats, ratio };
      }
      await yieldTask();
    }
    addedPointsByField[key] = candidate.scenarios[key].samples.length - originalCount;
   }
   candidate.worstRatio = Math.max(...Object.values(candidate.coverage).map(x=>x.ratio));
   candidate.addedPointsByField = addedPointsByField;
   candidate.extraCount = Object.values(addedPointsByField).reduce((a,b)=>a+b,0);
  }
  shortlist.sort((a,b)=>Number(a.worstRatio>1+1e-6)-Number(b.worstRatio>1+1e-6)
    || (a.worstRatio>1+1e-6 ? a.worstRatio-b.worstRatio : a.extraCount-b.extraCount)
    || a.worstRatio-b.worstRatio);
  best = shortlist[0];
  return { id: group.id, members: [...group.members], sourceSignature: schmidtBlockSourceSignature(fields, group.members),
    common: best.common, state: { paramsByField: best.params, editsByField: {}, monitor: {} },
    assessment: { tested, redistributionCandidates, coverage: best.coverage, worstRatio: best.worstRatio, addedPointsByField: best.addedPointsByField,
      minimumBorderMByField:Object.fromEntries(group.members.map(k=>[k,schmidtBlockBorderDistance(fields[k].geom,best.scenarios[k].samples)])),
      coverageTradeoff: best.worstRatio > 1 + 1e-6, routeValidated: false, timeSavingMeasured: false },
    createdAt: new Date().toISOString() };
}

let schmidtBlockController;
export function installSchmidtBlockHistoryIsolation(history) {
  const list = history.listar, write = history.gravar;
  history.listar = (...args) => schmidtBlockController?.active ? Promise.resolve([]) : list(...args);
  history.gravar = (...args) => schmidtBlockController?.active ? Promise.resolve(null) : write(...args);
}
export function serializeSchmidtBlockState(state) {
  return schmidtBlockController ? schmidtBlockController.serialize(state) : state;
}

// As três coleções continuam na chave abrangida pelo backup/journal/lock atuais.
// Uma escrita síncrona grava o registro completo antes de trocar o escopo em RAM.
export function createSchmidtBlockController({ app, save, refresh, stopGPS = () => {} }) {
  validateSchmidtBlocks(app.saved);
  let active = null, individual = null;
  const originalFields = { ...app.fields };
  const take = state => Object.fromEntries(SCHMIDT_BLOCK_MAPS.map(name => [name, blockCopy(state[name] || {})]));
  const records = () => app.saved.planningBlocks?.records || {};
  const controller = {
    get active() { return active; },
    get commonBearing() { return active ? records()[active].common.bearingDeg : null; },
    get records() { return blockCopy(records()); },
    serialize(state) {
      if (!active || state !== app.saved) return state;
      const store = { schema: SCHMIDT_BLOCK_SCHEMA, records: { ...records(), [active]: { ...records()[active], state: take(state) } } };
      validateSchmidtBlocks({ planningBlocks: store });
      return { ...state, ...individual, planningBlocks: store };
    },
    enter(record) {
      if (active) throw Error('Volte ao individual antes de trocar o bloco');
      if (!record?.assessment || record.assessment.coverageTradeoff) throw Error('Bloco precisa de revisão de cobertura; individual preservado');
      const store = { schema: SCHMIDT_BLOCK_SCHEMA, records: { ...records(), [record.id]: blockCopy(record) } };
      validateSchmidtBlocks({ planningBlocks: store });
      if (record.sourceSignature !== schmidtBlockSourceSignature(originalFields, record.members)) throw Error('Os dados do lote mudaram; prepare o bloco novamente');
      const next = { ...app.saved, planningBlocks: store };
      if (!save(next)) throw Error('Não foi possível salvar o bloco; individual preservado');
      stopGPS(); individual = take(app.saved); app.saved.planningBlocks = store;
      for (const name of SCHMIDT_BLOCK_MAPS) app.saved[name] = blockCopy(record.state[name]);
      Object.assign(app.fields, schmidtCommonBlockFields(originalFields, record.members, record.common));
      active = record.id; refresh(record.members[0]);
    },
    leave() {
      if (!active) return;
      const canonical = controller.serialize(app.saved);
      if (!save(canonical)) throw Error('Não foi possível salvar; o bloco continua aberto');
      stopGPS();
      app.saved.planningBlocks = canonical.planningBlocks;
      for (const name of SCHMIDT_BLOCK_MAPS) app.saved[name] = individual[name];
      Object.assign(app.fields, originalFields);
      active = null; individual = null;
      refresh(app.field ? blockKey(app.field) : Object.keys(originalFields)[0]);
    },
  };
  schmidtBlockController = controller;
  return controller;
}
