// Motor 2 · tiros retos (método linear, sem anéis): direção, deslocamentos de lado, seleção e recorte.
// Reescrita legível do módulo tracks do motor 0.5.1, com o mesmo resultado (teste diferencial nos 51 lotes).
// Anéis (buildCircularTracks) existem só para abrir dados legados; o método vigente é linear.
import { TOLERANCES } from './tolerances.mjs';
import { clipPolylineToGeom } from './clip.mjs';
import { circlePolyline, lengthOf } from './polyline.mjs';
import { geomCentroid } from './geometry.mjs';

const { SAME_OFFSET_EPS_M } = TOLERANCES;

export const TRACK_KINDS = Object.freeze({
  referencia_linear: { confidence: 'baixa', label: 'Reta estimada pelo rumo (não é rastro)' },
  curva_desenhada: { confidence: 'baixa', label: 'Curva desenhada/estimada (não é rastro)' },
  pista_gnss: { confidence: 'media', label: 'Pista GNSS importada do pulverizador' },
  trajeto_gps_equipe: { confidence: 'alta', label: 'Trajeto GPS executado pela equipe' },
});
export const trackKindLabel = kind => TRACK_KINDS[kind]?.label ?? kind;

/**
 * Referencial do tiro. bearingDeg: rumo verdadeiro da planilha; gridCorrection: correção para a grade UTM
 * (= −convergência meridiana, conferida com PROJ). u: direção de caminhada; v: direção "de lado" (u girado 90°).
 */
export function trackFrame(bearingDeg, gridCorrectionDeg = 0) {
  const a = (bearingDeg + gridCorrectionDeg) * Math.PI / 180, u = [Math.sin(a), Math.cos(a)];
  return { u, v: [-u[1], u[0]] };
}

const dot = (p, d) => p[0] * d[0] + p[1] * d[1];

/** Faixa [min, max] da projeção do lote numa direção. */
export function projectionRange(geom, direction) {
  let min = Infinity, max = -Infinity;
  for (const polygon of geom) for (const ring of polygon) for (const p of ring) {
    const t = dot(p, direction); if (t < min) min = t; if (t > max) max = t;
  }
  return [min, max];
}

/**
 * Deslocamentos de lado (ao longo de v) de cada tiro.
 * - quantidade: N faixas iguais, tiro no meio de cada; com barra e referência, cada um vai para o múltiplo da
 *   barra mais próximo a partir da referência (A + fase), descartando os que saem do lote ou coincidem.
 * - espaçamento com barra e referência: passadas = ⌊espaçamento/barra⌋ (mín. 1); tiros em A + fase + k·passo
 *   dentro do lote (no máximo 400); se nenhum couber, um tiro no meio.
 * - espaçamento livre: o menor número de faixas iguais com largura ≤ espaçamento, tiro no meio de cada.
 */
export function straightOffsets(geom, v, params) {
  const [min, max] = projectionRange(geom, v), width = max - min, boom = params.boomWidthM;
  const ref = params.anchor ? dot(params.anchor, v) + (Number(params.trackPhaseM) || 0) : null;
  if (params.trackMode === 'quantidade') {
    const n = Math.max(1, Math.round(params.trackCount)), step = width / n;
    let offsets = Array.from({ length: n }, (_, i) => min + (i + 0.5) * step);
    if (params.alignToBoom && boom > 0 && ref !== null) {
      offsets = offsets.map(o => ref + Math.round((o - ref) / boom) * boom).filter(o => o > min && o < max);
      offsets = offsets.filter((o, i) => i === 0 || Math.abs(o - offsets[i - 1]) > SAME_OFFSET_EPS_M);
    }
    return { offsets, deltaM: step, passes: 0, anchored: !!(params.alignToBoom && ref !== null) };
  }
  const spacing = params.trackSpacingM;
  if (!(spacing > 0)) throw Error('Espaçamento entre tiros deve ser positivo');
  if (params.alignToBoom && boom > 0 && ref !== null) {
    const passes = Math.max(1, Math.floor(spacing / boom)), step = passes * boom;
    const first = Math.ceil((min - ref) / step), last = Math.floor((max - ref) / step), offsets = [];
    for (let k = first; k <= last && offsets.length < 400; k++) offsets.push(ref + k * step);
    return { offsets: offsets.length ? offsets : [(min + max) / 2], deltaM: step, passes, anchored: true };
  }
  const n = Math.max(1, Math.ceil(width / spacing)), step = width / n;
  return { offsets: Array.from({ length: n }, (_, i) => min + (i + 0.5) * step), deltaM: step, passes: 0, anchored: false };
}

/** Tiros retos atravessando todo o lote (1 m além de cada lado), antes do recorte. */
export function buildStraightTracks(field, params) {
  const bearing = params.bearingDeg ?? field.bearing % 180;
  const { u, v } = trackFrame(bearing, field.bearingGridCorrection || 0);
  const result = straightOffsets(field.geom, v, { ...params, anchor: field.referenceA });
  const [lo, hi] = projectionRange(field.geom, u), kind = TRACK_KINDS.referencia_linear;
  const at = (s, o) => [u[0] * s + v[0] * o, u[1] * s + v[1] * o];
  return {
    tracks: result.offsets.map((offsetM, index) => ({ id: `T${index + 1}`, index, kind: 'referencia_linear', role: 'tiro_sugerido',
      confidence: kind.confidence, source: result.anchored ? 'rumo_planilha+ponto_A+multiplos_barra' : 'rumo_planilha+faixas_iguais',
      offsetM, line: [at(lo - 1, offsetM), at(hi + 1, offsetM)] })),
    frame: { u, v }, bearing, deltaM: result.deltaM, passes: result.passes, anchored: result.anchored,
  };
}

/**
 * Anéis concêntricos no centroide (DADO LEGADO; o método vigente é linear). Raios (k + ½)·passo até cobrir o
 * vértice mais distante, no máximo 200 anéis; passo em múltiplos da barra quando alinhado.
 */
export function buildCircularTracks(field, params) {
  const center = geomCentroid(field.geom);
  let reach = 0;
  for (const polygon of field.geom) for (const ring of polygon) for (const p of ring) reach = Math.max(reach, Math.hypot(p[0] - center[0], p[1] - center[1]));
  const boom = params.boomWidthM, passes = params.alignToBoom && boom > 0 ? Math.max(1, Math.floor(params.trackSpacingM / boom)) : 0;
  const step = passes ? passes * boom : params.trackSpacingM, bearing = params.bearingDeg ?? field.bearing % 180, tracks = [];
  for (let k = 0; (k + 0.5) * step < reach && tracks.length < 200; k++) {
    const r = (k + 0.5) * step;
    tracks.push({ id: `C${k + 1}`, index: k, kind: 'curva_desenhada', role: 'tiro_sugerido', confidence: TRACK_KINDS.curva_desenhada.confidence,
      source: 'aneis_concentricos_centroide', offsetM: r, radiusM: r, line: circlePolyline(center, r, 8, bearing) });
  }
  return { tracks, frame: null, bearing, deltaM: step, passes, anchored: false, center };
}

/** Trajetos importados (pista GNSS ou trajeto da equipe), com as mesmas validações do motor 0.5.1. */
export function buildImportedTracks(lines, kind) {
  if (!TRACK_KINDS[kind]) throw Error(`Tipo de trajeto desconhecido: ${kind}`);
  if (!Array.isArray(lines) || lines.length > 150) throw Error('Limite de 150 trajetos por importação.');
  const seen = new Set();
  return {
    tracks: lines.map((item, index) => {
      const id = String(item.id || `G${index + 1}`).trim();
      if (!/^[\p{L}\p{N}_ .-]{1,64}$/u.test(id)) throw Error(`Identificador do trajeto ${index + 1} inválido. Use letras, números, espaços, ponto, hífen ou _.`);
      if (seen.has(id)) throw Error(`Identificador duplicado: ${id}`);
      seen.add(id);
      if (!Array.isArray(item.line) || item.line.length < 2 || item.line.length > 5000
        || item.line.some(p => !Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])))
        throw Error(`Trajeto ${id}: linha inválida ou superior a 5.000 vértices.`);
      return { id, index, kind, role: kind === 'trajeto_gps_equipe' ? 'executado' : 'tiro_sugerido', confidence: TRACK_KINDS[kind].confidence,
        source: 'importado', offsetM: index, line: item.line };
    }),
    frame: null, bearing: null, deltaM: null, passes: 0, anchored: false,
  };
}

/** Seleção: todos, os N distribuídos por igual, ou os ids escolhidos à mão. */
export function selectTracks(tracks, selection) {
  if (selection.mode === 'manual') { const ids = new Set(selection.ids || []); return tracks.filter(t => ids.has(t.id)); }
  if (selection.mode === 'quantidade') {
    const n = Math.max(1, Math.min(tracks.length, Math.round(selection.count || 1))), total = tracks.length;
    const keep = new Set(Array.from({ length: n }, (_, i) => Math.min(total - 1, Math.floor((i + 0.5) * total / n))));
    return tracks.filter((_, i) => keep.has(i));
  }
  return tracks.slice();
}

/**
 * Recorta cada tiro pelo lote. Trechos ≥ minPieceM viram "units" (recebem pontos); os curtos ficam em
 * "discarded" (listados); tiros sem nenhum trecho dentro ficam em "outside". Ids: T3 ou T3.1, T3.2…
 */
export function clipTracks(tracks, geom, minPieceM) {
  const units = [], discarded = [], outside = [];
  for (const track of tracks) {
    const clip = clipPolylineToGeom(track.line, geom, { minPieceM });
    if (!clip.pieces.length && !clip.discarded.length) outside.push(track.id);
    const all = [...clip.pieces.map(q => ({ q, keep: true })), ...clip.discarded.map(q => ({ q, keep: false }))].sort((a, b) => a.q.s0 - b.q.s0);
    all.forEach(({ q, keep }, pieceIndex) => {
      const unit = { id: all.length > 1 ? `${track.id}.${pieceIndex + 1}` : track.id, trackId: track.id, trackIndex: track.index,
        pieceIndex, pieceCount: all.length, line: q.line, len: q.len, s0Track: q.s0, trackLength: clip.totalLength, wraps: q.wraps,
        kind: track.kind, role: track.role, confidence: track.confidence, source: track.source };
      (keep ? units : discarded).push(unit);
    });
  }
  return { units, discarded, outside };
}

export const trackLength = track => lengthOf(track.line);
