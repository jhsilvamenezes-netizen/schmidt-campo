const schmidtEngine2=(()=>{
// src/engine3/tolerances.mjs
const __tolerances=(()=>{

// Motor 2 · tolerâncias numéricas. Mesmos valores do motor 0.5.1 (conferido no oráculo audit/legacy-engine.mjs).
// Todas em metros de GRADE (UTM 23S local) ou adimensionais; nenhuma representa precisão de campo ou do GPS.
const TOLERANCES = Object.freeze({
  SEGMENT_T_EPS: 1e-9,          // folga do parâmetro t (0..1) ao aceitar cruzamento de segmentos
  PARALLEL_DET_EPS: 1e-12,      // |determinante| abaixo disso = segmentos paralelos (sem cruzamento único)
  MIN_RING_AREA_M2: 1,          // anel com área menor que 1 m² é tratado como degenerado na validação
  ALONG_S_EPS_M: 1e-8,          // folga ao pedir um ponto além das pontas de uma linha
  CUT_MERGE_TOL_M: 1e-6,        // cortes mais próximos que isso se fundem (ruído de ponto flutuante)
  SLICE_VERTEX_EPS_M: 1e-9,     // vértice interno a menos disso de um corte não é repetido no recorte
  ALLOC_EPS_M: 1e-9,
  MIN_POINTS_EPS: 1e-9,
  OPT_IMPROVE_EPS_M: 1e-6,
  OPT_MEAN_TIEBREAK: 0.001,
  OPT_LIMIT_EPS: 1e-9,
  BEARING_CHANGED_DEG: 0.05,
  CLOSED_LINE_EPS_M: 1e-6,      // linha cujas pontas distam menos que isso é fechada
  SAME_OFFSET_EPS_M: 1e-6,      // dois tiros a menos disso de lado são o mesmo tiro
  OPT_SHIFT_RANGE_EPS_M: 1e-6,
});

return Object.freeze({TOLERANCES});
})();
// src/engine3/vocab.mjs
const __vocab=(()=>{

// Motor 2 · vocabulário: valores fixos usados pelo motor e pela tela (reescrita do módulo vocab do motor 0.5.1).
const STATUS_TEXT = Object.freeze({ SIMULADO: 'SIMULAÇÃO · rastros não conferidos', TRAJETO_IMPORTADO: 'TRAJETO GPS IMPORTADO · pontos simulados' });
const KIND = Object.freeze({ REFERENCIA_LINEAR: 'referencia_linear', CURVA_DESENHADA: 'curva_desenhada', PISTA_GNSS: 'pista_gnss', TRAJETO_GPS_EQUIPE: 'trajeto_gps_equipe' });
const TRACK_MODE = Object.freeze({ ESPACAMENTO: 'espacamento', QUANTIDADE: 'quantidade', CIRCULAR: 'circular', IMPORTADO: 'importado' });
const SELECTION_MODE = Object.freeze({ TODOS: 'todos', QUANTIDADE: 'quantidade', MANUAL: 'manual' });
const POINT_MODE = Object.freeze({ TOTAL: 'total', POR_TIRO: 'por_tiro', ESPACAMENTO: 'espacamento' });
const EDGE_POLICY = Object.freeze({ MEIA_MARGEM: 'meia_margem', MARGENS_IGUAIS: 'margens_iguais', MARGEM_FIXA: 'margem_fixa' });
const OPT_MODE = Object.freeze({ QUALIDADE_ESPACIAL: 'qualidade_espacial', REGULARIDADE: 'regularidade', ESFORCO: 'esforco' });
const ALLOC_STATUS = Object.freeze({ OK: 'ok', CONFLITO: 'conflito', SEM_TRECHOS: 'sem_trechos' });

return Object.freeze({STATUS_TEXT,KIND,TRACK_MODE,SELECTION_MODE,POINT_MODE,EDGE_POLICY,OPT_MODE,ALLOC_STATUS});
})();
// src/engine3/errors.mjs
const __errors=(()=>{

// Motor 2 · erros de domínio com código estável (reescrita do módulo errors do motor 0.5.1).
const ERR = Object.freeze({
  GEOMETRIA_INVALIDA: 'GEOMETRIA_INVALIDA', AREA_AUSENTE: 'AREA_AUSENTE', SEM_TRAJETO_IMPORTADO: 'SEM_TRAJETO_IMPORTADO',
  TOTAL_INVALIDO: 'TOTAL_INVALIDO', TOTAL_ACIMA_TETO: 'TOTAL_ACIMA_TETO', PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO', TIRO_SEM_PARTES: 'TIRO_SEM_PARTES',
});
/** Erro do domínio: `code` (ERR), `field` (parâmetro envolvido, ou null) e `value` (valor recusado). */
class DomainError extends Error {
  constructor(code, message, info = {}) {
    super(message);
    this.name = 'DomainError'; this.code = code; this.field = info.field ?? null; this.value = info.value;
  }
}

return Object.freeze({ERR,DomainError});
})();
// src/engine3/numero.mjs
const __numero=(()=>{

// Motor 2 · número no formato brasileiro (vírgula decimal, ponto de milhar), com formatadores em cache.
const formatters = new Map();
/** numBR(1234.5, 1) → "1.234,5". `min` casas fixas; até `max` casas quando houver (mínimo = min). */
function numBR(value, min = 0, max = 3) {
  const key = min * 100 + max;
  let f = formatters.get(key);
  if (!f) { f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: Math.max(min, max) }); formatters.set(key, f); }
  return f.format(value);
}

return Object.freeze({numBR});
})();
// src/engine3/projection.mjs
const __projection=(()=>{

// Motor 2 · projeção UTM (hemisfério sul, WGS 84) ↔ longitude/latitude, série de Krüger de 6ª ordem
// (Karney 2011, "Transverse Mercator with an accuracy of a few nanometers"). Reescrita do módulo projection do 0.5.1;
// coeficientes iguais (teste diferencial). Fuso padrão 23 (EPSG:32723), como os dados dos lotes.
const F = 1 / 298.257223563, K0 = 0.9996, FALSE_E = 5e5, FALSE_N = 1e7;
const N3 = F / 1.9966471893352524, N4 = N3 ** 4, N5 = N4 * N3, N6 = N5 * N3;
const RECT_A = 6367449.145823415; // A: raio do meridiano retificado
const ALPHA = [0.0008377318206244698, 7.608527773802082e-7 - (1983433 * N6) / 1935360, 1.1976455033294527e-9, 24291706072013587e-28,
  (34729 * N5) / 80640 - (3418889 * N6) / 1995840, (212378941 * N6) / 319334400];
const BETA = [0.0008377321640579488, 5.9058701528681994e-8 - (1118711 * N6) / 3870720, 1673482665283997e-25,
  (4397 * N4) / 161280 - (11 * N5) / 504 - (830251 * N6) / 7257600, (4583 * N5) / 161280 - (108847 * N6) / 3991680, (20648693 * N6) / 638668800];
const DELTA = [0.003356551469132927 - (2854 * N6) / 675, 6571873198628443e-21, 1.7646404113085808e-8,
  (4279 * N4) / 630 - (332 * N5) / 35 - (399572 * N6) / 14175, (4174 * N5) / 315 - (144838 * N6) / 6237, (601676 * N6) / 22275];
const DEG = Math.PI / 180;
const centralMeridian = zone => (-183 + 6 * zone) * DEG;

/** [lon, lat] (graus) → [E, N] (m) no fuso sul indicado. */
function lonLatToUtmSouth(lon, lat, zone = 23) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw Error('Lon/lat inválidos');
  const phi = lat * DEG, lam = lon * DEG - centralMeridian(zone), e = Math.sqrt(F * 1.9966471893352524);
  const tau = Math.sinh(Math.atanh(Math.sin(phi)) - e * Math.atanh(e * Math.sin(phi)));
  const xi0 = Math.atan2(tau, Math.cos(lam)), eta0 = Math.atanh(Math.sin(lam) / Math.sqrt(1 + tau * tau));
  let xi = xi0, eta = eta0;
  for (let j = 1; j <= 6; j++) { xi += ALPHA[j - 1] * Math.sin(2 * j * xi0) * Math.cosh(2 * j * eta0); eta += ALPHA[j - 1] * Math.cos(2 * j * xi0) * Math.sinh(2 * j * eta0); }
  return [FALSE_E + K0 * RECT_A * eta, FALSE_N + K0 * RECT_A * xi];
}
/** [E, N] (m) no fuso sul → [lon, lat] (graus). */
function utmSouthToLonLat(e, n, zone = 23) {
  if (!Number.isFinite(e) || !Number.isFinite(n)) throw Error('UTM inválido');
  const xi = (n - FALSE_N) / (K0 * RECT_A), eta = (e - FALSE_E) / (K0 * RECT_A);
  let xi1 = xi, eta1 = eta;
  for (let j = 1; j <= 6; j++) { xi1 -= BETA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta); eta1 -= BETA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta); }
  const chi = Math.asin(Math.sin(xi1) / Math.cosh(eta1));
  let phi = chi;
  for (let j = 1; j <= 6; j++) phi += DELTA[j - 1] * Math.sin(2 * j * chi);
  return [(centralMeridian(zone) + Math.atan2(Math.sinh(eta1), Math.cos(xi1))) / DEG, phi / DEG];
}
/** Coordenada local do lote (metros relativos a centroidUTM) → [lon, lat]. */
const localToLonLat = (x, y, centroidUTM) => utmSouthToLonLat(centroidUTM[0] + x, centroidUTM[1] + y);
/** [lon, lat] → coordenada local do lote. */
function lonLatToLocal(lon, lat, centroidUTM) { const [e, n] = lonLatToUtmSouth(lon, lat); return [e - centroidUTM[0], n - centroidUTM[1]]; }

return Object.freeze({lonLatToUtmSouth,utmSouthToLonLat,localToLonLat,lonLatToLocal});
})();
// src/engine3/geometry.mjs
const __geometry=(()=>{
const { TOLERANCES } = __tolerances;
// Motor 2 · geometria plana de polígonos em metros locais (UTM 23S − centroide do lote).
// Formato: geom = [polígono...]; polígono = [anelExterno, furo1, furo2...]; anel = [[x,y]...] (fechado ou não).
// Reescrita legível do módulo geometry do motor 0.5.1, com o mesmo resultado (teste diferencial).

const { MIN_RING_AREA_M2, PARALLEL_DET_EPS, SEGMENT_T_EPS } = TOLERANCES;

/** Extensão (m) abaixo da qual coordenadas dentro de ±180/±90 parecem graus, não metros. */
const DEGREE_LIKE_EXTENT = 1;

/** Arestas de um anel; o último vértice repetido (anel fechado) não gera aresta nula. */
function ringEdges(ring) {
  const closed = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
  const n = closed ? ring.length - 1 : ring.length, edges = [];
  for (let i = 0; i < n; i++) edges.push([ring[i], ring[(i + 1) % n]]);
  return edges;
}

/** Área com sinal (fórmula do laço): positiva no sentido anti-horário. */
function ringSignedArea(ring) {
  let twice = 0;
  for (const [a, b] of ringEdges(ring)) twice += a[0] * b[1] - b[0] * a[1];
  return twice / 2;
}

/** Área de um polígono: anel externo menos os furos (valores absolutos). */
function polygonArea(polygon) {
  let area = Math.abs(ringSignedArea(polygon[0]));
  for (let i = 1; i < polygon.length; i++) area -= Math.abs(ringSignedArea(polygon[i]));
  return area;
}

const geomArea = geom => geom.reduce((sum, polygon) => sum + polygonArea(polygon), 0);

/** Ponto dentro do anel pela regra par-ímpar (raio horizontal para a direita). Borda: comportamento do raio. */
function pointInRing(x, y, ring) {
  const n0 = ring.length, n = n0 > 1 && ring[0][0] === ring[n0 - 1][0] && ring[0][1] === ring[n0 - 1][1] ? n0 - 1 : n0;
  let inside = false;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** Dentro do anel externo e fora de todos os furos. */
function pointInPolygon(x, y, polygon) {
  if (!pointInRing(x, y, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) if (pointInRing(x, y, polygon[i])) return false;
  return true;
}

const pointInGeom = (x, y, geom) => geom.some(polygon => pointInPolygon(x, y, polygon));

function geomBounds(geom) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const polygon of geom) for (const ring of polygon) for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Centroide de área; furos subtraem. Orientação de cada anel normalizada pelo sinal da área. */
function geomCentroid(geom) {
  let area = 0, cx = 0, cy = 0;
  for (const polygon of geom) for (let r = 0; r < polygon.length; r++) {
    const ring = polygon[r], role = r === 0 ? 1 : -1, orientation = Math.sign(ringSignedArea(ring)) || 1;
    for (const [a, b] of ringEdges(ring)) {
      const cross = (a[0] * b[1] - b[0] * a[1]) * orientation * role;
      cx += (a[0] + b[0]) * cross; cy += (a[1] + b[1]) * cross; area += cross / 2;
    }
  }
  return area ? [cx / (6 * area), cy / (6 * area)] : [0, 0];
}

/**
 * Cruzamento do segmento a→b com c→d: devolve t ∈ [0,1] ao longo de a→b, ou null (paralelos ou sem cruzamento).
 * Aceita uma folga SEGMENT_T_EPS nas pontas e prende t ao intervalo.
 */
function segmentIntersectionT(a, b, c, d) {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const det = rx * sy - ry * sx;
  if (Math.abs(det) < PARALLEL_DET_EPS) return null;
  const qx = c[0] - a[0], qy = c[1] - a[1];
  const t = (qx * sy - qy * sx) / det, u = (qx * ry - qy * rx) / det, e = SEGMENT_T_EPS;
  if (t < -e || t > 1 + e || u < -e || u > 1 + e) return null;
  return Math.min(1, Math.max(0, t));
}

function geomEdges(geom) {
  const edges = [];
  for (const polygon of geom) for (const ring of polygon) edges.push(...ringEdges(ring));
  return edges;
}

/** Problemas da geometria em texto (vazio = válida). Não corrige nada. */
function validateGeom(geom) {
  const problems = [];
  if (!Array.isArray(geom) || !geom.length) return ['Geometria vazia ou ausente'];
  let all = [];
  geom.forEach((polygon, p) => {
    if (!Array.isArray(polygon) || !polygon.length) { problems.push(`Polígono ${p} sem anéis`); return; }
    polygon.forEach((ring, r) => {
      if (!Array.isArray(ring) || ring.length < 3) { problems.push(`Anel ${p}.${r} com menos de 3 vértices`); return; }
      for (const v of ring) if (!Array.isArray(v) || v.length < 2 || !Number.isFinite(v[0]) || !Number.isFinite(v[1])) {
        problems.push(`Anel ${p}.${r} com coordenada inválida`); return;
      }
      all = all.concat(ring);
      if (Math.abs(ringSignedArea(ring)) < MIN_RING_AREA_M2) problems.push(`Anel ${p}.${r} com área nula`);
    });
    const outer = polygon[0];
    for (let h = 1; h < polygon.length; h++) {
      const hole = polygon[h];
      if (!Array.isArray(hole) || !Array.isArray(outer) || hole.length < 3 || outer.length < 3) continue;
      const outside = hole.some(v => !pointInRing(v[0], v[1], outer));
      const crossing = ringEdges(hole).some(([a, b]) => ringEdges(outer).some(([c, d]) => {
        const t = segmentIntersectionT(a, b, c, d); return t !== null && t > SEGMENT_T_EPS && t < 1 - SEGMENT_T_EPS;
      }));
      if (outside || crossing) problems.push(`Buraco ${p}.${h} fora do contorno externo ou cruzando-o`);
    }
  });
  if (all.length) {
    const xs = all.map(v => v[0]), ys = all.map(v => v[1]);
    const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (extent < DEGREE_LIKE_EXTENT && xs.every(x => Math.abs(x) <= 180) && ys.every(y => Math.abs(y) <= 90))
      problems.push('Coordenadas parecem graus (lon/lat); projete para metros antes de medir distâncias');
  }
  return problems;
}

return Object.freeze({DEGREE_LIKE_EXTENT,ringEdges,ringSignedArea,polygonArea,geomArea,pointInRing,pointInPolygon,pointInGeom,geomBounds,geomCentroid,segmentIntersectionT,geomEdges,validateGeom});
})();
// src/engine3/predicates.mjs
const __predicates=(()=>{

// Motor 2 · predicados geométricos exatos (precisão adaptativa de Shewchuk).
// orient2d(a, b, c) com y para cima (UTM): > 0 quando c fica à DIREITA de a→b (sentido horário), < 0 à esquerda,
// 0 exatamente colinear. (A biblioteca descreve o sinal com y para baixo, de tela.) leftOf() dá o sentido usual.
// Código de robust-predicates 3.0.3 (Vladimir Agafonkin, Unlicense / domínio público), port de
// "Adaptive Precision Floating-Point Arithmetic and Fast Robust Geometric Predicates" (J. R. Shewchuk, 1997).
// Alterações: só o necessário para orient2d; nomes internos com prefixo rp (escopo único do motor). Lógica intacta.
const rpEpsilon = 1.1102230246251565e-16;
const rpSplitter = 134217729;
const rpResultErrBound = (3 + 8 * rpEpsilon) * rpEpsilon;

// fast_expansion_sum_zeroelim routine from original code
function rpSum(elen, e, flen, f, h) {
    let Q, Qnew, hh, bvirt;
    let enow = e[0];
    let fnow = f[0];
    let eindex = 0;
    let findex = 0;
    if ((fnow > enow) === (fnow > -enow)) {
        Q = enow;
        enow = e[++eindex];
    } else {
        Q = fnow;
        fnow = f[++findex];
    }
    let hindex = 0;
    if (eindex < elen && findex < flen) {
        if ((fnow > enow) === (fnow > -enow)) {
            Qnew = enow + Q;
            hh = Q - (Qnew - enow);
            enow = e[++eindex];
        } else {
            Qnew = fnow + Q;
            hh = Q - (Qnew - fnow);
            fnow = f[++findex];
        }
        Q = Qnew;
        if (hh !== 0) {
            h[hindex++] = hh;
        }
        while (eindex < elen && findex < flen) {
            if ((fnow > enow) === (fnow > -enow)) {
                Qnew = Q + enow;
                bvirt = Qnew - Q;
                hh = Q - (Qnew - bvirt) + (enow - bvirt);
                enow = e[++eindex];
            } else {
                Qnew = Q + fnow;
                bvirt = Qnew - Q;
                hh = Q - (Qnew - bvirt) + (fnow - bvirt);
                fnow = f[++findex];
            }
            Q = Qnew;
            if (hh !== 0) {
                h[hindex++] = hh;
            }
        }
    }
    while (eindex < elen) {
        Qnew = Q + enow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (enow - bvirt);
        enow = e[++eindex];
        Q = Qnew;
        if (hh !== 0) {
            h[hindex++] = hh;
        }
    }
    while (findex < flen) {
        Qnew = Q + fnow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (fnow - bvirt);
        fnow = f[++findex];
        Q = Qnew;
        if (hh !== 0) {
            h[hindex++] = hh;
        }
    }
    if (Q !== 0 || hindex === 0) {
        h[hindex++] = Q;
    }
    return hindex;
}


// scale_expansion_zeroelim routine from oritinal code


function rpEstimate(elen, e) {
    let Q = e[0];
    for (let i = 1; i < elen; i++) Q += e[i];
    return Q;
}

function rpVec(n) {
    return new Float64Array(n);
}


const rpCcwErrA = (3 + 16 * rpEpsilon) * rpEpsilon;
const rpCcwErrB = (2 + 12 * rpEpsilon) * rpEpsilon;
const rpCcwErrC = (9 + 64 * rpEpsilon) * rpEpsilon * rpEpsilon;

const rpB = rpVec(4);
const rpC1 = rpVec(8);
const rpC2 = rpVec(12);
const rpD = rpVec(16);
const rpU = rpVec(4);

function rpOrient2dAdapt(ax, ay, bx, by, cx, cy, detsum) {
    let acxtail, acytail, bcxtail, bcytail;
    let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u3;

    const acx = ax - cx;
    const bcx = bx - cx;
    const acy = ay - cy;
    const bcy = by - cy;

    s1 = acx * bcy;
    c = rpSplitter * acx;
    ahi = c - (c - acx);
    alo = acx - ahi;
    c = rpSplitter * bcy;
    bhi = c - (c - bcy);
    blo = bcy - bhi;
    s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    t1 = acy * bcx;
    c = rpSplitter * acy;
    ahi = c - (c - acy);
    alo = acy - ahi;
    c = rpSplitter * bcx;
    bhi = c - (c - bcx);
    blo = bcx - bhi;
    t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
    _i = s0 - t0;
    bvirt = s0 - _i;
    rpB[0] = s0 - (_i + bvirt) + (bvirt - t0);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 - t1;
    bvirt = _0 - _i;
    rpB[1] = _0 - (_i + bvirt) + (bvirt - t1);
    u3 = _j + _i;
    bvirt = u3 - _j;
    rpB[2] = _j - (u3 - bvirt) + (_i - bvirt);
    rpB[3] = u3;

    let det = rpEstimate(4, rpB);
    let errbound = rpCcwErrB * detsum;
    if (det >= errbound || -det >= errbound) {
        return det;
    }

    bvirt = ax - acx;
    acxtail = ax - (acx + bvirt) + (bvirt - cx);
    bvirt = bx - bcx;
    bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
    bvirt = ay - acy;
    acytail = ay - (acy + bvirt) + (bvirt - cy);
    bvirt = by - bcy;
    bcytail = by - (bcy + bvirt) + (bvirt - cy);

    if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
        return det;
    }

    errbound = rpCcwErrC * detsum + rpResultErrBound * Math.abs(det);
    det += (acx * bcytail + bcy * acxtail) - (acy * bcxtail + bcx * acytail);
    if (det >= errbound || -det >= errbound) return det;

    s1 = acxtail * bcy;
    c = rpSplitter * acxtail;
    ahi = c - (c - acxtail);
    alo = acxtail - ahi;
    c = rpSplitter * bcy;
    bhi = c - (c - bcy);
    blo = bcy - bhi;
    s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    t1 = acytail * bcx;
    c = rpSplitter * acytail;
    ahi = c - (c - acytail);
    alo = acytail - ahi;
    c = rpSplitter * bcx;
    bhi = c - (c - bcx);
    blo = bcx - bhi;
    t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
    _i = s0 - t0;
    bvirt = s0 - _i;
    rpU[0] = s0 - (_i + bvirt) + (bvirt - t0);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 - t1;
    bvirt = _0 - _i;
    rpU[1] = _0 - (_i + bvirt) + (bvirt - t1);
    u3 = _j + _i;
    bvirt = u3 - _j;
    rpU[2] = _j - (u3 - bvirt) + (_i - bvirt);
    rpU[3] = u3;
    const C1len = rpSum(4, rpB, 4, rpU, rpC1);

    s1 = acx * bcytail;
    c = rpSplitter * acx;
    ahi = c - (c - acx);
    alo = acx - ahi;
    c = rpSplitter * bcytail;
    bhi = c - (c - bcytail);
    blo = bcytail - bhi;
    s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    t1 = acy * bcxtail;
    c = rpSplitter * acy;
    ahi = c - (c - acy);
    alo = acy - ahi;
    c = rpSplitter * bcxtail;
    bhi = c - (c - bcxtail);
    blo = bcxtail - bhi;
    t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
    _i = s0 - t0;
    bvirt = s0 - _i;
    rpU[0] = s0 - (_i + bvirt) + (bvirt - t0);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 - t1;
    bvirt = _0 - _i;
    rpU[1] = _0 - (_i + bvirt) + (bvirt - t1);
    u3 = _j + _i;
    bvirt = u3 - _j;
    rpU[2] = _j - (u3 - bvirt) + (_i - bvirt);
    rpU[3] = u3;
    const C2len = rpSum(C1len, rpC1, 4, rpU, rpC2);

    s1 = acxtail * bcytail;
    c = rpSplitter * acxtail;
    ahi = c - (c - acxtail);
    alo = acxtail - ahi;
    c = rpSplitter * bcytail;
    bhi = c - (c - bcytail);
    blo = bcytail - bhi;
    s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    t1 = acytail * bcxtail;
    c = rpSplitter * acytail;
    ahi = c - (c - acytail);
    alo = acytail - ahi;
    c = rpSplitter * bcxtail;
    bhi = c - (c - bcxtail);
    blo = bcxtail - bhi;
    t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
    _i = s0 - t0;
    bvirt = s0 - _i;
    rpU[0] = s0 - (_i + bvirt) + (bvirt - t0);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 - t1;
    bvirt = _0 - _i;
    rpU[1] = _0 - (_i + bvirt) + (bvirt - t1);
    u3 = _j + _i;
    bvirt = u3 - _j;
    rpU[2] = _j - (u3 - bvirt) + (_i - bvirt);
    rpU[3] = u3;
    const Dlen = rpSum(C2len, rpC2, 4, rpU, rpD);

    return rpD[Dlen - 1];
}

function orient2d(ax, ay, bx, by, cx, cy) {
    const detleft = (ay - cy) * (bx - cx);
    const detright = (ax - cx) * (by - cy);
    const det = detleft - detright;

    const detsum = Math.abs(detleft + detright);
    if (Math.abs(det) >= rpCcwErrA * detsum) return det;

    return -rpOrient2dAdapt(ax, ay, bx, by, cx, cy, detsum);
}

function orient2dFast(ax, ay, bx, by, cx, cy) {
    return (ay - cy) * (bx - cx) - (ax - cx) * (by - cy);
}

/** Lado exato de c em relação à reta a→b, com y para cima: > 0 à esquerda, < 0 à direita, 0 sobre a reta. */
function leftOf(ax, ay, bx, by, cx, cy) { return -orient2d(ax, ay, bx, by, cx, cy); }

return Object.freeze({orient2d,leftOf});
})();
// src/engine3/delaunay.mjs
const __delaunay=(()=>{
const { orient2d } = __predicates;
// Motor 2 · triangulação de Delaunay (base do diagrama de Voronoi da cobertura exata).
// Código de delaunator 5.1.0 (Mapbox, licença ISC: uso, cópia e modificação livres com este aviso). Usa o predicado
// exato orient2d. Alterações: importação local, export nomeado, nomes internos com prefixo dln. Lógica intacta.
// ISC License — Copyright (c) 2026, Mapbox. Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice
// appear in all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES.
const DLN_EPSILON = Math.pow(2, -52);
const DLN_EDGE_STACK = new Uint32Array(512);



/** @template {ArrayLike<number>} T */
class Delaunator {

    /**
     * Constructs a delaunay triangulation object given an array of points (`[x, y]` by default).
     * `getX` and `getY` are optional functions of the form `(point) => value` for custom point formats.
     *
     * @template P
     * @param {P[]} points
     * @param {(p: P) => number} [getX]
     * @param {(p: P) => number} [getY]
     */
    // @ts-expect-error TS2322
    static from(points, getX = dlnGetX, getY = dlnGetY) {
        const n = points.length;
        const coords = new Float64Array(n * 2);

        for (let i = 0; i < n; i++) {
            const p = points[i];
            coords[2 * i] = getX(p);
            coords[2 * i + 1] = getY(p);
        }

        return new Delaunator(coords);
    }

    /**
     * Constructs a delaunay triangulation object given an array of point coordinates of the form:
     * `[x0, y0, x1, y1, ...]` (use a typed array for best performance). Duplicate points are skipped.
     *
     * @param {T} coords
     */
    constructor(coords) {
        const n = coords.length >> 1;
        if (n > 0 && typeof coords[0] !== 'number') throw new Error('Expected coords to contain numbers.');

        this.coords = coords;

        // arrays that will store the triangulation graph
        const maxTriangles = Math.max(2 * n - 5, 0);
        /** @private */ this._triangles = new Uint32Array(maxTriangles * 3);
        /** @private */ this._halfedges = new Int32Array(maxTriangles * 3);

        // temporary arrays for tracking the edges of the advancing convex hull
        /** @private */ this._hashSize = Math.ceil(Math.sqrt(n));
        /** @private */ this._hullPrev = new Uint32Array(n); // edge to prev edge
        /** @private */ this._hullNext = new Uint32Array(n); // edge to next edge
        /** @private */ this._hullTri = new Uint32Array(n); // edge to adjacent triangle
        /** @private */ this._hullHash = new Int32Array(this._hashSize); // angular edge hash

        // temporary arrays for sorting points
        /** @private */ this._ids = new Uint32Array(n);
        /** @private */ this._dists = new Float64Array(n);

        /** @private */ this.trianglesLen = 0;
        /** @private */ this._cx = 0;
        /** @private */ this._cy = 0;
        /** @private */ this._hullStart = 0;


        /** A `Uint32Array` array of indices that reference points on the convex hull of the input data, counter-clockwise. */
        this.hull = this._triangles;
        /** A `Uint32Array` array of triangle vertex indices (each group of three numbers forms a triangle). All triangles are directed counterclockwise. */
        this.triangles = this._triangles;
        /**
         * A `Int32Array` array of triangle half-edge indices that allows you to traverse the triangulation.
         * `i`-th half-edge in the array corresponds to vertex `triangles[i]` the half-edge is coming from.
         * `halfedges[i]` is the index of a twin half-edge in an adjacent triangle (or `-1` for outer half-edges on the convex hull).
         */
        this.halfedges = this._halfedges;

        this.update();
    }

    /**
     * Updates the triangulation if you modified `delaunay.coords` values in place, avoiding expensive memory allocations.
     * Useful for iterative relaxation algorithms such as Lloyd's.
     */
    update() {
        const {coords, _hullPrev: hullPrev, _hullNext: hullNext, _hullTri: hullTri, _hullHash: hullHash} =  this;
        const n = coords.length >> 1;

        // populate an array of point indices; calculate input data bbox
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (let i = 0; i < n; i++) {
            const x = coords[2 * i];
            const y = coords[2 * i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            this._ids[i] = i;
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        let i0 = 0, i1 = 0, i2 = 0;

        // pick a seed point close to the center
        for (let i = 0, minDist = Infinity; i < n; i++) {
            const d = dlnDist(cx, cy, coords[2 * i], coords[2 * i + 1]);
            if (d < minDist) {
                i0 = i;
                minDist = d;
            }
        }
        const i0x = coords[2 * i0];
        const i0y = coords[2 * i0 + 1];

        // find the point closest to the seed
        for (let i = 0, minDist = Infinity; i < n; i++) {
            if (i === i0) continue;
            const d = dlnDist(i0x, i0y, coords[2 * i], coords[2 * i + 1]);
            if (d < minDist && d > 0) {
                i1 = i;
                minDist = d;
            }
        }
        let i1x = coords[2 * i1];
        let i1y = coords[2 * i1 + 1];

        let minRadius = Infinity;

        // find the third point which forms the smallest circumcircle with the first two
        for (let i = 0; i < n; i++) {
            if (i === i0 || i === i1) continue;
            const r = dlnCircumradius(i0x, i0y, i1x, i1y, coords[2 * i], coords[2 * i + 1]);
            if (r < minRadius) {
                i2 = i;
                minRadius = r;
            }
        }
        let i2x = coords[2 * i2];
        let i2y = coords[2 * i2 + 1];

        if (minRadius === Infinity) {
            // order collinear points by dx (or dy if all x are identical)
            // and return the list as a hull
            for (let i = 0; i < n; i++) {
                this._dists[i] = (coords[2 * i] - coords[0]) || (coords[2 * i + 1] - coords[1]);
            }
            dlnQuicksort(this._ids, this._dists, 0, n - 1);
            const hull = new Uint32Array(n);
            let j = 0;
            for (let i = 0, d0 = -Infinity; i < n; i++) {
                const id = this._ids[i];
                const d = this._dists[id];
                if (d > d0) {
                    hull[j++] = id;
                    d0 = d;
                }
            }
            this.hull = hull.subarray(0, j);
            this.triangles = new Uint32Array(0);
            this.halfedges = new Int32Array(0);
            return;
        }

        // dlnSwap the order of the seed points for counter-clockwise orientation
        if (orient2d(i0x, i0y, i1x, i1y, i2x, i2y) < 0) {
            const i = i1;
            const x = i1x;
            const y = i1y;
            i1 = i2;
            i1x = i2x;
            i1y = i2y;
            i2 = i;
            i2x = x;
            i2y = y;
        }

        const center = dlnCircumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
        this._cx = center.x;
        this._cy = center.y;

        for (let i = 0; i < n; i++) {
            this._dists[i] = dlnDist(coords[2 * i], coords[2 * i + 1], center.x, center.y);
        }

        // sort the points by distance from the seed triangle dlnCircumcenter
        dlnQuicksort(this._ids, this._dists, 0, n - 1);

        // set up the seed triangle as the starting hull
        this._hullStart = i0;
        let hullSize = 3;

        hullNext[i0] = hullPrev[i2] = i1;
        hullNext[i1] = hullPrev[i0] = i2;
        hullNext[i2] = hullPrev[i1] = i0;

        hullTri[i0] = 0;
        hullTri[i1] = 1;
        hullTri[i2] = 2;

        hullHash.fill(-1);
        hullHash[this._hashKey(i0x, i0y)] = i0;
        hullHash[this._hashKey(i1x, i1y)] = i1;
        hullHash[this._hashKey(i2x, i2y)] = i2;

        this.trianglesLen = 0;
        this._addTriangle(i0, i1, i2, -1, -1, -1);

        for (let k = 0, xp = 0, yp = 0; k < this._ids.length; k++) {
            const i = this._ids[k];
            const x = coords[2 * i];
            const y = coords[2 * i + 1];

            // skip near-duplicate points
            if (k > 0 && Math.abs(x - xp) <= DLN_EPSILON && Math.abs(y - yp) <= DLN_EPSILON) continue;
            xp = x;
            yp = y;

            // skip seed triangle points
            if (i === i0 || i === i1 || i === i2) continue;

            // find a visible edge on the convex hull using edge hash
            let start = 0;
            for (let j = 0, key = this._hashKey(x, y); j < this._hashSize; j++) {
                start = hullHash[(key + j) % this._hashSize];
                if (start !== -1 && start !== hullNext[start]) break;
            }

            start = hullPrev[start];
            let e = start, q;
            while (q = hullNext[e], orient2d(x, y, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1]) >= 0) {
                e = q;
                if (e === start) {
                    e = -1;
                    break;
                }
            }
            if (e === -1) continue; // likely a near-duplicate point; skip it

            // add the first triangle from the point
            let t = this._addTriangle(e, i, hullNext[e], -1, -1, hullTri[e]);

            // recursively flip triangles from the point until they satisfy the Delaunay condition
            hullTri[i] = this._legalize(t + 2);
            hullTri[e] = t; // keep track of boundary triangles on the hull
            hullSize++;

            // walk forward through the hull, adding more triangles and flipping recursively
            let n = hullNext[e];
            while (q = hullNext[n], orient2d(x, y, coords[2 * n], coords[2 * n + 1], coords[2 * q], coords[2 * q + 1]) < 0) {
                t = this._addTriangle(n, i, q, hullTri[i], -1, hullTri[n]);
                hullTri[i] = this._legalize(t + 2);
                hullNext[n] = n; // mark as removed
                hullSize--;
                n = q;
            }

            // walk backward from the other side, adding more triangles and flipping
            if (e === start) {
                while (q = hullPrev[e], orient2d(x, y, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1]) < 0) {
                    t = this._addTriangle(q, i, e, -1, hullTri[e], hullTri[q]);
                    this._legalize(t + 2);
                    hullTri[q] = t;
                    hullNext[e] = e; // mark as removed
                    hullSize--;
                    e = q;
                }
            }

            // update the hull indices
            this._hullStart = hullPrev[i] = e;
            hullNext[e] = hullPrev[n] = i;
            hullNext[i] = n;

            // save the two new edges in the hash table
            hullHash[this._hashKey(x, y)] = i;
            hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
        }

        this.hull = new Uint32Array(hullSize);
        for (let i = 0, e = this._hullStart; i < hullSize; i++) {
            this.hull[i] = e;
            e = hullNext[e];
        }

        // trim typed triangle mesh arrays
        this.triangles = this._triangles.subarray(0, this.trianglesLen);
        this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
    }

    /**
     * Calculate an angle-based key for the edge hash used for advancing convex hull.
     *
     * @param {number} x
     * @param {number} y
     * @private
     */
    _hashKey(x, y) {
        return Math.floor(dlnPseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
    }

    /**
     * Flip an edge in a pair of triangles if it doesn't satisfy the Delaunay condition.
     *
     * @param {number} a
     * @private
     */
    _legalize(a) {
        const {_triangles: triangles, _halfedges: halfedges, coords} = this;

        let i = 0;
        let ar = 0;

        // recursion eliminated with a fixed-size stack
        while (true) {
            const b = halfedges[a];

            /* if the pair of triangles doesn't satisfy the Delaunay condition
             * (p1 is inside the circumcircle of [p0, pl, pr]), flip them,
             * then do the same check/flip recursively for the new pair of triangles
             *
             *           pl                    pl
             *          /||\                  /  \
             *       al/ || \bl            al/    \a
             *        /  ||  \              /      \
             *       /  a||b  \    flip    /___ar___\
             *     p0\   ||   /p1   =>   p0\---bl---/p1
             *        \  ||  /              \      /
             *       ar\ || /br             b\    /br
             *          \||/                  \  /
             *           pr                    pr
             */
            const a0 = a - a % 3;
            ar = a0 + (a + 2) % 3;

            if (b === -1) { // convex hull edge
                if (i === 0) break;
                a = DLN_EDGE_STACK[--i];
                continue;
            }

            const b0 = b - b % 3;
            const al = a0 + (a + 1) % 3;
            const bl = b0 + (b + 2) % 3;

            const p0 = triangles[ar];
            const pr = triangles[a];
            const pl = triangles[al];
            const p1 = triangles[bl];

            const illegal = dlnInCircle(
                coords[2 * p0], coords[2 * p0 + 1],
                coords[2 * pr], coords[2 * pr + 1],
                coords[2 * pl], coords[2 * pl + 1],
                coords[2 * p1], coords[2 * p1 + 1]);

            if (illegal) {
                triangles[a] = p1;
                triangles[b] = p0;

                const hbl = halfedges[bl];

                // edge swapped on the other side of the hull (rare); fix the half-edge reference
                if (hbl === -1) {
                    let e = this._hullStart;
                    do {
                        if (this._hullTri[e] === bl) {
                            this._hullTri[e] = a;
                            break;
                        }
                        e = this._hullPrev[e];
                    } while (e !== this._hullStart);
                }
                this._link(a, hbl);
                this._link(b, halfedges[ar]);
                this._link(ar, bl);

                const br = b0 + (b + 1) % 3;

                // don't worry about hitting the cap: it can only happen on extremely degenerate input
                if (i < DLN_EDGE_STACK.length) {
                    DLN_EDGE_STACK[i++] = br;
                }
            } else {
                if (i === 0) break;
                a = DLN_EDGE_STACK[--i];
            }
        }

        return ar;
    }

    /**
     * Link two half-edges to each other.
     * @param {number} a
     * @param {number} b
     * @private
     */
    _link(a, b) {
        this._halfedges[a] = b;
        if (b !== -1) this._halfedges[b] = a;
    }

    /**
     * Add a new triangle given vertex indices and adjacent half-edge ids.
     *
     * @param {number} i0
     * @param {number} i1
     * @param {number} i2
     * @param {number} a
     * @param {number} b
     * @param {number} c
     * @private
     */
    _addTriangle(i0, i1, i2, a, b, c) {
        const t = this.trianglesLen;

        this._triangles[t] = i0;
        this._triangles[t + 1] = i1;
        this._triangles[t + 2] = i2;

        this._link(t, a);
        this._link(t + 1, b);
        this._link(t + 2, c);

        this.trianglesLen += 3;

        return t;
    }
}

/**
 * Monotonically increases with real angle, but doesn't need expensive trigonometry.
 *
 * @param {number} dx
 * @param {number} dy
 */
function dlnPseudoAngle(dx, dy) {
    const p = dx / (Math.abs(dx) + Math.abs(dy));
    return (dy > 0 ? 3 - p : 1 + p) / 4; // [0..1]
}

/**
 * Squared distance between two points.
 *
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 */
function dlnDist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

/**
 * Check whether point P is inside a circle formed by points A, B, C.
 *
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} cx
 * @param {number} cy
 * @param {number} px
 * @param {number} py
 */
function dlnInCircle(ax, ay, bx, by, cx, cy, px, py) {
    const dx = ax - px;
    const dy = ay - py;
    const ex = bx - px;
    const ey = by - py;
    const fx = cx - px;
    const fy = cy - py;

    const ap = dx * dx + dy * dy;
    const bp = ex * ex + ey * ey;
    const cp = fx * fx + fy * fy;

    return dx * (ey * cp - bp * fy) -
           dy * (ex * cp - bp * fx) +
           ap * (ex * fy - ey * fx) < 0;
}

/**
 * Squared radius of the circle formed by points A, B, C.
 *
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} cx
 * @param {number} cy
 */
function dlnCircumradius(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax;
    const dy = by - ay;
    const ex = cx - ax;
    const ey = cy - ay;

    const bl = dx * dx + dy * dy;
    const cl = ex * ex + ey * ey;
    const d = 0.5 / (dx * ey - dy * ex);

    const x = (ey * bl - dy * cl) * d;
    const y = (dx * cl - ex * bl) * d;

    return x * x + y * y;
}

/**
 * Get coordinates of a dlnCircumcenter for points A, B, C.
 *
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} cx
 * @param {number} cy
 */
function dlnCircumcenter(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax;
    const dy = by - ay;
    const ex = cx - ax;
    const ey = cy - ay;

    const bl = dx * dx + dy * dy;
    const cl = ex * ex + ey * ey;
    const d = 0.5 / (dx * ey - dy * ex);

    const x = ax + (ey * bl - dy * cl) * d;
    const y = ay + (dx * cl - ex * bl) * d;

    return {x, y};
}

/**
 * Sort points by distance via an array of point indices and an array of calculated distances.
 *
 * @param {Uint32Array} ids
 * @param {Float64Array} dists
 * @param {number} left
 * @param {number} right
 */
function dlnQuicksort(ids, dists, left, right) {
    if (right - left <= 20) {
        for (let i = left + 1; i <= right; i++) {
            const temp = ids[i];
            const tempDist = dists[temp];
            let j = i - 1;
            while (j >= left && dists[ids[j]] > tempDist) ids[j + 1] = ids[j--];
            ids[j + 1] = temp;
        }
    } else {
        const median = (left + right) >> 1;
        let i = left + 1;
        let j = right;
        dlnSwap(ids, median, i);
        if (dists[ids[left]] > dists[ids[right]]) dlnSwap(ids, left, right);
        if (dists[ids[i]] > dists[ids[right]]) dlnSwap(ids, i, right);
        if (dists[ids[left]] > dists[ids[i]]) dlnSwap(ids, left, i);

        const temp = ids[i];
        const tempDist = dists[temp];
        while (true) {
            do i++; while (dists[ids[i]] < tempDist);
            do j--; while (dists[ids[j]] > tempDist);
            if (j < i) break;
            dlnSwap(ids, i, j);
        }
        ids[left + 1] = ids[j];
        ids[j] = temp;

        if (right - i + 1 >= j - left) {
            dlnQuicksort(ids, dists, i, right);
            dlnQuicksort(ids, dists, left, j - 1);
        } else {
            dlnQuicksort(ids, dists, left, j - 1);
            dlnQuicksort(ids, dists, i, right);
        }
    }
}

/**
 * @param {Uint32Array} arr
 * @param {number} i
 * @param {number} j
 */
function dlnSwap(arr, i, j) {
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

/** @param {[number, number]} p */
function dlnGetX(p) {
    return p[0];
}
/** @param {[number, number]} p */
function dlnGetY(p) {
    return p[1];
}

return Object.freeze({Delaunator});
})();
// src/engine3/voronoi.mjs
const __voronoi=(()=>{
const { ringSignedArea, pointInGeom, geomArea } = __geometry;
const { Delaunator } = __delaunay;
// Motor 2 · cobertura EXATA por diagrama de Voronoi recortado pelo lote.
// Para cada ponto, a célula de Voronoi (lugares mais perto dele que de qualquer outro) é a interseção dos
// semiplanos "mais perto de i que de j" com os vizinhos de Delaunay j. Recortar cada anel do lote por esses
// semiplanos (Sutherland–Hodgman: recorte convexo, vale para lote côncavo e com furos) dá:
//  · área que cada ponto representa (soma das áreas com sinal dos anéis recortados);
//  · pior vazio exato: a distância ao ponto é convexa dentro da célula, logo o máximo está num vértice da região
//    (vértice do lote dentro da célula, cruzamento borda × célula ou vértice de Voronoi dentro do lote).
// Sem grade: o número é exato a menos do ponto flutuante. Conferido contra Shapely/GEOS (audit/voronoi-*).

const ON_EDGE_TOL_M = 1e-7;

/** Pares vizinhos (i < j) do diagrama: arestas de Delaunay; casos degenerados (1, 2 ou todos colineares) à parte. */
function voronoiNeighbors(xy) {
  const n = xy.length, nb = Array.from({ length: n }, () => new Set());
  if (n < 2) return nb;
  const d = Delaunator.from(xy);
  if (d.triangles.length) {
    for (let e = 0; e < d.triangles.length; e++) {
      const a = d.triangles[e], b = d.triangles[e % 3 === 2 ? e - 2 : e + 1];
      nb[a].add(b); nb[b].add(a);
    }
  } else {
    // todos colineares: vizinhos são os consecutivos na ordem da reta (o casco que o Delaunator devolve)
    const h = [...d.hull];
    for (let k = 1; k < h.length; k++) { nb[h[k - 1]].add(h[k]); nb[h[k]].add(h[k - 1]); }
  }
  // pontos repetidos ficam fora da triangulação: mesmo lugar, mesma célula — repartem a área ao meio por par
  return nb;
}

/** Recorta um anel aberto pelo semiplano (p − m)·d ≤ 0. */
function clipRing(ring, mx, my, dx, dy) {
  const out = [], n = ring.length;
  if (!n) return out;
  let [px, py] = ring[n - 1], pf = (px - mx) * dx + (py - my) * dy;
  for (let k = 0; k < n; k++) {
    const [cx, cy] = ring[k], cf = (cx - mx) * dx + (cy - my) * dy;
    if (cf <= 0) {
      if (pf > 0) { const t = pf / (pf - cf); out.push([px + t * (cx - px), py + t * (cy - py)]); }
      out.push([cx, cy]);
    } else if (pf <= 0) { const t = pf / (pf - cf); out.push([px + t * (cx - px), py + t * (cy - py)]); }
    px = cx; py = cy; pf = cf;
  }
  return out;
}

const openRing = ring => (ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring.slice());

/** Ponto do lote (dentro ou sobre a divisa, com folga de 1e-7 m). */
function inLotClosed(x, y, geom) {
  if (pointInGeom(x, y, geom)) return true;
  for (const polygon of geom) for (const ring of polygon) {
    for (let k = 1; k < ring.length; k++) {
      const [ax, ay] = ring[k - 1], [bx, by] = ring[k], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
      const t = L2 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2)) : 0;
      if (Math.hypot(x - (ax + t * ex), y - (ay + t * ey)) <= ON_EDGE_TOL_M) return true;
    }
  }
  return false;
}

/**
 * Células de Voronoi recortadas pelo lote.
 * @param {number[][][][]} geom  multipolígono: [polígono][anel][vértice] = [x, y] (metros)
 * @param {{x:number,y:number}[]} samples
 * @returns {{cells: {areaM2:number, worstM:number, worstAt:number[]|null, rings:number[][][]}[], worstGapM:number, worstAt:number[]|null, worstIndex:number, totalAreaM2:number, method:string}}
 */
function exactCoverage(geom, samples) {
  const xy = samples.map(s => [s.x, s.y]);
  const fast = cellsWith(geom, xy, voronoiNeighbors(xy));
  // Autoverificação: com pontos quase colineares o Delaunay pode descartar um ponto (fica sem vizinhos) ou deixar de
  // ligar vizinhos — aí as células se sobrepõem e a soma passa da área do lote. Nesses casos refaz com TODOS os pares
  // (cada célula recortada por todas as bissetrizes): exato em qualquer configuração, só que O(n²).
  const lot = geomArea(geom), tol = Math.max(1e-6 * lot, 1e-3);
  if (xy.length < 2 || Math.abs(fast.totalAreaM2 - lot) <= tol) return { ...fast, method: 'delaunay' };
  const all = xy.map((_, i) => new Set(xy.map((__, j) => j).filter(j => j !== i)));
  return { ...cellsWith(geom, xy, all), method: 'todos-os-pares' };
}

function cellsWith(geom, xy, nb) {
  const n = xy.length;
  const cells = [];
  let worstGapM = n ? 0 : Infinity, worstIndex = -1, totalAreaM2 = 0;
  /** @type {number[]|null} */ let worstAt = null;
  for (let i = 0; i < n; i++) {
    const [sx, sy] = xy[i], rings = [];
    let area = 0, worst = 0;
    /** @type {number[]|null} */ let at = null;
    for (const polygon of geom) polygon.forEach((ring0, r) => {
      const orient = Math.sign(ringSignedArea(ring0)) || 1, hole = r > 0;
      let ring = openRing(ring0);
      for (const j of nb[i]) {
        const [tx, ty] = xy[j];
        if (tx === sx && ty === sy) continue;
        ring = clipRing(ring, (sx + tx) / 2, (sy + ty) / 2, tx - sx, ty - sy);
        if (!ring.length) break;
      }
      if (ring.length < 3) return;
      const a = Math.abs(ringSignedArea([...ring, ring[0]])) * (Math.sign(ringSignedArea([...ring, ring[0]])) === orient ? 1 : -1);
      area += hole ? -a : a;
      rings.push(ring);
      for (const [x, y] of ring) {
        const dist = Math.hypot(x - sx, y - sy);
        if (dist > worst && inLotClosed(x, y, geom)) { worst = dist; at = [x, y]; }
      }
    });
    cells.push({ areaM2: Math.max(0, area), worstM: worst, worstAt: at, rings });
    totalAreaM2 += Math.max(0, area);
    if (worst > worstGapM) { worstGapM = worst; worstAt = at; worstIndex = i; }
  }
  return { cells, worstGapM, worstAt, worstIndex, totalAreaM2 };
}

return Object.freeze({exactCoverage});
})();
// src/engine3/polyline.mjs
const __polyline=(()=>{
const { TOLERANCES } = __tolerances;
// Motor 2 · polilinhas em metros: comprimento acumulado (s), ponto em s, projeção e recorte entre s0 e s1.
// Reescrita legível do módulo polyline do motor 0.5.1, com o mesmo resultado (teste diferencial).

const { ALONG_S_EPS_M, CLOSED_LINE_EPS_M, SLICE_VERTEX_EPS_M } = TOLERANCES;

function assertPolyline(line) {
  if (!Array.isArray(line) || line.length < 2) throw Error('Trajeto precisa de dois ou mais vértices');
  for (const v of line) if (!Array.isArray(v) || !Number.isFinite(v[0]) || !Number.isFinite(v[1])) throw Error('Coordenada inválida no trajeto');
}

/** s acumulado em cada vértice (s[0] = 0). */
function cumulative(line) {
  assertPolyline(line);
  const s = [0];
  for (let i = 1; i < line.length; i++) s.push(s[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  return s;
}

const lengthOf = line => cumulative(line).at(-1);

/** Ponto a s metros do início (busca binária no acumulado). Fora de [0, L] além da folga: erro. */
function pointAt(line, s, cum = cumulative(line)) {
  const length = /** @type {number} */ (cum.at(-1));
  if (!(length > 0) || !Number.isFinite(s) || s < -ALONG_S_EPS_M || s > length + ALONG_S_EPS_M) throw Error('Distância fora do trajeto válido');
  const target = Math.min(Math.max(s, 0), length);
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= target) lo = mid; else hi = mid; }
  const span = cum[hi] - cum[lo];
  if (span <= 0) return [line[hi][0], line[hi][1]];
  const f = (target - cum[lo]) / span;
  return [line[lo][0] + f * (line[hi][0] - line[lo][0]), line[lo][1] + f * (line[hi][1] - line[lo][1])];
}

/** Projeção ortogonal na linha: { s, x, y, dist } do ponto mais próximo (primeiro em caso de empate). */
function locate(line, xy, cum = cumulative(line)) {
  let best = { s: 0, x: line[0][0], y: line[0][1], dist: Infinity };
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
    const t = len2 ? Math.min(1, Math.max(0, ((xy[0] - a[0]) * dx + (xy[1] - a[1]) * dy) / len2)) : 0;
    const x = a[0] + t * dx, y = a[1] + t * dy, dist = Math.hypot(xy[0] - x, xy[1] - y);
    if (dist < best.dist) best = { s: cum[i - 1] + t * (cum[i] - cum[i - 1]), x, y, dist };
  }
  return best;
}

/** Trecho entre s0 e s1 (s1 > s0): ponta, vértices internos estritamente entre os cortes, ponta. */
function slice(line, s0, s1, cum = cumulative(line)) {
  if (!(s1 > s0)) throw Error('Recorte vazio');
  const out = [pointAt(line, s0, cum)];
  for (let i = 1; i < line.length - 1; i++) if (cum[i] > s0 + SLICE_VERTEX_EPS_M && cum[i] < s1 - SLICE_VERTEX_EPS_M) out.push([line[i][0], line[i][1]]);
  out.push(pointAt(line, s1, cum));
  return out;
}

/** Linha fechada: mais de 3 vértices e pontas coincidentes (tolerância CLOSED_LINE_EPS_M). */
function isClosed(line) {
  const a = line[0], b = line.at(-1);
  return line.length > 3 && Math.hypot(a[0] - b[0], a[1] - b[1]) < CLOSED_LINE_EPS_M;
}

/** Círculo como polilinha (usado só por dados legados de anéis; o método vigente é linear). */
function circlePolyline(center, radius, stepM = 10, startDeg = 0) {
  if (!(radius > 0)) throw Error('Raio deve ser positivo');
  const n = Math.max(24, Math.ceil(2 * Math.PI * radius / stepM)), out = [];
  for (let i = 0; i <= n; i++) {
    const a = startDeg * Math.PI / 180 + 2 * Math.PI * i / n;
    out.push([center[0] + radius * Math.sin(a), center[1] + radius * Math.cos(a)]);
  }
  out[n] = [out[0][0], out[0][1]];
  return out;
}

return Object.freeze({assertPolyline,cumulative,lengthOf,pointAt,locate,slice,isClosed,circlePolyline});
})();
// src/engine3/clip.mjs
const __clip=(()=>{
const { TOLERANCES } = __tolerances;
const { geomEdges, pointInGeom, segmentIntersectionT } = __geometry;
const { cumulative, isClosed, pointAt, slice } = __polyline;
// Motor 2 · recorte de uma polilinha pelo contorno do lote (com furos e partes separadas).
// Corta em todo cruzamento com as arestas; mantém só os trechos cujo ponto médio está dentro do lote.
// Trechos encostados (corte em comum) se juntam; numa linha fechada o primeiro e o último se emendam.
// Nunca liga partes através de área externa. Reescrita legível do clip do motor 0.5.1 (teste diferencial).

const { CUT_MERGE_TOL_M } = TOLERANCES;

/**
 * @returns {{pieces:{s0,s1,len,line,wraps}[], discarded:{s0,s1,len,line,wraps}[], totalLength:number}}
 *   pieces: trechos dentro com comprimento ≥ minPieceM; discarded: os mais curtos (listados, não somem).
 */
function clipPolylineToGeom(line, geom, { minPieceM = 0 } = {}) {
  const cum = cumulative(line), total = /** @type {number} */ (cum.at(-1)), edges = geomEdges(geom);
  // 1. Posições de corte ao longo da linha: pontas + cada cruzamento com uma aresta.
  const cuts = [0, total];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], segment = cum[i] - cum[i - 1];
    if (!(segment > 0)) continue;
    for (const [c, d] of edges) {
      const t = segmentIntersectionT(a, b, c, d);
      if (t !== null) cuts.push(cum[i - 1] + t * segment);
    }
  }
  cuts.sort((x, y) => x - y);
  /** @type {number[]} */
  const unique = [];
  for (const s of cuts) if (!unique.length || s - /** @type {number} */ (unique.at(-1)) > CUT_MERGE_TOL_M) unique.push(s);
  // 2. Intervalos entre cortes com o ponto médio dentro do lote; vizinhos encostados viram um só.
  /** @type {{s0: number, s1: number}[]} */
  const inside = [];
  for (let k = 0; k < unique.length - 1; k++) {
    const s0 = unique[k], s1 = unique[k + 1];
    if (s1 - s0 <= CUT_MERGE_TOL_M) continue;
    const mid = pointAt(line, (s0 + s1) / 2, cum);
    if (!pointInGeom(mid[0], mid[1], geom)) continue;
    const last = inside.at(-1);
    if (last && Math.abs(last.s1 - s0) <= CUT_MERGE_TOL_M) last.s1 = s1; else inside.push({ s0, s1 });
  }
  let parts = inside.map(({ s0, s1 }) => ({ s0, s1, len: s1 - s0, line: slice(line, s0, s1, cum), wraps: false }));
  // 3. Linha fechada que começa e termina dentro: emenda o último trecho com o primeiro.
  if (isClosed(line) && parts.length > 1) {
    const first = parts[0], last = parts[parts.length - 1];
    if (first.s0 <= CUT_MERGE_TOL_M && total - last.s1 <= CUT_MERGE_TOL_M) {
      parts = [{ s0: last.s0, s1: first.s1 + total, len: last.len + first.len, line: last.line.concat(first.line.slice(1)), wraps: true }, ...parts.slice(1, -1)];
    }
  }
  return { pieces: parts.filter(p => p.len >= minPieceM), discarded: parts.filter(p => p.len < minPieceM), totalLength: total };
}

return Object.freeze({clipPolylineToGeom});
})();
// src/engine3/tracks.mjs
const __tracks=(()=>{
const { TOLERANCES } = __tolerances;
const { clipPolylineToGeom } = __clip;
const { circlePolyline, lengthOf } = __polyline;
const { geomCentroid } = __geometry;
// Motor 2 · tiros retos (método linear, sem anéis): direção, deslocamentos de lado, seleção e recorte.
// Reescrita legível do módulo tracks do motor 0.5.1, com o mesmo resultado (teste diferencial nos 51 lotes).
// Anéis (buildCircularTracks) existem só para abrir dados legados; o método vigente é linear.

const { SAME_OFFSET_EPS_M } = TOLERANCES;

const TRACK_KINDS = Object.freeze({
  referencia_linear: { confidence: 'baixa', label: 'Reta estimada pelo rumo (não é rastro)' },
  curva_desenhada: { confidence: 'baixa', label: 'Curva desenhada/estimada (não é rastro)' },
  pista_gnss: { confidence: 'media', label: 'Pista GNSS importada do pulverizador' },
  trajeto_gps_equipe: { confidence: 'alta', label: 'Trajeto GPS executado pela equipe' },
});
const trackKindLabel = kind => TRACK_KINDS[kind]?.label ?? kind;

/**
 * Referencial do tiro. bearingDeg: rumo verdadeiro da planilha; gridCorrection: correção para a grade UTM
 * (= −convergência meridiana, conferida com PROJ). u: direção de caminhada; v: direção "de lado" (u girado 90°).
 */
function trackFrame(bearingDeg, gridCorrectionDeg = 0) {
  const a = (bearingDeg + gridCorrectionDeg) * Math.PI / 180, u = [Math.sin(a), Math.cos(a)];
  return { u, v: [-u[1], u[0]] };
}

const dot = (p, d) => p[0] * d[0] + p[1] * d[1];

/** Faixa [min, max] da projeção do lote numa direção. */
function projectionRange(geom, direction) {
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
function straightOffsets(geom, v, params) {
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
function buildStraightTracks(field, params) {
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
function buildCircularTracks(field, params) {
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
function buildImportedTracks(lines, kind) {
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
function selectTracks(tracks, selection) {
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
function clipTracks(tracks, geom, minPieceM) {
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

const trackLength = track => lengthOf(track.line);

return Object.freeze({TRACK_KINDS,trackKindLabel,trackFrame,projectionRange,straightOffsets,buildStraightTracks,buildCircularTracks,buildImportedTracks,selectTracks,clipTracks,trackLength});
})();
// src/engine3/sampling.mjs
const __sampling=(()=>{
const { cumulative, pointAt } = __polyline;
// Motor 2 · posição dos pontos ao longo de um trecho de comprimento L com n pontos.
// Regras de borda (edgePolicy), em metros ao longo do trecho:
// - meia_margem:    (i + ½)·L/n            → borda e intervalos: L/(2n) e L/n
// - margens_iguais: (i + 1)·L/(n + 1)      → borda = intervalo = L/(n + 1)
// - margem_fixa:    m, m + d, …, L − m     → d = (L − 2m)/(n − 1); se a margem não couber, vira meia_margem
// Reescrita legível do módulo sampling do motor 0.5.1 (teste diferencial).

function assertLengthCount(L, n) {
  if (!Number.isFinite(L) || L <= 0) throw Error('L > 0 é obrigatório');
  if (!Number.isInteger(n) || n < 1) throw Error('n >= 1 inteiro é obrigatório');
}
/** Margem fixa efetiva: entre 0 e metade do trecho. */
const effectiveMargin = (L, margin) => Math.max(0, Math.min(margin || 0, L / 2));
/** Margem fixa que não deixa espaço para n > 1 pontos (2m ≥ L): usa meia margem. */
const marginTooBig = (L, n, margin) => n > 1 && 2 * (margin || 0) >= L;

function positions(L, n, policy = 'meia_margem', margin = 0) {
  assertLengthCount(L, n);
  if (policy === 'meia_margem') return Array.from({ length: n }, (_, i) => (i + 0.5) * L / n);
  if (policy === 'margens_iguais') return Array.from({ length: n }, (_, i) => (i + 1) * L / (n + 1));
  if (policy === 'margem_fixa') {
    if (n === 1) return [L / 2];
    if (marginTooBig(L, n, margin)) return positions(L, n, 'meia_margem');
    const m = effectiveMargin(L, margin), d = (L - 2 * m) / (n - 1);
    return Array.from({ length: n }, (_, i) => m + i * d);
  }
  throw Error(`Política inválida: ${policy}`);
}

/** Intervalo entre pontos vizinhos no mesmo trecho (null com um só ponto). */
function internalGap(L, n, policy, margin = 0) {
  assertLengthCount(L, n);
  if (n === 1) return null;
  if (policy === 'meia_margem') return L / n;
  if (policy === 'margens_iguais') return L / (n + 1);
  if (policy === 'margem_fixa') return marginTooBig(L, n, margin) ? L / n : (L - 2 * effectiveMargin(L, margin)) / (n - 1);
  throw Error(`Política inválida: ${policy}`);
}

/** Maior distância, andando no trecho, de qualquer lugar dele até o ponto mais próximo (∞ sem pontos). */
function alongCoverageRadius(L, n, policy, margin = 0) {
  if (n <= 0) return Infinity;
  if (policy === 'meia_margem') return L / (2 * n);
  if (policy === 'margens_iguais') return L / (n + 1);
  if (policy === 'margem_fixa') {
    if (n === 1) return L / 2;
    if (marginTooBig(L, n, margin)) return L / (2 * n);
    const m = effectiveMargin(L, margin);
    return Math.max(m, (L - 2 * m) / (2 * (n - 1)));
  }
  throw Error(`Política inválida: ${policy}`);
}

/** Posições deslocadas em bloco (otimização), sem sair do trecho. */
function shiftedPositions(L, n, policy, margin, shift) {
  const base = positions(L, n, policy, margin), min = -base[0], max = L - base[n - 1];
  const s = Math.min(max, Math.max(min, shift));
  return base.map(p => p + s);
}

/** Posição ao longo do TIRO inteiro (trecho que dá a volta numa linha fechada é contado em módulo). */
const trackPosition = (unit, s) => (unit.wraps ? (unit.s0Track + s) % unit.trackLength : unit.s0Track + s);

/** Pontos de todos os trechos conforme as contagens; numerados na ordem dos trechos e ao longo de cada um. */
function sampleUnits(units, counts, policy, margin, shifts) {
  const samples = [];
  for (const unit of units) {
    const n = counts.get(unit.id) || 0;
    if (!n) continue;
    const cum = cumulative(unit.line);
    const along = shifts && shifts.has(unit.id) ? shiftedPositions(unit.len, n, policy, margin, shifts.get(unit.id) || 0) : positions(unit.len, n, policy, margin);
    along.forEach((s, i) => {
      const [x, y] = pointAt(unit.line, s, cum);
      samples.push({ unitId: unit.id, trackId: unit.trackId, seq: i + 1, s, sTrack: trackPosition(unit, s), x, y,
        kind: unit.kind, confidence: unit.confidence, manual: false, offTrack: false });
    });
  }
  return numberSamples(samples, units);
}

/** Ordena por trecho (ordem dos units) e posição; atribui id P1, P2… (preserva id existente) e número. */
function numberSamples(samples, units) {
  const order = new Map(units.map((u, i) => [u.id, i]));
  return samples.slice().sort((a, b) => (order.get(a.unitId) ?? 1e9) - (order.get(b.unitId) ?? 1e9) || a.s - b.s)
    .map((p, i) => ({ ...p, id: p.id || `P${i + 1}`, number: i + 1 }));
}

return Object.freeze({effectiveMargin,positions,internalGap,alongCoverageRadius,shiftedPositions,trackPosition,sampleUnits,numberSamples});
})();
// src/engine3/allocation.mjs
const __allocation=(()=>{
const { TOLERANCES } = __tolerances;
const { alongCoverageRadius, internalGap } = __sampling;
// Motor 2 · quantos pontos vai em cada trecho.
// Regra base: mínimo por área = ⌈área oficial ÷ hectares por ponto⌉ (nunca reduzido automaticamente).
// Repartição gulosa: cada ponto extra vai ao trecho cujo raio de cobertura ao longo (ver sampling) está maior;
// empate (≤ ALLOC_EPS_M) → trecho mais longo; depois o id menor. Determinística.
// Reescrita legível do módulo allocation do motor 0.5.1 (teste diferencial).

const { ALLOC_EPS_M, MIN_POINTS_EPS } = TOLERANCES;

function minimumPoints(areaHa, haPerPoint) {
  if (!Number.isFinite(areaHa) || areaHa <= 0) throw Error('Área oficial inválida');
  if (!Number.isFinite(haPerPoint) || haPerPoint <= 0) throw Error('Hectares por ponto inválido');
  return Math.ceil(areaHa / haPerPoint - MIN_POINTS_EPS);
}

/** Trecho que mais precisa de um ponto: maior raio de cobertura; empate → mais longo → id menor. */
function neediest(units, counts, radius) {
  /** @type {{id: string, len: number} | null} */
  let best = null;
  let bestR = -Infinity;
  for (const u of units) {
    const r = radius(u.len, counts.get(u.id) || 0), tie = r === bestR || Math.abs(r - bestR) <= ALLOC_EPS_M;
    if ((!tie && r > bestR) || (tie && best && (u.len > best.len || (u.len === best.len && u.id < best.id)))) { best = u; bestR = r; }
  }
  return best;
}

/** Total fixo de pontos: 1 por trecho e o resto pela regra gulosa. Menos pontos que trechos = conflito. */
function allocateBalanced(units, total, policy, margin = 0) {
  if (!units.length) return { counts: new Map(), status: 'sem_trechos', empty: [], suggestions: ['Nenhum trecho válido: revise rumo, espaçamento ou geometria.'] };
  if (!Number.isInteger(total) || total < 0) throw Error('Total de pontos deve ser inteiro >= 0');
  const radius = (L, n) => alongCoverageRadius(L, n, policy, margin), counts = new Map(units.map(u => [u.id, 0]));
  let status = 'ok';
  const suggestions = [];
  if (total < units.length) {
    status = 'conflito';
    suggestions.push(`Aumentar para ${units.length} pontos (1 por trecho ativo)`, `Ou reduzir para ${total} tiros/trechos ativos`);
  } else for (const u of units) counts.set(u.id, 1);
  for (let used = status === 'ok' ? units.length : 0; used < total; used++) {
    const u = neediest(units, counts, radius);
    if (!u) break;
    counts.set(u.id, (counts.get(u.id) || 0) + 1);
  }
  return { counts, status, empty: units.filter(u => !counts.get(u.id)).map(u => u.id), suggestions };
}

/** Mesmo número por tiro, repartido entre os trechos de cada tiro. */
function allocatePerTrack(units, perTrack, policy, margin = 0) {
  if (!Number.isInteger(perTrack) || perTrack < 1) throw Error('Pontos por tiro deve ser inteiro >= 1');
  const byTrack = new Map();
  for (const u of units) { if (!byTrack.has(u.trackId)) byTrack.set(u.trackId, []); byTrack.get(u.trackId).push(u); }
  const counts = new Map(), empty = [], suggestions = [];
  let status = 'ok';
  for (const [trackId, group] of byTrack) {
    const r = allocateBalanced(group, perTrack, policy, margin);
    for (const [id, n] of r.counts) counts.set(id, n);
    if (r.status === 'conflito') {
      status = 'conflito'; empty.push(...r.empty);
      suggestions.push(`${trackId}: ${group.length} trechos separados e só ${perTrack} pontos — aumentar para ${group.length} ou aceitar trechos sem amostra listados`);
    }
  }
  return { counts, status, empty, suggestions };
}

/** Menor n que deixa o intervalo (ou, com 1 ponto, o dobro do raio) ≤ alvo. */
function countForSpacing(L, target, policy, margin = 0) {
  if (!(target > 0)) throw Error('Intervalo alvo deve ser positivo');
  let n = 1;
  while (n < 1e4) {
    const gap = internalGap(L, n, policy, margin), r = alongCoverageRadius(L, n, policy, margin);
    if ((gap === null && 2 * r <= target + ALLOC_EPS_M) || (gap !== null && gap <= target + ALLOC_EPS_M)) return n;
    n++;
  }
  return n;
}

/** Pelo intervalo desejado; completa até o mínimo por área; acima do teto = conflito. */
function allocateBySpacing(units, target, policy, margin, minimum, cap) {
  const counts = new Map(units.map(u => [u.id, countForSpacing(u.len, target, policy, margin)]));
  let total = [...counts.values()].reduce((a, b) => a + b, 0), added = 0;
  const suggestions = [], radius = (L, n) => alongCoverageRadius(L, n, policy, margin);
  while (total < minimum) {
    const u = neediest(units, counts, radius);
    if (!u) break;
    counts.set(u.id, (counts.get(u.id) || 0) + 1); total++; added++;
  }
  if (added) suggestions.push(`${added} ponto(s) acrescentado(s) para cumprir o mínimo por área; intervalos ficam menores que o alvo.`);
  let status = 'ok';
  if (total > cap) { status = 'conflito'; suggestions.push(`Alvo de ${target} m exige ${total} pontos (teto ${cap}). Aumente o alvo.`); }
  return { counts, status, empty: [], suggestions, added };
}

return Object.freeze({minimumPoints,allocateBalanced,allocatePerTrack,countForSpacing,allocateBySpacing});
})();
// src/engine3/metrics.mjs
const __metrics=(()=>{
const { geomArea, geomBounds } = __geometry;
const { cumulative, locate, pointAt } = __polyline;
// Motor 2 · métricas do plano: intervalos ao longo, cobertura do lote, distância entre tiros e caminhada.
// Reescrita legível do módulo metrics do motor 0.5.1 (teste diferencial: mesmos números).

/** n, mín., máx., mediana, média e CV (desvio padrão populacional ÷ média) dos valores finitos. */
function summarize(values) {
  const v = values.filter(Number.isFinite).slice().sort((a, b) => a - b), n = v.length;
  if (!n) return { n: 0, min: null, max: null, median: null, mean: null, cv: null };
  const mean = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const median = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  return { n, min: v[0], max: v[n - 1], median, mean, cv: mean ? sd / mean : 0 };
}

/** Intervalos entre pontos vizinhos em cada trecho e por tiro (pontos fora do trajeto não entram). */
function longitudinal(samples, units) {
  const byUnit = new Map(units.map(u => [u.id, []]));
  for (const p of samples) if (!p.offTrack && byUnit.has(p.unitId)) byUnit.get(p.unitId).push(p);
  const perUnit = [], all = [];
  for (const u of units) {
    const pts = byUnit.get(u.id).slice().sort((a, b) => a.s - b.s), gaps = [];
    for (let i = 1; i < pts.length; i++) gaps.push(pts[i].s - pts[i - 1].s);
    all.push(...gaps);
    perUnit.push({ unitId: u.id, trackId: u.trackId, lengthM: u.len, n: pts.length, gaps,
      startMarginM: pts.length ? pts[0].s : null, endMarginM: pts.length ? u.len - pts.at(-1).s : null, stats: summarize(gaps) });
  }
  const byTrack = new Map();
  for (const r of perUnit) {
    if (!byTrack.has(r.trackId)) byTrack.set(r.trackId, { trackId: r.trackId, lengthM: 0, n: 0, units: 0, gaps: [] });
    const t = byTrack.get(r.trackId); t.lengthM += r.lengthM; t.n += r.n; t.units++; t.gaps.push(...r.gaps);
  }
  const perTrack = [...byTrack.values()].map(t => ({ ...t, stats: summarize(t.gaps) }));
  return { perUnit, perTrack, global: summarize(all), emptyUnits: perUnit.filter(r => r.n === 0).map(r => r.unitId),
    tracksWithSamples: perTrack.filter(t => t.n > 0).length, tracksWithoutSamples: perTrack.filter(t => t.n === 0).map(t => t.trackId) };
}

/** Abscissas (ordenadas) onde a linha horizontal y cruza as arestas do anel. */
function crossingsAtY(ring, y) {
  const n0 = ring.length, n = n0 > 1 && ring[0][0] === ring[n0 - 1][0] && ring[0][1] === ring[n0 - 1][1] ? n0 - 1 : n0, xs = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    if ((a[1] > y) !== (b[1] > y)) xs.push((b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]);
  }
  return xs.sort((p, q) => p - q);
}

const gridCache = new WeakMap();
/**
 * Centros das células (passo × passo) dentro do lote, por varredura de linhas: para cada linha y, os cruzamentos
 * de cada anel são percorridos uma vez da esquerda para a direita (paridade = dentro/fora). Furos excluem.
 * Resultado em cache por geometria e passo.
 */
function coverageGrid(geom, step) {
  let byStep = gridCache.get(geom);
  if (!byStep) { byStep = new Map(); gridCache.set(geom, byStep); }
  const key = step.toFixed(6);
  if (byStep.has(key)) return byStep.get(key);
  const b = geomBounds(geom), xs = [], ys = [];
  for (let y = b.minY + step / 2; y < b.maxY; y += step) {
    const scan = geom.map(polygon => polygon.map(ring => ({ c: crossingsAtY(ring, y), k: 0 })));
    for (let x = b.minX + step / 2; x < b.maxX; x += step) {
      let inside = false;
      for (const rings of scan) {
        let inPolygon = true;
        for (let r = 0; r < rings.length; r++) {
          const ring = rings[r];
          while (ring.k < ring.c.length && ring.c[ring.k] <= x) ring.k++;
          const odd = ((ring.c.length - ring.k) & 1) === 1;
          if (r === 0 ? !odd : odd) { inPolygon = false; if (r === 0) break; }
        }
        if (inPolygon) inside = true;
      }
      if (inside) { xs.push(x); ys.push(y); }
    }
  }
  const grid = { step, x: Float64Array.from(xs), y: Float64Array.from(ys) };
  byStep.set(key, grid);
  return grid;
}

/**
 * Distância de cada célula ao ponto mais próximo. Pontos ordenados por x; para cada célula parte do vizinho
 * achado na célula anterior (células vizinhas têm vizinhos parecidos) e varre para os dois lados até que
 * só a diferença em x já seja maior que a melhor distância. Exato (não aproxima).
 */
function nearestUncached(grid, samples) {
  const cells = grid.x.length, out = new Float64Array(cells), m = samples.length;
  if (!m) { out.fill(Infinity); return out; }
  const order = Array.from({ length: m }, (_, i) => i).sort((a, b) => samples[a].x - samples[b].x);
  const sx = Float64Array.from(order, i => samples[i].x), sy = Float64Array.from(order, i => samples[i].y);
  let guess = 0;
  for (let c = 0; c < cells; c++) {
    const x = grid.x[c], y = grid.y[c];
    let lo = 0, hi = m;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sx[mid] < x) lo = mid + 1; else hi = mid; }
    let dx = x - sx[guess], dy = y - sy[guess], best = dx * dx + dy * dy, bestIndex = guess;
    for (let j = lo; j < m; j++) { dx = x - sx[j]; if (dx * dx >= best) break; dy = y - sy[j]; const d = dx * dx + dy * dy; if (d < best) { best = d; bestIndex = j; } }
    for (let j = lo - 1; j >= 0; j--) { dx = x - sx[j]; if (dx * dx >= best) break; dy = y - sy[j]; const d = dx * dx + dy * dy; if (d < best) { best = d; bestIndex = j; } }
    guess = bestIndex; out[c] = Math.sqrt(best);
  }
  return out;
}

const nearestCache = new WeakMap(), contentCache = new WeakMap();
/** Igual a nearestUncached, com cache por grade e lista de pontos (invalidado se algum ponto mudar). */
function nearestDistances(grid, samples) {
  let byGrid = nearestCache.get(grid);
  if (!byGrid) { byGrid = new WeakMap(); nearestCache.set(grid, byGrid); }
  const hit = byGrid.get(samples);
  if (hit && hit.xy.length === samples.length * 2 && samples.every((p, i) => p.x === hit.xy[2 * i] && p.y === hit.xy[2 * i + 1])) return hit.d;
  const xy = new Float64Array(samples.length * 2);
  samples.forEach((p, i) => { xy[2 * i] = p.x; xy[2 * i + 1] = p.y; });
  // 3.2 (M4): a busca do motor monta listas novas com os mesmos pontos (~22% das contas eram repetidas); também guarda
  // pelo conteúdo (coordenadas exatas), as últimas 64 por grade. Mesmo resultado: mesmas coordenadas, mesma conta.
  let byContent = contentCache.get(grid);
  if (!byContent) { byContent = new Map(); contentCache.set(grid, byContent); }
  const key = Array.prototype.join.call(xy, ',');
  let d = byContent.get(key);
  if (d) { byContent.delete(key); byContent.set(key, d); }
  else {
    d = nearestUncached(grid, samples); byContent.set(key, d);
    if (byContent.size > 64) byContent.delete(byContent.keys().next().value);
  }
  byGrid.set(samples, { xy, d });
  return d;
}

/** k-ésimo menor (0-based) por seleção de Hoare, sem ordenar tudo. Altera o vetor recebido. */
function selectKth(a, k) {
  let lo = 0, hi = a.length - 1;
  while (hi > lo) {
    const pivot = a[(lo + hi) >> 1];
    let i = lo, j = hi;
    while (i <= j) {
      while (a[i] < pivot) i++;
      while (a[j] > pivot) j--;
      if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; }
    }
    if (k <= j) hi = j; else if (k >= i) lo = i; else break;
  }
  return a[k];
}

/** k-ésimo menor valor (0-based) sem ordenar tudo; não altera a entrada. Mesmo valor que ordenar e indexar. */
function kthSmallest(values, k) { return selectKth(Float64Array.from(values), k); }

/** p95 (percentil pelo posto ⌈0,95·n⌉), máximo e média das distâncias. */
function distanceStats(d) {
  if (!d.length) return { p95: null, max: null, mean: null };
  let max = -Infinity, sum = 0;
  for (let i = 0; i < d.length; i++) { const v = d[i]; if (v > max) max = v; sum += v; }
  return { p95: selectKth(Float64Array.from(d), Math.max(0, Math.ceil(0.95 * d.length) - 1)), max, mean: sum / d.length };
}

/** Passo da grade: √(área ÷ células alvo), limitado entre minStepM e maxStepM. */
const gridStep = (geom, opts) => Math.min(opts.maxStepM, Math.max(opts.minStepM, Math.sqrt(geomArea(geom) / opts.gridTargetCells)));

/**
 * Cobertura do lote: distância de cada célula ao ponto mais próximo, na grade fina (meio passo, h).
 * A grade grossa estima a incerteza do p95.
 * maxUpperBoundM é um limite superior RIGOROSO do pior vazio contínuo (corrigido na 2.3; antes faltavam até
 * 10,9 m em 16 de 153 planos, ver audit/coverage-exact.py). Para x no lote: se o centro c da célula de x está
 * no lote, d(x) ≤ d(c) + h/√2; se está fora, o segmento x→c cruza a divisa em y com |x−y| ≤ h/√2, e y fica a
 * ≤ δ/2 de uma amostra b da divisa (espaçamento δ = h), logo d(x) ≤ d(b) + h/√2 + δ/2.
 */
function coverage(geom, samples, opts) {
  if (!samples.length) return { p95: null, max: null, mean: null, stepM: null, fineStepM: null, uncertaintyP95M: null, maxUpperBoundM: null, cells: 0 };
  const step = gridStep(geom, opts), coarse = distanceStats(nearestDistances(coverageGrid(geom, step), samples));
  const h = step / 2, fineGrid = coverageGrid(geom, h), fine = distanceStats(nearestDistances(fineGrid, samples));
  const border = nearestDistances(boundaryPoints(geom, h), samples);
  let borderMax = 0;
  for (let i = 0; i < border.length; i++) if (border[i] > borderMax) borderMax = border[i];
  const maxUpperBoundM = Math.max((fine.max ?? 0) + h * Math.SQRT1_2, borderMax + h * Math.SQRT1_2 + h / 2);
  return { p95: fine.p95, max: fine.max, mean: fine.mean, stepM: step, fineStepM: h, p95CoarseM: coarse.p95,
    uncertaintyP95M: Math.abs((fine.p95 ?? 0) - (coarse.p95 ?? 0)), maxUpperBoundM, cells: fineGrid.x.length };
}

const borderCache = new WeakMap();
/** Pontos sobre todas as divisas (contornos e furos), com no máximo `spacing` entre vizinhos; em cache por lote. */
function boundaryPoints(geom, spacing) {
  let byStep = borderCache.get(geom);
  if (!byStep) { byStep = new Map(); borderCache.set(geom, byStep); }
  const key = spacing.toFixed(6);
  if (byStep.has(key)) return byStep.get(key);
  const xs = [], ys = [];
  for (const polygon of geom) for (const ring of polygon) {
    const n0 = ring.length, n = n0 > 1 && ring[0][0] === ring[n0 - 1][0] && ring[0][1] === ring[n0 - 1][1] ? n0 - 1 : n0;
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]), parts = Math.max(1, Math.ceil(len / spacing));
      for (let k = 0; k < parts; k++) { const t = k / parts; xs.push(a[0] + t * (b[0] - a[0])); ys.push(a[1] + t * (b[1] - a[1])); }
    }
  }
  const pts = { x: Float64Array.from(xs), y: Float64Array.from(ys) };
  byStep.set(key, pts);
  return pts;
}

const quickP95 = (grid, samples) => distanceStats(nearestDistances(grid, samples));

/** Distância de lado entre tiros vizinhos (selecionados, na ordem): amostra a cada stepM no primeiro. */
function transverse(units, selectedIds, stepM = 25) {
  const byTrack = new Map();
  for (const u of units) { if (!byTrack.has(u.trackId)) byTrack.set(u.trackId, []); byTrack.get(u.trackId).push(u); }
  const ids = selectedIds.filter(id => byTrack.has(id)), out = [];
  for (let k = 1; k < ids.length; k++) {
    const from = byTrack.get(ids[k - 1]), to = byTrack.get(ids[k]), d = [];
    for (const u of from) {
      const cum = cumulative(u.line);
      for (let s = 0; s <= u.len; s += stepM) {
        const p = pointAt(u.line, s, cum);
        let best = Infinity;
        for (const v of to) best = Math.min(best, locate(v.line, p).dist);
        d.push(best);
      }
    }
    const st = summarize(d);
    out.push({ from: ids[k - 1], to: ids[k], medianM: st.median, minM: st.min, maxM: st.max });
  }
  return out;
}

/** Caminhada estimada: dentro dos trechos + retas entre o fim de um e o início do seguinte (vai e volta por tiro). */
function route(units) {
  let inside = 0, transitions = 0, last = null, flip = false, prevTrack = null;
  for (const u of units) {
    if (prevTrack !== null && u.trackId !== prevTrack) flip = !flip;
    const start = flip ? u.line.at(-1) : u.line[0], end = flip ? u.line[0] : u.line.at(-1);
    if (last) transitions += Math.hypot(start[0] - last[0], start[1] - last[1]);
    inside += u.len; last = end; prevTrack = u.trackId;
  }
  return { insideM: inside, transitionsEstimatedM: transitions, totalEstimatedM: inside + transitions };
}

return Object.freeze({summarize,longitudinal,coverageGrid,nearestDistances,kthSmallest,distanceStats,gridStep,coverage,boundaryPoints,quickP95,transverse,route});
})();
// src/engine3/optimize.mjs
const __optimize=(()=>{
const { TOLERANCES } = __tolerances;
const { cumulative, pointAt } = __polyline;
const { internalGap, positions } = __sampling;
const { coverage, coverageGrid, gridStep, quickP95, summarize } = __metrics;
// Motor 2 · otimização opcional da distribuição ("Buscar distribuição melhor").
// Busca local determinística (descida coordenada) numa grade de busca mais grossa:
//  1. fase: desloca o conjunto de pontos de cada trecho em `phaseSteps` posições entre −f·borda e +f·borda;
//  2. troca (modo qualidade_espacial): tira 1 ponto de um trecho e põe em outro, se não violar os limites
//     de maior intervalo (+maxGapIncreaseFrac) e de irregularidade (CV + maxCvIncrease).
// Nota de cada tentativa: p95 da distância ao ponto mais próximo + 0,001 × média (desempate).
// Só aceita o resultado se melhorar o p95 na grade fina de cobertura sem violar limites nem esvaziar trechos.
// Não garante ótimo global; métrica geométrica, não agronômica. Reescrita do optimize do motor 0.5.1.

const { OPT_IMPROVE_EPS_M, OPT_LIMIT_EPS, OPT_MEAN_TIEBREAK, OPT_SHIFT_RANGE_EPS_M } = TOLERANCES;

/** Estatística dos intervalos nominais (cada trecho com n ≥ 2 contribui n − 1 intervalos iguais). */
function gapStats(units, counts, policy, margin) {
  const gaps = [];
  for (const u of units) {
    const n = counts.get(u.id) || 0;
    if (n >= 2) { const g = internalGap(u.len, n, policy, margin); for (let i = 1; i < n; i++) gaps.push(g); }
  }
  return summarize(gaps);
}

function optimizeDistribution({ geom, units, counts: initialCounts, policy, marginM, params, signal }) {
  const opt = params.optimizer, started = Date.now();
  const grid = coverageGrid(geom, gridStep(geom, { ...params.coverage, gridTargetCells: opt.searchGridCells }));
  const cums = new Map(units.map(u => [u.id, cumulative(u.line)]));
  const placed = (unit, n, shift) => {
    if (!n) return [];
    const base = positions(unit.len, n, policy, marginM), s = Math.min(unit.len - base[n - 1], Math.max(-base[0], shift));
    return base.map(p => p + s);
  };
  const pointsOf = (counts, shifts) => {
    const pts = [];
    for (const u of units) for (const s of placed(u, counts.get(u.id) || 0, shifts.get(u.id) || 0)) {
      const [x, y] = pointAt(u.line, s, cums.get(u.id)); pts.push({ x, y });
    }
    return pts;
  };
  let evaluations = 0, worstCap = Infinity;
  // 2.5 · keepWorstGap: tentativa que aumenta o pior vazio (na grade de busca) é descartada. Desligado = motor 0.5.1.
  const score = (counts, shifts) => { evaluations++; const r = quickP95(grid, pointsOf(counts, shifts));
    if (opt.keepWorstGap && (r.max ?? Infinity) > worstCap + OPT_LIMIT_EPS) return Infinity;
    return (r.p95 ?? Infinity) + OPT_MEAN_TIEBREAK * (r.mean ?? 0); };
  const shiftRange = (unit, n) => {
    if (!n) return [0, 0];
    const base = positions(unit.len, n, policy, marginM);
    return [-opt.edgeShiftFrac * base[0], opt.edgeShiftFrac * (unit.len - base[n - 1])];
  };

  const original = new Map(initialCounts), baseGaps = gapStats(units, original, policy, marginM);
  const maxGap = baseGaps.max === null ? null : baseGaps.max * (1 + opt.maxGapIncreaseFrac);
  const maxCv = baseGaps.cv === null ? null : baseGaps.cv + opt.maxCvIncrease;
  const emptyBefore = units.filter(u => !(original.get(u.id) > 0)).length;
  let counts = new Map(original), shifts = new Map(units.map(u => [u.id, 0]));
  if (opt.keepWorstGap) worstCap = quickP95(grid, pointsOf(counts, shifts)).max ?? Infinity;
  let best = score(counts, shifts);
  const moves = [];

  // Fase: para cada trecho, testa as posições e fica com a melhor que melhora a nota.
  const tunePhases = list => {
    let improved = false;
    for (const u of list) {
      if (signal?.cancelled) return improved;
      const n = counts.get(u.id) || 0;
      if (!n) continue;
      const [lo, hi] = shiftRange(u, n);
      if (hi - lo < OPT_SHIFT_RANGE_EPS_M) continue;
      let keep = shifts.get(u.id) || 0;
      for (let i = 0; i < opt.phaseSteps; i++) {
        const s = lo + (hi - lo) * i / Math.max(1, opt.phaseSteps - 1);
        shifts.set(u.id, s);
        const v = score(counts, shifts);
        if (v < best - OPT_IMPROVE_EPS_M) { best = v; keep = s; improved = true; }
      }
      shifts.set(u.id, keep);
    }
    return improved;
  };

  if (opt.mode !== 'regularidade') for (let it = 0; it < opt.maxIterations && !signal?.cancelled; it++) {
    let improved = tunePhases(units);
    if (opt.allowCountMoves && opt.mode === 'qualidade_espacial') {
      /** @type {{a: any, b: any, sc: number, trial: Map<any, number>, trialShifts: Map<any, number>} | null} */
      let bestMove = null;
      for (const from of units) {
        if ((counts.get(from.id) || 0) < 2) continue;
        for (const to of units) {
          if (from === to) continue;
          const trial = new Map(counts);
          trial.set(from.id, trial.get(from.id) - 1); trial.set(to.id, (trial.get(to.id) || 0) + 1);
          const g = gapStats(units, trial, policy, marginM);
          if ((maxGap !== null && g.max !== null && g.max > maxGap + OPT_LIMIT_EPS) || (maxCv !== null && g.cv !== null && g.cv > maxCv + OPT_LIMIT_EPS)) continue;
          const trialShifts = new Map(shifts); trialShifts.set(from.id, 0); trialShifts.set(to.id, 0);
          const v = score(trial, trialShifts);
          if (v < best - OPT_IMPROVE_EPS_M && (!bestMove || v < bestMove.sc)) bestMove = { a: from, b: to, sc: v, trial, trialShifts };
        }
      }
      if (bestMove) {
        counts = bestMove.trial; shifts = bestMove.trialShifts; best = bestMove.sc; improved = true;
        moves.push({ from: bestMove.a.id, to: bestMove.b.id });
        tunePhases([bestMove.a, bestMove.b]);
      }
    }
    if (!improved) break;
  }

  // Aceite na grade fina de cobertura (a mesma que o app mostra).
  const before = coverage(geom, pointsOf(original, new Map()), params.coverage), after = coverage(geom, pointsOf(counts, shifts), params.coverage);
  const gaps = gapStats(units, counts, policy, marginM), emptyAfter = units.filter(u => !(counts.get(u.id) > 0)).length;
  const constraintsOk = (maxGap === null || gaps.max === null || gaps.max <= maxGap + OPT_LIMIT_EPS)
    && (maxCv === null || gaps.cv === null || gaps.cv <= maxCv + OPT_LIMIT_EPS) && emptyAfter <= emptyBefore
    // keepWorstGap: o pior vazio na grade fina (a que o app mostra) também não pode aumentar.
    && (!opt.keepWorstGap || (after.max !== null && before.max !== null && after.max <= before.max + OPT_IMPROVE_EPS_M));
  const accepted = !signal?.cancelled && constraintsOk && after.p95 !== null && before.p95 !== null && after.p95 < before.p95 - OPT_IMPROVE_EPS_M;
  const summary = (c, g, empty) => ({ p95M: c.p95, maxM: c.max, meanM: c.mean, uncertaintyP95M: c.uncertaintyP95M, maxGapM: g.max, medianGapM: g.median, cvGaps: g.cv, emptyUnits: empty });
  return {
    counts: accepted ? counts : original, shifts: accepted ? shifts : new Map(),
    report: { mode: opt.mode, accepted, cancelled: !!signal?.cancelled, baseline: summary(before, baseGaps, emptyBefore), optimized: summary(after, gaps, emptyAfter),
      limits: { maxGapM: maxGap, cv: maxCv, maxGapIncreaseFrac: opt.maxGapIncreaseFrac, maxCvIncrease: opt.maxCvIncrease, edgeShiftFrac: opt.edgeShiftFrac },
      constraintsOk, moves, evaluations, elapsedMs: Date.now() - started,
      note: opt.mode === 'regularidade' ? 'Modo regularidade: distribuição regular preservada, sem busca.'
        : 'Busca local restrita (descida coordenada). Não garante ótimo global; métrica geométrica, não agronômica.' },
  };
}

return Object.freeze({optimizeDistribution});
})();
// src/engine3/params.mjs
const __params=(()=>{

// Motor 2 · parâmetros padrão, resolução (padrão + informados) e assinatura estável.
// Mesmos valores do motor 0.5.1. O motor declarado continua "0.5.1-sim" até a troca completa no app,
// para não invalidar ajustes manuais guardados (a assinatura dos parâmetros não muda).
const ENGINE_VERSION = '0.5.1-sim';

const DEFAULT_PARAMS = Object.freeze({
  boomWidthM: 36.48, trackMode: 'espacamento', trackSpacingM: 300, trackCount: 5, alignToBoom: true, bearingDeg: null,
  minPieceM: 60, selectionMode: 'todos', selectionCount: 5, selectionIds: [], haPerPoint: 20, pointMode: 'total',
  totalPoints: null, pointsPerTrack: 5, targetSpacingM: 400, edgePolicy: 'meia_margem', edgeMarginM: 50,
  gapToleranceFrac: 0.1, maxAcceptableGapM: null, snapToleranceM: 30, maxPointsCap: 600,
  monitor: Object.freeze({ stepLengthM: 0.75, arrivalRadiusM: 10, gpsAccuracyMaxM: 15, offLineWarnM: 25 }),
  coverage: Object.freeze({ gridTargetCells: 1500, minStepM: 15, maxStepM: 150 }),
  optimizer: Object.freeze({ mode: 'qualidade_espacial', maxGapIncreaseFrac: 0.1, maxCvIncrease: 0.05, edgeShiftFrac: 0.5,
    phaseSteps: 9, maxIterations: 6, allowCountMoves: true, searchGridCells: 700 }),
});

/** Padrões + informados; os três grupos aninhados são mesclados campo a campo. */
function resolveParams(given = {}) {
  const p = { ...DEFAULT_PARAMS, ...given };
  p.coverage = { ...DEFAULT_PARAMS.coverage, ...(given.coverage || {}) };
  p.optimizer = { ...DEFAULT_PARAMS.optimizer, ...(given.optimizer || {}) };
  p.monitor = { ...DEFAULT_PARAMS.monitor, ...(given.monitor || {}) };
  return p;
}

/** Assinatura: chaves em ordem alfabética, valor em JSON (usada para reconhecer ajustes manuais guardados). */
const paramsSignature = params => Object.keys(params).sort().map(k => `${k}=${JSON.stringify(params[k])}`).join('|');

return Object.freeze({ENGINE_VERSION,DEFAULT_PARAMS,resolveParams,paramsSignature});
})();
// src/engine3/plan.mjs
const __plan=(()=>{
const { buildCircularTracks, buildImportedTracks, buildStraightTracks, clipTracks, selectTracks } = __tracks;
const { allocateBalanced, allocateBySpacing, allocatePerTrack, minimumPoints } = __allocation;
const { sampleUnits } = __sampling;
// Motor 2 · núcleo do plano: tiros → trechos dentro do lote → quantos pontos em cada trecho → pontos.
// Recebe parâmetros JÁ resolvidos e validados (mesmo objeto que o motor 0.5.1 guarda em scenario.params).
// Não calcula métricas, cobertura nem rota; essas etapas continuam no motor antigo até a próxima reescrita.

/**
 * @param field  lote ({geom, bearing, bearingGridCorrection, referenceA, areaOfficialHa, …})
 * @param params parâmetros resolvidos
 * @param opts   opcional: importedLines e importedKind (trajetos importados)
 */
function planCore(field, params, opts = {}) {
  let generated;
  if (params.trackMode === 'importado') {
    if (!opts.importedLines?.length) throw Error('Nenhum trajeto importado');
    generated = buildImportedTracks(opts.importedLines, opts.importedKind || 'pista_gnss');
  } else if (params.trackMode === 'circular') {
    generated = buildCircularTracks(field, params); // dado legado; o método vigente é linear
  } else generated = buildStraightTracks(field, params);

  const clip = clipTracks(generated.tracks, field.geom, params.minPieceM);
  const tracksInside = generated.tracks.filter(t => clip.units.some(u => u.trackId === t.id));
  const selected = selectTracks(tracksInside, { mode: params.selectionMode, count: params.selectionCount, ids: params.selectionIds });
  const chosen = new Set(selected.map(t => t.id));
  const units = clip.units.filter(u => chosen.has(u.trackId));

  const minPoints = minimumPoints(field.areaOfficialHa, params.haPerPoint);
  let allocation, requested;
  if (params.pointMode === 'por_tiro') {
    const perTrack = Math.max(1, Math.round(params.pointsPerTrack));
    allocation = allocatePerTrack(units, perTrack, params.edgePolicy, params.edgeMarginM);
    requested = perTrack * selected.length;
  } else if (params.pointMode === 'espacamento') {
    allocation = allocateBySpacing(units, params.targetSpacingM, params.edgePolicy, params.edgeMarginM, minPoints, params.maxPointsCap);
    requested = [...allocation.counts.values()].reduce((a, b) => a + b, 0);
  } else {
    const total = params.totalPoints ? params.totalPoints : minPoints;
    if (!Number.isInteger(total) || total < 0) throw Error('Total de pontos deve ser inteiro');
    if (total > params.maxPointsCap) throw Error(`Total ${total} acima do teto configurado (${params.maxPointsCap})`);
    allocation = allocateBalanced(units, total, params.edgePolicy, params.edgeMarginM);
    requested = total;
  }
  const samples = sampleUnits(units, allocation.counts, params.edgePolicy, params.edgeMarginM);
  return {
    bearing: generated.bearing, deltaM: generated.deltaM, passes: generated.passes, anchored: generated.anchored, frame: generated.frame,
    allTracks: generated.tracks, tracksInside, selected, units, discarded: clip.discarded, outside: clip.outside,
    minPoints, requestedPoints: requested, counts: allocation.counts,
    allocation: { status: allocation.status, empty: allocation.empty, suggestions: allocation.suggestions }, samples,
  };
}

return Object.freeze({planCore});
})();
// src/engine3/diagnostics.mjs
const __diagnostics=(()=>{
const { TOLERANCES } = __tolerances;
// Motor 2 · avisos do cenário (nível erro/alerta/info), na ordem em que aparecem para a pessoa.
// Primeiro os avisos de qualidade dos dados do lote (assessField, injetado até a reescrita de dataQuality);
// depois os do plano. Reescrita do diagnostics do motor 0.5.1 (teste diferencial: mesmos avisos e textos).

const LEVEL = Object.freeze({ ERRO: 'erro', ALERTA: 'alerta', INFO: 'info' });
const { BEARING_CHANGED_DEG } = TOLERANCES;

function buildWarnings(field, sc, assessField) {
  const p = sc.params, out = [];
  const add = (level, code, message, action) => out.push({ level, code, message, ...(action ? { action } : {}) });
  for (const w of assessField(field)) add(w.level, w.code, w.message, w.action);
  if (!field.isSoy) add(LEVEL.ALERTA, 'protocolo_nao_soja', 'Regra 1 ponto/20 ha informada apenas para soja: neste lote é exploratória.');
  if (sc.samples.length < sc.minPoints)
    add(LEVEL.ERRO, 'abaixo_minimo', `Pontos planejados (${sc.samples.length}) abaixo do mínimo por área (${sc.minPoints}). Não reduzido automaticamente: aumente os pontos.`);
  if (sc.allocation.status === 'conflito') add(LEVEL.ERRO, 'conflito_tiros_pontos', `Conflito: ${sc.allocation.suggestions.join(' · ')}`);
  if (sc.longitudinal.emptyUnits.length) add(LEVEL.ERRO, 'trechos_sem_amostra', `Trechos sem amostra (visíveis no mapa): ${sc.longitudinal.emptyUnits.join(', ')}`);
  if (sc.allocation.status === 'ok' && p.pointMode === 'espacamento' && sc.allocation.suggestions.length)
    add(LEVEL.INFO, 'espacamento_ajustado', sc.allocation.suggestions.join(' '));
  const over = sc.trackRows.filter(r => r.outOfTolerance);
  if (over.length) add(LEVEL.ALERTA, 'intervalo_acima_alvo', `Intervalo acima do alvo (+${Math.round(p.gapToleranceFrac * 100)}%) em: ${over.map(r => r.trackId).join(', ')}`);
  if (sc.discarded.length)
    add(LEVEL.INFO, 'trechos_curtos', `${sc.discarded.length} trecho(s) < ${p.minPieceM} m sem amostra: ${sc.discarded.map(u => `${u.id} (${Math.round(u.len)} m)`).join(', ')}`);
  const split = sc.selected.filter(t => sc.units.filter(u => u.trackId === t.id).length > 1);
  if (split.length) add(LEVEL.INFO, 'trechos_desconectados', `Tiros cortados em trechos separados (medidos separadamente): ${split.map(t => t.id).join(', ')}`);
  if (p.bearingDeg !== null && Math.abs(p.bearingDeg - field.bearing % 180) > BEARING_CHANGED_DEG)
    add(LEVEL.ALERTA, 'rumo_alterado', 'Rumo alterado em relação à planilha: confirmar pista existente.');
  if (sc.anchored && sc.passes)
    add(LEVEL.INFO, 'malha_teorica', `Malha estimada: ${sc.passes} passadas × ${p.boomWidthM} m entre tiros, ancorada no ponto A. Não confirma rastros físicos.`);
  if (sc.units.some(u => u.kind === 'referencia_linear' || u.kind === 'curva_desenhada'))
    add(LEVEL.INFO, 'nao_e_rastro', 'Trajetos são estimativas geométricas, não rastros GNSS do M4040.');
  if (sc.selected.length < sc.tracksInside.length)
    add(LEVEL.INFO, 'tiros_inativos', `${sc.tracksInside.length - sc.selected.length} tiro(s) desativado(s) pela seleção; aparecem no mapa como inativos.`);
  return out;
}

return Object.freeze({LEVEL,buildWarnings});
})();
// src/engine3/scenario.mjs
const __scenario=(()=>{
const { validateGeom } = __geometry;
const { DomainError } = __errors;
const { internalGap, sampleUnits } = __sampling;
const { exactCoverage } = __voronoi;
const { coverage, longitudinal, route, summarize, transverse } = __metrics;
const { ENGINE_VERSION, paramsSignature, resolveParams } = __params;
const { planCore } = __plan;
// Motor 2 · cenário completo: parâmetros → núcleo do plano → métricas → linhas por tiro → avisos.
// Validação detalhada de parâmetros, avisos e otimização ainda vêm do motor 0.5.1 (injetados em `legacy`)
// até serem reescritos; o restante é do motor 2. Teste: cenário inteiro idêntico ao do motor antigo.

const STATUS = Object.freeze({ SIMULADO: 'SIMULAÇÃO · rastros não conferidos', TRAJETO_IMPORTADO: 'TRAJETO GPS IMPORTADO · pontos simulados' });

/** Uma linha por tiro selecionado: comprimento, pontos, intervalos e se passou do intervalo aceitável. */
function trackRows(sc) {
  const p = sc.params;
  return sc.selected.map(track => {
    const units = sc.units.filter(u => u.trackId === track.id), rows = sc.longitudinal.perUnit.filter(r => r.trackId === track.id);
    const n = rows.reduce((a, r) => a + r.n, 0), gaps = rows.flatMap(r => r.gaps), st = summarize(gaps);
    const target = p.pointMode === 'espacamento' ? p.targetSpacingM : p.maxAcceptableGapM ?? null;
    const nominal = rows.filter(r => r.n >= 2).map(r => internalGap(r.lengthM, r.n, p.edgePolicy, p.edgeMarginM));
    return { trackId: track.id, kind: track.kind, lengthM: units.reduce((a, u) => a + u.len, 0), units: units.length, n, gaps,
      medianGapM: st.median, maxGapM: st.max, cv: st.cv, nominalGapM: nominal.length ? Math.max(...nominal) : null, targetGapM: target,
      outOfTolerance: target !== null && st.max !== null && st.max > target * (1 + p.gapToleranceFrac), empty: n === 0,
      emptyUnits: rows.filter(r => r.n === 0).map(r => r.unitId) };
  });
}

/** Métricas, linhas por tiro e avisos sobre um cenário já com pontos (mesma função após edição manual). */
function withMetrics(field, sc, buildWarnings) {
  const out = { ...sc, longitudinal: longitudinal(sc.samples, sc.units), coverage: coverage(field.geom, sc.samples, sc.params.coverage),
    transverse: transverse(sc.units, sc.selected.map(t => t.id)), route: route(sc.units) };
  out.trackRows = trackRows(out);
  out.warnings = buildWarnings(field, out);
  return out;
}


/**
 * @param legacy assertParams, buildWarnings, optimizeDistribution e engineVersion (opcional) — validação detalhada vem do
 *   motor 0.5.1 até a reescrita; engineVersion é a versão declarada no app (o padrão mantém a do motor antigo).
 */
/** Parâmetros resolvidos e validados + lote válido (mesmas recusas e mensagens do cenário completo). */
function validated(field, given, assertParams) {
  const params = resolveParams(given);
  assertParams(params);
  const problems = validateGeom(field?.geom);
  if (problems.length) throw new DomainError('GEOMETRIA_INVALIDA', `Geometria inválida para ${field?.code ?? '?'}: ${problems.join('; ')}`, { field: 'geom', value: problems });
  if (!(field.areaOfficialHa > 0)) throw new DomainError('AREA_AUSENTE', `Área oficial ausente para ${field.code}`, { field: 'areaOfficialHa', value: field.areaOfficialHa });
  return params;
}

/**
 * Só o plano (tiros, trechos, pontos), sem cobertura, entre tiros, caminhada e avisos. Para buscas que testam
 * muitos candidatos e medem a cobertura por conta própria (preparação de bloco): mesmos números de planCore,
 * mesma validação do cenário completo. Devolve { params, ...planCore }.
 */
/** Ganho mínimo de p95 (fração) para o plano equilibrado substituir o plano regular. */
const BALANCED_MIN_GAIN = 0.02;

function planScenario(field, given = {}, legacy) {
  const params = validated(field, given, legacy.assertParams);
  return { params, ...planCore(field, params) };
}

function buildScenario(field, given = {}, opts = {}, legacy) {
  const params = validated(field, given, legacy.assertParams);
  const core = planCore(field, params, opts);
  let samples = core.samples, optimization = null;
  // 2.5 · plano equilibrado (opts.balanced): mesma busca do "Buscar distribuição melhor", mas só desloca os pontos
  // dentro de cada tiro (pontos por tiro e total iguais) e nenhum passo pode aumentar o pior vazio. Medido nos 51 lotes:
  // busca enxuta (2 rodadas, 7 posições por tiro); com o ganho mínimo de 2%: 31 dos 51 lotes mudam (p95 −11% na
  // mediana, até −32%), pior vazio nunca maior, equipe idêntica;
  // ≤ 13 ms no computador (≈ +40 ms ao trocar de lote num celular lento).
  const balanced = !opts.optimize && opts.balanced && /** @type {string|undefined} */ (params.optimizer?.mode) !== 'regularidade';
  if ((opts.optimize || balanced) && core.units.length) {
    const optParams = balanced ? { ...params, optimizer: { ...params.optimizer, mode: 'qualidade_espacial', allowCountMoves: false, keepWorstGap: true, maxIterations: 2, phaseSteps: 7 } } : params;
    const r = legacy.optimizeDistribution({ geom: field.geom, units: core.units, counts: core.counts, policy: params.edgePolicy,
      marginM: params.edgeMarginM, params: optParams, signal: opts.signal });
    // Equilibrado só troca o plano regular se o ganho valer a pena (p95 ≥ 2% menor); ganho menor só tira os pontos
    // da posição simétrica sem benefício para quem caminha.
    const b0 = r.report?.baseline?.p95M, b1 = r.report?.optimized?.p95M;
    let worth = !balanced || (r.report?.accepted && b0 > 0 && b1 !== null && (b0 - b1) / b0 >= BALANCED_MIN_GAIN);
    const moved = worth ? sampleUnits(core.units, r.counts, params.edgePolicy, params.edgeMarginM, r.shifts) : core.samples;
    // R2.1: garantia por valor EXATO (Voronoi recortado), não pela grade: o pior vazio do plano equilibrado não pode
    // passar o do plano regular. Nos 51 lotes nunca passa; a conferência transforma o "medido" em garantia.
    if (balanced && worth && exactCoverage(field.geom, moved).worstGapM > exactCoverage(field.geom, core.samples).worstGapM + 1e-6) worth = false;
    samples = worth ? moved : core.samples;
    optimization = r.report ? { ...r.report, ...(balanced ? { mode: 'equilibrado', accepted: !!worth, minGain: BALANCED_MIN_GAIN } : {}) } : null;
  }
  return withMetrics(field, {
    engineVersion: legacy.engineVersion ?? ENGINE_VERSION, generatedAt: new Date().toISOString(),
    status: core.units.some(u => u.kind === 'trajeto_gps_equipe') ? STATUS.TRAJETO_IMPORTADO : STATUS.SIMULADO,
    field: { key: `${field.farm}|${field.code}`, farm: field.farm, code: field.code, areaOfficialHa: field.areaOfficialHa, areaKMLHa: field.areaKMLHa, isSoy: field.isSoy },
    params, signature: paramsSignature(params), bearing: core.bearing, deltaM: core.deltaM, passes: core.passes, anchored: core.anchored,
    frame: core.frame, allTracks: core.allTracks, tracksInside: core.tracksInside, selected: core.selected, units: core.units,
    discarded: core.discarded, outside: core.outside, minPoints: core.minPoints, requestedPoints: core.requestedPoints,
    allocation: core.allocation, optimization, samples,
  }, legacy.buildWarnings);
}

return Object.freeze({STATUS,trackRows,withMetrics,BALANCED_MIN_GAIN,planScenario,buildScenario});
})();
// src/engine3/dataQuality.mjs
const __dataQuality=(()=>{
const { geomArea, pointInGeom, segmentIntersectionT, validateGeom } = __geometry;
const { TOLERANCES } = __tolerances;
const { numBR } = __numero;
// Motor 2 · qualidade do cadastro do lote: limite, rumo, pontos A/B e áreas (reescrita do módulo dataQuality do 0.5.1).
// Só aponta; nunca corrige o limite nem inventa divisa (regra do projeto).

const QUALITY_LIMITS = Object.freeze({ spikeAngleDeg: 3, shortEdgeM: 1, weakABDistanceM: 50, derivedBearingTolDeg: 0.05,
  bearingDivergenceDeg: 1, areaDiffFrac: 0.005 });

const fmt = (v, d = 1) => numBR(v, d, d);

/** Diferença entre dois rumos no eixo das linhas (0–90°: 10° e 190° são a mesma linha). */
function axisDifferenceDeg(a, b) {
  const d = (((a - b) % 180) + 180) % 180;
  return Math.min(d, 180 - d);
}

function edgesOf(ring) {
  const n = ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.length - 1 : ring.length;
  return Array.from({ length: n }, (_, i) => [ring[i], ring[(i + 1) % n]]);
}

/** Cruzamentos do anel com ele mesmo (arestas não vizinhas). */
function selfIntersections(ring) {
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
function vertexIssues(ring, limits = QUALITY_LIMITS) {
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
function assessField(field, limits = QUALITY_LIMITS) {
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

return Object.freeze({QUALITY_LIMITS,axisDifferenceDeg,selfIntersections,vertexIssues,assessField});
})();
// src/engine3/paramCatalog.mjs
const __paramCatalog=(()=>{
const { DomainError, ERR } = __errors;
const { EDGE_POLICY, OPT_MODE, POINT_MODE, SELECTION_MODE, TRACK_MODE } = __vocab;
const { numBR } = __numero;
// Motor 2 · catálogo dos parâmetros: rótulo, unidade, limites, nível, ajuda e origem; checagem, recusa e limpeza
// de parâmetros gravados (reescrita do módulo paramCatalog do motor 0.5.1).

const OPERACIONAL = 'informação operacional', INICIAL = 'valor inicial de simulação';

const CATALOG = Object.freeze({
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

const KNOWN_TOP = Object.freeze(['boomWidthM', 'trackMode', 'trackSpacingM', 'trackCount', 'alignToBoom', 'bearingDeg', 'minPieceM',
  'selectionMode', 'selectionCount', 'selectionIds', 'haPerPoint', 'pointMode', 'totalPoints', 'pointsPerTrack', 'targetSpacingM', 'edgePolicy',
  'edgeMarginM', 'gapToleranceFrac', 'maxAcceptableGapM', 'snapToleranceM', 'maxPointsCap', 'monitor', 'coverage', 'optimizer', 'trackPhaseM']);
const KNOWN_NESTED = Object.freeze({
  monitor: ['stepLengthM', 'arrivalRadiusM', 'gpsAccuracyMaxM', 'offLineWarnM'],
  coverage: ['gridTargetCells', 'minStepM', 'maxStepM'],
  optimizer: ['mode', 'maxGapIncreaseFrac', 'maxCvIncrease', 'edgeShiftFrac', 'phaseSteps', 'maxIterations', 'allowCountMoves', 'searchGridCells'],
});

/** Valor por caminho com ponto ("optimizer.mode"). */
const getParam = (params, path) => path.split('.').reduce((o, k) => o?.[k], params);

const withUnit = (def, v) => `${numBR(def.scale ? v * def.scale : v)}${def.unit ? ` ${def.unit}` : ''}`;
const isPlainObject = v => v && typeof v === 'object' && !Array.isArray(v);

/** Problemas {field, ui, message} dos valores presentes (opção inexistente, não número, não inteiro, fora dos limites). */
function checkParams(params) {
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
function assertParams(params) {
  const problems = checkParams(params);
  if (!problems.length) return;
  const first = problems[0];
  throw new DomainError(ERR.PARAMETRO_INVALIDO, problems.map(p => p.message).join('; '), { field: first.ui, value: getParam(params, first.field) });
}

/** Valor para exibir: "—", "sim"/"não", número com unidade ou texto. */
function displayValue(path, v) {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  return typeof v === 'number' ? withUnit(/** @type {any} */ (CATALOG)[path], v) : String(v);
}

/** Limpa parâmetros gravados: tira chaves desconhecidas e valores inválidos; devolve {clean, removed}. */
function sanitizeParams(given) {
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

return Object.freeze({CATALOG,KNOWN_TOP,KNOWN_NESTED,getParam,checkParams,assertParams,displayValue,sanitizeParams});
})();
// src/engine3/explain.mjs
const __explain=(()=>{
const { internalGap } = __sampling;
const { EDGE_POLICY, POINT_MODE, SELECTION_MODE, TRACK_MODE } = __vocab;
const { LEVEL } = __diagnostics;
const { numBR } = __numero;
// Motor 2 · explicação do plano, etapa por etapa (reescrita do módulo explain do motor 0.5.1).

const int = v => numBR(Math.round(v)), one = v => numBR(v, 1, 1), two = v => numBR(v, 2, 2);
const plural = (n, singular, pluralForm) => `${n} ${n === 1 ? singular : pluralForm}`;
/** Regularidade dos intervalos pelo coeficiente de variação. */
const regularityWord = cv => (cv == null ? 'sem intervalos' : cv < 0.05 ? 'muito regular' : cv < 0.15 ? 'regular' : 'irregular');

function explainScenario(sc, field) {
  const p = sc.params, steps = [], add = (etapa, lines) => steps.push({ etapa, texto: lines.filter(Boolean) });
  add('Lote e mínimo de pontos', [
    `${field.code} tem ${two(field.areaOfficialHa)} ha (área publicada).`,
    `Regra: 1 ponto a cada ${int(p.haPerPoint)} ha, arredondando para cima: ${two(field.areaOfficialHa)} ÷ ${int(p.haPerPoint)} = ${one(field.areaOfficialHa / p.haPerPoint)} → mínimo de ${sc.minPoints} pontos.`,
    field.isSoy ? '' : 'Atenção: essa regra foi informada para soja; nesta cultura o mínimo é só uma referência.',
  ]);
  const inside = sc.tracksInside.length;
  const trackLines = p.trackMode === TRACK_MODE.CIRCULAR
    ? [`Pivô: tiros em anéis ao redor do centro, a cada ${one(sc.deltaM)} m${sc.passes ? ` (${sc.passes} larguras de barra de ${two(p.boomWidthM)} m)` : ''}.`,
      `${plural(inside, 'anel cruza', 'anéis cruzam')} o lote. É uma estimativa, não o rastro real da máquina.`]
    : p.trackMode === TRACK_MODE.IMPORTADO
      ? [`${plural(sc.allTracks.length, 'trajeto importado', 'trajetos importados')} de arquivo de GPS.`]
      : p.trackMode === TRACK_MODE.QUANTIDADE
        ? [`Retas na direção ${one(sc.bearing)}°. A largura do lote foi dividida em ${p.trackCount} faixas iguais de ${int(sc.deltaM)} m, com um tiro no meio de cada uma${sc.anchored ? ', ajustado para o múltiplo de barra mais próximo' : ''}.`]
        : [`Retas na direção ${one(sc.bearing)}° (${p.bearingDeg === null ? 'da planilha' : 'alterada à mão'}).`,
          sc.anchored && sc.passes
            ? `Distância máxima pedida: ${int(p.trackSpacingM)} m → ${sc.passes} larguras de barra de ${two(p.boomWidthM)} m = ${two(sc.deltaM)} m entre tiros, contadas a partir do ponto A.`
            : `Tiros a cada ${int(sc.deltaM)} m (no máximo ${int(p.trackSpacingM)} m).`];
  add('Tiros', [...trackLines, `${plural(inside, 'tiro atravessa', 'tiros atravessam')} o lote.`]);
  const split = sc.selected.filter(t => sc.units.filter(u => u.trackId === t.id).length > 1);
  add('Partes de cada tiro', [
    'Cada tiro foi cortado no limite do lote; cada parte contínua é medida sozinha (nunca se soma uma parte com outra).',
    split.length ? `${split.map(t => t.id).join(', ')} ${split.length === 1 ? 'atravessa' : 'atravessam'} áreas fora do lote e ${split.length === 1 ? 'virou' : 'viraram'} mais de uma parte.` : 'Nenhum tiro foi cortado em partes.',
    sc.discarded.length ? `${plural(sc.discarded.length, 'parte ficou', 'partes ficaram')} sem ponto por ter menos de ${int(p.minPieceM)} m: ${sc.discarded.map(d => `${d.id} (${int(d.len)} m)`).join(', ')}.` : '',
  ]);
  const ids = sc.selected.map(t => t.id).join(', ');
  add('Tiros que recebem pontos', [p.selectionMode === SELECTION_MODE.TODOS ? `Todos os ${inside} tiros recebem pontos.`
    : p.selectionMode === SELECTION_MODE.QUANTIDADE ? `Um tiro por monitor (${p.selectionCount}), espalhados pela largura do lote: ${ids}.` : `Tiros escolhidos à mão: ${ids}.`]);
  const perTrack = sc.trackRows.filter(r => r.n > 0).map(r => `${r.trackId}: ${r.n}${r.medianGapM ? ` (a cada ${int(r.medianGapM)} m)` : ''}`).join(' · ');
  const pointLines = p.pointMode === POINT_MODE.POR_TIRO
    ? [`${p.pointsPerTrack} pontos em cada tiro (${sc.samples.length} no total).`, 'Com o mesmo número de pontos, tiros mais longos ficam com pontos mais espaçados.']
    : p.pointMode === POINT_MODE.ESPACAMENTO
      ? [`Pedido: um ponto a cada ${int(p.targetSpacingM)} m. O app calculou quantos cabem em cada parte.`, sc.allocation.suggestions.length ? sc.allocation.suggestions.join(' ') : '']
      : [`Total: ${sc.samples.length} pontos${p.totalPoints === null ? ' (o mínimo)' : ` (pedido: ${p.totalPoints})`}.`,
        'Os pontos foram repartidos pelo tamanho de cada parte, para que nenhum trecho fique muito mais longe de um ponto que os outros.'];
  add('Repartição dos pontos', [...pointLines, perTrack ? `Resultado: ${perTrack}.` : '', sc.allocation.status === 'conflito' ? `Conflito: ${sc.allocation.suggestions.join(' · ')}` : '']);
  const longest = sc.longitudinal.perUnit.filter(u => u.n >= 2).sort((a, b) => b.lengthM - a.lengthM)[0];
  const gap = longest ? internalGap(longest.lengthM, longest.n, p.edgePolicy, p.edgeMarginM) : null;
  const rule = { [EDGE_POLICY.MEIA_MARGEM]: 'o 1º ponto fica a meio intervalo da borda; depois, intervalos iguais.',
    [EDGE_POLICY.MARGENS_IGUAIS]: 'a borda e os intervalos têm a mesma distância.',
    [EDGE_POLICY.MARGEM_FIXA]: `o 1º e o último ponto ficam a ${int(p.edgeMarginM)} m da borda; intervalos iguais entre eles.` }[p.edgePolicy];
  add('Posição dos pontos', [`Regra das pontas: ${rule}`,
    longest ? `Exemplo: ${longest.unitId} tem ${int(longest.lengthM)} m e ${longest.n} pontos → um ponto a cada ${int(gap)} m, o 1º a ${int(longest.startMarginM)} m da borda.` : '',
    'As distâncias são medidas andando sobre o tiro (vale também para curvas).']);
  if (sc.optimization) {
    const o = sc.optimization;
    add('Busca de distribuição melhor', [
      o.accepted ? `Aceita: a maior distância até um ponto (95% do lote) caiu de ${int(o.baseline.p95M)} m para ${int(o.optimized.p95M)} m.` : 'Mantido o plano original: a busca não melhorou sem piorar a regularidade.',
      `Limites respeitados: maior intervalo até ${int(o.limits.maxGapM ?? 0)} m e nenhuma parte sem ponto.`,
      o.moves.length ? `Pontos trocados de tiro: ${o.moves.map(m => `${m.from}→${m.to}`).join(', ')}.` : '']);
  }
  const g = sc.longitudinal.global, nErr = sc.warnings.filter(w => w.level === LEVEL.ERRO).length, nWarn = sc.warnings.filter(w => w.level === LEVEL.ALERTA).length;
  add('Resultado', [
    g.max === null ? 'Nenhum tiro tem dois pontos (sem intervalos para medir).' : `Maior distância entre dois pontos do mesmo tiro: ${int(g.max)} m. Distribuição ${regularityWord(g.cv)}.`,
    sc.coverage.p95 === null ? '' : `95% do lote fica a menos de ${int(sc.coverage.p95)} m de algum ponto.`,
    nErr || nWarn ? `Antes de ir a campo: ${plural(nErr, 'erro', 'erros')} e ${plural(nWarn, 'alerta', 'alertas')} para conferir na lista abaixo.` : 'Nenhum erro ou alerta.']);
  return steps;
}

return Object.freeze({regularityWord,explainScenario});
})();
// src/engine3/guidance.mjs
const __guidance=(()=>{
const { geomCentroid } = __geometry;
const { locate, pointAt } = __polyline;
// Motor 2 · roteiro do tiro e direção ao próximo ponto (reescrita do módulo route do motor 0.5.1).
// Só direciona: não registra coleta. O próximo ponto vem de `nextPoint` (src/gps/guide-next.mjs), injetado.

const CARDINAIS = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
const GPS_MAX_AGE_MS = 15e3;
/** Azimute em graus (0 = norte, sentido horário) do deslocamento (dx, dy). */
const azimuth = (dx, dy) => ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
const cardinal = deg => CARDINAIS[Math.round(deg / 45) % 8];
/** Passos estimados, arredondados de 5 em 5 (até 100) ou de 10 em 10. */
function stepsFor(meters, stepLengthM) {
  if (!(stepLengthM > 0)) throw Error('Comprimento do passo deve ser positivo');
  const steps = meters / stepLengthM, unit = steps < 100 ? 5 : 10;
  return Math.max(0, Math.round(steps / unit) * unit);
}
const metersText = m => `${Math.round(m).toLocaleString('pt-BR')} m`;

/** Roteiro de um tiro: partes na ordem de caminhada, pontos com distância desde a entrada e passos. */
function buildRoute(sc, field, trackId, opts = {}) {
  const stepLengthM = opts.stepLengthM ?? sc.params.monitor.stepLengthM, flipped = !!opts.flipped, center = geomCentroid(field.geom);
  let units = sc.units.filter(u => u.trackId === trackId).sort((a, b) => a.s0Track - b.s0Track);
  if (!units.length) throw Error(`Tiro ${trackId} sem partes ativas`);
  if (flipped) units = units.slice().reverse();
  const parts = [], points = [];
  let seq = 0;
  units.forEach((unit, index) => {
    const line = flipped ? unit.line.slice().reverse() : unit.line, entry = line[0], exit = line[line.length - 1];
    const second = line[Math.min(1, line.length - 1)], walkAzimuthDeg = azimuth(second[0] - entry[0], second[1] - entry[1]);
    const along = sc.samples.filter(s => s.unitId === unit.id && !s.offTrack).map(q => ({ q, d: flipped ? unit.len - q.s : q.s })).sort((a, b) => a.d - b.d);
    let previous = 0;
    const partPoints = along.map(({ q, d }, i) => {
      const deltaM = d - previous; previous = d;
      return { id: q.id, number: q.number, seq: ++seq, unitId: unit.id, partIndex: index, firstInPart: i === 0, fromEntryM: d, deltaM, steps: stepsFor(deltaM, stepLengthM), x: q.x, y: q.y };
    });
    points.push(...partPoints);
    const next = units[index + 1], nextEntry = next ? (flipped ? next.line[next.line.length - 1] : next.line[0]) : null;
    parts.push({ unitId: unit.id, index, lengthM: unit.len, line, entry, exit, curved: line.length > 2,
      entrySide: cardinal(azimuth(entry[0] - center[0], entry[1] - center[1])), exitSide: cardinal(azimuth(exit[0] - center[0], exit[1] - center[1])),
      walkDir: cardinal(walkAzimuthDeg), walkAzimuthDeg, afterLastM: along.length ? unit.len - along[along.length - 1].d : unit.len,
      toNextPartM: nextEntry ? Math.hypot(nextEntry[0] - exit[0], nextEntry[1] - exit[1]) : null, nPoints: partPoints.length });
  });
  const offTrack = sc.samples.filter(s => s.trackId === trackId && s.offTrack).map(s => ({ id: s.id, number: s.number, seq: ++seq, unitId: null,
    partIndex: null, firstInPart: false, fromEntryM: null, deltaM: null, steps: null, x: s.x, y: s.y }));
  points.push(...offTrack);
  const route = { trackId, fieldCode: field.code, flipped, stepLengthM, totalLengthM: units.reduce((sum, u) => sum + u.len, 0), nPoints: points.length, parts, points };
  return { ...route, instructions: instructions(route) };
}
const pointLabel = (p, route) => `Ponto ${p.seq} de ${route.nPoints} (nº ${p.number})`;

/** Roteiro em frases, na ordem de caminhada. */
function instructions(route) {
  const out = [], step = route.stepLengthM;
  out.push(`Tiro ${route.trackId}: ${metersText(route.totalLengthM)} dentro do lote, ${route.nPoints} ponto${route.nPoints === 1 ? '' : 's'}.`);
  for (const part of route.parts) {
    const prefix = route.parts.length > 1 ? `Parte ${part.index + 1} (${metersText(part.lengthM)}): ` : '';
    const walk = part.curved ? `siga a linha (curva), começando para o ${part.walkDir}` : `caminhe para o ${part.walkDir}`;
    out.push(`${prefix}${prefix ? 'entre' : 'Entre'} pela borda ${part.entrySide} e ${walk}.`);
    const pts = route.points.filter(p => p.partIndex === part.index);
    if (!pts.length) out.push('Esta parte não tem ponto: apenas atravesse.');
    const gaps = pts.slice(1).map(p => Math.round(p.deltaM));
    if (gaps.length > 1 && gaps.every(g => g === gaps[0])) out.push(`Pontos a cada ${metersText(gaps[0])} (≈ ${pts[1].steps} passos), começando a ${metersText(pts[0].deltaM)} da borda.`);
    pts.forEach((p, i) => out.push(i === 0 ? `${pointLabel(p, route)}: ande ${metersText(p.deltaM)} desde a borda (≈ ${p.steps} passos).` : `${pointLabel(p, route)}: mais ${metersText(p.deltaM)} (≈ ${p.steps} passos).`));
    if (pts.length) out.push(`Depois do último ponto faltam ${metersText(part.afterLastM)} até a borda ${part.exitSide} (≈ ${stepsFor(part.afterLastM, step)} passos).`);
    if (part.toNextPartM !== null) out.push(`Saia do lote e vá até a próxima parte (≈ ${metersText(part.toNextPartM)} em linha reta).`);
  }
  for (const p of route.points.filter(q => q.unitId === null)) out.push(`${pointLabel(p, route)}: fora da linha do tiro — use o GPS para chegar.`);
  out.push(`Passos estimados com passo de ${step.toLocaleString('pt-BR')} m; confira com o GPS quando possível.`);
  return out;
}

/** Direção ao próximo ponto a partir da posição `pos`. `nextPoint(route, pos, collected, monitor, state)` escolhe o alvo. */
function guide(route, pos, collected, monitor, nextPoint) {
  const nCollected = route.points.filter(p => collected.has(p.id)).length, next = nextPoint(route, pos, collected, monitor, pos.guideState);
  const accuracyOk = Number.isFinite(pos.accuracyM) && pos.accuracyM <= monitor.gpsAccuracyMaxM, stale = Number.isFinite(pos.ageMs) && pos.ageMs > GPS_MAX_AGE_MS;
  if (!next) return { done: true, collected: nCollected, total: route.points.length, accuracyOk, stale };
  const dx = next.x - pos.x, dy = next.y - pos.y, distM = Math.hypot(dx, dy), az = azimuth(dx, dy);
  /** @type {any} */ let lateralM = null, /** @type {any} */ lado = null, /** @type {any} */ voltaDir = null, /** @type {any} */ along = null;
  const part = next.partIndex === null ? null : route.parts[next.partIndex];
  if (part) {
    const near = locate(part.line, [pos.x, pos.y]);
    lateralM = near.dist; along = near.s;
    if (lateralM > 0.5) voltaDir = cardinal(azimuth(near.x - pos.x, near.y - pos.y));
    const a = pointAt(part.line, Math.max(0, near.s - 1)), b = pointAt(part.line, Math.min(part.lengthM, near.s + 1));
    const cross = (b[0] - a[0]) * (pos.y - near.y) - (b[1] - a[1]) * (pos.x - near.x);
    if (lateralM > 0.5) lado = cross > 0 ? 'esquerda' : 'direita';
  }
  const offLine = lateralM !== null && lateralM > monitor.offLineWarnM;
  let alvo = { tipo: 'ponto', distM, azimuthDeg: az, direction: cardinal(az), x: next.x, y: next.y };
  if (part && next.firstInPart && offLine) {
    const ex = part.entry[0] - pos.x, ey = part.entry[1] - pos.y, toEntry = Math.hypot(ex, ey);
    if (toEntry < distM) { const azE = azimuth(ex, ey); alvo = { tipo: 'entrada', distM: toEntry, azimuthDeg: azE, direction: cardinal(azE), x: part.entry[0], y: part.entry[1] }; }
  }
  /** @type {any} */ let trecho = null;
  if (part && !offLine && Number.isFinite(next.fromEntryM)) {
    const prev = next.firstInPart ? null : route.points.find(p => p.partIndex === next.partIndex && p.seq === next.seq - 1);
    const from = prev ? prev.fromEntryM : 0, total = next.fromEntryM - from, left = next.fromEntryM - along;
    trecho = { desde: prev ? { tipo: 'ponto', seq: prev.seq } : { tipo: 'entrada' }, totalM: total, andadoM: Math.min(total, Math.max(0, along - from)),
      faltaM: Math.max(0, left), passouM: left < -monitor.arrivalRadiusM ? -left : 0 };
  }
  // 3.16 · o GPS não separa posições mais próximas que a sua precisão: com ± 13 m e raio de 10 m a pessoa podia estar no
  // ponto sem nunca "chegar". Raio efetivo = maior entre o raio de chegada e a precisão (até a precisão aceita, 15 m);
  // quando a precisão passa do raio, a chegada vem com o aviso de conferir pelos passos.
  // 3.19 · de moto o raio de chegada NÃO cresce (a amostra é no ponto): a 1,5 s do ponto (até 25 m) vem "pare aqui";
  // a chegada continua pelo raio normal (ou pela precisão do GPS), depois de parar ou descer
  const acc = Number.isFinite(pos.accuracyM) ? pos.accuracyM : 0, spd = Number.isFinite(pos.speedMps) ? pos.speedMps : 0;
  const radiusM = Math.max(monitor.arrivalRadiusM, Math.min(acc, monitor.gpsAccuracyMaxM));
  const stopHere = spd >= 2.5 && distM > radiusM && distM <= Math.min(25, radiusM + spd * 1.5) && !stale;
  return { done: false, next, distM, azimuthDeg: az, direction: cardinal(az), arrived: distM <= radiusM && !stale, radiusM, stopHere,
    arrivalUncertain: distM <= radiusM && (!accuracyOk || acc > monitor.arrivalRadiusM), accuracyOk, stale, lateralM, lado, voltaDir, offLine, alvo, trecho,
    collected: nCollected, total: route.points.length };
}

/** Se a pessoa está a até `toleranceM` de OUTRO tiro e longe do seu, devolve esse tiro (aviso de tiro errado). */
function tiroErrado(units, trackId, pos, toleranceM) {
  const nearest = new Map();
  for (const u of units) { const d = locate(u.line, [pos.x, pos.y]).dist; if (!(nearest.get(u.trackId) <= d)) nearest.set(u.trackId, d); }
  const mine = nearest.get(trackId);
  if (mine === undefined || mine <= toleranceM) return null;
  /** @type {{trackId:any, distM:number}|null} */ let best = null;
  for (const [id, d] of nearest) if (id !== trackId && d <= toleranceM && (!best || d < best.distM)) best = { trackId: id, distM: d };
  return best ? { ...best, meuM: mine } : null;
}

return Object.freeze({CARDINAIS,GPS_MAX_AGE_MS,azimuth,cardinal,stepsFor,buildRoute,pointLabel,instructions,guide,tiroErrado});
})();
// src/engine3/team.mjs
const __team=(()=>{
const { cumulative, pointAt } = __polyline;
const { azimuth, cardinal } = __guidance;
// Motor 2 · divisão dos tiros entre as pessoas da equipe (reescrita do módulo team do motor 0.5.1).
// Cada tiro vira uma tarefa: entra pela ponta que deixa a menor caminhada (até o último ponto e volta pelo lado mais
// curto). Com mais tiros que pessoas, junta tiros vizinhos em blocos contíguos: primeiro o menor "maior bloco"
// possível (programação dinâmica min-max) e, dentro desse limite, os blocos mais parecidos (soma dos quadrados).

function trackTasks(sc) {
  const out = [];
  for (const track of sc.selected) {
    const units = sc.units.filter(u => u.trackId === track.id);
    if (!units.length) continue;
    const all = sc.samples.filter(s => s.trackId === track.id);
    const pts = all.filter(s => Number.isFinite(s.sTrack)).sort((x, y) => x.sTrack - y.sTrack).map(s => ({ s: s.sTrack, n: s.number }));
    const a = Math.min(...units.map(u => u.s0Track)), b = Math.max(...units.map(u => u.s0Track + u.len)), ring = units.some(u => u.wraps);
    let side = { a: '', b: '' }, /** @type {any} */ ends = null;
    if (!ring && Array.isArray(track.line) && track.line.length >= 2) {
      const cum = cumulative(track.line), pa = pointAt(track.line, a, cum), pb = pointAt(track.line, b, cum);
      side = { a: cardinal(azimuth(pa[0] - pb[0], pa[1] - pb[1])), b: cardinal(azimuth(pb[0] - pa[0], pb[1] - pa[1])) };
      ends = { a: pa, b: pb };
    }
    out.push({ id: track.id, offset: Number.isFinite(track.offsetM) ? track.offsetM : null, ring, a, b,
      len: units.reduce((sum, u) => sum + u.len, 0), pts, nAll: all.length, side, ends });
  }
  return out;
}

/** Caminhada de um tiro: entrar pela ponta A ou B (a menor), percorrer até o último ponto e voltar pelo lado mais curto. */
function walk(t) {
  if (t.ring) return { m: t.len, entra: '', de: t.pts[0]?.n, ate: t.pts.at(-1)?.n, n: t.nAll };
  if (!t.pts.length) return { m: 0, entra: t.side.a, n: t.nAll };
  const first = t.pts[0].s, last = t.pts.at(-1).s;
  const fromA = last - t.a + Math.min(t.b - last, last - t.a), fromB = t.b - first + Math.min(first - t.a, t.b - first);
  return fromA <= fromB ? { m: fromA, entra: t.side.a, de: t.pts[0].n, ate: t.pts.at(-1).n, n: t.nAll }
    : { m: fromB, entra: t.side.b, de: t.pts.at(-1).n, ate: t.pts[0].n, n: t.nAll };
}

/** Caminhada no tiro entrando pela ponta `e` e saindo pela ponta `x` ('a' ou 'b'): mesma ponta = até o ponto mais
 * longe e volta; pontas opostas = o tiro inteiro. */
function crossM(t, e, x) {
  if (!t.pts.length) return e === x ? 0 : t.b - t.a;
  if (e !== x) return t.b - t.a;
  return e === 'a' ? 2 * (t.pts.at(-1).s - t.a) : 2 * (t.b - t.pts[0].s);
}
/** 3.21 · ordem de uma pessoa com 2+ tiros: o tiro pode ser feito pelas duas pontas, então cada tiro entra pela ponta
 * que deixa a menor caminhada total, contando a passagem real (em linha reta) da saída de um tiro à entrada do próximo.
 * Na prática vira zigue-zague: sai no norte do T1, entra pelo norte do T2. Programação dinâmica em 2 estados (ponta). */
function serpentine(ts) {
  const E = ['a', 'b'], d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  /** @type {any} */ let dp = { a: { m: 0, path: [] }, b: { m: 0, path: [] } };
  ts.forEach((t, i) => {
    /** @type {any} */ const nx = { a: null, b: null };
    for (const x of E) for (const e of E) for (const px of E) {
      if (i === 0 && px === 'b') continue; // primeiro tiro: sem saída anterior
      const prev = dp[px], move = i === 0 ? 0 : d(ts[i - 1].ends[px], t.ends[e]);
      const last = i === ts.length - 1, m = prev.m + move + (last ? Math.min(crossM(t, e, 'a'), crossM(t, e, 'b')) : crossM(t, e, x));
      if (!nx[x] || m < nx[x].m - 1e-6) nx[x] = { m, path: [...prev.path, e] };
    }
    dp = nx;
  });
  return dp.a.m <= dp.b.m + 1e-6 ? dp.a : dp.b;
}
/** Tarefa de um tiro com a entrada dada: pontos na ordem de caminhada. */
function walkFrom(t, e) {
  if (!t.pts.length) return { m: 0, entra: t.side[e], n: t.nAll };
  const m = Math.min(crossM(t, e, 'a'), crossM(t, e, 'b'));
  return e === 'a' ? { m, entra: t.side.a, de: t.pts[0].n, ate: t.pts.at(-1).n, n: t.nAll } : { m, entra: t.side.b, de: t.pts.at(-1).n, ate: t.pts[0].n, n: t.nAll };
}

/** Partição de k pessoas em blocos contíguos: min-max e, empatado o máximo, menor soma dos quadrados. */
function partition(n, k, cost) {
  const solve = (combine, cap) => {
    const dp = Array.from({ length: k + 1 }, () => Array(n).fill(Infinity)), cut = Array.from({ length: k + 1 }, () => Array(n).fill(-1));
    for (let j = 0; j < n; j++) if (cost(0, j) <= cap) dp[1][j] = combine(0, cost(0, j));
    for (let p = 2; p <= k; p++) for (let j = p - 1; j < n; j++) for (let i = p - 1; i <= j; i++) {
      const c = cost(i, j);
      if (c > cap || dp[p - 1][i - 1] === Infinity) continue;
      const v = combine(dp[p - 1][i - 1], c);
      if (v < dp[p][j] - 1e-6) { dp[p][j] = v; cut[p][j] = i; }
    }
    return { dp, cut };
  };
  const best = solve(Math.max, Infinity).dp[k][n - 1];
  const { cut } = solve((acc, c) => acc + c * c, best + 1), blocks = [];
  for (let p = k, j = n - 1; p >= 1; p--) { const i = p === 1 ? 0 : cut[p][j]; blocks.unshift([i, j]); j = i - 1; }
  return blocks;
}

function teamPlan(sc, people) {
  const k = Math.max(1, Math.floor(Number(people) || 0)), tracks = trackTasks(sc);
  if (!tracks.length) return null;
  const walks = tracks.map(walk);
  const between = tracks.slice(0, -1).map((t, i) => (t.offset != null && tracks[i + 1].offset != null ? Math.abs(tracks[i + 1].offset - t.offset) : sc.deltaM || 0));
  const task = (t, i) => ({ id: t.id, parte: 'inteiro', ...walks[i] });
  let pessoas, sobra = 0, agrupados = 0;
  if (tracks.length > k) {
    const n = tracks.length, W = [0], B = [0];
    for (let i = 0; i < n; i++) W.push(W[i] + walks[i].m);
    for (let i = 0; i < n - 1; i++) B.push(B[i] + between[i]);
    const cost = (i, j) => W[j + 1] - W[i] + (B[j] - B[i]);
    const blocks = partition(n, k, cost);
    pessoas = blocks.map(([i, j]) => {
      const ts = tracks.slice(i, j + 1);
      if (ts.length < 2 || ts.some(t => t.ring || !t.ends)) return { m: cost(i, j), tarefas: ts.map((t, d) => task(t, i + d)) };
      // 3.21 · zigue-zague: cada tiro entra pela ponta onde o anterior terminou (se encurtar o total)
      const best = serpentine(ts);
      return { m: best.m, tarefas: ts.map((t, d) => ({ id: t.id, parte: 'inteiro', ...walkFrom(t, best.path[d]) })) };
    });
    agrupados = blocks.filter(([i, j]) => j > i).length;
  } else {
    sobra = k - tracks.length;
    pessoas = tracks.map((t, i) => ({ m: walks[i].m, tarefas: [task(t, i)] }));
  }
  const ms = pessoas.map(p => p.m);
  return { pessoas, maxM: Math.max(...ms), minM: Math.min(...ms), umPorTiroM: Math.max(...walks.map(w => w.m)), sobra, agrupados,
    passagemM: between.length ? between.reduce((s, v) => s + v, 0) / between.length : 0 };
}

return Object.freeze({teamPlan});
})();
// src/engine3/tradeoffs.mjs
const __tradeoffs=(()=>{
const { SELECTION_MODE } = __vocab;
// Motor 2 · fronteira de esforço (quantos tiros × caminhada × cobertura) e resumo de regularidade.
// Reescrita do módulo tradeoffs do 0.5.1. `build(field, params)` é o montador de cenário em uso (injeção).

/** Para cada K, o cenário com K tiros; marca `pareto` quem nenhum outro supera em caminhada, p95 e maior intervalo. */
function effortFrontier(field, params, counts, build) {
  const rows = counts.map(k => {
    const sc = build(field, { ...params, selectionMode: SELECTION_MODE.QUANTIDADE, selectionCount: k });
    return { K: sc.selected.length, points: sc.samples.length, routeM: sc.route.totalEstimatedM, p95M: sc.coverage.p95,
      maxGapM: sc.longitudinal.global.max, cv: sc.longitudinal.global.cv, empty: sc.longitudinal.emptyUnits.length, minOk: sc.samples.length >= sc.minPoints };
  });
  const unique = rows.filter((r, i) => rows.findIndex(o => o.K === r.K) === i);
  const p95 = r => r.p95M ?? Infinity, gap = r => r.maxGapM ?? 0;
  for (const r of unique) r.pareto = !unique.some(o => o !== r && o.routeM <= r.routeM && p95(o) <= p95(r) && gap(o) <= gap(r)
    && (o.routeM < r.routeM || p95(o) < p95(r) || gap(o) < gap(r)));
  return unique;
}
const regularitySummary = sc => ({ n: sc.samples.length, activeTracks: sc.selected.length, p95: sc.coverage.p95,
  maxGap: sc.longitudinal.global.max, cv: sc.longitudinal.global.cv, emptyTracks: sc.longitudinal.tracksWithoutSamples.length, emptyUnits: sc.longitudinal.emptyUnits.length });

return Object.freeze({effortFrontier,regularitySummary});
})();
// src/engine3/editing.mjs
const __editing=(()=>{
const { pointInGeom } = __geometry;
const { cumulative, locate, pointAt } = __polyline;
const { numberSamples, trackPosition } = __sampling;
const { TRACK_KINDS } = __tracks;
// Motor 2 · edição manual de pontos: mover, acrescentar e restaurar (reescrita do módulo editing do motor 0.5.1).
// Funções puras: devolvem a nova lista de pontos (ou {ok:false, code, error}); quem chama recalcula as métricas.

const fail = (code, error) => ({ ok: false, code, error });

function nearestUnit(units, x, y, onlyUnit) {
  /** @type {{u:any, hit:{s:number,x:number,y:number,dist:number}}|null} */ let best = null;
  for (const u of units) {
    if (onlyUnit && u.id !== onlyUnit) continue;
    const hit = locate(u.line, [x, y]);
    if (!best || hit.dist < best.hit.dist) best = { u, hit };
  }
  return best;
}

const onUnit = (base, u, s, x, y) => ({ ...base, unitId: u.id, trackId: u.trackId, s, sTrack: trackPosition(u, s), x, y,
  kind: u.kind, confidence: u.confidence, manual: true, offTrack: false });

/** Move um ponto: `{deltaS}` desliza sobre o tiro; `{x, y}` reposiciona (gruda no tiro se perto, senão só com allowOffTrack). */
function moveSample(sc, field, id, to, opts = {}) {
  const p = sc.params, cur = sc.samples.find(s => s.id === id);
  if (!cur) return fail('PONTO_NAO_ENCONTRADO', 'Ponto não encontrado');
  let next;
  if (to.deltaS !== undefined) {
    const u = sc.units.find(v => v.id === cur.unitId);
    if (!u || cur.offTrack) return fail('PONTO_FORA_DA_PISTA', 'Ponto fora da pista: arraste-o de volta ao tiro');
    const s = Math.min(u.len, Math.max(0, cur.s + to.deltaS)), [x, y] = pointAt(u.line, s, cumulative(u.line));
    next = { ...cur, s, sTrack: trackPosition(u, s), x, y, manual: true, offTrack: false };
  } else {
    if (!pointInGeom(to.x, to.y, field.geom)) return fail('FORA_DO_LOTE', 'Fora do limite do lote');
    const near = nearestUnit(sc.units, to.x, to.y);
    if (near && near.hit.dist <= p.snapToleranceM) next = onUnit(cur, near.u, near.hit.s, near.hit.x, near.hit.y);
    else if (opts.allowOffTrack) next = { ...cur, x: to.x, y: to.y, manual: true, offTrack: true };
    else return fail('LONGE_DO_TIRO', `Mais de ${p.snapToleranceM} m do tiro: ative "fora da pista" para posicionar livremente`);
  }
  return { ok: true, samples: sc.samples.map(s => (s.id === id ? next : s)) };
}

/** Acrescenta um ponto extra (X1, X2, …) no tiro mais próximo (ou na parte `opts.unitId`). */
function addSample(sc, field, at, opts = {}) {
  if (!pointInGeom(at.x, at.y, field.geom)) return fail('FORA_DO_LOTE', 'Fora do limite do lote');
  const near = nearestUnit(sc.units, at.x, at.y, opts.unitId);
  if (!near) return fail('SEM_TIRO', 'O plano não tem tiro para receber o ponto');
  const used = new Set(sc.samples.map(s => s.id));
  let k = 1;
  while (used.has(`X${k}`)) k++;
  const sample = { ...onUnit({ seq: 0 }, near.u, near.hit.s, near.hit.x, near.hit.y), extra: true, id: `X${k}` };
  return { ok: true, samples: [...sc.samples, sample], sample, distM: near.hit.dist };
}

/** Cenário com outra lista de pontos (renumerada). `metrics(field, sc)` recalcula métricas e avisos. */
const withSamples = (field, sc, samples, metrics) => metrics(field, { ...sc, samples: numberSamples(samples, sc.units) });

const ID_RE = /^[\p{L}\p{N}_ .-]{1,80}$/u, isNum = v => typeof v === 'number' && Number.isFinite(v);

/** Restaura pontos gravados (validação estrita; qualquer item inválido → null). */
function restoreSamples(sc, saved) {
  if (!Array.isArray(saved) || saved.length > 5000) return null;
  const units = new Map(sc.units.map(u => [u.id, u])), seen = new Set(), out = [];
  for (const it of saved) {
    if (!it || typeof it !== 'object' || typeof it.id !== 'string' || !ID_RE.test(it.id) || seen.has(it.id) || !isNum(it.x) || !isNum(it.y)) return null;
    seen.add(it.id);
    const offTrack = it.offTrack === true, u = units.get(it.unitId);
    if (!u && !offTrack) return null;
    const base = { id: it.id, x: it.x, y: it.y, manual: it.manual === true, offTrack, ...(it.extra === true ? { extra: true } : {}) };
    if (!u) { out.push({ ...base, unitId: null, trackId: null, s: null, sTrack: null, kind: null, confidence: null }); continue; }
    if (!isNum(it.s)) return null;
    const s = Math.min(u.len, Math.max(0, it.s));
    out.push({ ...base, unitId: u.id, trackId: u.trackId, s, sTrack: trackPosition(u, s), kind: u.kind, confidence: TRACK_KINDS[u.kind]?.confidence ?? null });
  }
  return out;
}

return Object.freeze({moveSample,addSample,withSamples,restoreSamples});
})();
// src/engine3/presets.mjs
const __presets=(()=>{
const { minimumPoints } = __allocation;
const { regularityWord } = __explain;
const { POINT_MODE, SELECTION_MODE, TRACK_MODE } = __vocab;
// Motor 2 · atalhos de parâmetros e comparação das duas formas de dividir pontos na equipe (reescrita de presets).

const PRESETS = Object.freeze({
  equipe: { titulo: 'Um tiro por monitor', ajuda: 'Cada monitor caminha um tiro com o mesmo número de pontos.' },
  soja: { titulo: 'Soja padrão', ajuda: 'Todos os tiros, total = mínimo de 1 ponto a cada 20 ha.' },
  pivo: { titulo: 'Pivô (anéis)', ajuda: 'Tiros em anéis ao redor do centro do pivô.' },
  distancia: { titulo: 'Distância entre pontos', ajuda: 'Um ponto a cada 400 m ao longo dos tiros (ajustável).' },
});

const pointsPerMonitor = (field, monitors, haPerPoint = 20) => Math.ceil(minimumPoints(field.areaOfficialHa, haPerPoint) / Math.max(1, monitors));

function presetParams(id, field, opts = {}) {
  const monitors = Math.max(1, Math.round(opts.monitors ?? 5)), haPerPoint = opts.haPerPoint ?? 20;
  switch (id) {
    case 'equipe': return { trackMode: TRACK_MODE.QUANTIDADE, trackCount: monitors, selectionMode: SELECTION_MODE.TODOS,
      pointMode: POINT_MODE.POR_TIRO, pointsPerTrack: pointsPerMonitor(field, monitors, haPerPoint) };
    case 'pivo': return { trackMode: TRACK_MODE.CIRCULAR, trackSpacingM: 150, pointMode: POINT_MODE.TOTAL };
    case 'distancia': return { pointMode: POINT_MODE.ESPACAMENTO, targetSpacingM: 400 };
    case 'soja': return {};
    default: throw Error(`Atalho desconhecido: ${id}`);
  }
}

const summary = sc => {
  const g = sc.longitudinal.global;
  return { pontos: sc.samples.length, minimo: sc.minPoints, maiorIntervaloM: g.max, regularidade: regularityWord(g.cv), cv: g.cv,
    cobertura95M: sc.coverage.p95, porTiro: sc.trackRows.map(r => ({ tiro: r.trackId, pontos: r.n, aCadaM: r.medianGapM })) };
};

/** Mesmo número de pontos por monitor × proporcional ao tamanho do tiro. `build(field, params)` monta o cenário. */
function compareTeamSplits(field, monitors, given = {}, build) {
  const equal = /** @type {any} */ (presetParams('equipe', field, { monitors, haPerPoint: given.haPerPoint })), total = equal.pointsPerTrack * equal.trackCount;
  const options = [{ id: 'igual', titulo: 'Mesmo número por monitor', params: equal },
    { id: 'proporcional', titulo: 'Proporcional ao tamanho do tiro', params: { ...equal, pointMode: POINT_MODE.TOTAL, totalPoints: total } }]
    .map(o => ({ ...o, ...summary(build(field, { ...given, ...o.params })) }));
  const [a, b] = options, better = (a.maiorIntervaloM ?? Infinity) <= (b.maiorIntervaloM ?? Infinity) ? a : b;
  const diff = Math.abs((a.maiorIntervaloM ?? 0) - (b.maiorIntervaloM ?? 0));
  return { monitores: monitors, total, options,
    resumo: diff < 1 ? 'As duas formas dão o mesmo maior intervalo: prefira a mais simples para a equipe (mesmo número por pessoa).'
      : `"${better.titulo}" reduz a maior distância entre pontos em ${Math.round(diff)} m; a outra é mais simples de combinar com a equipe.` };
}

return Object.freeze({PRESETS,pointsPerMonitor,presetParams,compareTeamSplits});
})();
// src/engine3/recommend.mjs
const __recommend=(()=>{
const { minimumPoints } = __allocation;
const { DEFAULT_PARAMS } = __params;
const { coverageGrid, nearestDistances } = __metrics;
const { numBR } = __numero;
// Motor 2 · plano recomendado para o lote e alternativas (reescrita do módulo recommend do motor 0.5.1).
// Busca o espaçamento entre tiros (múltiplo da barra quando alinhado) que dá a menor distância de 95% do lote até um
// ponto, desempatando pela caminhada; refina a fase a partir do ponto A; corrige cantos muito longe de qualquer ponto
// que o p95 não enxerga; e, se pedido, cabe na equipe. `build(field, params)` monta o cenário (injetado).

const BOOM_PASSES = Array.from({ length: 22 }, (_, i) => i + 3);   // 3 a 24 larguras de barra
const SEARCH_COVERAGE = Object.freeze({ gridTargetCells: 500 });   // grade leve durante a busca
const FAR_FACTOR = 0.85;                                           // "longe" = mais que 0,85 × lado do quadrado ideal
const farTolHa = areaHa => Math.max(0.5, 0.0025 * areaHa);
/** Parâmetros de forma do plano: a recomendação os define; os demais vêm do usuário. */
const SHAPE_KEYS = ['trackMode', 'trackSpacingM', 'trackPhaseM', 'trackCount', 'pointMode', 'totalPoints', 'pointsPerTrack',
  'targetSpacingM', 'selectionMode', 'selectionCount', 'selectionIds'];

function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
}

/** Resumo de um cenário para comparar opções. */
function metricsOf(sc) {
  const rows = sc.trackRows.filter(r => r.n > 0), counts = rows.map(r => r.n);
  return { tiros: sc.selected.length, pontos: sc.samples.length, minimo: sc.minPoints,
    pontosPorTiro: counts.length ? [Math.min(...counts), Math.max(...counts)] : [0, 0], aoLongoM: median(rows.map(r => r.medianGapM)),
    entreTirosM: median(sc.transverse.map(t => t.medianM)) ?? (sc.deltaM || null), p95M: sc.coverage.p95, maiorM: sc.longitudinal.global.max,
    caminhadaKm: sc.route.totalEstimatedM / 1e3, vazios: sc.longitudinal.emptyUnits.length, abaixoDoMinimo: sc.samples.length < sc.minPoints };
}

const withoutShape = given => { const p = { ...(given || {}) }; for (const k of SHAPE_KEYS) delete p[k]; return p; };
const ha1 = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), int = v => numBR(Math.round(v));
const byCoverageThenWalk = (a, b) => (Math.abs(a.p95 - b.p95) > 1 ? a.p95 - b.p95 : a.km - b.km);

function recommendPlan(field, given = {}, opts = {}, build) {
  const base = withoutShape(given), haPerPoint = base.haPerPoint ?? DEFAULT_PARAMS.haPerPoint;
  const N = minimumPoints(field.areaOfficialHa, haPerPoint), idealM = Math.sqrt((field.areaOfficialHa * 1e4) / Math.max(1, N));
  const boom = base.boomWidthM ?? DEFAULT_PARAMS.boomWidthM, aligned = base.alignToBoom ?? DEFAULT_PARAMS.alignToBoom;
  const tryBuild = p => { try { return build(field, p); } catch { return null; } };
  const shape = (s, phase = 0) => ({ trackMode: 'espacamento', trackSpacingM: Math.round(s * 100) / 100, trackPhaseM: Math.round(phase * 100) / 100,
    pointMode: 'total', totalPoints: null, selectionMode: 'todos' });
  const usable = sc => sc && !sc.longitudinal.emptyUnits.length && sc.samples.length >= N && sc.units.length;
  /** Avalia um espaçamento/fase: p95, caminhada, área longe de ponto (ha) e nº de tiros; fine = grade normal. */
  const evaluate = (s, phase, fine) => {
    const sc = tryBuild({ ...base, ...shape(s, phase), ...(fine ? {} : { coverage: { ...(base.coverage || {}), ...SEARCH_COVERAGE } }) });
    if (!usable(sc)) return null;
    const grid = coverageGrid(field.geom, sc.coverage.fineStepM), d = nearestDistances(grid, sc.samples);
    let far = 0;
    for (let i = 0; i < d.length; i++) if (d[i] > FAR_FACTOR * idealM) far++;
    return { s, phase, p95: sc.coverage.p95, km: sc.route.totalEstimatedM / 1e3, farHa: (far * grid.step * grid.step) / 1e4, tiros: sc.selected.length };
  };

  /** @type {any} */ let pick, lazy, teamNote;
  /** @type {string|null} */ let farNote = null;
  if (opts.preset) {
    pick = { s: opts.preset.s, phase: opts.preset.phase || 0 };
    lazy = opts.preset.lazy || null;
  } else {
    const nearIdeal = s => s >= idealM * 0.5 && s <= idealM * 1.6;
    let spacings = aligned ? BOOM_PASSES.map(k => k * boom + 0.01) : Array.from({ length: 33 }, (_, i) => 100 + i * 25);
    if (spacings.filter(nearIdeal).length >= 3) spacings = spacings.filter(nearIdeal);
    const scan = list => list.map(s => evaluate(s, 0, false)).filter(Boolean);
    let tried = scan(spacings);
    if (!tried.length && aligned) tried = scan(BOOM_PASSES.map(k => k * boom + 0.01));
    if (!tried.length) return null;
    tried.sort(byCoverageThenWalk);
    pick = tried[0];
    const refined = [];
    // Fase: desloca o conjunto de tiros em passadas inteiras a partir do ponto A (±2 larguras em volta da escolhida).
    if (aligned && field.referenceA && opts.refine !== false) {
      const k0 = Math.round((pick.s - 0.01) / boom);
      for (let k = Math.max(3, k0 - 2); k <= k0 + 2; k++)
        for (let ph = 0; ph < k; ph += Math.max(1, Math.floor(k / 6))) { const r = evaluate(k * boom + 0.01, ph * boom, false); if (r) refined.push(r); }
      const plain = evaluate(pick.s, 0, true);
      const best = refined.sort(byCoverageThenWalk).slice(0, 3).map(r => evaluate(r.s, r.phase || 0, true)).filter(Boolean).sort(byCoverageThenWalk)[0];
      if (plain) pick = best && best.p95 <= plain.p95 * 0.98 ? best : plain;
    }
    const all = [...tried, ...refined], current = evaluate(pick.s, pick.phase || 0, false);
    // Canto descoberto: se a escolha deixa área longe de ponto bem acima da melhor opção, troca pela de menos canto.
    if (current && all.length) {
      const minFar = Math.min(...all.map(r => r.farHa));
      if (current.farHa - minFar >= farTolHa(field.areaOfficialHa)) {
        const pool = all.filter(r => r.farHa <= minFar + Math.max(0.25, 0.001 * field.areaOfficialHa)), bestP95 = Math.min(...pool.map(r => r.p95));
        const alt = pool.filter(r => r.p95 <= bestP95 * 1.02).sort((a, b) => a.km - b.km)[0], fine = alt && evaluate(alt.s, alt.phase || 0, true);
        if (fine) {
          farNote = `Espaçamento ajustado para não deixar ${ha1(current.farHa)} ha a mais de ${Math.round(FAR_FACTOR * idealM)} m de qualquer ponto (cai para ${ha1(fine.farHa)} ha): a cobertura de 95% sozinha não enxergava esse canto.`;
          pick = fine;
        }
      }
    }
    // Equipe: no máximo um tiro por pessoa, sem piorar o p95 mais de 10% nem abrir canto descoberto.
    if (opts.fitTeam && opts.monitors >= 1) {
      const people = Math.round(opts.monitors), now = evaluate(pick.s, pick.phase || 0, true);
      if (now && now.tiros > people) {
        const cand = all.filter(r => r.tiros <= people && r.farHa - now.farHa < farTolHa(field.areaOfficialHa)).sort(byCoverageThenWalk)[0];
        const fit = cand && evaluate(cand.s, cand.phase || 0, true);
        if (fit && fit.tiros <= people && fit.p95 <= now.p95 * 1.1) {
          teamNote = `Ajustado à equipe: ${fit.tiros} tiros para ${people} pessoas (era ${now.tiros}); 95% do lote a menos de ${int(fit.p95)} m (era ${int(now.p95)} m).`;
          pick = fit;
        } else teamNote = `Nenhum espaçamento testado cabe em ${people} pessoas sem piorar a cobertura em mais de 10% ou abrir canto descoberto: o plano segue com ${now.tiros} tiros.`;
      }
    }
    const pickFar = (evaluate(pick.s, pick.phase || 0, false) || {}).farHa ?? 0;
    lazy = tried.filter(r => r.p95 <= pick.p95 * 1.1 && r.km <= pick.km * 0.95 && r.farHa - pickFar < farTolHa(field.areaOfficialHa)).sort((a, b) => a.km - b.km)[0] || null;
  }

  const option = (id, titulo, params, nota) => {
    const sc = tryBuild({ ...base, ...params });
    return sc ? { id, titulo, nota, params, m: metricsOf(sc), passes: sc.passes, espacamentoM: sc.deltaM } : null;
  };
  const chosen = option('recomendado', 'Recomendado para o lote', shape(pick.s, pick.phase || 0), null);
  if (!chosen) return null;
  const alternatives = [];
  if (lazy) alternatives.push(option('menos_caminhada', 'Menos caminhada', shape(lazy.s, lazy.phase || 0), 'Cobre um pouco menos, anda menos.'));
  const more = option('mais_cobertura', 'Mais cobertura (+2 pontos)', { ...shape(pick.s, pick.phase || 0), totalPoints: N + 2 }, 'Acima do mínimo: decisão do planejador.');
  if (more && more.m.p95M <= chosen.m.p95M * 0.95) alternatives.push(more);
  const team = Math.max(1, Math.round(opts.monitors ?? 5));
  alternatives.push(option('equipe', `${team} tiros, mesmo número por pessoa`, { trackMode: 'quantidade', trackCount: team, trackPhaseM: 0,
    selectionMode: 'todos', pointMode: 'por_tiro', pointsPerTrack: Math.ceil(N / team) }, 'Mais simples de combinar com a equipe.'));
  alternatives.push(option('antigo', 'Tiros a 300 m (padrão antigo)', { trackMode: 'espacamento', trackSpacingM: 300, trackPhaseM: 0,
    pointMode: 'total', totalPoints: null, selectionMode: 'todos' }, 'Como o app fazia até a v0.10.'));
  for (const a of alternatives) if (a && a.m.pontos > N)
    a.nota = `${a.m.pontos - N === 1 ? '1 ponto' : `${a.m.pontos - N} pontos`} acima do mínimo. ${a.nota || ''}`.trim();
  const m = chosen.m;
  const porque = [
    `Mínimo da regra: ${N} pontos (${field.areaOfficialHa.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha ÷ ${haPerPoint} ha).`,
    `Com ${N} pontos, cada um cobre um quadrado de cerca de ${int(idealM)} m de lado.`,
    `Por isso ${m.tiros} tiros a ${int(chosen.espacamentoM)} m um do outro, medidos de lado${chosen.passes ? ` (${chosen.passes} passadas da barra)` : ''}.`,
    ...(pick.phase ? [`Conjunto de tiros deslocado ${int(pick.phase)} m (${Math.round(pick.phase / boom)} passadas) a partir do ponto A, para cobrir melhor as bordas do lote.`] : []),
    `Pontos repartidos pelo comprimento: ${m.pontosPorTiro[0] === m.pontosPorTiro[1] ? m.pontosPorTiro[0] : `${m.pontosPorTiro[0]} a ${m.pontosPorTiro[1]}`} por tiro${m.aoLongoM > 0 ? `, a cada ~${int(m.aoLongoM)} m andando sobre o tiro` : ''}.`,
    ...(farNote ? [farNote] : opts.preset?.farNote ? [opts.preset.farNote] : []),
    ...(teamNote ? [teamNote] : []),
  ];
  return { N, idealM, pivot: false, chosen, alternatives: alternatives.filter(Boolean), porque,
    preset: { s: pick.s, phase: pick.phase || 0, lazy: lazy ? { s: lazy.s, phase: lazy.phase || 0 } : null, ...(farNote ? { farNote } : {}) } };
}

return Object.freeze({SHAPE_KEYS,metricsOf,recommendPlan});
})();
// src/engine3/exporters.mjs
const __exporters=(()=>{
const { localToLonLat } = __projection;
const { ringSignedArea } = __geometry;
// Motor 2 · arquivos de saída: CSV, GPX, KML, GeoJSON (RFC 7946) e CSV do piloto (reescrita do módulo exporters).
// Todo arquivo diz que é simulação: pontos planejados, linhas estimadas, nada de rastro GNSS.

const fixed = (v, d = 2) => (v == null || !Number.isFinite(v) ? '' : v.toFixed(d));
const comma = (v, d = 2) => fixed(v, d).replace('.', ',');
const cell = v => String(v ?? '').replace(/[;\r\n]+/g, ' ');
const xml = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const BOM = '﻿';
const sampleStatus = (/** @type {any} */ _sc) => 'simulado';
const unitStatus = u => (u.kind === 'trajeto_gps_equipe' ? 'trajeto_importado' : 'simulado');

/** Distância (sobre o trecho) de cada ponto ao anterior do mesmo trecho; o 1º de cada trecho fica null. */
function previousGaps(samples) {
  const byUnit = new Map();
  for (const s of samples) if (!s.offTrack) { if (!byUnit.has(s.unitId)) byUnit.set(s.unitId, []); byUnit.get(s.unitId).push(s); }
  const out = new Map();
  for (const list of byUnit.values()) { list.sort((a, b) => a.s - b.s); list.forEach((s, i) => out.set(s.id, i ? s.s - list[i - 1].s : null)); }
  return out;
}

function toCSV(sc, field) {
  const gaps = previousGaps(sc.samples), rows = ['status;fazenda;lote;ponto;tiro_id;trecho_id;latitude;longitude;utm_e_m;utm_n_m;distancia_desde_inicio_m;distancia_desde_inicio_trecho_m;intervalo_ao_anterior_m;tipo_trajeto;confianca;fora_da_pista;ajuste_manual;politica_margem;fonte_geometria;versao_motor;gerado_em'];
  for (const s of sc.samples) {
    const [lon, lat] = localToLonLat(s.x, s.y, field.centroidUTM);
    rows.push([sampleStatus(sc), cell(field.farm), cell(field.code), s.number, cell(s.trackId), s.offTrack ? '' : cell(s.unitId), comma(lat, 7), comma(lon, 7),
      comma(field.centroidUTM[0] + s.x), comma(field.centroidUTM[1] + s.y), s.offTrack ? '' : comma(s.sTrack, 1), s.offTrack ? '' : comma(s.s, 1),
      comma(gaps.get(s.id) ?? null, 1), s.kind, s.confidence, s.offTrack ? 'sim' : 'nao', s.manual ? 'sim' : 'nao', sc.params.edgePolicy,
      'KML_2024_25_historico', sc.engineVersion, sc.generatedAt].join(';'));
  }
  return BOM + rows.join('\r\n') + '\r\n';
}

const lonLat = (field, xy) => localToLonLat(xy[0], xy[1], field.centroidUTM).map(v => v.toFixed(7));
const pointDesc = (route, p) => (p.fromEntryM === null ? `${route.trackId} · fora da linha · SIMULADO`
  : `${route.trackId} · ${Math.round(p.fromEntryM)} m da entrada · +${Math.round(p.deltaM)} m (≈ ${p.steps} passos) · SIMULADO`);

/** GPX 1.1 com pontos (wpt) e linhas estimadas (trk) das rotas. `appVersion` vai no campo creator. */
function toGPX(routes, field, sc, appVersion) {
  const out = ['<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="SCHMIDT Monitoramento Espacial ${xml(appVersion)} (SIMULACAO)" xmlns="http://www.topografix.com/GPX/1/1">`,
    `<metadata><name>${xml(`${field.code} · ${routes.map(r => r.trackId).join(', ')} · simulado`)}</name>`,
    `<desc>${xml(`${sc.status}. Pontos planejados, não coletados. Motor ${sc.engineVersion}.`)}</desc><time>${sc.generatedAt}</time></metadata>`];
  for (const r of routes) for (const p of r.points) {
    const [lon, lat] = lonLat(field, [p.x, p.y]);
    out.push(`<wpt lat="${lat}" lon="${lon}"><name>${xml(`${r.trackId}-P${p.number}`)}</name><desc>${xml(pointDesc(r, p))}</desc><sym>Flag, Blue</sym><type>ponto_simulado</type></wpt>`);
  }
  for (const r of routes) {
    out.push(`<trk><name>${xml(r.trackId)}</name><desc>${xml(`${Math.round(r.totalLengthM)} m · linha estimada, não é rastro`)}</desc>`);
    for (const part of r.parts) out.push(`<trkseg>${part.line.map(xy => { const [lon, lat] = lonLat(field, xy); return `<trkpt lat="${lat}" lon="${lon}"/>`; }).join('')}</trkseg>`);
    out.push('</trk>');
  }
  out.push('</gpx>');
  return out.join('\n') + '\n';
}

function toKML(routes, field, sc) {
  const coords = line => line.map(xy => lonLat(field, xy).join(',')).join(' ');
  const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
    `<name>${xml(`${field.code} · simulado`)}</name><description>${xml(`${sc.status}. Motor ${sc.engineVersion}, ${sc.generatedAt}.`)}</description>`,
    '<Style id="lote"><LineStyle><color>ff2f7553</color><width>2</width></LineStyle><PolyStyle><color>332f7553</color></PolyStyle></Style>',
    '<Style id="tiro"><LineStyle><color>ff866f0b</color><width>3</width></LineStyle></Style>'];
  for (const polygon of field.geom) {
    const rings = polygon.map((ring, i) => { const tag = i ? 'innerBoundaryIs' : 'outerBoundaryIs'; return `<${tag}><LinearRing><coordinates>${coords(ring)}</coordinates></LinearRing></${tag}>`; });
    out.push(`<Placemark><name>${xml(field.code)}</name><styleUrl>#lote</styleUrl><Polygon>${rings.join('')}</Polygon></Placemark>`);
  }
  for (const r of routes) {
    out.push(`<Folder><name>${xml(`Tiro ${r.trackId}`)}</name>`);
    for (const part of r.parts) out.push(`<Placemark><name>${xml(`${r.trackId} parte ${part.index + 1}`)}</name><styleUrl>#tiro</styleUrl><LineString><coordinates>${coords(part.line)}</coordinates></LineString></Placemark>`);
    for (const p of r.points) out.push(`<Placemark><name>${xml(`P${p.number}`)}</name><description>${xml(pointDesc(r, p))}</description><Point><coordinates>${lonLat(field, [p.x, p.y]).join(',')}</coordinates></Point></Placemark>`);
    out.push('</Folder>');
  }
  out.push('</Document></kml>');
  return out.join('\n') + '\n';
}

/** CSV do piloto: pontos marcados (ou não) pela equipe, em ordem de horário. */
function pilotCSV(marks, meta) {
  const rows = ['fazenda;lote;tiro;monitor;ponto;horario;minutos_desde_anterior;planejado_lat;planejado_lon;marcado_lat;marcado_lon;distancia_planejado_marcado_m;precisao_gps_m;gps;distancia_desde_entrada_m;passos_estimados;passo_m;versao_motor'];
  const sorted = marks.slice().sort((a, b) => a.at.localeCompare(b.at));
  sorted.forEach((m, i) => {
    const minutes = i ? (Date.parse(m.at) - Date.parse(sorted[i - 1].at)) / 6e4 : null;
    rows.push([meta.field.farm, meta.field.code, m.track, meta.monitor, m.number, m.at, fixed(minutes, 1), m.planned[0].toFixed(7), m.planned[1].toFixed(7),
      m.marked ? m.marked[0].toFixed(7) : '', m.marked ? m.marked[1].toFixed(7) : '', fixed(m.distM, 1), fixed(m.accuracyM, 1), m.marked ? 'sim' : 'nao',
      fixed(m.fromEntryM, 1), m.steps ?? '', meta.stepLengthM, meta.engineVersion].map(v => String(v ?? '').replace(/;/g, ',')).join(';'));
  });
  return BOM + rows.join('\r\n') + '\r\n';
}

/** Orientação RFC 7946: anel externo anti-horário, furos horários. */
const rfc7946Rings = polygon => polygon.map((ring, i) => (ringSignedArea(ring) > 0 === (i === 0) ? ring : ring.slice().reverse()));

function toGeoJSON(sc, field) {
  const ll = xy => localToLonLat(xy[0], xy[1], field.centroidUTM).map(v => +v.toFixed(8)), gaps = previousGaps(sc.samples), features = [];
  for (const polygon of field.geom) features.push({ type: 'Feature', properties: { tipo: 'limite_KML_historico', fazenda: field.farm, lote: field.code,
    fonte: 'KML_2024_25', homologado: false, area_publicada_ha: field.areaOfficialHa }, geometry: { type: 'Polygon', coordinates: rfc7946Rings(polygon).map(r => r.map(ll)) } });
  for (const u of sc.units) features.push({ type: 'Feature', properties: { tipo: 'trecho_tiro', status: unitStatus(u), papel: u.role, tiro_id: u.trackId,
    trecho_id: u.id, tipo_trajeto: u.kind, confianca: u.confidence, comprimento_m: +u.len.toFixed(1), fonte: u.source }, geometry: { type: 'LineString', coordinates: u.line.map(ll) } });
  for (const s of sc.samples) {
    const gap = gaps.get(s.id);
    features.push({ type: 'Feature', properties: { tipo: 'ponto_amostragem', status: sampleStatus(sc), ponto: s.number, tiro_id: s.trackId,
      trecho_id: s.offTrack ? null : s.unitId, distancia_desde_inicio_m: s.offTrack ? null : +s.sTrack.toFixed(1),
      distancia_desde_inicio_trecho_m: s.offTrack ? null : +s.s.toFixed(1), intervalo_ao_anterior_m: gap == null ? null : +gap.toFixed(1),
      tipo_trajeto: s.kind, confianca: s.confidence, fora_da_pista: s.offTrack, ajuste_manual: s.manual }, geometry: { type: 'Point', coordinates: ll([s.x, s.y]) } });
  }
  return { type: 'FeatureCollection', name: `monitoramento_${sampleStatus(sc)}_${field.code}`,
    metadata: { status: sc.status, versao_motor: sc.engineVersion, gerado_em: sc.generatedAt, crs_calculo: 'EPSG:32723', minimo_pontos: sc.minPoints,
      pontos_planejados: sc.samples.length, politica_margem: sc.params.edgePolicy, largura_barra_m: sc.params.boomWidthM,
      aviso: 'Simulação geométrica. Não é rastro GNSS nem plano agronômico homologado.' }, features };
}

return Object.freeze({previousGaps,toCSV,toGPX,toKML,pilotCSV,rfc7946Rings,toGeoJSON});
})();
return Object.freeze({tolerances:__tolerances,vocab:__vocab,errors:__errors,numero:__numero,projection:__projection,geometry:__geometry,predicates:__predicates,delaunay:__delaunay,voronoi:__voronoi,polyline:__polyline,clip:__clip,tracks:__tracks,sampling:__sampling,allocation:__allocation,metrics:__metrics,optimize:__optimize,params:__params,plan:__plan,diagnostics:__diagnostics,scenario:__scenario,dataQuality:__dataQuality,paramCatalog:__paramCatalog,explain:__explain,guidance:__guidance,team:__team,tradeoffs:__tradeoffs,editing:__editing,presets:__presets,recommend:__recommend,exporters:__exporters});
})();
(()=>{
'use strict';
// src/app3/format.mjs
const __m_app3_format=(()=>{

// 3.0 · formatação de números e texto seguro para HTML (pt-BR).
const cache = new Map();
/** Número pt-BR com `d` casas (padrão 0). */
function num(v, d = 0) {
  if (v == null || !Number.isFinite(v)) return '—';
  let f = cache.get(d);
  if (!f) cache.set(d, (f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })));
  return f.format(v);
}
/** Faixa "438–515" (ou um número só, se iguais depois de arredondar). */
function range(a, b, d = 0) { const x = num(a, d), y = num(b, d); return x === y ? x : `${x}–${y}`; }
const km = m => num(m / 1000, 1);
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

return Object.freeze({num,range,km,plural,esc});
})();
// src/app3/planner.mjs
const __m_app3_planner=(()=>{
const { buildScenario, planScenario, withMetrics } = schmidtEngine2.scenario;
const { assertParams, sanitizeParams } = schmidtEngine2.paramCatalog;
const { buildWarnings } = schmidtEngine2.diagnostics;
const { assessField } = schmidtEngine2.dataQuality;
const { optimizeDistribution } = schmidtEngine2.optimize;
const { DEFAULT_PARAMS, paramsSignature } = schmidtEngine2.params;
const { coverageGrid, nearestDistances, quickP95 } = schmidtEngine2.metrics;
const { recommendPlan, SHAPE_KEYS, metricsOf } = schmidtEngine2.recommend;
const { restoreSamples, withSamples, moveSample } = schmidtEngine2.editing;
const { teamPlan } = schmidtEngine2.team;
const { buildRoute } = schmidtEngine2.guidance;
const { exactCoverage } = schmidtEngine2.voronoi;
const { pointInGeom } = schmidtEngine2.geometry;
const { cumulative, pointAt } = schmidtEngine2.polyline;
const { num, range, km, plural } = __m_app3_format;
// 3.0 · aplicação: monta o plano de um lote com o motor 2, a recomendação, a conferência, a equipe e a área
// descoberta. Sem DOM: testável no Node com os 51 lotes.

const ENGINE_LABEL = '3.21.0';
const deps = { assertParams, buildWarnings: (f, sc) => buildWarnings(f, sc, assessField), optimizeDistribution, engineVersion: ENGINE_LABEL };
const metrics = (f, sc) => withMetrics(f, sc, deps.buildWarnings);
/** @type {any} */ (deps).metrics = metrics;

/** Cenário completo; `balanced` = plano equilibrado da 2.5 (mesmo critério). */
const scenarioOf = (field, params, balanced = true) => buildScenario(field, params, { balanced }, deps);
const plain = (field, params) => buildScenario(field, params, {}, deps);

/** Parâmetros sem os de forma (os que a recomendação define). */
function baseOf(params) { const p = { ...(params || {}) }; for (const k of SHAPE_KEYS) delete p[k]; return p; }
/** `params` usa a forma `shape` (recomendação ou opção): todo campo de forma que ela define tem o mesmo valor. */
const sameShape = (params, shape) => !!shape && Object.keys(shape).every(k => !SHAPE_KEYS.includes(k) || JSON.stringify(params?.[k] ?? null) === JSON.stringify(shape[k] ?? null));

/** Recomendação do motor 2 (igual ao motor 0.5.1), antes do equilíbrio das áreas. */
function recommendBase(field, base, people, fitTeam) {
  return recommendPlan(field, base, { monitors: people, fitTeam: !!fitTeam }, plain);
}

/** Recomendação do lote para a regra (ha por ponto), pessoas e "limitar à equipe" — com as áreas equilibradas (U17). */
function recommend(field, base, people, fitTeam) {
  const rec = recommendBase(field, base, people, fitTeam);
  return rec ? balanceAreas(field, base, rec) : rec;
}

/** Bordadura (definida pelo proprietário, 19/11): a bordadura do plantio é de ~41 m — ponto a 41 m ou mais da borda é o
 *  ideal; abaixo de 15 m é alerta. Lote estreito, pequeno ou de forma irregular pode não permitir: o app avisa, não força. */
const BORDADURA_M = 41;
const BORDA_MIN_M = 15;
/** Faixa da bordadura de um plano: 2 = todos os pontos a ≥ 41 m · 1 = algum entre 15 e 41 m · 0 = algum a < 15 m. */
const bordaFaixa = m => (m >= BORDADURA_M ? 2 : m >= BORDA_MIN_M ? 1 : 0);

/** Limites do equilíbrio (A5): a cobertura nunca piora além disto. */
const BALANCE = Object.freeze({ p95: 1.03, km: 1.10, spread: 1 });
const BOOM = 36.48;

/** Tiros com só 1 ponto no plano simples (sem cobertura nem equilíbrio); Infinity se o plano não fecha. */
function onesOf(field, params) {
  let c; try { c = planScenario(field, params, deps); } catch { return Infinity; }
  const per = new Map(); for (const p of c.samples) per.set(p.trackId, (per.get(p.trackId) || 0) + 1);
  let ones = 0; for (const v of per.values()) if (v === 1) ones++;
  return ones;
}

/** Mede um plano: cobertura (95% e pior vazio exato), variação da área de cada ponto, tiros de 1 ponto, caminhada. */
function balanceStats(field, params) {
  let sc;
  try { sc = planInUse(field, params, null); } catch { return null; }
  if (sc.longitudinal.emptyUnits.length || sc.samples.length < sc.minPoints || !sc.samples.length) return null;
  const cov = exactCoverage(field.geom, sc.samples), a = cov.cells.map(c => c.areaM2), mean = a.reduce((x, y) => x + y, 0) / a.length;
  const cv = mean ? Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / a.length) / mean : 0;
  return { sc, p95: sc.coverage.p95, worst: cov.worstGapM, cv, ones: sc.trackRows.filter(r => r.n === 1).length, km: sc.route.totalEstimatedM / 1e3 };
}

/**
 * U17 · A1+A5: entre os espaçamentos (múltiplos da barra, ±1 passada do escolhido) e todas as fases a partir do ponto A,
 * fica com o de áreas por ponto mais iguais, desde que: 95% do lote no máximo 3% pior, pior vazio nunca maior,
 * nenhum tiro de 1 ponto a mais e caminhada no máximo 10% maior. Sem candidato melhor, a recomendação fica igual.
 */
function balanceAreas(field, base, rec) {
  const it = balanceSteps(field, base, rec);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}

/** O mesmo cálculo em passos (um candidato por passo), para a tela rodar aos poucos sem travar. */
function* balanceSteps(field, base, rec) {
  const cp = rec.chosen?.params;
  if (!cp || cp.trackMode !== 'espacamento' || !Number.isFinite(cp.trackSpacingM)) return rec;
  const now = balanceStats(field, { ...base, ...cp });
  if (!now) return rec;
  const k0 = Math.round(cp.trackSpacingM / BOOM);
  const faixa = sc => bordaFaixa(borderStats(field, sc).minM);
  /** @type {any} */ let best = { params: cp, ...now, bf: faixa(now.sc) };
  for (let k = Math.max(3, k0 - BALANCE.spread); k <= k0 + BALANCE.spread; k++) for (let ph = 0; ph < k; ph++) {
    const params = { ...cp, trackSpacingM: Math.round((k * BOOM + 0.01) * 100) / 100, trackPhaseM: Math.round(ph * BOOM * 100) / 100 };
    if (params.trackSpacingM === cp.trackSpacingM && params.trackPhaseM === cp.trackPhaseM) continue;
    yield;
    // 3.7 · triagem barata (35× mais rápida): o equilíbrio não muda quantos pontos cada tiro tem, então o nº de tiros de
    // 1 ponto já se sabe pelo plano simples; quem cria tiro de 1 ponto a mais nem chega ao cálculo completo (mesmo resultado)
    if (onesOf(field, { ...base, ...params }) > now.ones) continue;
    const c = balanceStats(field, { ...base, ...params });
    if (!c || c.p95 > now.p95 * BALANCE.p95 || c.worst > now.worst + 1e-6 || c.ones > now.ones || c.km > now.km * BALANCE.km) continue;
    // 3.8: bordadura como desempate — com áreas quase iguais (até +0,5 p.p.), vale o plano sem ponto colado na borda
    const bf = faixa(c.sc);
    // subir de faixa custa até +0,5 p.p. de variação; descer da faixa ideal (≥ 41 m) para 15–41 m só se as áreas ficarem
    // ≥ 2 p.p. mais iguais; abaixo de 15 m nunca é escolhido por igualdade de áreas
    const better = bf === best.bf ? c.cv < best.cv - 1e-9 : bf > best.bf ? c.cv <= best.cv + 0.005 : (bf >= 1 && c.cv < best.cv - 0.02);
    if (better) best = { params, ...c, bf };
  }
  if (best.params === cp) return rec;
  const pct = v => `${num(v * 100)}%`;
  const m = metricsOf(best.sc), passes = Math.round(best.params.trackSpacingM / BOOM), esp = Math.round(best.params.trackSpacingM * 100) / 100;
  // o "porquê" passa a descrever o plano equilibrado (mesmas frases do motor, com os números novos)
  const ppt = m.pontosPorTiro[0] === m.pontosPorTiro[1] ? m.pontosPorTiro[0] : `${m.pontosPorTiro[0]} a ${m.pontosPorTiro[1]}`;
  const ph = best.params.trackPhaseM || 0, phaseLine = ph ? [`Conjunto de tiros deslocado ${num(ph)} m (${Math.round(ph / BOOM)} passadas) a partir do ponto A, para cobrir melhor as bordas do lote.`] : [];
  const why = (rec.porque || []).filter(t => !/^Conjunto de tiros deslocado/.test(t)).flatMap(t => (/^Pontos repartidos pelo comprimento/.test(t) ? [...phaseLine, t] : [t])).map(t => (/^Por isso \d+ tiros a /.test(t) ? `Por isso ${m.tiros} tiros a ${num(esp)} m um do outro, medidos de lado (${passes} passadas da barra).`
    : /^Pontos repartidos pelo comprimento/.test(t) ? `Pontos repartidos pelo comprimento: ${ppt} por tiro${m.aoLongoM > 0 ? `, a cada ~${num(m.aoLongoM)} m andando sobre o tiro` : ''}.` : t));
  return { ...rec, chosen: { ...rec.chosen, params: best.params, m, passes, espacamentoM: esp },
    porque: [...why, `Tiros ajustados para áreas por ponto mais iguais (variação ${pct(now.cv)} → ${pct(best.cv)}), sem piorar a cobertura.`],
    equilibrio: { antes: { cv: now.cv, p95M: now.p95, piorVazioM: now.worst, km: now.km }, depois: { cv: best.cv, p95M: best.p95, piorVazioM: best.worst, km: best.km } } };
}

/** Plano em uso: parâmetros salvos (ou recomendados), ajustes manuais válidos para a mesma assinatura. */
function planInUse(field, params, edits) {
  let sc = scenarioOf(field, params);
  if (edits && Array.isArray(edits.samples) && edits.signature === paramsSignature(sc.params)) {
    const restored = restoreSamples(sc, edits.samples);
    if (restored) sc = withSamples(field, sc, restored, metrics);
  }
  return sc;
}

/** Área a mais de 0,85 × lado ideal de qualquer ponto (critério "Padrão" da 2.5); tolerância de 1% do lote. */
function uncovered(field, sc, k = 0.85) {
  if (!sc.samples.length) return null;
  const grid = coverageGrid(field.geom, sc.coverage.fineStepM || Math.sqrt((field.areaOfficialHa * 1e4) / 4000));
  const ideal = Math.sqrt((field.areaOfficialHa * 1e4) / sc.samples.length), limitM = k * ideal;
  const d = nearestDistances(grid, sc.samples), cellHa = (grid.step * grid.step) / 1e4;
  let far = 0;
  for (let i = 0; i < d.length; i++) if (d[i] > limitM) far++;
  const areaHa = grid.x.length * cellHa;
  return { limitM, haBlind: far * cellHa, limitHa: Math.max(0.5, 0.01 * areaHa), areaHa };
}

/** Conferência antes de enviar: [{level: ok|alerta|erro, text}]. */
function checks(sc, people, blind) {
  const out = [], extra = sc.samples.length - sc.minPoints;
  out.push(extra < 0 ? { level: 'erro', text: `Faltam ${plural(-extra, 'ponto', 'pontos')} para o mínimo` } : { level: 'ok', text: `${num(sc.samples.length)} pontos (mínimo ${num(sc.minPoints)})` });
  const empty = sc.trackRows.filter(r => r.empty);
  out.push(empty.length ? { level: 'erro', text: `${empty.map(r => r.trackId).join(', ')} sem ponto` } : { level: 'ok', text: 'Todos os tiros com ponto' });
  const tiros = sc.selected.length;
  out.push(tiros > people ? { level: 'alerta', text: `${plural(tiros, 'tiro', 'tiros')} para ${plural(people, 'pessoa', 'pessoas')}` } : { level: 'ok', text: tiros === people ? '1 tiro por pessoa' : `1 tiro por pessoa · sobra ${plural(people - tiros, 'pessoa', 'pessoas')}` });
  if (blind) out.push(blind.haBlind > blind.limitHa ? { level: 'alerta', text: `${num(blind.haBlind, 1)} ha a mais de ${num(blind.limitM)} m de um ponto` } : { level: 'ok', text: 'Sem área descoberta' });
  const errors = sc.warnings.filter(w => w.level === 'erro').length, alerts = sc.warnings.filter(w => w.level === 'alerta').length;
  if (errors || alerts) out.push({ level: errors ? 'erro' : 'alerta', text: [errors && plural(errors, 'erro', 'erros'), alerts && plural(alerts, 'alerta', 'alertas')].filter(Boolean).join(' e ') + ' nos dados' });
  return out;
}

/** Números do plano, já formatados para a tela. */
function figures(sc) {
  const gaps = sc.trackRows.filter(r => r.n > 1 && r.medianGapM).map(r => r.medianGapM);
  return { pontos: sc.samples.length, tiros: sc.selected.length, entreTiros: sc.deltaM ? `${num(sc.deltaM)} m` : '—',
    entrePontos: gaps.length ? `${range(Math.min(...gaps), Math.max(...gaps))} m` : '—', p95: sc.coverage.p95 == null ? '—' : `< ${num(sc.coverage.p95)} m`,
    caminhada: `${km(sc.route.totalEstimatedM)} km` };
}

const team = (sc, people) => teamPlan(sc, people);

/** Resumo em texto para colar no WhatsApp. */
function summaryText(field, sc, people, list, split) {
  const f = figures(sc), lines = [`*SCHMIDT · Plano* · ${field.farm} / ${field.code} (${num(field.areaOfficialHa, 2)} ha)`,
    `${plural(f.pontos, 'ponto', 'pontos')} · ${plural(f.tiros, 'tiro', 'tiros')} · ${plural(people, 'pessoa', 'pessoas')}`, `Entre tiros ${f.entreTiros} · entre pontos ${f.entrePontos} · 95% do lote ${f.p95}`, ''];
  if (split) split.pessoas.forEach((p, i) => lines.push(`- Pessoa ${i + 1} (${km(p.m)} km): ${p.tarefas.map(t => `${t.id}, entra a ${t.entra || '—'}, pontos ${t.de ?? '—'}–${t.ate ?? '—'}`).join('; ')}`));
  lines.push('', ...list.map(c => `[${c.level === 'ok' ? 'ok' : c.level.toUpperCase()}] ${c.text}`), '', 'Simulação: pontos planejados, não coletados.');
  return lines.join('\n');
}


const areaCache = new WeakMap();
/** Área que cada ponto representa (célula de Voronoi exata recortada pelo lote), em ha; guardada por plano. */
function pointAreas(field, sc) {
  if (!sc?.samples.length) return null;
  let a = areaCache.get(sc);
  if (!a) {
    const cov = exactCoverage(field.geom, sc.samples);
    const cells = cov.cells.map((c, i) => ({ id: sc.samples[i].id, ha: c.areaM2 / 1e4, rings: c.rings }));
    const has = cells.map(c => c.ha);
    a = { cells, minHa: Math.min(...has), maxHa: Math.max(...has), worstGapM: cov.worstGapM, worstAt: cov.worstAt, worstPt: cov.worstIndex >= 0 ? sc.samples[cov.worstIndex] : null };
    areaCache.set(sc, a);
  }
  return a;
}

/** Informação de um ponto tocado no mapa: tiro, vizinhos no mesmo trecho (andando) e distância à borda do lote. */
/** Distância em linha reta de um ponto até a borda do lote (bordadura) e o lugar da borda mais perto. */
function edgeDistance(field, p) {
  let m = Infinity;
  /** @type {number[]|null} */ let at = null;
  for (const pg of field.geom) for (const ring of pg) for (let j = 1; j < ring.length; j++) {
    const [ax, ay] = ring[j - 1], [bx, by] = ring[j], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((p.x - ax) * ex + (p.y - ay) * ey) / L2)) : 0, d = Math.hypot(p.x - ax - t * ex, p.y - ay - t * ey);
    if (d < m) { m = d; at = [ax + t * ex, ay + t * ey]; }
  }
  return { m, at };
}

const borderCache = new WeakMap();
/**
 * 3.8 · bordadura: distância de cada ponto até a borda; o ponto mais perto da borda (o que mais pede atenção) e,
 * em cada tiro, o 1º e o último ponto (os das pontas), que são os que ficam perto da bordadura.
 */
function borderStats(field, sc) {
  if (!sc?.samples.length) return null;
  let b = borderCache.get(sc);
  if (!b) {
    const all = sc.samples.map(p => ({ id: p.id, number: p.number, trackId: p.trackId, x: p.x, y: p.y, ...edgeDistance(field, p) }));
    const byUnit = new Map();
    for (const p of sc.samples) if (p.unitId && Number.isFinite(p.s)) { const l = byUnit.get(p.unitId) || []; l.push(p); byUnit.set(p.unitId, l); }
    const endIds = new Set();
    for (const l of byUnit.values()) { l.sort((a, c) => a.s - c.s); endIds.add(l[0].id); endIds.add(l[l.length - 1].id); }
    const ends = all.filter(p => endIds.has(p.id)), min = all.reduce((a, c) => (c.m < a.m ? c : a));
    b = { minM: min.m, min, ends, endsMinM: Math.min(...ends.map(p => p.m)), endsMaxM: Math.max(...ends.map(p => p.m)) };
    borderCache.set(sc, b);
  }
  return b;
}

function pointInfo(field, sc, id) {
  const p = sc.samples.find(s => s.id === id);
  if (!p) return null;
  const same = sc.samples.filter(s => s.unitId === p.unitId && !s.offTrack && Number.isFinite(s.s)).sort((a, b) => a.s - b.s), i = same.indexOf(p);
  const prev = i > 0 ? p.s - same[i - 1].s : null, next = i >= 0 && i < same.length - 1 ? same[i + 1].s - p.s : null;
  const { m: edge, at: edgeAt } = edgeDistance(field, p);
  // ponto mais perto em cada tiro vizinho (em linha reta)
  const order = sc.selected.filter(t => Number.isFinite(t.offsetM)).sort((a, b) => a.offsetM - b.offsetM).map(t => t.id), k = order.indexOf(p.trackId);
  const across = [order[k - 1], order[k + 1]].filter(Boolean).map(tid => {
    /** @type {any} */ let best = null;
    for (const q of sc.samples) if (q.trackId === tid) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (!best || d < best.m) best = { id: q.id, number: q.number, trackId: tid, m: d, x: q.x, y: q.y }; }
    return best;
  }).filter(Boolean);
  return { number: p.number, trackId: p.trackId, prevM: prev, nextM: next, edgeM: edge, manual: !!p.manual, x: p.x, y: p.y,
    prev: i > 0 ? same[i - 1] : null, next: i >= 0 && i < same.length - 1 ? same[i + 1] : null, edgeAt, across };
}

/** Pior vazio exato (Voronoi) e variação da área de cada ponto. */
function exactStats(field, samples) {
  const cov = exactCoverage(field.geom, samples), a = cov.cells.map(c => c.areaM2), mean = a.reduce((x, y) => x + y, 0) / a.length;
  return { worst: cov.worstGapM, cv: mean ? Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / a.length) / mean : 0 };
}

/** "Buscar distribuição melhor" (mesma busca da 2.x): devolve os pontos como ajuste gravável ou null se não melhorou. */
function optimizeEdits(field, params) {
  const sc = buildScenario(field, params, { optimize: true }, deps), o = sc.optimization;
  if (!o?.accepted) return { edits: null, report: o };
  // 3.2: a busca da 2.x só olha o "95% do lote"; nos 51 lotes ela aumentava o pior vazio em 27 de 34 (364 → 383 m em
  // média) e deixava as áreas mais desiguais. Agora só vale se o pior vazio (exato) e a variação das áreas não pioram.
  const before = exactStats(field, planInUse(field, params, null).samples), after = exactStats(field, sc.samples);
  if (after.worst > before.worst + 1 || after.cv > before.cv + 0.005) return { edits: null, report: { ...o, accepted: false, rejectedBy: 'piora o pior vazio ou a igualdade das áreas', before, after } };
  const samples = sc.samples.map(s => ({ id: s.id, x: s.x, y: s.y, unitId: s.unitId, s: s.s, manual: false, offTrack: !!s.offTrack }));
  return { edits: { signature: paramsSignature(sc.params), samples }, report: o };
}

/**
 * 3.2 · minimax: desliza cada ponto sobre o próprio tiro (passos de 80, 40 e 20 m) para diminuir o PIOR VAZIO exato
 * (Voronoi), sem deixar o 95% do lote mais de 1% pior, sem deixar as áreas mais desiguais (+1 ponto percentual),
 * sem trocar a ordem dos pontos no tiro (mínimo de 60 m entre vizinhos) e sem encostar na ponta do tiro (≥ 30 m).
 * Mesmos pontos, mesmos tiros; devolve um ajuste gravável ou null se não melhorou.
 */
function minimaxEdits(field, params, edits = null, { maxEvals = 1200, minBorderM = BORDADURA_M } = {}) {
  let sc = planInUse(field, params, edits);
  if (sc.samples.length < 2 || sc.samples.some(p => p.offTrack)) return { edits: null };
  const grid = coverageGrid(field.geom, sc.coverage.fineStepM ?? 20), p95of = smp => quickP95(grid, smp).p95;
  const borderOf = list => Math.min(...list.map(q => edgeDistance(field, q).m));
  const start = { ...exactStats(field, sc.samples), p95: p95of(sc.samples), border: borderOf(sc.samples) };
  let cur = start, samples = sc.samples, evals = 0, improved = false;
  const units = new Map(sc.units.map(u => [u.id, u]));
  const okPlace = (list, p) => {
    const u = units.get(p.unitId);
    if (!u || p.s < Math.min(30, u.len / 2) || p.s > u.len - Math.min(30, u.len / 2)) return false;
    return list.every(q => q.id === p.id || q.unitId !== p.unitId || Math.abs(q.s - p.s) >= 60);
  };
  /** Tenta deslizar o ponto `p` `d` metros no próprio tiro; aplica e devolve true se `wins` aprovar (mesmas travas sempre). */
  const tryMove = (p, d, wins) => {
    const r = moveSample({ ...sc, samples }, field, p.id, { deltaS: d });
    if (!r.ok) return false;
    const moved = r.samples.find(q => q.id === p.id), before = samples.find(q => q.id === p.id);
    // a ordem no tiro não muda: o ponto não passa por cima do vizinho
    if (!okPlace(r.samples, moved) || r.samples.some(q => q.unitId === moved.unitId && q.id !== moved.id && Math.sign(q.s - before.s) !== Math.sign(q.s - moved.s))) return false;
    evals++;
    const eM = edgeDistance(field, moved).m, eB = edgeDistance(field, before).m;
    // nenhum ponto vai para dentro da bordadura (nem chega mais perto da borda se já estava dentro)
    if (eM < minBorderM && eM < eB) return false;
    const st = exactStats(field, r.samples);
    if (!wins(st, eM, eB)) return false;
    const p95 = p95of(r.samples);
    if (p95 > start.p95 * 1.01) return false;
    samples = r.samples; cur = { ...st, p95, border: borderOf(r.samples) }; improved = true;
    return true;
  };
  /** Uma etapa de busca: tenta deslizar cada ponto ±passo e aceita a primeira mudança que `wins` aprovar. */
  const pass = wins => {
    for (const step of [80, 40, 20]) {
      let again = true;
      while (again && evals < maxEvals) {
        again = false;
        for (const p of samples) {
          for (const d of [step, -step]) { if (evals >= maxEvals) break; if (tryMove(p, d, wins)) { again = true; break; } }
          if (again) break;
        }
      }
    }
  };
  /** Centro de área de uma célula (anéis com sinal: buracos descontam). */
  const centroid = rings => {
    let A = 0, cx = 0, cy = 0;
    for (const r of rings) for (let a = 0, b = r.length - 1; a < r.length; b = a++) { const [x0, y0] = r[b], [x1, y1] = r[a], c = x0 * y1 - x1 * y0; A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; }
    return Math.abs(A) < 1e-6 ? null : [cx / (3 * A), cy / (3 * A)];
  };
  const lloyd = wins => {
    for (let it = 0; it < 12 && evals < maxEvals; it++) {
      const cov = exactCoverage(field.geom, samples), ids = samples.map(q => q.id);
      let moved = false;
      ids.forEach((id, i) => {
        const p = samples.find(q => q.id === id), c = cov.cells[i] && centroid(cov.cells[i].rings), u = p && units.get(p.unitId);
        if (!c || !u || evals >= maxEvals) return;
        const cum = cumulative(u.line), a = pointAt(u.line, Math.max(0, p.s - 1), cum), b = pointAt(u.line, Math.min(u.len, p.s + 1), cum), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (!L) return;
        const d = Math.max(-80, Math.min(80, ((c[0] - p.x) * (b[0] - a[0]) + (c[1] - p.y) * (b[1] - a[1])) / L));
        if (Math.abs(d) < 4) return;
        if (tryMove(p, d, wins) || tryMove(p, d / 2, wins)) moved = true;
      });
      if (!moved) break;
    }
  };
  // 0º bordadura: ponto mais perto da borda que o mínimo desliza para dentro (pior vazio até +5%, áreas até +2 p.p.)
  pass((st, eM, eB) => eB < minBorderM && eM > eB + 1 && st.worst <= start.worst * 1.05 && st.cv <= start.cv + 0.02);
  const base = cur;
  // 1º o pior vazio (minimax); 2º, sem deixar o pior vazio voltar a crescer, áreas por ponto mais iguais (lotes pequenos)
  pass(st => st.worst < cur.worst - 1 && st.cv <= Math.max(start.cv, base.cv) + 0.01);
  const worstCap = cur.worst;
  pass(st => st.cv < cur.cv - 0.005 && st.worst <= worstCap + 1e-6);
  // 3.14 · 3º Lloyd ao longo do tiro: cada ponto anda (no próprio tiro) em direção ao centro da sua área; sai do ótimo
  // local dos passos fixos de 80/40/20 m. Mesmas travas; vale se as áreas ficam mais iguais sem crescer o pior vazio.
  lloyd(st => st.cv < cur.cv - 0.002 && st.worst <= worstCap + 1e-6);
  if (!improved) return { edits: null, before: start, after: cur, evals };
  const out = samples.map(q => ({ id: q.id, x: q.x, y: q.y, unitId: q.unitId, s: q.s, manual: false, offTrack: false }));
  return { edits: { signature: paramsSignature(sc.params), samples: out }, before: start, after: cur, evals };
}

/**
 * 3.15 · lote irregular: sugere 1 ponto acima do mínimo quando isso encurta de verdade o maior vazio ou o "95% do lote"
 * (decisão do proprietário, 19/11). Só quando o maior vazio já passa de 1,2 × o lado ideal (lote irregular), o total
 * não foi escolhido à mão e o ganho é de pelo menos 8%. Devolve {params, before, after} ou null.
 */
const PLUS_ONE = Object.freeze({ irregular: 1.2, gain: 0.08, smallHa: 60 });
/** 3.19 · tiros de 1 ponto no meio do lote (fora do primeiro e do último tiro), em lote que não é pequeno. Regra do
 *  proprietário (19/11): em lote pequeno e irregular (RA9, RB9) o ponto sozinho é aceito; nos maiores, só no bico. */
function middleOnes(field, sc) {
  if (field.areaOfficialHa < PLUS_ONE.smallHa) return 0;
  const ord = sc.selected.filter(t => sc.units.some(u => u.trackId === t.id)).map(t => t.id);
  return sc.trackRows.filter(r => r.n === 1 && r.trackId !== ord[0] && r.trackId !== ord.at(-1)).length;
}
function plusOne(field, params, people = 5) {
  if (!params || Number.isFinite(params.totalPoints)) return null;
  const now = balanceStats(field, params);
  if (!now) return null;
  const n = now.sc.samples.length, mid = middleOnes(field, now.sc);
  const irregular = now.worst >= PLUS_ONE.irregular * Math.sqrt((field.areaOfficialHa * 1e4) / n);
  if (n !== now.sc.minPoints || (!irregular && !mid)) return null;
  let rec, b;
  try { rec = recommend(field, { ...baseOf(params), totalPoints: n + 1 }, people, false); b = balanceStats(field, { ...rec.chosen.params, totalPoints: n + 1 }); } catch { return null; }
  if (!b || b.sc.samples.length !== n + 1 || b.worst > now.worst + 1) return null;
  const gains = irregular && (b.worst <= now.worst * (1 - PLUS_ONE.gain) || b.p95 <= now.p95 * (1 - PLUS_ONE.gain));
  // 3.19 · ou tira o tiro de 1 ponto do meio do lote sem piorar a cobertura
  const fixesMid = mid > 0 && middleOnes(field, b.sc) < mid && b.p95 <= now.p95 + 1;
  if (!gains && !fixesMid) return null;
  return { params: { ...rec.chosen.params, totalPoints: n + 1 }, reason: gains ? 'irregular' : 'meio',
    before: { n, worst: now.worst, p95: now.p95, mid }, after: { n: n + 1, worst: b.worst, p95: b.p95, mid: middleOnes(field, b.sc) } };
}

/** Mensagem curta para quem usa, a partir do erro do motor. */
function friendly(err) {
  const m = String(err?.message || err), teto = /Total (\d+) acima do teto configurado \((\d+)\)/.exec(m);
  if (teto) return `Seriam ${num(+teto[1])} pontos, acima do máximo de ${num(+teto[2])} por lote. Use mais hectares por ponto.`;
  return m;
}

/** Confere parâmetros (faixas do catálogo) e monta o plano sem deixar erro escapar: {sc} ou {error}. */
function tryPlan(field, params, edits) {
  const { removed } = sanitizeParams(params || {});
  if (removed.length) return { error: `valor fora da faixa (${removed[0]})` };
  try { return { sc: planInUse(field, params, edits) }; } catch (e) { return { error: friendly(e) }; }
}

/** U04 · tiro completo, como na 2.5: comprimento, régua (borda → pontos → borda), tiros vizinhos (medidos de lado) e por
 *  onde entrar. Cada parte do tiro (quando o lote o corta) tem a sua régua. */
function trackDetail(field, sc, trackId) {
  let route;
  try { route = buildRoute(sc, field, trackId); } catch { return null; }
  const parts = route.parts.map(part => {
    const pts = route.points.filter(p => p.partIndex === part.index);
    const steps = pts.map((p, i) => ({ de: i === 0 ? 'borda' : pts[i - 1].number, ate: p.number, m: p.deltaM }));
    if (pts.length) steps.push({ de: pts.at(-1).number, ate: 'borda', m: part.afterLastM });
    return { entra: part.entrySide, sai: part.exitSide, anda: part.walkDir, lengthM: part.lengthM, steps };
  });
  const order = sc.selected.filter(t => Number.isFinite(t.offsetM)).sort((a, b) => a.offsetM - b.offsetM), i = order.findIndex(t => t.id === trackId);
  const neighbors = i < 0 ? [] : [order[i - 1], order[i + 1]].filter(Boolean).map(t => ({ id: t.id, m: Math.abs(t.offsetM - order[i].offsetM) }));
  return { id: trackId, lengthM: route.totalLengthM, n: route.nPoints, parts, neighbors };
}

/** "Onde estou": dentro ou fora do lote, distância à borda, ao tiro e ao ponto mais perto (em metros, no lote). */
function whereAmI(field, sc, pos) {
  const inside = pointInGeom(pos.x, pos.y, field.geom);
  let edgeM = Infinity;
  for (const pg of field.geom) for (const ring of pg) for (let j = 1; j < ring.length; j++) {
    const [ax, ay] = ring[j - 1], [bx, by] = ring[j], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((pos.x - ax) * ex + (pos.y - ay) * ey) / L2)) : 0;
    edgeM = Math.min(edgeM, Math.hypot(pos.x - ax - t * ex, pos.y - ay - t * ey));
  }
  /** @type {any} */ let track = null;
  for (const u of sc.units) for (let j = 1; j < u.line.length; j++) {
    const [ax, ay] = u.line[j - 1], [bx, by] = u.line[j], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((pos.x - ax) * ex + (pos.y - ay) * ey) / L2)) : 0, d = Math.hypot(pos.x - ax - t * ex, pos.y - ay - t * ey);
    if (!track || d < track.m) track = { id: u.trackId, m: d };
  }
  /** @type {any} */ let point = null;
  for (const q of sc.samples) { const d = Math.hypot(q.x - pos.x, q.y - pos.y); if (!point || d < point.m) point = { id: q.id, number: q.number, trackId: q.trackId, m: d, x: q.x, y: q.y }; }
  return { inside, edgeM, track, point, accuracyM: pos.accuracyM };
}

return Object.freeze({ENGINE_LABEL,deps,scenarioOf,baseOf,sameShape,recommendBase,recommend,BORDADURA_M,BORDA_MIN_M,bordaFaixa,BALANCE,balanceStats,balanceAreas,balanceSteps,planInUse,uncovered,checks,figures,team,summaryText,pointAreas,edgeDistance,borderStats,pointInfo,optimizeEdits,minimaxEdits,PLUS_ONE,middleOnes,plusOne,friendly,tryPlan,trackDetail,whereAmI,DEFAULT_PARAMS,paramsSignature});
})();
const P=__m_app3_planner;
self.onmessage=e=>{if(e.data&&e.data.kind==='improve'){const {id,field,params,edits,people}=e.data;let r=null,plus=null;try{r=P.minimaxEdits(field,params,edits);}catch(x){r=null;}try{plus=edits?null:P.plusOne(field,params,people);}catch(x){plus=null;}self.postMessage({id,kind:'improve',r,plus});return;}const {id,field,base,people,fitTeam}=e.data;let rec=null,error=null;try{rec=P.recommend(field,base,people,fitTeam);}catch(x){error=String((x&&x.message)||x);}self.postMessage({id,rec,error});};
})();