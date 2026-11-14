// Política de apresentação: IDs, parâmetros e mensagens de erro não são alterados.
export function operationalAlternativeLabel(text) {
  return text.replace(/\s+/g,' ').trim() === 'Tiros a 300 m (padrão antigo)' ? 'Distribuição alternativa' : text.replace(/^1 tiros(?=,|$)/,'1 tiro');
}
export function operationalComparisonNote(text) {
  return text.replace('Como o app fazia até a v0.10.','').trim();
}
export function operationalParameterHint(text) {
  if (!text.trimStart().startsWith('Padrão:')) return text;
  const at=text.indexOf(' · aceita ');
  return at<0 ? '' : 'Aceita '+text.slice(at+' · aceita '.length).trim();
}
// Desenho do "Esquema das distâncias" (viewBox 0 -6 300 90). Com 2 linhas e 3 pontos por linha é o desenho
// aprovado em 09/11/2026, byte a byte; com 1 tiro ou 1 ponto por tiro não desenha medida que o plano não tem.
export function operationalSchematicMarkup({ lines = 2, perLine = 3 } = {}) {
  const ys = lines === 2 ? [24, 68] : [46], xs = perLine === 3 ? [20, 150, 280] : [150], dy = ys[0] - 24;
  const arrows = (lines === 2 ? 'M37 32V60M33 36L37 32L41 36M33 56L37 60L41 56' : '')
    + (perLine === 3 ? `M165 ${12 + dy}H265M169 ${8 + dy}L165 ${12 + dy}L169 ${16 + dy}M261 ${8 + dy}L265 ${12 + dy}L261 ${16 + dy}` : '');
  const labels = (lines === 2 ? '<text x="46" y="49">De lado</text>' : '') + (perLine === 3 ? `<text x="186" y="${9 + dy}">Ao longo</text>` : '');
  return `<path d="${ys.map(y => `M20 ${y}H280`).join('')}" stroke="currentColor" stroke-width="2"/>`
    + `<g fill="var(--sx-map-point)">${ys.map(y => xs.map(x => `<circle cx="${x}" cy="${y}" r="5"/>`).join('')).join('')}</g>`
    + (arrows ? `<path d="${arrows}" fill="none" stroke="currentColor" stroke-width="1.5"/>` : '')
    + (labels ? `<g fill="currentColor" font-size="13" font-family="system-ui,sans-serif">${labels}</g>` : '');
}
