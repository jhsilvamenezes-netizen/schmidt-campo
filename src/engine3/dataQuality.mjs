// Motor 2 · qualidade do cadastro do lote: limite, rumo, pontos A/B e áreas (reescrita do módulo dataQuality do 0.5.1).
// Só aponta; nunca corrige o limite nem inventa divisa (regra do projeto).
import { geomArea, pointInGeom, segmentIntersectionT, validateGeom } from './geometry.mjs';
import { TOLERANCES } from './tolerances.mjs';
import { numBR } from './numero.mjs';

export const QUALITY_LIMITS = Object.freeze({ spikeAngleDeg: 3, shortEdgeM: 1, weakABDistanceM: 50, derivedBearingTolDeg: 0.05,
  bearingDivergenceDeg: 1, areaDiffFrac: 0.005 });

const fmt = (v, d = 1) => numBR(v, d, d);

/** Diferença entre dois rumos no eixo das linhas (0–90°: 10° e 190° são a mesma linha). */
export function axisDifferenceDeg(a, b) {
  const d = (((a - b) % 180) + 180) % 180;
  return Math.min(d, 180 - d);
}

function edgesOf(ring) {
  const n = ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.length - 1 : ring.length;
  return Array.from({ length: n }, (_, i) => [ring[i], ring[(i + 1) % n]]);
}

/** Cruzamentos do anel com ele mesmo (arestas não vizinhas). */
export function selfIntersections(ring) {
  const E = edgesOf(ring), eps = TOLERANCES.SEGMENT_T_EPS;
  let count = 0;
  for (let i = 0; i < E.length; i++) for (let j = i + 2; j < E.length; j++) {
    if (i === 0 && j === E.length - 1) continue;
    const t = segmentIntersectionT(E[i][0], E[i][1], E[j][0], E[j][1]);
    if (t !== null && t > eps && t < 1 - eps) count++;
  }
  return count;
}

/** Vértices em "espinho" (ângulo interno < spikeAngleDeg) e arestas curtas (< shortEdgeM). */
export function vertexIssues(ring, limits = QUALITY_LIMITS) {
  const E = edgesOf(ring), spikes = [];
  let shortEdges = 0;
  for (let i = 0; i < E.length; i++) {
    const [a, o] = E[i], c = E[(i + 1) % E.length][1];
    if (Math.hypot(o[0] - a[0], o[1] - a[1]) < limits.shortEdgeM) shortEdges++;
    const u = [a[0] - o[0], a[1] - o[1]], v = [c[0] - o[0], c[1] - o[1]], lu = Math.hypot(...u), lv = Math.hypot(...v);
    if (!lu || !lv) continue;
    const angleDeg = (Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lu * lv)))) * 180) / Math.PI;
    if (angleDeg < limits.spikeAngleDeg) spikes.push({ at: o, angleDeg });
  }
  return { spikes, shortEdges };
}

const cache = new WeakMap();

/** Lista de achados {level, code, message, action?} do cadastro de um lote (cache por lote com os limites padrão). */
export function assessField(field, limits = QUALITY_LIMITS) {
  if (cache.has(field) && limits === QUALITY_LIMITS) return cache.get(field);
  const out = [], add = (level, code, message, action) => out.push({ level, code, message, ...(action ? { action } : {}) });
  const invalid = validateGeom(field.geom);
  for (const msg of invalid) add('erro', 'geometria_invalida', msg, 'Corrigir o limite no cadastro antes de planejar.');
  let crossings = 0, shortEdges = 0;
  const spikes = [];
  if (!invalid.length) for (const polygon of field.geom) for (const ring of polygon) {
    crossings += selfIntersections(ring);
    const v = vertexIssues(ring, limits);
    spikes.push(...v.spikes); shortEdges += v.shortEdges;
  }
  if (crossings) add('erro', 'auto_intersecao', `O limite cruza a si mesmo em ${crossings} ponto(s).`, 'Corrigir o desenho do lote no KML.');
  if (spikes.length) add('alerta', 'espinho', `O limite tem ${spikes.length} vértice(s) com ângulo muito fechado (${fmt(Math.min(...spikes.map(s => s.angleDeg)))}°): provável erro de digitalização.`,
    'Conferir o contorno do lote no KML/cadastro.');
  if (shortEdges) add('info', 'vertices_proximos', `${shortEdges} aresta(s) com menos de ${limits.shortEdgeM} m no limite.`);
  for (const flag of field.flags || []) {
    if (/sobrepost|repetid/i.test(flag)) {
      if (crossings) add('alerta', 'origem_kml', flag);
      else add('info', 'origem_kml_corrigida', `No KML original: ${flag.replace(/\s*—.*$/, '')}. A geometria usada aqui foi unificada e não tem sobreposição.`);
    } else if (!/ponto a|rumo informado/i.test(flag)) add('alerta', 'origem_kml', flag);
  }
  if (Number.isFinite(field.bearing) && Number.isFinite(field.bearingCalc)) {
    const diff = axisDifferenceDeg(field.bearing, field.bearingCalc), weak = field.refDistanceM !== undefined && field.refDistanceM < limits.weakABDistanceM;
    // P6 · Rio de Janeiro: rumo conferido com o dono (configuração aprovada), sem alerta de divergência
    if (diff > limits.bearingDivergenceDeg && !(field.code === 'P6' && field.farm === 'Rio de Janeiro'))
      add('alerta', 'rumo_divergente', `Rumo da planilha (${fmt(field.bearing)}°) e direção de A para B (${fmt(field.bearingCalc)}°) diferem ${fmt(diff)}° no eixo das linhas.`,
        'Confirmar com a equipe ou com a pista GNSS do pulverizador qual direção está certa antes de ir a campo.');
    else if (weak && diff <= limits.derivedBearingTolDeg)
      add('info', 'b_derivado', `O ponto B da planilha fica a ${fmt(field.refDistanceM, 2)} m de A, exatamente na direção do rumo: foi gerado a partir do rumo. A direção das linhas ainda não foi conferida em campo.`,
        'Quando possível, importar a pista GNSS do pulverizador para confirmar.');
    else if (weak) add('alerta', 'rumo_fraco', `Pontos A e B distam só ${fmt(field.refDistanceM, 2)} m: pouco para definir a direção das linhas.`, 'Conferir a direção em campo ou com a pista GNSS.');
  }
  if (field.referenceA && !pointInGeom(field.referenceA[0], field.referenceA[1], field.geom))
    add('info', 'ponto_a_fora', 'O ponto A da referência fica fora do limite do lote (usado só como âncora das linhas).');
  if (field.areaKMLHa && field.areaOfficialHa && Math.abs(field.areaOfficialHa - field.areaKMLHa) / field.areaOfficialHa > limits.areaDiffFrac)
    add('info', 'area_divergente', `Área publicada ${fmt(field.areaOfficialHa, 2)} ha × desenho KML ${fmt(field.areaKMLHa, 2)} ha. O mínimo de pontos usa a área publicada.`);
  const recalculated = invalid.length ? null : geomArea(field.geom) / 1e4;
  if (recalculated !== null && field.areaKMLHa && Math.abs(recalculated - field.areaKMLHa) / field.areaKMLHa > 0.01)
    add('alerta', 'area_recalculada', `Área recalculada (${fmt(recalculated, 2)} ha) difere da área KML declarada.`);
  if (limits === QUALITY_LIMITS) cache.set(field, out);
  return out;
}
