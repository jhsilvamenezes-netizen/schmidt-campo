import { loadFields } from '../../audit/legacy-engine.mjs';
const F = await loadFields(), out = [], PX = 2048;
for (const [k, f] of Object.entries(F).sort()) {
  const pts = f.geom.flat(2), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), wM = x1 - x0, hM = y1 - y0;
  const w = wM >= hM ? PX : Math.round(PX * wM / hM), h = hM > wM ? PX : Math.round(PX * hM / wM), c = f.centroidUTM;
  const bbox = [c[0] + x0, c[1] + y0, c[0] + x1, c[1] + y1].map(v => v.toFixed(1)).join(',');
  const url = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=32723&imageSR=32723&size=${w},${h}&format=jpg&f=image`;
  out.push({ k, id: (f.farm[0] + '_' + f.code), url, box: [x0, y0, x1, y1], size: [w, h], geom: f.geom, bearing: f.bearing, corr: f.bearingGridCorrection || 0 });
}
console.log(JSON.stringify(out));
