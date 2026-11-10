import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {buildCandidate} from '../scripts/build-preserved.mjs';
const rootBefore=await readFile('index.html','utf8');
const before=execFileSync('git',['show','76c9303b5c8adfceabb84d6da7f695cc712973c7:index.html'],{encoding:'utf8',maxBuffer:4000000}),build=await buildCandidate(),after=build.html;
const strip=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi,'');
assert.equal(strip(before),strip(after),'Estrutura/CSS fora dos scripts idênticos');
const records=JSON.parse(await readFile('audit/results/block-runtime-r3/prepared-records-private.json'));
await mkdir('audit/results/bottlenecks',{recursive:true});await writeFile('audit/results/bottlenecks/candidate.html',after);
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(req.url==='/before'?before:after);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});const errors=[];let checked=0;
try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/after');await page.waitForFunction(()=>window.SCHMIDT?.blocks);
 const record=await page.evaluate(async()=>{const g=SCHMIDT.blocks.groups.find(g=>g.id==='Bananal|BB1-BC1');return await SCHMIDT.blocks.prepare(g);});
 for(const key of ['members','common','state','assessment'])assert.deepEqual(record[key],records[record.id][key],key);
 await page.evaluate(record=>SCHMIDT.blocks.controller.enter(record),record);assert.equal(await page.evaluate(()=>SCHMIDT.blocks.controller.active),record.id);
 await page.evaluate(()=>SCHMIDT.blocks.controller.leave());assert.equal(await page.evaluate(()=>SCHMIDT.blocks.controller.active),null);checked++;
 assert.deepEqual(errors,[]);
 await writeFile('audit/results/bottlenecks/browser.json',JSON.stringify({passed:true,realBlock:record.id,exactPlanParity:true,enterLeavePassed:true,staticMarkupAndCSSIdentical:true,errors,rootHtmlUnchanged:rootBefore===await readFile('index.html','utf8')},null,2));
 console.log('Bloco real: plano idêntico, entrada/saída aprovadas, markup/CSS idênticos, zero erros.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
