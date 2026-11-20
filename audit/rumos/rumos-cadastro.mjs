import { loadFields } from '../../audit/legacy-engine.mjs';
import { axisDifferenceDeg } from '../../src/engine3/dataQuality.mjs';
import { pointInGeom } from '../../src/engine3/geometry.mjs';
const F = await loadFields(), rows = [];
const ax = (dx, dy) => ((Math.atan2(dx, dy) * 180 / Math.PI) + 360) % 180;
for (const [k, f] of Object.entries(F).sort()) {
  // convergência meridiana UTM (fuso pela longitude): gamma = atan(tan(dλ)·sen φ)
  const zone = Math.floor((f.lon + 180) / 6) + 1, l0 = zone * 6 - 183, dl = (f.lon - l0) * Math.PI / 180, ph = f.lat * Math.PI / 180;
  const gamma = Math.atan(Math.tan(dl) * Math.sin(ph)) * 180 / Math.PI;
  // eixos do contorno: histograma de arestas (peso = comprimento), janela de ±2°
  const hist = new Float64Array(180); let per = 0;
  for (const pg of f.geom) for (const r of pg) for (let i = 1; i < r.length; i++) { const dx = r[i][0] - r[i-1][0], dy = r[i][1] - r[i-1][1], L = Math.hypot(dx, dy); hist[Math.round(ax(dx, dy)) % 180] += L; per += L; }
  let best = 0, bw = 0; for (let a = 0; a < 180; a++) { let w = 0; for (let d = -2; d <= 2; d++) w += hist[(a + d + 180) % 180]; if (w > bw) { bw = w; best = a; } }
  // a fração do contorno paralela ao rumo da planilha (±2°)
  const gridBearing = ((f.bearing + (f.bearingGridCorrection || 0)) % 180 + 180) % 180;
  let par = 0; for (let a = 0; a < 180; a++) if (axisDifferenceDeg(a, gridBearing) <= 2) par += hist[a];
  // retângulo de menor área (orientação)
  let rect = 0, ra = Infinity; const pts = f.geom.flat(2);
  for (let a = 0; a < 180; a += 0.5) { const t = a * Math.PI / 180, u = [Math.sin(t), Math.cos(t)], v = [Math.cos(t), -Math.sin(t)];
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; for (const p of pts) { const s = p[0]*u[0]+p[1]*u[1], q = p[0]*v[0]+p[1]*v[1]; a0 = Math.min(a0, s); a1 = Math.max(a1, s); b0 = Math.min(b0, q); b1 = Math.max(b1, q); }
    const A = (a1 - a0) * (b1 - b0); if (A < ra) { ra = A; rect = (a1 - a0) >= (b1 - b0) ? a : (a + 90) % 180; } }
  const A = f.referenceA, aIn = A ? pointInGeom(A[0], A[1], f.geom) : null;
  rows.push({ k, rumo: f.bearing, ab: f.bearingCalc, dAB: f.bearingCalc != null ? axisDifferenceDeg(f.bearing, f.bearingCalc) : null, abM: f.refDistanceM,
    corr: f.bearingGridCorrection, gamma, dCorr: Math.abs(-gamma - (f.bearingGridCorrection || 0)), eixoBorda: best, dBorda: axisDifferenceDeg(gridBearing, best),
    fracParalela: par / per, eixoRet: rect, dRet: axisDifferenceDeg(gridBearing, rect), aDentro: aIn, flags: (f.flags || []).filter(x => /rumo|ponto a/i.test(x)) });
}
console.log(JSON.stringify(rows));
