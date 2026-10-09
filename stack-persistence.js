/* STACK v29.81 — data integrity: restore points + recovery guard. Main storage key/schema unchanged.
   Before: two rolling lists (8 + 10 snapshots) were rewritten on every save, so the history was only the last few taps
   and nothing in the UI could use it. Now: time-based restore points in the existing IndexedDB store (no DB upgrade):
   the newest state per 15 min for 2 h, per day for 14 days, per month for ~6 months, plus pinned «before-…» points
   taken right before an import / restore / delete. Analytics → Данные lists them (STACK_RECOVERY.list / restore).
   The old lists stay readable (labelled «старая копия») but are no longer written.
   save() returns whether the main key was really written; the per-save «merge missing keys from the previous copy»
   is gone — it resurrected fields the app had deleted. */
(()=>{'use strict';
const BUILD='v29-81-restore-points';
const VERSION='v29.82';
const SNAP='snap:',META='snapm:',END='￿';
const LEGACY_LISTS=['stack_recovery_v2242','stack_backups_v21'];
const RECOVER_MARK='stack_v2250_recovered_once';
const SNAP_DELAY=4000,MIN=60000,HOUR=3600000,DAY=86400000,MAX_PINNED=20;
let queue=Promise.resolve();
const later=fn=>{const run=queue.then(fn);queue=run.catch(()=>{});return run};
const pad=ts=>String(ts).padStart(13,'0');
const range=prefix=>IDBKeyRange.bound(prefix,prefix+END);
function serial(v){try{return JSON.stringify(v)}catch(e){return null}}
function plain(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function dispatch(name,detail){try{window.dispatchEvent(new CustomEvent(name,{detail}))}catch(e){}}

/* one IndexedDB transaction on the shared store; resolves with the request result once the transaction has committed */
function req(mode,fn){
  return idbOpen().then(db=>new Promise((resolve,reject)=>{
    let out;
    const tx=db.transaction(IDB_STORE,mode);
    tx.oncomplete=()=>{db.close();resolve(out&&out.result)};
    tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('IndexedDB'))};
    try{out=fn(tx.objectStore(IDB_STORE))}catch(e){try{tx.abort()}catch(_){}}
  }));
}

/* Retention. items: [{ts, pin}] → timestamps to delete. A point survives if it is the newest in its bucket:
   15-minute buckets up to 2 h old, calendar days up to 14 days, months up to ~6 months. Pinned points keep
   their own slot for 14 days (newest MAX_PINNED only), so an auto point can never push out the state from just before a delete. */
function dayKey(ts){const d=new Date(ts);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()}
function monthKey(ts){const d=new Date(ts);return d.getFullYear()+'-'+d.getMonth()}
function expired(items,now=Date.now()){
  const seen=new Set(),drop=[];let pinned=0;
  [...items].sort((a,b)=>b.ts-a.ts).forEach(({ts,pin})=>{
    const age=now-ts;
    if(pin){if(age<=14*DAY&&pinned<MAX_PINNED){pinned++;return}drop.push(ts);return}
    const bucket=age<=2*HOUR?'a'+Math.floor(ts/(15*MIN)):age<=14*DAY?'d'+dayKey(ts):age<=190*DAY?'m'+monthKey(ts):null;
    if(bucket&&!seen.has(bucket)){seen.add(bucket);return}
    drop.push(ts);
  });
  return drop;
}
async function prune(){
  const metas=await req('readonly',s=>s.getAll(range(META)))||[];
  const drop=expired(metas.map(m=>({ts:m.ts,pin:!!m.pin})));
  if(!drop.length)return;
  await req('readwrite',s=>{let r;drop.forEach(ts=>{s.delete(SNAP+pad(ts));r=s.delete(META+pad(ts))});return r});
}

function stats(s){
  let marks=0;
  (s.months||[]).forEach(m=>(m||[]).forEach(r=>(r||[]).forEach(v=>{if(v==='✓'||v==='○'||v==='◐')marks++})));
  return{processes:(s.processes||[]).length,marks,tasks:(s.journal||[]).length,goals:(s.savings?.goals||[]).length};
}

/* Writes one restore point of the CURRENT state (sync part captures everything before the first await, so a caller can
   snapshot right before it replaces the state). `raw` overrides the serialized main state (boot: the untouched stored copy). */
let lastSig='';
function snapshotNow(reason='auto',raw=null){
  try{
    const live=typeof state!=='undefined'?state:null,D=globalThis.STACK_DATA;
    if(!plain(live)||!D?.hasData?.(live))return Promise.resolve(false);
    const main=raw||serial(live);
    if(!main)return Promise.resolve(false);
    const storage=D.storageOnly?.()||{};
    const pin=/^before-/.test(reason),sig=main+'\u0001'+serial(storage);
    if(!pin&&sig===lastSig)return Promise.resolve(false);
    lastSig=sig;
    const ts=Date.now();
    const rec={ts,build:BUILD,reason,main,storage};
    const meta={ts,reason,pin,stats:stats(live),bytes:main.length};
    return later(async()=>{
      await req('readwrite',s=>{s.put(rec,SNAP+pad(ts));return s.put(meta,META+pad(ts))});
      await prune();
      return true;
    }).catch(()=>false);
  }catch(e){return Promise.resolve(false)}
}
let timer=0;
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{timer=0;snapshotNow('auto')},SNAP_DELAY)}
function flush(){if(!timer)return;clearTimeout(timer);timer=0;snapshotNow('auto')}

/* newest first: [{id, ts, reason, pin, stats}] — new points plus the readable-only legacy lists */
async function list(){
  const out=[];
  try{(await req('readonly',s=>s.getAll(range(META))||[])||[]).forEach(m=>out.push({id:SNAP+pad(m.ts),ts:m.ts,reason:m.reason,pin:!!m.pin,stats:m.stats||null}))}catch(e){}
  for(const key of LEGACY_LISTS){
    try{const arr=await req('readonly',s=>s.get(key));(Array.isArray(arr)?arr:[]).forEach((e,i)=>{if(e?.payload&&e.ts)out.push({id:'legacy:'+key+':'+i,ts:e.ts,reason:'legacy',pin:false,stats:null})})}catch(e){}
  }
  return out.sort((a,b)=>b.ts-a.ts);
}
async function load(id){
  if(String(id).startsWith(SNAP))return req('readonly',s=>s.get(id));
  const m=/^legacy:(.+):(\d+)$/.exec(String(id));
  if(!m)return null;
  const arr=await req('readonly',s=>s.get(m[1])),e=Array.isArray(arr)?arr[+m[2]]:null;
  return e?{ts:e.ts,main:e.payload,storage:null}:null;
}
/* Adopt an older state as the live one without letting the revision (state._meta, v22.2) go backwards: the IndexedDB copy
   with a higher revision would otherwise win at the next start and undo the adoption. */
function adopt(parsed){
  const next=migrateStoredState(parsed),live=typeof state!=='undefined'&&state?._meta?.revision;
  next._meta={...(next._meta||{}),revision:Math.max(Number(live)||0,Number(next._meta?.revision)||0)};
  state=next;normalize();save();
}
/* Puts a restore point back as the live state. Goes through the normal save() path: a plain localStorage write followed
   by reload would be overwritten by the pagehide save of the old in-memory state. */
async function restore(id){
  const rec=await load(id);
  if(!rec?.main)throw new Error('Точка восстановления не найдена');
  let parsed;try{parsed=JSON.parse(rec.main)}catch(e){throw new Error('Точка восстановления повреждена')}
  if(!plain(parsed))throw new Error('Точка восстановления повреждена');
  await snapshotNow('before-restore');
  if(rec.storage)globalThis.STACK_DATA?.importStorage?.(rec.storage);
  adopt(parsed);
  try{await idbSaveState(state)}catch(e){}
  location.reload();
}
async function newestValidMain(){
  const items=await list();
  for(const it of items){
    try{const rec=await load(it.id),p=JSON.parse(rec?.main);if(plain(p))return rec.main}catch(e){}
  }
  return null;
}

function readMain(){
  try{
    if(typeof KEY==='undefined')return{status:'unavailable',raw:null,value:null};
    const raw=localStorage.getItem(KEY);
    if(raw==null)return{status:'missing',raw:null,value:null};
    try{return{status:'ok',raw,value:JSON.parse(raw)}}catch(e){return{status:'corrupt',raw,value:null}}
  }catch(e){return{status:'unavailable',raw:null,value:null}}
}
async function recoverCorruptMain(){
  if(readMain().status!=='corrupt')return false;
  try{if(sessionStorage.getItem(RECOVER_MARK)==='1')return false}catch(e){}
  const main=await newestValidMain();
  if(!main)return false;
  try{
    try{sessionStorage.setItem(RECOVER_MARK,'1')}catch(e){}
    adopt(JSON.parse(main));
    try{await idbSaveState(state)}catch(e){}
    console.warn('STACK recovered corrupt main state from a restore point',BUILD);
    location.reload();
    return true;
  }catch(e){return false}
}

/* The first save of a session asks the browser not to evict our storage under pressure (no prompt in installed PWAs). */
let askedPersistent=false;
function askPersistent(){
  if(askedPersistent)return;askedPersistent=true;
  try{navigator.storage?.persisted?.().then(p=>{if(!p)return navigator.storage.persist?.()}).catch(()=>{})}catch(e){}
}
function installSaveGuard(){
  try{
    if(typeof save!=='function'||save.__stackPersistenceGuard)return;
    const original=save;
    const wrapped=function(...args){
      if(typeof state!=='undefined'&&(!plain(state)||serial(state)===null)){
        console.error('STACK blocked invalid state write',BUILD);
        dispatch('stack:data-write-blocked',{source:BUILD});
        return false;
      }
      const ok=original.apply(this,args);
      if(ok===false)dispatch('stack:save-failed',{source:BUILD});
      else{schedule();askPersistent()}
      dispatch('stack:data-changed',{source:'persistence-save'});
      return ok;
    };
    wrapped.__stackPersistenceGuard=true;
    save=wrapped;
  }catch(e){}
}
/* Another window saved: take its state instead of overwriting it with ours on the next save (storage events never fire in the writing window). */
function installTabSync(){
  window.addEventListener('storage',e=>{
    if(e.storageArea!==localStorage||e.key!==KEY||!e.newValue)return;
    try{
      state=migrateStoredState(JSON.parse(e.newValue));normalize();renderAll();
      dispatch('stack:data-changed',{source:'tab-sync'});
    }catch(err){console.warn('STACK tab sync failed',err)}
  });
}
function installVersion(){
  let el=document.getElementById('stackVersion');
  if(!el){
    el=document.createElement('div');el.id='stackVersion';
    Object.assign(el.style,{textAlign:'center',font:'600 9px Arial, sans-serif',letterSpacing:'.08em',color:'#667084',opacity:'.72',padding:'12px 0 max(10px, env(safe-area-inset-bottom))',userSelect:'none',pointerEvents:'none'});
    document.body.appendChild(el);
  }
  el.textContent=VERSION;el.setAttribute('aria-label','Версия STACK '+VERSION);
}
async function bootSnapshot(raw){
  try{
    const metas=await req('readonly',s=>s.getAll(range(META)))||[];
    if(Date.now()-Math.max(0,...metas.map(m=>m.ts))>30*MIN)await snapshotNow('boot',raw);
  }catch(e){}
}
async function boot(){
  if(await recoverCorruptMain())return;
  const main=readMain();
  installSaveGuard();installTabSync();installVersion();
  window.addEventListener('pagehide',flush);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
  globalThis.STACK_RECOVERY=Object.freeze({build:BUILD,list,restore,snapshotNow,expired,restoreLatest:async()=>{const it=(await list())[0];if(!it)throw new Error('No valid recovery snapshot');return restore(it.id)}});
  if(globalThis.STACK_DATA?.hasData?.())globalThis.STACK_DATA.touchBackupMeta(false);
  bootSnapshot(main.status==='ok'?main.raw:null);
  console.info('STACK persistence guard',BUILD);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{boot().catch(()=>{})},{once:true});else boot().catch(()=>{});
})();
