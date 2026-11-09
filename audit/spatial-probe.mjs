// Dados intermediários apenas locais/ignorados: não enviar este JSON a artefatos públicos.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const html=await readFile(root+'index.html');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu']});
try {
  const page=await browser.newPage({locale:'pt-BR',serviceWorkers:'block'});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.SCHMIDT?.modulos&&SCHMIDT.app?.sc);
  const result=await page.evaluate(()=>{
    const m=SCHMIDT.modulos,engine=m.__m_engine_scenario,projection=m.__m_engine_projection,ex=m.__m_engine_exporters;
    const fields={};
    for(const [key,field] of Object.entries(SCHMIDT.app.fields)) {
      const sc=engine.buildScenario(field);
      const route=m.__m_engine_route.buildRoute(sc,field,sc.selected[0].id);
      const xml={};
      for(const [format,text] of [['gpx',ex.toGPX([route],field,sc)],['kml',ex.toKML([route],field,sc)]]) {
        const doc=new DOMParser().parseFromString(text,'application/xml');
        xml[format]={wellFormed:doc.querySelector('parsererror')===null,root:doc.documentElement.localName};
      }
      const geojson=ex.toGeoJSON(sc,field);
      fields[key]={areaEngineM2:m.__m_engine_geometry.geomArea(field.geom),
        centerLonLat:projection.localToLonLat(0,0,field.centroidUTM),
        samples:sc.samples.map(p=>[p.x,p.y]),minimum:sc.minPoints,
        exports:{...xml,geojsonType:geojson.type,geojsonFeatures:geojson.features?.length,csvLines:ex.toCSV(sc,field).split('\n').length}};
    }
    return {fields,fixtures:[[-45,-12],[-46,-11.5],[-44,-13],[-45,0]].map(([lon,lat])=>({lon,lat,utm:projection.lonLatToUtmSouth(lon,lat)}))};
  });
  assert.equal(Object.keys(result.fields).length,51);
  for(const f of Object.values(result.fields)){
    assert.equal(f.exports.gpx.wellFormed,true);assert.equal(f.exports.gpx.root,'gpx');
    assert.equal(f.exports.kml.wellFormed,true);assert.equal(f.exports.kml.root,'kml');
    assert.equal(f.exports.geojsonType,'FeatureCollection');assert.ok(f.exports.geojsonFeatures>0);assert.ok(f.exports.csvLines>1);
  }
  result.htmlSha256=createHash('sha256').update(html).digest('hex');
  result.browser=browser.version();
  await mkdir(root+'audit/results',{recursive:true});
  await writeFile(root+'audit/results/spatial-runtime-private.json',JSON.stringify(result));
  console.log('51 cenários e exports GPX/KML/GeoJSON/CSV executados; coordenadas intermediárias mantidas só em results/ ignorado.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
