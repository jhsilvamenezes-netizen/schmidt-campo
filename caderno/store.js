/* IndexedDB isolado por nome: não compartilha registros ou SW com Schmidt Campo. */
(function(root){'use strict';const DB_NAME='schmidt-caderno-campo-standalone-v2',KEY='workspace';let dbPromise;
const open=()=>{if(!('indexedDB' in root))return Promise.reject(new Error('IndexedDB indisponível'));if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Falha ao abrir banco de dados'));});return dbPromise;};
const read=async()=>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readonly'),req=tx.objectStore('snapshots').get(KEY);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);});};
const write=async data=>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(data,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Gravação não concluída'));tx.onabort=()=>reject(tx.error||Error('Gravação cancelada'));});};
const persist=async()=>{try{if(root.navigator?.storage?.persist)return !!await root.navigator.storage.persist();}catch(_){}return false;};
root.CampoStore={open,read,write,persist,DB_NAME};
})(typeof window!=='undefined'?window:globalThis);
