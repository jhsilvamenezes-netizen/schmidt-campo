// 4.0.2 · guarda de qualidade do motor: retrato do plano recomendado (5 pessoas) nos 51 lotes.
// Uso: `node engine-quality.mjs` compara com engine-quality-baseline.json; `--update --motivo "…"` grava um retrato
// novo (só quando a mudança for intencional e medida; o motivo e o que mudou ficam no histórico do arquivo). O teste engine-quality.test.mjs usa as mesmas funções.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadFields } from './lotes.mjs';
import * as P from '../src/app3/planner.mjs';

export const BASELINE = fileURLToPath(new URL('./engine-quality-baseline.json', import.meta.url));
/** Folga só para arredondamento de ponto flutuante: qualquer piora real reprova. */
export const TOL = Object.freeze({ m: 0.5, frac: 0.001, ha: 0.05 });
const PEOPLE = 5;
const r1 = x => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);

/** Raio de cobertura ótimo teórico (grade hexagonal) para n pontos numa área A (m²): o piso do "maior vazio". */
export const hexRadiusM = (areaM2, n) => Math.sqrt((2 * areaM2) / (3 * Math.sqrt(3) * n));

export function measure(field) {
  const rec = P.recommend(field, {}, PEOPLE, false), sc = P.planInUse(field, rec.chosen.params, null);
  const areas = P.pointAreas(field, sc), border = P.borderStats(field, sc), blind = P.uncovered(field, sc), team = P.team(sc, PEOPLE);
  const hex = hexRadiusM(field.areaOfficialHa * 1e4, sc.samples.length);
  return {
    pontos: sc.samples.length, minimo: sc.minPoints, tiros: sc.selected.length,
    p95M: r1(sc.coverage.p95), maiorVazioM: r1(areas.worstGapM), razaoHex: Math.round((areas.worstGapM / hex) * 1000) / 1000,
    descobertoHa: r1(blind.haBlind), caminhadaKm: Math.round(sc.route.totalEstimatedM) / 1000,
    pessoaMaisLongaKm: Math.round(team.maxM) / 1000, tirosSemPonto: sc.trackRows.filter(r => r.empty).length,
    umPontoNoMeio: P.middleOnes(field, sc), bordaMinM: r1(border.minM),
  };
}

export async function measureAll() {
  const fields = await loadFields(), out = {};
  for (const k of Object.keys(fields).sort()) out[k] = measure(fields[k]);
  return out;
}

/** Compara dois retratos. Devolve {pioras, melhoras, mudancas}: listas de textos "lote: métrica a → b". */
export function compare(base, now) {
  const pioras = [], melhoras = [], mudancas = [];
  const up = (k, m, a, b, tol) => { if (b > a + tol) pioras.push(`${k}: ${m} ${a} → ${b}`); else if (b < a - tol) melhoras.push(`${k}: ${m} ${a} → ${b}`); };
  for (const k of Object.keys(base)) {
    const a = base[k], b = now[k];
    if (!b) { pioras.push(`${k}: lote sumiu`); continue; }
    for (const m of ['p95M', 'maiorVazioM']) up(k, m, a[m], b[m], Math.max(TOL.m, a[m] * TOL.frac));
    up(k, 'descobertoHa', a.descobertoHa, b.descobertoHa, TOL.ha);
    for (const m of ['caminhadaKm', 'pessoaMaisLongaKm']) up(k, m, a[m], b[m], Math.max(0.001, a[m] * TOL.frac));
    for (const m of ['tirosSemPonto', 'umPontoNoMeio']) up(k, m, a[m], b[m], 0);
    // borda: menor é pior; abaixo da mínima (15 m) nunca pode cair
    if (b.bordaMinM < a.bordaMinM - TOL.m && (b.bordaMinM < P.BORDA_MIN_M || b.bordaMinM < a.bordaMinM - 5)) pioras.push(`${k}: bordaMinM ${a.bordaMinM} → ${b.bordaMinM}`);
    if (b.pontos < b.minimo) pioras.push(`${k}: ${b.pontos} pontos, abaixo do mínimo ${b.minimo}`);
    for (const m of ['pontos', 'tiros']) if (a[m] !== b[m]) mudancas.push(`${k}: ${m} ${a[m]} → ${b[m]}`);
  }
  for (const k of Object.keys(now)) if (!base[k]) mudancas.push(`${k}: lote novo`);
  return { pioras, melhoras, mudancas };
}

export function summary(snap) {
  const v = Object.values(snap), med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  return { lotes: v.length, pontos: v.reduce((s, x) => s + x.pontos, 0), caminhadaKm: Math.round(v.reduce((s, x) => s + x.caminhadaKm, 0) * 10) / 10,
    razaoHexMediana: med(v.map(x => x.razaoHex)), razaoHexMax: Math.max(...v.map(x => x.razaoHex)), umPontoNoMeio: v.reduce((s, x) => s + x.umPontoNoMeio, 0),
    bordaAbaixoMin: v.filter(x => x.bordaMinM < P.BORDA_MIN_M).length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = Date.now(), now = await measureAll();
  if (process.argv.includes('--update')) {
    const i = process.argv.indexOf('--motivo'), motivo = i > 0 ? process.argv[i + 1] : null;
    if (!motivo) { console.error('--update pede --motivo "o que mudou e por quê" (fica no histórico do retrato)'); process.exit(2); }
    let old = null; try { old = JSON.parse(readFileSync(BASELINE, 'utf8')); } catch { /* primeiro retrato */ }
    const diff = old ? compare(old.lotes, now) : { pioras: [], melhoras: [], mudancas: [] };
    const historico = [...(old?.historico || []), { motor: P.ENGINE_LABEL, data: new Date().toISOString().slice(0, 10), motivo, ...diff }];
    writeFileSync(BASELINE, JSON.stringify({ motor: P.ENGINE_LABEL, resumo: summary(now), historico, lotes: now }, null, 1) + '\n');
    console.log('retrato gravado', summary(now));
  } else {
    const base = JSON.parse(readFileSync(BASELINE, 'utf8')), r = compare(base.lotes, now);
    console.log(`motor ${P.ENGINE_LABEL} vs retrato ${base.motor} (${((Date.now() - t) / 1000).toFixed(1)} s)`, summary(now));
    for (const [t2, l] of Object.entries(r)) if (l.length) console.log(`\n${t2} (${l.length}):\n  ` + l.join('\n  '));
    process.exitCode = r.pioras.length ? 1 : 0;
  }
}
