// 4.0-a · tokens do design 4.0 em três camadas: (1) primitivas em OKLCH (escalas de tom com passos que o olho
// percebe iguais), (2) papéis (fundo, texto, ação, mapa, estados) e (3) componentes (no CSS). As cores são calculadas
// em OKLCH e gravadas em sRGB hexadecimal (#rrggbb): funciona em qualquer celular, inclusive navegadores antigos sem
// oklch(). Contraste conferido por WCAG 2 e APCA no teste (audit/tokens4.test.mjs). Sem DOM: roda no Node e no build.

// ---------- OKLCH → sRGB ----------
const lin2srgb = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklabToLinear(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}
const inGamut = rgb => rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4);
/** OKLCH (L 0–1, C, h em graus) → '#rrggbb'. Fora da faixa do sRGB, reduz o croma (mantém tom e luminosidade). */
export function oklch(L, C, h) {
  const rad = (h * Math.PI) / 180;
  let c = C, rgb = oklabToLinear(L, c * Math.cos(rad), c * Math.sin(rad));
  for (let i = 0; i < 40 && !inGamut(rgb); i++) { c *= 0.95; rgb = oklabToLinear(L, c * Math.cos(rad), c * Math.sin(rad)); }
  return '#' + rgb.map(v => Math.round(Math.min(1, Math.max(0, lin2srgb(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')).join('');
}

// ---------- 1 · primitivas: escalas de 10 tons (50 = mais claro … 950 = mais escuro) ----------
const STEPS = { 50: 0.975, 100: 0.945, 200: 0.89, 300: 0.81, 400: 0.71, 500: 0.6, 600: 0.5, 700: 0.42, 800: 0.33, 900: 0.25, 950: 0.19 };
/** Croma de cada tom: menor nos extremos (cores puras demais "vibram" no claro e somem no escuro). */
const chromaAt = (L, peak) => peak * Math.max(0.12, 1 - Math.abs(L - 0.55) / 0.5);
const scale = (h, peak) => Object.fromEntries(Object.entries(STEPS).map(([k, L]) => [k, oklch(L, chromaAt(L, peak), h)]));
export const HUES = Object.freeze({ mata: 155, ouro: 78, terra: 85, erro: 27, alerta: 68 });
export const PRIM = Object.freeze({
  mata: scale(HUES.mata, 0.15),    // verde da marca (tiros, ação, números)
  ouro: scale(HUES.ouro, 0.17),    // dourado (pontos, assinatura)
  terra: scale(HUES.terra, 0.018), // neutro quente (fundos, texto, linhas)
  erro: scale(HUES.erro, 0.19),
  alerta: scale(HUES.alerta, 0.16),
});

// ---------- 2 · papéis (mesmos nomes de token da 3.x: o CSS dos componentes funciona nos dois designs) ----------
const P = PRIM;
/** Ponto do mapa: dourado vivo de propósito (a escala tira croma dos tons claros; o ponto precisa saltar no lote). */
const PONTO = oklch(0.8, 0.165, 82);
export const ROLES = Object.freeze({
  light: {
    bg: P.terra[50], sf: '#ffffff', sf2: P.terra[100], ink: P.terra[950], mu: P.terra[700], ln: P.terra[200],
    br: P.mata[700], br2: P.mata[100], 'on-br': '#ffffff', act: P.mata[700], 'on-act': '#ffffff', gold: P.ouro[500],
    hd: P.mata[900], 'hd-ink': '#ffffff', mapbg: oklch(0.93, 0.02, HUES.mata), pt: P.ouro[700], tr: P.mata[700], ptf: PONTO,
    ptr: P.mata[900], pti: P.terra[950], fd: oklch(0.992, 0.006, HUES.terra), fl: P.mata[700],
    ok: P.mata[700], oks: P.mata[100], al: P.alerta[700], als: P.alerta[100], er: P.erro[600], ers: P.erro[50],
  },
  dark: {
    bg: oklch(0.17, 0.012, HUES.mata), sf: oklch(0.215, 0.014, HUES.mata), sf2: oklch(0.255, 0.016, HUES.mata), ink: P.terra[50], mu: P.terra[300], ln: oklch(0.33, 0.018, HUES.mata),
    br: P.mata[300], br2: oklch(0.3, 0.05, HUES.mata), 'on-br': P.mata[950], act: P.mata[600], 'on-act': '#ffffff', gold: P.ouro[400],
    hd: oklch(0.2, 0.03, HUES.mata), 'hd-ink': '#ffffff', mapbg: oklch(0.2, 0.02, HUES.mata), pt: P.ouro[300], tr: P.mata[400], ptf: PONTO,
    ptr: P.terra[50], pti: P.terra[950], fd: oklch(0.25, 0.025, HUES.mata), fl: P.mata[400],
    ok: P.mata[300], oks: oklch(0.29, 0.05, HUES.mata), al: P.alerta[300], als: oklch(0.3, 0.05, HUES.alerta), er: P.erro[300], ers: oklch(0.3, 0.06, HUES.erro),
  },
});

/** Pares que precisam ser legíveis (texto sobre fundo; traços do mapa 3:1). [frente, fundo, mínimo WCAG, mínimo APCA |Lc|] */
export const PAIRS = [
  ['ink', 'bg', 4.5, 75], ['ink', 'sf', 4.5, 75], ['ink', 'sf2', 4.5, 75], ['mu', 'sf', 4.5, 60], ['mu', 'bg', 4.5, 60], ['mu', 'sf2', 4.5, 60],
  ['br', 'sf', 4.5, 60], ['br', 'bg', 4.5, 60], ['br', 'br2', 4.5, 60], ['on-act', 'act', 4.5, 60], ['hd-ink', 'hd', 4.5, 75],
  ['pt', 'fd', 4.5, 60], ['pti', 'ptf', 4.5, 60], ['ok', 'oks', 4.5, 60], ['al', 'als', 4.5, 60], ['er', 'ers', 4.5, 60],
  ['ink', 'mapbg', 4.5, 60], ['tr', 'fd', 3, 45], ['fl', 'fd', 3, 45], ['ptr', 'fd', 3, 45], ['fl', 'mapbg', 3, 45],
];

// ---------- 3 · saída para o CSS (só com o design 4.0 ligado; o Sol continua por cima) ----------
const block = r => Object.entries(r).map(([k, v]) => `--${k}:${v}`).join(';');
export function cssTokens() {
  return `/* gerado por src/app3/tokens4.mjs (OKLCH → sRGB) — não editar à mão */\n`
    + `:root[data-design="4"]:not(.sun){${block(ROLES.light)}}\n`
    + `@media (prefers-color-scheme:dark){:root[data-design="4"]:not(.sun){${block(ROLES.dark)}}}\n`;
}

// ---------- contraste ----------
const ch = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
/** Contraste WCAG 2 (1–21). */
export function wcag(a, b) {
  const lum = h => { const [r, g, bl] = ch(h).map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
/** APCA (SAPC 0.0.98G-4g): |Lc| de texto `fg` sobre fundo `bg` (0–~106). Mede como o olho percebe, pelo tamanho e peso. */
export function apca(fg, bg) {
  const Y = h => { const [r, g, b] = ch(h).map(v => v ** 2.4); return 0.2126729 * r + 0.7151522 * g + 0.0721750 * b; };
  const clamp = y => (y > 0.022 ? y : y + (0.022 - y) ** 1.414);
  const yt = clamp(Y(fg)), yb = clamp(Y(bg));
  if (Math.abs(yb - yt) < 0.0005) return 0;
  const c = yb > yt ? (yb ** 0.56 - yt ** 0.57) * 1.14 : (yb ** 0.65 - yt ** 0.62) * 1.14;
  const lc = Math.abs(c) < 0.1 ? 0 : c > 0 ? c - 0.027 : c + 0.027;
  return Math.abs(lc * 100);
}
