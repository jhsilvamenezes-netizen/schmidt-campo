import {test} from 'node:test';
import assert from 'node:assert/strict';
import {schmidtMapClosestBorder} from '../src/ui/block-map.mjs';
import {schmidtBlockBorderDistance} from '../src/application/block-planning.mjs';
const outer=[[0,0],[100,0],[100,100],[0,100]],hole=[[40,40],[60,40],[60,60],[40,60]];
test('medida desenhada termina na borda mais próxima, inclusive furos',()=>{
 const g=[[outer,hole]];const b=schmidtMapClosestBorder([35,50],g);assert.deepEqual(b.xy,[40,50]);assert.equal(b.metres,5);
 assert.equal(b.metres,schmidtBlockBorderDistance(g,[{x:35,y:50}]));
});
test('projeção prende a medida ao segmento e não à reta infinita',()=>{
 const b=schmidtMapClosestBorder([-3,-4],[[outer]]);assert.equal(b.metres,5);assert.deepEqual(b.xy,[0,0]);
});
test('bordas degeneradas e ponto na divisa não produzem NaN',()=>{
 const g=[[[[0,0],[0,0],[100,0],[100,100],[0,100],[0,0]]]];
 const before=JSON.stringify(g);assert.equal(schmidtMapClosestBorder([50,0],g).metres,0);assert.equal(JSON.stringify(g),before);
});
