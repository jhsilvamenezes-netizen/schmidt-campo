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
