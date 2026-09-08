/* STACK v22.42 — persistence/recovery guard. Additive; main storage schema/key unchanged. */
(()=>{'use strict';
const BUILD='v22.42-persistence-recovery';
const RECOVERY_KEY='stack_recovery_v2242';
const MAX=6;
let queue=Promise.resolve();
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return null}}
function mergeExtras(target,source){
  if(!target||!source||typeof target!=='object'||typeof source!=='object')return target;
  if(Array.isArray(target)&&Array.isArray(source)){
    const n=Math.min(target.length,source.length);
    for(let i=0;i<n;i++)mergeExtras(target[i],source[i]);
    return target;
  }
  if(Array.isArray(target)||Array.isArray(source))return target;
  for(const k of Object.keys(source)){
    if(!(k in target))target[k]=clone(source[k]);
    else if(target[k]&&source[k]&&typeof target[k]==='object'&&typeof source[k]==='object')mergeExtras(target[k],source[k]);
  }
  return target;
}
function rawMain(){
  try{if(typeof KEY==='undefined')return null;const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null}catch(e){return null}
}
async function loadVault(){
  try{if(typeof idbOpen!=='function')return[];const db=await idbOpen();const out=await new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readonly'),r=tx.objectStore(IDB_STORE).get(RECOVERY_KEY);r.onsuccess=()=>res(Array.isArray(r.result)?r.result:[]);r.onerror=()=>rej(r.error)});db.close();return out}catch(e){return[]}
}
async function writeVault(snapshot,reason){
  if(!snapshot||typeof snapshot!=='object'||typeof idbOpen!=='function')return;
  const list=await loadVault(),payload=JSON.stringify(snapshot),last=list[list.length-1];
  if(last?.payload===payload)return;
  list.push({ts:Date.now(),build:BUILD,reason,payload});while(list.length>MAX)list.shift();
  const db=await idbOpen();await new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(list,RECOVERY_KEY);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
}
function vault(snapshot,reason){queue=queue.then(()=>writeVault(clone(snapshot),reason)).catch(()=>{});return queue}
function installSaveGuard(){
  try{
    if(typeof save!=='function'||save.__stackPersistenceGuard)return;
    const original=save;
    const wrapped=function(...args){
      const previous=rawMain();
      try{if(previous&&typeof state!=='undefined')mergeExtras(state,previous)}catch(e){}
      if(previous)vault(previous,'before-save');
      const result=original.apply(this,args);
      try{if(typeof state!=='undefined')vault(state,'after-save')}catch(e){}
      return result;
    };
    wrapped.__stackPersistenceGuard=true;save=wrapped;
  }catch(e){}
}
function persist(){try{if(typeof state!=='undefined')vault(state,'lifecycle')}catch(e){}}
function boot(){
  const raw=rawMain();if(raw)vault(raw,'boot-raw');
  installSaveGuard();persist();
  window.addEventListener('pagehide',persist);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist()});
  console.info('STACK persistence guard',BUILD);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();