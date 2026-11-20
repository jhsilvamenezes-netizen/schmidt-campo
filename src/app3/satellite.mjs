// 3.26 · fundo de satélite opcional (desligado por padrão), a mesma fonte da 2.5: Esri World Imagery (abaixo de 1 m).
// Uma imagem por lote, pedida ao serviço de exportação no fuso UTM 23S dos lotes, com folga em volta. Só baixa com a
// camada ligada e com internet; sem sinal o mapa segue igual (o plano não depende da imagem). Sem DOM.

export const SAT_SERVICE = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export';
export const SAT_HOST = 'https://services.arcgisonline.com';
/** Crédito obrigatório da fonte (o mesmo da 2.5). */
export const SAT_CREDIT = 'Esri, Vantor, Earthstar Geographics';
/** Lado maior da imagem do lote (px): nítida no celular (≈ 2,5–3,5 m por pixel nos lotes atuais). */
export const SAT_MAX_PX = 2048;
/** Imagem do entorno: mais larga e leve, só para não haver borda vazia em volta do lote. */
export const SAT_CONTEXT_PX = 1024;

const request = (/** @type {number[]} */ c, /** @type {number[]} */ box, /** @type {number} */ maxPx) => {
  const [x0, y0, x1, y1] = box, wM = x1 - x0, hM = y1 - y0;
  const w = wM >= hM ? maxPx : Math.max(64, Math.round(maxPx * wM / hM)), h = hM > wM ? maxPx : Math.max(64, Math.round(maxPx * hM / wM));
  const bbox = [c[0] + x0, c[1] + y0, c[0] + x1, c[1] + y1].map(v => Math.round(v * 10) / 10);
  const q = new URLSearchParams({ bbox: bbox.join(','), bboxSR: '32723', imageSR: '32723', size: `${w},${h}`, format: 'jpg', transparent: 'false', f: 'image' });
  return { href: `${SAT_SERVICE}?${q}`, local: box, size: [w, h] };
};

/**
 * Pedido das imagens de um lote, em UTM 23S:
 * - `detail`: o lote + folga de 35% do lado maior (mín. 250 m), nítida;
 * - `context`: um quadrado de 3× o lado maior (mín. 4 km), centrado no lote, que cobre a tela em volta.
 * `local` = a caixa em metros do lote (para desenhar no mapa).
 * @param {{geom:number[][][][], centroidUTM:number[]}} field
 */
export function satRequest(field) {
  const pts = field.geom.flat(2), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), L = Math.max(x1 - x0, y1 - y0);
  const m = Math.max(250, 0.35 * L), half = Math.max(2000, 1.5 * L), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return {
    detail: request(field.centroidUTM, [x0 - m, y0 - m, x1 + m, y1 + m], SAT_MAX_PX),
    context: request(field.centroidUTM, [cx - half, cy - half, cx + half, cy + half], SAT_CONTEXT_PX),
  };
}
