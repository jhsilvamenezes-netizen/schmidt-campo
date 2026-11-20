// 3.24 · aba Mapa em HTML (mapa, legenda e ferramentas). Sem DOM; recebe dados prontos.
import { esc, num, plural } from './format.mjs';
import { badge, sw } from './views.mjs';


export const mapaView = ({ f, sc }) => `<div class="map" data-map="full"></div>
<section class="sheet"><div class="grab"></div><div class="row-sb"><p class="big">${plural(f.pontos, 'ponto', 'pontos')} <span>· ${plural(f.tiros, 'tiro', 'tiros')}</span></p><button class="badge" data-open="dados">${badge(sc)}</button></div>
<p class="mu">95% do lote ${esc(f.p95)} · caminhada ${esc(f.caminhada)}</p><button class="btn p" data-go="plano">Ver plano</button></section>`;

/** Legenda do mapa (como na 2.5): cada medida com a marca da sua cor no desenho. */
export function legend(field, f, areas, showGap = false) {
  const ha = areas ? (Math.abs(areas.maxHa - areas.minHa) < 0.05 ? `${num(areas.minHa, 1)}` : `${num(areas.minHa, 1)} a ${num(areas.maxHa, 1)}`) : null;
  return `<div class="leg"><b>${esc(field.code)} · ${num(field.areaOfficialHa, 1)} ha</b>
<span><i class="sw t" aria-hidden="true"></i>Entre tiros <b>${esc(f.entreTiros)}</b></span>
<span><i class="sw p" aria-hidden="true"></i>Entre pontos <b>${esc(f.entrePontos.replace('–', ' a '))}</b></span>
${ha ? `<span><i class="sw a" aria-hidden="true"></i>Cada ponto <b>${ha} ha</b></span>` : ''}${showGap && areas?.worstGapM ? `<span><i class="sw v" aria-hidden="true"></i>Maior vazio <b>${num(areas.worstGapM)} m</b></span>` : ''}</div>`;
}

/** 3.8 · ferramentas do mapa num canto: enquadrar, onde estou e o botão de camadas (abre o painel). Sem quadro fixo de
 *  medidas sobre o mapa: elas ficam no painel e no Plano. */
const LAYER_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17.5l9 5 9-5" opacity=".55"/></svg>';
/** @param {any} layers @param {boolean} zoomed @param {boolean} [here] @param {boolean} [open] @param {any} [sum] */
export function mapTools(layers, zoomed, here = false, open = false, sum = null) {
  const btns = `<div class="mtools v">${zoomed ? '<button class="mt" data-act="fit" aria-label="Enquadrar o lote">⤢</button>' : ''}<button class="mt" data-act="where" aria-label="Onde estou" aria-pressed="${here}">◎</button>`
    + `<button class="mt lyr" data-act="layers" aria-expanded="${open}" aria-label="Camadas e medidas">${LAYER_ICON}</button></div>`;
  if (!open || !sum) return btns;
  const row = (k, v, cls = '', term = k) => `<button class="lsum${cls}" data-term="${term}"><span>${k}</span> <b>${v}</b></button>`;
  return btns + `<div class="lpanel" role="dialog" aria-label="Camadas e medidas"><p class="lh">${esc(sum.code)} · ${num(sum.ha, 1)} ha</p>
${row('Entre tiros', esc(sum.entreTiros))}${row('Entre pontos', esc(sum.entrePontos.replace('–', ' a ')))}${sum.cada ? row('Cada ponto', `${sum.cada} ha`, '', 'Área de cada ponto') : ''}${row('Maior vazio', `${num(sum.vazio)} m`)}${row('Mais perto da borda', `${num(sum.borda)} m · ponto ${num(sum.bordaPt)}`, sum.borda < sum.bordLow ? ' er' : sum.borda < sum.bordMin ? ' al' : '', 'Bordadura')}
<p class="lh">Camadas</p>${sw('layer-medidas', 'Medidas no mapa', layers.medidas, 'entre tiros e entre pontos')}${sw('layer-areas', 'Área de cada ponto', layers.areas, 'e onde fica o maior vazio')}${sw('layer-borda', 'Bordadura', layers.borda, `pontas até a borda · ideal ${sum.bordMin} m, mínimo ${sum.bordLow} m`)}${sw('layer-grade', 'Grade em metros', layers.grade, 'um quadrado = a escala')}</div>`;
}
