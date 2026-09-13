/* STACK v27.3 — unified runtime bootstrap for shell identity and optional modules. */
(()=>{'use strict';
const BUILD='27.3.0';
function shell(){
  document.title='STACK — Персональная система управления';
  document.querySelector('meta[name="stack-build"]')?.setAttribute('content','v27.3.0');
  const brand=document.querySelector('.brand');if(brand)brand.textContent='STACK';
  const sub=document.querySelector('.sub');if(sub)sub.textContent='Персональная система управления · действия → данные → траектория';
  document.querySelectorAll('.variant').forEach(el=>el.style.display='none');
}
function load(id,src,ready){return new Promise(resolve=>{
  if(ready?.()){resolve();return}
  const old=document.getElementById(id);if(old){if(old.dataset.ready==='1')resolve();else old.addEventListener('load',resolve,{once:true});return}
  const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onload=()=>{s.dataset.ready='1';resolve()};s.onerror=()=>resolve();document.body.appendChild(s)
})}
async function boot(){
  shell();
  await load('stackV27CoreScript',`./stack-v27-core.js?build=${BUILD}`,()=>!!globalThis.STACK_CORE);
  await load('stackV271FitnessTabsScript',`./stack-v27-1-fitness-tabs.js?build=${BUILD}`,()=>!!document.getElementById('stackFitnessTabsFix'));
  await load('stackV273NutritionScript',`./stack-v27-3-nutrition.js?build=${BUILD}`,()=>!!document.getElementById('v273NutritionStyle'));
  shell();
  window.addEventListener('pageshow',shell);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)shell()});
  Object.defineProperty(globalThis,'STACK_BOOTSTRAP',{value:Object.freeze({build:BUILD,refresh:shell}),configurable:true});
  console.info('STACK bootstrap',BUILD)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{boot().catch(()=>{})},{once:true});else boot().catch(()=>{});
})();
