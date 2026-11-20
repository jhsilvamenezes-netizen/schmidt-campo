// 3.26 · fundo de satélite opcional (desligado por padrão), a mesma fonte da 2.5: Esri World Imagery (abaixo de 1 m).
// Uma imagem por lote, pedida ao serviço de exportação no fuso UTM 23S dos lotes, com folga em volta. Só baixa com a
// camada ligada e com internet; sem sinal o mapa segue igual (o plano não depende da imagem). Sem DOM.

export const SAT_SERVICE = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export';
export const SAT_HOST = 'https://services.arcgisonline.com';
/** Crédito obrigatório da fonte (o mesmo da 2.5). */
export const SAT_CREDIT = 'Esri, Vantor, Earthstar Geographics';
/** Lado maior da imagem (px): nítida no celular sem pesar (≈ 150–400 KB em JPG). */
export const SAT_MAX_PX = 1600;

/**
 * Pedido da imagem de um lote: caixa em UTM (do lote + folga de 35% do lado maior, mín. 250 m) e endereço.
 * `local` = a mesma caixa em metros do lote (para desenhar no mapa).
 * @param {{geom:number[][][][], centroidUTM:number[]}} field
 */
export function satRequest(field) {
  const pts = field.geom.flat(2), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const m = Math.max(250, 0.35 * Math.max(x1 - x0, y1 - y0));
  x0 -= m; x1 += m; y0 -= m; y1 += m;
  const [cx, cy] = field.centroidUTM, wM = x1 - x0, hM = y1 - y0;
  const w = wM >= hM ? SAT_MAX_PX : Math.max(64, Math.round(SAT_MAX_PX * wM / hM)), h = hM > wM ? SAT_MAX_PX : Math.max(64, Math.round(SAT_MAX_PX * hM / wM));
  const bbox = [cx + x0, cy + y0, cx + x1, cy + y1].map(v => Math.round(v * 10) / 10);
  const q = new URLSearchParams({ bbox: bbox.join(','), bboxSR: '32723', imageSR: '32723', size: `${w},${h}`, format: 'jpg', transparent: 'false', f: 'image' });
  return { href: `${SAT_SERVICE}?${q}`, local: [x0, y0, x1, y1], size: [w, h] };
}
