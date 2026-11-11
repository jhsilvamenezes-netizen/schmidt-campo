import {test} from 'node:test';import assert from 'node:assert/strict';
import {installSchmidtSessionLifecycle} from '../src/platform/browser-session-lock.mjs';
test('retorno persistido recarrega uma vez; abertura normal não recarrega',()=>{
 const target=new EventTarget();let reloads=0,invalidations=0;target.location={reload:()=>reloads++};installSchmidtSessionLifecycle(target,{invalidate:()=>invalidations++});
 target.dispatchEvent(new Event('pageshow'));assert.equal(reloads,0);
 target.dispatchEvent(new Event('pagehide'));assert.equal(invalidations,1);
 const restored=()=>{const e=new Event('pageshow');Object.defineProperty(e,'persisted',{value:true});target.dispatchEvent(e);};restored();restored();assert.equal(reloads,1);assert.equal(invalidations,2);
});
