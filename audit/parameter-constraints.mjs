// Proposta isolada de validação. Nenhum módulo do aplicativo importa este arquivo.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const get = (value, path) => path.split('.').reduce((v, k) => v?.[k], value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export function reviewParameters(patch, schema, context = {}) {
  const issues = [];
  const add = (field, code) => issues.push({ field, code });
  if (!object(patch)) return { valid: false, issues: [{ field: 'parameters', code: 'object-required' }] };
  const resolved = structuredClone(schema.defaults);
  for (const [key, value] of Object.entries(patch)) {
    if (!schema.knownTop.includes(key)) { add(key, 'unknown-parameter'); continue; }
    if (own(schema.knownNested, key)) {
      if (!object(value)) { add(key, 'object-required'); continue; }
      for (const [name, nested] of Object.entries(value)) {
        if (!schema.knownNested[key].includes(name)) add(`${key}.${name}`, 'unknown-parameter');
        else resolved[key][name] = nested;
      }
    } else resolved[key] = value;
  }
  const paths = new Set(Object.keys(schema.catalog));
  for (const [key, value] of Object.entries(schema.defaults)) {
    if (object(value)) for (const name of Object.keys(value)) paths.add(`${key}.${name}`);
    else paths.add(key);
  }
  for (const path of paths) {
    const value = get(resolved, path), def = get(schema.defaults, path), meta = schema.catalog[path] ?? {};
    if (value === undefined && path === 'trackPhaseM') continue;
    if (value === null && def === null) continue;
    if (typeof def === 'boolean') {
      if (typeof value !== 'boolean') add(path, 'boolean-required');
      continue;
    }
    if (path === 'selectionIds') {
      if (!Array.isArray(value) || value.length > 500 || value.some(v => typeof v !== 'string' || !v.trim() || v.length > 64)) add(path, 'invalid-selection-ids');
      else if (new Set(value).size !== value.length) add(path, 'duplicate-selection-id');
      continue;
    }
    if (meta.options) {
      if (!meta.options.includes(value)) add(path, 'unknown-option');
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) { add(path, 'finite-number-required'); continue; }
    if ((meta.integer || path === 'totalPoints') && !Number.isInteger(value)) add(path, 'integer-required');
    if (meta.min !== undefined && value < meta.min) add(path, 'below-minimum');
    if (meta.max !== undefined && value > meta.max) add(path, 'above-maximum');
    if (path === 'totalPoints' && value < 1) add(path, 'positive-count-required');
  }
  if (typeof resolved.coverage.minStepM === 'number' && typeof resolved.coverage.maxStepM === 'number' && resolved.coverage.minStepM > resolved.coverage.maxStepM) add('coverage', 'inverted-step-range');
  if (resolved.alignToBoom === true && resolved.trackMode === 'espacamento' && resolved.trackSpacingM < resolved.boomWidthM) add('trackSpacingM', 'spacing-smaller-than-boom');
  if (resolved.selectionMode === 'manual' && Array.isArray(resolved.selectionIds) && resolved.selectionIds.length === 0) add('selectionIds', 'manual-selection-empty');
  if (resolved.pointMode === 'total' && Number.isInteger(resolved.totalPoints)) {
    if (resolved.totalPoints > resolved.maxPointsCap) add('totalPoints', 'above-point-cap');
    if (Number.isInteger(context.minimumPoints) && resolved.totalPoints < context.minimumPoints) add('totalPoints', 'below-field-minimum');
  }
  if (own(context, 'people') && (!Number.isInteger(context.people) || context.people < 1 || context.people > 20)) add('people', 'integer-between-1-and-20-required');
  if (own(context, 'minimumPoints') && (!Number.isInteger(context.minimumPoints) || context.minimumPoints < 1)) add('minimumPoints', 'positive-integer-required');
  return { valid: issues.length === 0, issues };
}
