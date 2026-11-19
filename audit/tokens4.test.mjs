// 4.0-a · tokens do design 4.0: OKLCH → sRGB correto, escalas em ordem de claridade, contraste WCAG 2 e APCA em todos
// os pares de leitura (claro e escuro), e o CSS gerado no arquivo final.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { oklch, PRIM, ROLES, PAIRS, wcag, apca, cssTokens } from '../src/app3/tokens4.mjs';

test('OKLCH → sRGB: branco, preto e um verde conhecido', () => {
  assert.equal(oklch(1, 0, 0), '#ffffff'); assert.equal(oklch(0, 0, 0), '#000000');
  // oklch(0.42 0.1 155) fica perto de um verde-floresta: G maior que R e B
  const [r, g, b] = [1, 3, 5].map(i => parseInt(oklch(0.42, 0.1, 155).slice(i, i + 2), 16)); assert.ok(g > r && g > b);
});

test('escalas: 50 → 950 sempre do mais claro ao mais escuro', () => {
  const Y = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).reduce((a, v) => a + v, 0);
  for (const [name, sc] of Object.entries(PRIM)) { const v = Object.values(sc).map(Y); for (let i = 1; i < v.length; i++) assert.ok(v[i] < v[i - 1], `${name} em ordem`); }
});

test('contraste WCAG 2 e APCA em todos os pares (claro e escuro)', () => {
  const bad = [];
  for (const [theme, r] of Object.entries(ROLES)) for (const [a, b, w, lc] of PAIRS) {
    const cw = wcag(r[a], r[b]), ca = apca(r[a], r[b]);
    if (cw < w) bad.push(`${theme} ${a}/${b} WCAG ${cw.toFixed(2)} < ${w}`);
    if (ca < lc) bad.push(`${theme} ${a}/${b} APCA ${ca.toFixed(0)} < ${lc}`);
  }
  assert.deepStrictEqual(bad, []);
});

test('pontos distintos dos tiros também para daltônicos (deuteranopia e protanopia)', () => {
  const lin = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const sim = (h, m) => { const c = lin(h); return m.map(r => r[0] * c[0] + r[1] * c[1] + r[2] * c[2]); };
  const DEU = [[0.367, 0.861, -0.228], [0.280, 0.673, 0.047], [-0.012, 0.043, 0.969]], PRO = [[0.152, 1.053, -0.205], [0.115, 0.786, 0.099], [-0.004, -0.048, 1.052]];
  for (const r of Object.values(ROLES)) for (const M of [DEU, PRO]) assert.ok(Math.hypot(...sim(r.ptf, M).map((v, i) => v - sim(r.tr, M)[i])) > 0.08);
});

test('CSS gerado: só vale com o design 4.0 ligado e nunca por cima do Sol', () => {
  const css = cssTokens();
  assert.match(css, /:root\[data-design="4"\]:not\(\.sun\)\{--bg:#[0-9a-f]{6}/);
  assert.doesNotMatch(css, /oklch\(/, 'sRGB hexadecimal (celulares antigos)');
});
