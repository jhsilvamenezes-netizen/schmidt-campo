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

export function orient2d(ax, ay, bx, by, cx, cy) {
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
export function leftOf(ax, ay, bx, by, cx, cy) { return -orient2d(ax, ay, bx, by, cx, cy); }
