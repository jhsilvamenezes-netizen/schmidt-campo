/* Banco local do Caderno Campo: upgrade v1→v2 preserva o workspace existente.
 * Isolamento por banco não equivale ao isolamento por domínio: hospedar separadamente. */
(function(root){'use strict';
 const DB_NAME='schmidt-caderno-campo-standalone-v2', KEY='workspace';let dbPromise;
 const open=()=>{
  if(!('indexedDB' in root))return Promise.reject(new Error('IndexedDB indisponível'));
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
   const req=root.indexedDB.open(DB_NAME,2);
   req.onupgradeneeded=()=>{const db=req.result;
    if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots');
    if(!db.objectStoreNames.contains('drafts'))db.createObjectStore('drafts');
   };
   req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();dbPromise=null;};resolve(db)};
   req.onerror=()=>{dbPromise=null;reject(req.error||Error('Falha ao abrir banco de dados'))};
   req.onblocked=()=>{dbPromise=null;reject(Error('Feche outras abas antigas do Caderno Campo para atualizar o banco'))};
  });return dbPromise;
 };
 const read=async()=>{const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('snapshots','readonly'),req=tx.objectStore('snapshots').get(KEY);
  req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);});};
 // Compare-and-swap em uma única transação: nenhuma aba pisa na revisão de outra.
 const write=async(data,expectedRevision=null)=>{const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots');let updated=null;
  const req=store.get(KEY);req.onsuccess=()=>{
   const current=req.result;const revision=Number(current?.revision||0);
   if(expectedRevision!==null && Number(expectedRevision)!==revision){tx.abort();reject(Object.assign(Error('Esta base foi alterada em outra aba. Reabra o caderno antes de salvar.'),{name:'ConflictError'}));return;}
   updated={...data,revision:revision+1};store.put(updated,KEY);
  };
  req.onerror=()=>reject(req.error);tx.oncomplete=()=>resolve(updated);
  tx.onerror=()=>reject(tx.error||Error('Gravação não concluída'));
  tx.onabort=()=>{if(tx.error)reject(tx.error)};
 });};
 const readDraft=async()=>{const db=await open();return new Promise((resolve,reject)=>{
  const req=db.transaction('drafts','readonly').objectStore('drafts').get('current');req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);
 })};
 const saveDraft=async draft=>{const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(draft,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 })};
 const clearDraft=async()=>{const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').delete('current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 })};
 const persist=async()=>{try{if(root.navigator?.storage?.persist)return !!await root.navigator.storage.persist();}catch(_){}return false;};
 root.CampoStore={open,read,write,readDraft,saveDraft,clearDraft,persist,DB_NAME};
})(typeof window!=='undefined'?window:globalThis);
