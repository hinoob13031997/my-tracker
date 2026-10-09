/* STACK backup button + save toast.
   v29.81: the rolling IndexedDB list that used to live here (10 snapshots, rewritten on every save) is replaced by the
   time-based restore points in stack-persistence.js. What stays: the «Резервная копия» button (same file as «Экспорт»)
   and the «Сохранено» toast — which now appears only when save() really wrote the main key. */
(()=>{
'use strict';

const BUILD='v29.81-backup-honest-toast';

function toast(text,bad=false,ms=1500){
  let el=document.getElementById('stackBackupToast');
  if(!el){
    el=document.createElement('div');el.id='stackBackupToast';
    Object.assign(el.style,{position:'fixed',right:'10px',top:'max(10px, env(safe-area-inset-top))',zIndex:'10000',padding:'8px 11px',borderRadius:'10px',background:'#06101eef',border:'1px solid #24503d',color:'#73e6aa',font:'700 10px Arial, sans-serif',boxShadow:'0 0 14px #18e48233',opacity:'0',transform:'translateY(-6px)',transition:'.2s ease',pointerEvents:'none'});
    document.body.appendChild(el);
  }
  el.textContent=text;el.style.color=bad?'#ff8099':'#73e6aa';el.style.borderColor=bad?'#6a2437':'#24503d';el.style.opacity='1';el.style.transform='none';
  clearTimeout(toast._t);toast._t=setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(-6px)'},ms);
}
function downloadBackup(){
  try{
    const exportBtn=document.getElementById('exportBtn');
    if(!exportBtn)throw new Error('export unavailable');
    exportBtn.click();
    toast('✓ Резервная копия создана');
  }catch(e){toast('Не удалось создать копию',true,3000)}
}
function installButton(){if(document.getElementById('stackBackupBtn'))return;const actions=document.querySelector('.actions');if(!actions)return;const btn=document.createElement('button');btn.className='btn';btn.id='stackBackupBtn';btn.type='button';btn.textContent='Резервная копия';btn.setAttribute('aria-label','Создать резервную копию данных STACK');btn.addEventListener('click',downloadBackup);actions.insertBefore(btn,actions.firstChild)}
function wrapSave(){
  try{
    if(typeof save!=='function'||save.__stackBackupWrapped)return;
    const original=save;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      /* nobody sees a toast on a hidden page (lifecycle saves) */
      if(document.visibilityState==='visible'){
        if(result===false)toast('Не сохранено: память устройства заполнена. Скачайте копию',true,5000);
        else toast('✓ Сохранено');
      }
      return result;
    };
    wrapped.__stackBackupWrapped=true;save=wrapped;
  }catch(e){}
}
function boot(){installButton();wrapSave();console.info('STACK backup module',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
