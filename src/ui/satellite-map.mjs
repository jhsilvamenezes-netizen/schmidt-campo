import { readSchmidtBoundedResponse, schmidtRasterDimensions } from '../platform/bounded-response.mjs';
// Fundo opcional. O plano e seus cálculos não dependem da rede ou da imagem.
export const SCHMIDT_IMAGERY_SERVICE = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const satelliteFrames = new Map();
let satelliteView = null;
export function publishSchmidtSatelliteFrame(frame) {
  satelliteFrames.set(frame.svg, frame);
  satelliteView?.update(frame);
}
export function schmidtSatelliteExtent(frame, margin = 1) {
  const {width, height, scale, origin, angle = 0} = frame;
  if (![width, height, scale, ...origin].every(Number.isFinite) || scale <= 0) throw Error('Câmera inválida');
  const cx = (width / 2 - origin[0]) / scale, cy = (origin[1] - height / 2) / scale;
  const rad = angle * Math.PI / 180;
  const rx = (Math.abs(Math.cos(rad)) * width + Math.abs(Math.sin(rad)) * height) / (2 * scale) * margin;
  const ry = (Math.abs(Math.sin(rad)) * width + Math.abs(Math.cos(rad)) * height) / (2 * scale) * margin;
  return [cx - rx, cy - ry, cx + rx, cy + ry];
}
export function schmidtSatelliteCovers(entry, frame) {
  if (!entry || entry.scope !== frame.scope) return false;
  const box = schmidtSatelliteExtent(frame), b = entry.bbox;
  return box[0] >= b[0] && box[1] >= b[1] && box[2] <= b[2] && box[3] <= b[3]
    && (entry.scale ? frame.scale <= entry.scale * 1.5 : (b[2] - b[0]) / entry.width <= 1.5 / frame.scale);
}
export function installSchmidtSatelliteMap({document}) {
  if (satelliteView) return satelliteView;
  const win = document.defaultView, ns = 'http://www.w3.org/2000/svg';
  const details = document.createElement('details'); details.id = 'satellite-options';
  const summary = document.createElement('summary'); summary.textContent = 'Fundo do mapa · Plano';
  const label = document.createElement('label'); label.textContent = 'Fundo do mapa';
  const select = document.createElement('select'); select.id = 'satellite-mode'; select.setAttribute('aria-label', 'Fundo do mapa');
  for (const [value, text] of [['plan', 'Plano'], ['satellite', 'Satélite (opcional)']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
  }
  const status = document.createElement('p'); status.id = 'satellite-status'; status.setAttribute('role', 'status');
  const credit = document.createElement('small'); credit.className='satellite-credit'; credit.textContent = 'Esri, Vantor, Earthstar Geographics · GIS Community'; credit.hidden = true;
  label.append(select); details.append(summary, label, status);
  const style = document.createElement('style'); style.textContent = `
  #satellite-options{margin:8px 0;padding:8px;border:1px solid var(--sx-line);border-radius:9px;background:var(--sx-surface);color:var(--sx-brand);flex-shrink:0}
  #satellite-options summary{min-height:44px;align-content:center;cursor:pointer;font-size:13px;font-weight:700}
  #satellite-options label{display:grid;gap:6px;font-size:13px}#satellite-options select{width:100%;min-height:44px;font:inherit;padding:8px;border:1px solid var(--sx-line-strong);border-radius:8px;background:var(--sx-surface);color:var(--sx-brand)}
  #satellite-status{font-size:12px;margin:6px 0}#satellite-status:empty{display:none}.satellite-credit{display:block;position:absolute;right:4px;bottom:4px;max-width:calc(100% - 95px);padding:2px 4px;background:#12392ee8;color:white;font-size:11px;line-height:1.25;border-radius:4px;pointer-events:none}.satellite-credit[hidden]{display:none}
  .schmidt-satellite-image{pointer-events:none}
  #block-overview.satellite-on .bm-field,#map.satellite-on .m-field{fill:#fff!important;fill-opacity:.025!important;stroke:white!important;filter:drop-shadow(0 1px 1px #12392e)}
  #block-overview.satellite-on .bm-track,#map.satellite-on .m-unit{stroke:#6fe7ff!important;filter:drop-shadow(0 1px 1px #12392e)}
  #block-overview.satellite-on .bm-point{fill:#ffbc50;stroke:#152b22}
  #block-overview.satellite-on .bm-pill{fill:#12392e;stroke:white}
  #block-overview.satellite-on .bm-label,#block-overview.satellite-on .bm-chrome-text{fill:white!important;stroke:#12392e!important;stroke-width:3;paint-order:stroke}
  #block-overview.satellite-on .bm-chrome{stroke:white}
  #map.satellite-on .m-basemap{display:none}
  `; document.head.append(style);
  let mode = 'plan', current = null, timer = null, pending = null, serial = 0;
  const cache = [];
  const releaseCache = () => { for(const entry of cache)win.URL.revokeObjectURL(entry.url);cache.length=0; };
  const visible = frame => frame.svg.isConnected && frame.svg.getBoundingClientRect().width > 0 && frame.svg.getBoundingClientRect().height > 0;
  const removeImages = () => { for (const frame of satelliteFrames.values()) { frame.svg.classList.remove('satellite-on'); frame.svg.querySelectorAll('.schmidt-satellite-image').forEach(n => n.remove()); } };
  const cancel = () => { ++serial; win.clearTimeout(timer); timer = null; pending?.controller.abort(); pending = null; };
  const draw = (frame, entry) => {
    const existing = frame.svg.querySelector('.schmidt-satellite-image');
    frame.svg.classList.toggle('satellite-on', !!entry);
    if (!entry) { existing?.remove(); return; }
    const image = existing || document.createElementNS(ns, 'image'), b = entry.bbox;
    const values = {href:entry.url, x:frame.origin[0]+b[0]*frame.scale, y:frame.origin[1]-b[3]*frame.scale,
      width:(b[2]-b[0])*frame.scale, height:(b[3]-b[1])*frame.scale, preserveAspectRatio:'none', opacity:'.88', class:'schmidt-satellite-image', 'data-satellite-scope':entry.scope};
    for (const [k,v] of Object.entries(values)) if(image.getAttribute(k)!==String(v))image.setAttribute(k, v);
    if(image.parentNode!==frame.layer)frame.layer.prepend(image);
  };
  async function request(frame) {
    const id = ++serial, controller = new AbortController(), bbox = schmidtSatelliteExtent(frame, 1.35);
    const ratio = (bbox[2]-bbox[0])/(bbox[3]-bbox[1]);
    const width = Math.max(128, Math.round(Math.min(1024, 1024*ratio))), height = Math.max(128, Math.round(width/ratio));
    pending = {controller, bbox, width, scale:frame.scale, scope:frame.scope};
    const timeout = win.setTimeout(() => controller.abort(), 10000);
    try {
      const query = new URLSearchParams({f:'json',bbox:bbox.join(','),bboxSR:'32723',imageSR:'32723',size:`${width},${height}`,format:'jpg',transparent:'false'});
      const options = {signal:controller.signal,credentials:'omit',cache:'no-store',redirect:'error'};
      const response = await win.fetch(SCHMIDT_IMAGERY_SERVICE+'/export?'+query, options);
      if (!response.ok) throw Error('Imagem indisponível');
      const metadata = await readSchmidtBoundedResponse(response, {limit:64*1024, signal:controller.signal});
      const meta = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(metadata)), extent = meta.extent;
      const href = new URL(meta.href);
      if (href.origin !== new URL(SCHMIDT_IMAGERY_SERVICE).origin || !extent || (extent.spatialReference?.latestWkid || extent.spatialReference?.wkid) !== 32723) throw Error('Referência inválida');
      const actual = [extent.xmin,extent.ymin,extent.xmax,extent.ymax];
      const tolerance = Math.max(bbox[2]-bbox[0],bbox[3]-bbox[1])*.02;
      if (!actual.every((n,i)=>Number.isFinite(n)&&Math.abs(n-bbox[i])<=tolerance) || !(meta.width>0&&meta.width<=2048&&meta.height>0&&meta.height<=2048)) throw Error('Extensão inválida');
      const imageResponse = await win.fetch(href.href, options);
      if (!imageResponse.ok || !/^image\/(?:jpeg|png)(?:;|$)/.test(imageResponse.headers.get('content-type')||'')) throw Error('Imagem inválida');
      const bytes = await readSchmidtBoundedResponse(imageResponse, {limit:4*1024*1024, signal:controller.signal});
      const mime = imageResponse.headers.get('content-type'), dimensions = schmidtRasterDimensions(bytes, mime);
      if(dimensions.width!==meta.width || dimensions.height!==meta.height)throw Error('Dimensões divergentes');
      const blob = new Blob([bytes],{type:mime});
      const bitmap = await win.createImageBitmap(blob);
      try { if(bitmap.width!==meta.width||bitmap.height!==meta.height)throw Error('Imagem inválida'); } finally { bitmap.close(); }
      if (id!==serial || mode!=='satellite') return;
      const entry = {scope:frame.scope,bbox:actual,width:meta.width,scale:frame.scale,url:win.URL.createObjectURL(blob)};
      cache.push(entry); while (cache.length>2) win.URL.revokeObjectURL(cache.shift().url);
      if (current && schmidtSatelliteCovers(entry,current) && visible(current)) {
        draw(current, entry); status.textContent = 'Imagem de referência · data não confirmada'; credit.hidden = false;
      }
    } catch {
      if (id===serial && mode==='satellite') {
        mode='plan'; select.value='plan'; summary.textContent='Fundo do mapa · Plano';
        removeImages(); releaseCache(); credit.hidden=true; status.textContent='Sem imagem disponível. Plano mantido.';
      }
    } finally {
      win.clearTimeout(timeout); controller.abort();
      if (id===serial) { pending=null; if(mode==='satellite'&&current)update(current); }
    }
  }
  function update(frame) {
    if (!visible(frame) || document.hidden) return;
    current=frame;
    const block = frame.svg.closest('#block-map-panel');
    if (block) { if(details.parentElement!==block)block.append(details); }
    else { const options=document.getElementById('geo-layer-options'); if(options&&details.parentElement!==options)options.append(details); }
    if(credit.parentElement!==frame.svg.parentElement)frame.svg.parentElement.append(credit);
    if (mode!=='satellite') { draw(frame,null); return; }
    const entry=[...cache].reverse().find(e=>schmidtSatelliteCovers(e,frame));
    draw(frame,entry);
    if (entry) { status.textContent='Imagem de referência · data não confirmada'; credit.hidden=false; return; }
    credit.hidden=true; status.textContent='Carregando satélite…';
    if (pending && schmidtSatelliteCovers(pending,frame)) return;
    cancel();
    timer=win.setTimeout(()=>{if(mode==='satellite'&&current&&visible(current)&&!document.hidden)request(current);},400);
  }
  select.onchange=()=>{
    cancel(); mode=select.value; summary.textContent='Fundo do mapa · '+(mode==='satellite'?'Satélite':'Plano');
    removeImages(); status.textContent='';credit.hidden=true;
    if(mode==='plan')releaseCache();
    if(current)update(current);
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else if(current)update(current);});
  win.addEventListener('offline',()=>{if(mode==='satellite'){select.value='plan';select.onchange();status.textContent='Sem internet. Plano mantido.';}});
  win.addEventListener('pagehide',()=>{cancel();releaseCache();});
  satelliteView={update};
  for(const frame of satelliteFrames.values())update(frame);
  return satelliteView;
}
