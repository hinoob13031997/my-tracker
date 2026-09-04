/* STACK v21 SAFE BACKUP
   Adds local backup history without changing the existing storage key or state format. */
(()=>{
'use strict';

const BUILD='v21-safe-backup-2026-09-04';
const BACKUP_KEY='stack_backups_v21';
const MAX_BACKUPS=10;

function toast(text,bad=false){
  let el=document.getElementById('stackBackupToast');
  if(!el){
    el=document.createElement('div');
    el.id='stackBackupToast';
    Object.assign(el.style,{
      position:'fixed',right:'10px',top:'max(10px, env(safe-area-inset-top))',
      zIndex:'10000',padding:'8px 11px',borderRadius:'10px',
      background:'#06101eef',border:'1px solid #24503d',
      color:'#73e6aa',font:'700 10px Arial, sans-serif',
      boxShadow:'0 0 14px #18e48233',opacity:'0',
      transform:'translateY(-6px)',transition:'.2s ease',
      pointerEvents:'none'
    });
    document.body.appendChild(el);
  }
  el.textContent=text;
  el.style.color=bad?'#ff8099':'#73e6aa';
  el.style.borderColor=bad?'#6a2437':'#24503d';
  el.style.opacity='1';
  el.style.transform='none';
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>{
    el.style.opacity='0';
    el.style.transform='translateY(-6px)';
  },1500);
}

async function loadBackups(){
  try{
    if(typeof idbOpen!=='function') return [];
    const db=await idbOpen();
    const value=await new Promise((resolve,reject)=>{
      const tx=db.transaction(IDB_STORE,'readonly');
      const req=tx.objectStore(IDB_STORE).get(BACKUP_KEY);
      req.onsuccess=()=>resolve(Array.isArray(req.result)?req.result:[]);
      req.onerror=()=>reject(req.error);
    });
    db.close();
    return value;
  }catch(e){ return []; }
}

async function saveBackup(snapshot){
  try{
    if(!snapshot || typeof snapshot!=='object' || typeof idbOpen!=='function') return;
    const list=await loadBackups();
    const payload=JSON.stringify(snapshot);
    const latest=list[list.length-1];
    if(latest && latest.payload===payload) return;

    list.push({ts:Date.now(),build:BUILD,payload});
    while(list.length>MAX_BACKUPS) list.shift();

    const db=await idbOpen();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(IDB_STORE,'readwrite');
      tx.objectStore(IDB_STORE).put(list,BACKUP_KEY);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }catch(e){}
}

async function backupPrevious(){
  try{
    if(typeof KEY==='undefined') return;
    const raw=localStorage.getItem(KEY);
    if(!raw) return;
    const oldState=JSON.parse(raw);
    await saveBackup(oldState);
  }catch(e){}
}

function downloadBackup(){
  try{
    if(typeof state==='undefined') throw new Error('state unavailable');
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    a.href=URL.createObjectURL(blob);
    a.download=`STACK_backup_${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    saveBackup(state);
    toast('✓ Резервная копия создана');
  }catch(e){
    toast('Не удалось создать копию',true);
  }
}

function installButton(){
  if(document.getElementById('stackBackupBtn')) return;
  const actions=document.querySelector('.actions');
  if(!actions) return;
  const btn=document.createElement('button');
  btn.className='btn';
  btn.id='stackBackupBtn';
  btn.type='button';
  btn.textContent='Резервная копия';
  btn.setAttribute('aria-label','Создать резервную копию данных STACK');
  btn.addEventListener('click',downloadBackup);
  actions.insertBefore(btn,actions.firstChild);
}

function wrapSave(){
  try{
    if(typeof save!=='function' || save.__stackBackupWrapped) return;
    const original=save;
    const wrapped=function(...args){
      backupPrevious();
      const result=original.apply(this,args);
      try{
        if(typeof state!=='undefined') saveBackup(state);
        toast('✓ Сохранено');
      }catch(e){}
      return result;
    };
    wrapped.__stackBackupWrapped=true;
    save=wrapped;
  }catch(e){}
}

function persistBackup(){
  try{
    if(typeof state!=='undefined') saveBackup(state);
  }catch(e){}
}

function boot(){
  installButton();
  wrapSave();
  persistBackup();
  window.addEventListener('pagehide',persistBackup);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden') persistBackup();
  });
  console.info('STACK backup module',BUILD);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

})();