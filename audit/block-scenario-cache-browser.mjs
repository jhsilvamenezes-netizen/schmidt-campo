import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildCandidate} from '../scripts/build-preserved.mjs';
import {createSchmidtBlockScenarioReader,schmidtBlockScenarios,schmidtCommonBlockFields} from '../src/application/block-planning.mjs';
const build=await buildCandidate(),old=await readFile('index.html','utf8');
const strip=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi,'');assert.equal(strip(old),strip(build.html));
const records=JSON.parse(await readFile('audit/results/block-runtime-r3/prepared-records-private.json'));
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(build.html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});
try{
 const page=await browser.newPage({serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.SCHMIDT?.blocks);
 const fn=new Function('records',[createSchmidtBlockScenarioReader,schmidtBlockScenarios,schmidtCommonBlockFields].map(f=>f.toString()).join('\n')+`
 const fields=SCHMIDT.app.fields,engine=SCHMIDT.modulos.__m_engine_scenario;
 const reader=createSchmidtBlockScenarioReader(engine);let pairs=0;
 const comparable=rows=>JSON.stringify(rows.map(({generatedAt,...sc})=>sc));
 for(const record of Object.values(records)){const expected=comparable(schmidtBlockScenarios(fields,record,engine));if(comparable(reader(fields,record))!==expected)throw Error('Cena fria divergente');if(comparable(reader(fields,structuredClone(record)))!==expected)throw Error('Cena quente divergente');pairs+=record.members.length;}
 const record=records['Bananal|BB1-BC1'],run=(fn)=>{const start=performance.now();for(let i=0;i<30;i++)fn(fields,structuredClone(record));return performance.now()-start;};
 run((f,r)=>schmidtBlockScenarios(f,r,engine));run(reader);const batches=[];
 for(let i=0;i<9;i++){let before,after;if(i%2){after=run(reader);before=run((f,r)=>schmidtBlockScenarios(f,r,engine));}else{before=run((f,r)=>schmidtBlockScenarios(f,r,engine));after=run(reader);}batches.push({before,after});}
 return {blocks:40,memberPairs:pairs,exactParity:true,batches,beforeMedianMs:batches.map(b=>b.before).sort((a,b)=>a-b)[4],afterMedianMs:batches.map(b=>b.after).sort((a,b)=>a-b)[4]};`);
 const result=await page.evaluate(fn,records);assert.ok(result.afterMedianMs<result.beforeMedianMs);
 await page.evaluate(record=>SCHMIDT.blocks.controller.enter(record),records['Bananal|BB1-BC1']);await page.waitForTimeout(200);
 const texts=await page.locator('#block-details').innerText();await page.locator('[data-block-member="Bananal|BC1"]').click();await page.waitForTimeout(200);assert.equal(await page.locator('#block-details').innerText(),texts);
 await page.evaluate(()=>SCHMIDT.blocks.controller.leave());assert.equal(await page.evaluate(()=>SCHMIDT.blocks.controller.active),null);assert.deepEqual(errors,[]);
 result.errors=errors;result.staticPresentationIdentical=true;result.switchAndLeavePassed=true;
 await mkdir('audit/results/scenario-cache',{recursive:true});await writeFile('audit/results/scenario-cache/report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();await new Promise(r=>server.close(r));}
