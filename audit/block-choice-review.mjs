// Diagnóstico do que o operador vê no link real; perfil isolado sem coletas reais.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspace/entregas-schmidt/estudo-escolha-bloco-r4/';
const privateOut='/workspace/schmidt-campo/audit/results/block-choice-r4/';
await mkdir(out,{recursive:true});await mkdir(privateOut,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block'});
 await context.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://jhsilvamenezes-netizen.github.io/schmidt-campo/');
 await page.waitForFunction(()=>window.SCHMIDT?.blocks);
 await page.locator('[data-v08-view="plano"]').click();
 const state=()=>page.evaluate(()=>({
   fieldOnMainMap:SCHMIDT.app.sc.field.key,
   selectedGroup:document.getElementById('block-group').selectedOptions[0]?.textContent,
   scope:SCHMIDT.blocks.controller.active,
   miniatureExists:!!document.getElementById('block-overview'),
   miniatureFields:[...document.querySelectorAll('#block-members button')].map(b=>b.dataset.blockMember),
   mainMapTexts:[...document.querySelectorAll('#map text')].map(n=>n.textContent),
   distancesText:document.getElementById('block-distances')?.textContent||'',
   mainMapRect:document.getElementById('map').getBoundingClientRect().toJSON(),
   miniatureRect:document.getElementById('block-overview')?.getBoundingClientRect().toJSON(),
   groups:document.getElementById('block-group').options.length,
 }));
 const initial=await state();
 await page.selectOption('#block-mode','block');await page.selectOption('#block-group','Bananal|BB1-BC1');
 const chosen=await state();assert.equal(chosen.fieldOnMainMap,initial.fieldOnMainMap);assert.equal(chosen.miniatureExists,false);
 await page.locator('#block-planning').scrollIntoViewIfNeeded();await page.waitForTimeout(5200);
 await page.screenshot({path:out+'Atual-01-Escolha-Sem-Previa.png',fullPage:true});
 await page.locator('#block-prepare').click();await page.waitForFunction(()=>!document.getElementById('block-apply').hidden);
 const prepared=await state();assert.equal(prepared.fieldOnMainMap,initial.fieldOnMainMap);assert.equal(prepared.miniatureExists,true);
 await page.screenshot({path:out+'Atual-02-Previa-Secundaria.png',fullPage:true});
 await page.locator('#block-apply').click();await page.waitForFunction(()=>SCHMIDT.blocks.controller.active);
 const applied=await state();assert.equal(applied.fieldOnMainMap,'Bananal|BB1');assert.deepEqual(applied.miniatureFields,['Bananal|BB1','Bananal|BC1']);
 await page.locator('#block-active').click();await page.waitForTimeout(5200);
 await page.screenshot({path:out+'Atual-03-Bloco-Aplicado.png',fullPage:true});
 const data=await page.evaluate(()=>({fields:JSON.parse(document.getElementById('fields-data').textContent).fields,
   brandHTML:document.querySelector('.top')?.firstElementChild?.outerHTML,
   groups:SCHMIDT.blocks.groups,record:SCHMIDT.blocks.controller.snapshot(),
   stylesheet:document.querySelector('style[rel="stylesheet"]')?.textContent||''}));
 await writeFile(privateOut+'source-private.json',JSON.stringify(data));
 assert.deepEqual(errors,[]);
 const report={url:page.url(),version:await page.evaluate(()=>SCHMIDT.modulos.__m_engine_params.APP_VERSION),initial,chosen,prepared,applied,errors,
   findings:['Escolher um bloco não atualiza o mapa principal nem mostra a visão conjunta imediatamente.',
   'Preparar mostra miniatura secundária; o mapa principal ainda é do lote anterior.',
   'Aplicar abre o primeiro membro no mapa principal; o conjunto permanece na miniatura.',
   'As distâncias do conjunto ficam no texto do painel, sem cotas na miniatura nem identificação visual de cada lote.']};
 await writeFile(out+'DIAGNOSTICO-ATUAL.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({initialField:initial.fieldOnMainMap,chosenField:chosen.fieldOnMainMap,preparedField:prepared.fieldOnMainMap,
   appliedField:applied.fieldOnMainMap,miniatureMembers:applied.miniatureFields,options:chosen.groups,errors}));
}finally{await browser.close();}
