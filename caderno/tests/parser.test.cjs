const assert=require('node:assert/strict');
const parser=require('../parser.js');
const lotTests={
 'BD12345':['BD1','BD2','BD3','BD4','BD5'],
 'BA123':['BA1','BA2','BA3'],
 'Pivô 1, 2, 4, 5, 6':['P1','P2','P4','P5','P6'],
 'RA - RB - RC 7, 8':['RA7','RA8','RB7','RB8','RC7','RC8'],
 'BE2-3':['BE2','BE3'],
 'BD125':['BD1','BD2','BD5'],
 'BB1-BC1':['BB1','BC1'],
 'RA7,8 ,RB7,8  ,RC7,8':['RA7','RA8','RB7','RB8','RC7','RC8'],
 'RA 9 / RB 9':['RA9','RB9']
};
for (const [x,expected] of Object.entries(lotTests)) assert.deepEqual(parser.parseLots(x),expected,x);
const terrestrial=`*RELATÓRIO DE APLICAÇÃO*\n*OS:34*\n*LOTE:BD12345*\n*Data de Inicio:30/10/2026*\n*Data de Termino: 03/11/2026*\n*PRODUTOS USADOS NA OS*\nZapp-------3460KG\nGrasidim full---80L\nAureo------340L\n*SOBRA DE PRODUTOS DA OS*\nZapp-------00\nGrasidim full---00\nAureo------00`;
const t=parser.parse(terrestrial);
assert.equal(t.value.farm,'Bananal');assert.equal(t.value.os,'34');assert.equal(t.value.products.length,3);assert.equal(t.value.products[0].used,'3460');assert.equal(t.value.products[0].left,'00');assert.equal(t.value.products[0].dose,null);
const aerial=`*RELATÓRIO DE APLICAÇÃO*\n*Aplicação aérea*\n*OS:* 52\n*LOTE:* BA1,2,3, BC3,4\n*Data de Inicio:* 13/11\n*Data de Termino:* 13/11\n*Avião:* PR-ORQ\n*Piloto:* Maycon\n*Horimetro Inicial:* 35,3\n*Horimetro Final:* 42,8\n*PRODUTOS USADOS NA OS*\nProfol 516\nAdesil 50\nÁureo 331\nAzimut 840`;
const a=parser.parse(aerial);
assert.equal(a.value.farm,'Bananal');assert.equal(a.value.type,'Aérea');assert.equal(a.value.start,'2026-11-13');assert.equal(a.value.equipment.aircraft,'PR-ORQ');assert.equal(a.value.products.length,4);assert.equal(a.value.products[0].usedUnit,'');assert(a.warnings.some(x=>x.includes('unidade')));
const malformed=parser.parse(terrestrial+'\n'+terrestrial);assert(malformed.error.includes('mais de um'));
assert.equal(parser.isoDate('29/02/2026'),'');assert.equal(parser.isoDate('29/02/2028'),'2028-02-29');
console.log('OK: formatos de talhão, aplicação terrestre/aérea, unidade não informada, data inválida e múltiplos relatórios');
