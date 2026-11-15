// 2.3: tema Noite, opcional (uso no fim do dia ou na cabine). O botão "Sol" passa a alternar três estados:
// Normal → Sol → Noite → Normal. Sol continua igual. Noite troca os tokens de cor e, como o CSS antigo ainda tem
// branco e preto fixos (108 regras), gera na hora as trocas equivalentes lendo as próprias regras da página:
// nenhuma regra antiga é editada, e regra nova que usar token já sai certa.
const KEY = 'schmidt.tema.noite';
const ACCENT_BG = /var\(--sx-(?:brand|brand-strong|ok|ok-mid|warn|warn-mid|err|ref|focus|map-[a-z-]+)\)/;

export const NIGHT_TOKENS = {
  '--sx-bg': '#0d1512', '--sx-surface': '#16201c', '--sx-soft': '#1a2621', '--sx-tint': '#1e2c26', '--sx-glass': '#16201ceb',
  '--sx-ink': '#e7efea', '--sx-ink-2': '#c5d4cb', '--sx-muted': '#a6b8ae', '--sx-head': '#d4ece0',
  '--sx-line-soft': '#22312a', '--sx-line': '#34473e', '--sx-line-strong': '#7d968b',
  '--sx-brand': '#74d3b2', '--sx-brand-strong': '#9be2c8', '--sx-brand-soft': '#1b3a30', '--sx-forest': '#0a2419',
  '--sx-on-accent': '#0d1512', '--sx-point-text': '#eda46a', '--sx-ref': '#cfa9fa',
  '--sx-ok': '#7ad79a', '--sx-ok-mid': '#5cc282', '--sx-ok-line': '#2f5a3e', '--sx-ok-soft': '#15301f',
  '--sx-warn': '#f2bb6b', '--sx-warn-mid': '#e3a346', '--sx-warn-line': '#5a4527', '--sx-warn-soft': '#33260f',
  '--sx-err': '#ff9b91', '--sx-err-soft': '#3a1714', '--sx-focus': '#8ab8ff',
  '--sx-map-track': '#56c6de', '--sx-map-track-sel': '#ff9d57', '--sx-map-point': '#95521c', '--sx-map-point-strong': '#b8662a',
  '--sx-map-label': '#9bd8e6', '--sx-map-field': '#13261c', '--sx-map-field-line': '#62b089', '--sx-map-inactive': '#61716a',
  '--sx-map-grid': '#3f7a68', '--sx-map-blind': '#ff5a6e', '--sx-shadow-soft': '#0009', '--sx-shadow-float': '#000a',
  '--sx-elev': '0 4px 18px #0008',
};

// Cada regra que define cor é copiada (só as cores) para a MESMA camada e na mesma ordem, sob
// :root[data-tema=noite]. Copiar todas, e não só as de branco/preto fixo, mantém a cascata original entre elas: uma
// troca isolada (fora de camada) venceria regras posteriores que antes ganhavam dela.
const COLOR_PROPS = ['background', 'background-color', 'color', 'fill', 'stroke', 'border', 'border-top', 'border-bottom', 'border-left',
  'border-right', 'border-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'outline-color'];
const WHITE_G = /rgba?\(255,\s*255,\s*255(?:,\s*([\d.]+))?\)|#f{6}\b|#f{3}\b|\bwhite\b/gi;
const BLACK_G = /rgba?\(0,\s*0,\s*0(?:,\s*1)?\)|#0{6}\b|#000\b|\bblack\b/gi;
// Tokens escuros usados como cor de TEXTO (sobre fundo claro) passam ao equivalente claro.
const TEXT_ROLE = { '--sx-forest': '--sx-head', '--sx-map-point': '--sx-point-text', '--sx-map-point-strong': '--sx-point-text' };
function translate(prop, value, accent, selector) {
  // fill branco em forma (escala, rótulo de fundo) é fundo; em texto do mapa (número no ponto) é letra.
  const shapeFill = prop === 'fill' && !accent && !/text/.test(selector);
  const bg = prop.startsWith('background') || shapeFill, text = !shapeFill && (prop === 'color' || prop === 'fill');
  let v = value.replace(WHITE_G, (_, alpha) => bg ? (alpha !== undefined && Number(alpha) < 1 ? 'var(--sx-glass)' : 'var(--sx-surface)')
    : text ? (accent ? 'var(--sx-on-accent)' : _) : prop === 'stroke' ? 'var(--sx-surface)' : 'var(--sx-line)');
  v = v.replace(BLACK_G, () => bg ? 'var(--sx-bg)' : text ? 'var(--sx-ink)' : 'var(--sx-line-strong)');
  if (prop === 'color') v = v.replace(/var\((--sx-[a-z-]+)\)/g, (m, t) => TEXT_ROLE[t] ? `var(${TEXT_ROLE[t]})` : m);
  return v;
}
function overrideFor(rule) {
  const st = rule.style, out = [];
  const accent = ACCENT_BG.test(st.getPropertyValue('background') + st.getPropertyValue('background-color'));
  for (const prop of COLOR_PROPS) {
    const raw = st.getPropertyValue(prop).trim();
    if (raw) out.push(`${prop}:${translate(prop, raw, accent, rule.selectorText)}${st.getPropertyPriority(prop) ? '!important' : ''}`);
  }
  if (!out.length) return '';
  const sel = rule.selectorText.split(',').map(x => {
    x = x.trim();
    return x.startsWith(':root') ? x.replace(':root', ':root[data-tema=noite]') : x.startsWith('html') ? `:root[data-tema=noite]${x.slice(4)}` : `:root[data-tema=noite] ${x}`;
  }).join(',');
  return `${sel}{${out.join(';')}}`;
}

// Percorre camadas e @media mantendo o contexto (mesma camada, mesmo @media, mesma ordem).
export function nightThemeCSS(sheets) {
  const out = [];
  const walk = (rules, wrap) => {
    for (const r of rules) {
      if (r.selectorText !== undefined && r.style) {
        if (/data-tema/.test(r.selectorText)) continue;
        const css = overrideFor(r);
        if (css) out.push(wrap(css));
      } else if (r.cssRules) {
        const media = r.media?.mediaText;
        if (media && /print/.test(media)) continue;
        const inner = media ? (c => wrap(`@media ${media}{${c}}`)) : r.name !== undefined && r.constructor?.name === 'CSSLayerBlockRule' ? (c => wrap(`@layer ${r.name}{${c}}`)) : wrap;
        walk(r.cssRules, inner);
      }
    }
  };
  for (const sheet of sheets) { if (sheet.ownerNode?.id === 'schmidt-night') continue; try { walk(sheet.cssRules, c => c); } catch { /* folha externa */ } }
  const tokens = `:root[data-tema=noite]{color-scheme:dark;${Object.entries(NIGHT_TOKENS).map(([k, v]) => `${k}:${v}`).join(';')}}`;
  // Logotipo em PNG sobre fundo branco (multiply): no escuro, inverte o brilho mantendo o tom e some o fundo.
  const logo = ':root[data-tema=noite] .brand-logo{mix-blend-mode:screen;filter:invert(1) hue-rotate(180deg)}';
  return `${tokens}\n${out.join('\n')}\n${logo}`;
}

export function installSchmidtNightTheme({ document }) {
  const view = document.defaultView, root = document.documentElement, button = document.getElementById('sun-toggle');
  if (!view || !button || document.getElementById('schmidt-night')) return false;
  const style = document.createElement('style');
  style.id = 'schmidt-night';
  const meta = document.querySelector('meta[name="theme-color"]'), metaDay = meta?.content;
  const store = { get() { try { return view.localStorage.getItem(KEY) === '1'; } catch { return false; } },
    set(on) { try { on ? view.localStorage.setItem(KEY, '1') : view.localStorage.removeItem(KEY); } catch { /* sem armazenamento */ } } };
  const apply = on => {
    if (on && !style.textContent) { style.textContent = nightThemeCSS([...document.styleSheets]); document.head.append(style); }
    if (on) root.dataset.tema = 'noite'; else if (root.dataset.tema === 'noite') root.dataset.tema = '';
    button.textContent = on ? 'Noite' : 'Sol';
    button.setAttribute('aria-pressed', String(on || root.dataset.tema === 'sol'));
    button.title = on ? 'Tema Noite. Toque para voltar ao normal.' : root.dataset.tema === 'sol' ? 'Tema Sol. Toque para o tema Noite.' : 'Tema normal. Toque para o tema Sol (alto contraste).';
    if (meta) meta.content = on ? NIGHT_TOKENS['--sx-forest'] : metaDay;
    store.set(on);
  };
  // Na fase de captura (antes do clique antigo, que fica no próprio botão): em Noite, o clique só volta ao normal.
  let wasSol = false;
  button.addEventListener('click', event => {
    wasSol = root.dataset.tema === 'sol';
    if (root.dataset.tema === 'noite') { event.stopImmediatePropagation(); apply(false); }
  }, true);
  // Depois do clique antigo: se o Sol acabou de ser desligado, entra a Noite.
  button.addEventListener('click', () => { if (wasSol && root.dataset.tema !== 'sol') apply(true); else if (root.dataset.tema === 'sol') apply(false); });
  if (store.get() && root.dataset.tema !== 'sol') apply(true); else apply(false);
  return true;
}
