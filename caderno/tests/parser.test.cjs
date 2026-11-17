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
const terrestrial=`*RELATÓRIO DE APLICAÇÃO*\n*OS:901*\n*LOTE:BD12345*\n*Data de Inicio:18/09/2026*\n*Data de Termino: 19/09/2026*\n*PRODUTOS USADOS NA OS*\nZapp-------350KG\nProduto B---8L\nAdjuvante C------34L\n*SOBRA DE PRODUTOS DA OS*\nZapp-------00\nProduto B---00\nAdjuvante C------00`;
const t=parser.parse(terrestrial);
assert.equal(t.value.farm,'Bananal');assert.equal(t.value.os,'901');assert.equal(t.value.products.length,3);assert.equal(t.value.products[0].used,'350');assert.equal(t.value.products[0].left,'00');assert.equal(t.value.products[0].dose,null);
const aerial=`*RELATÓRIO DE APLICAÇÃO*\n*Aplicação aérea*\n*OS:* 902\n*LOTE:* BA1,2,3, BC3,4\n*Data de Inicio:* 18/09\n*Data de Termino:* 18/09\n*Avião:* PR-TST\n*Piloto:* Operador Teste\n*Horimetro Inicial:* 10,1\n*Horimetro Final:* 12,4\n*PRODUTOS USADOS NA OS*\nProduto A 51\nProduto B 5\nProduto C 33\nProduto D 84`;
const a=parser.parse(aerial);
assert.equal(a.value.farm,'Bananal');assert.equal(a.value.type,'Aérea');assert.equal(a.value.start,'2026-09-18');assert.equal(a.value.equipment.aircraft,'PR-TST');assert.equal(a.value.products.length,4);assert.equal(a.value.products[0].usedUnit,'');assert(a.warnings.some(x=>x.includes('unidade')));
const malformed=parser.parse(terrestrial+'\n'+terrestrial);assert(malformed.error.includes('mais de um'));
assert.equal(parser.isoDate('29/02/2026'),'');assert.equal(parser.isoDate('29/02/2028'),'2028-02-29');
assert.equal(parser.parse('*RELATÓRIO DE APLICAÇÃO*\n*OS:* 10\n*LOTE:* BD1\n*Data de Inicio:* 12/01\n*Data de Termino:* 13/01\n*PRODUTOS USADOS NA OS*\nZapp 2 kg',[],'2026/27').value.start,'2027-01-12');
console.log('OK: formatos de talhão, aplicação terrestre/aérea, unidade não informada, data inválida e múltiplos relatórios');
