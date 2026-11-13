import test from 'node:test';import assert from 'node:assert/strict';
import {schmidtSatelliteExtent as extent,schmidtSatelliteCovers as covers} from '../src/ui/satellite-map.mjs';
const frame={width:390,height:500,scale:.1,origin:[-40000,870000],angle:0,scope:'a'};
test('envelope cobre os quatro cantos, inclusive mapa girado',()=>{
 for(const angle of [0,30,90,145,180]){const f={...frame,angle},b=extent(f);const rad=angle*Math.PI/180;
 for(const [x,y]of [[0,0],[390,0],[390,500],[0,500]]){
 const rx=195+(x-195)*Math.cos(rad)-(y-250)*Math.sin(rad),ry=250+(x-195)*Math.sin(rad)+(y-250)*Math.cos(rad);
 const east=(rx-f.origin[0])/f.scale,north=(f.origin[1]-ry)/f.scale;
 assert(east>=b[0]-1e-7&&east<=b[2]+1e-7&&north>=b[1]-1e-7&&north<=b[3]+1e-7);
 }}
});
test('cache não troca lote nem estica imagem após zoom',()=>{
 const entry={scope:'a',bbox:extent(frame,1.35),width:1024};assert(covers(entry,frame));assert(!covers(entry,{...frame,scope:'b'}));assert(!covers(entry,{...frame,scale:frame.scale*10}));assert(!covers(entry,{...frame,origin:[0,0]}));
});
test('câmera inválida não gera consulta',()=>{assert.throws(()=>extent({...frame,scale:0}));assert.throws(()=>extent({...frame,origin:[NaN,0]}));});

import {readFileSync} from 'node:fs';
test('CSP permite somente o destino de imagem aprovado, mantendo scripts restritos',()=>{const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.equal(html.match(/connect-src ([^;]+);/)[1],"'self' blob: data: https://services.arcgisonline.com");assert(!html.match(/script-src ([^;]+);/)[1].includes('unsafe-inline'));});
