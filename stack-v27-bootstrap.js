/* STACK v29.0 — legacy domain bootstrap under the new shell. */
(()=>{'use strict';
const BUILD='29.0.0';
const V29=()=>!!globalThis.__STACK_V29__;
function releaseFail(){document.documentElement.classList.remove('stack-minimal-loading');document.documentElement.classList.add('stack-minimal-ready')}
function preflight(){if(V29())return;document.documentElement.classList.add('stack-minimal-loading');if(!document.getElementById('stackMinimalPreflight')){const s=document.createElement('style');s.id='stackMinimalPreflight';s.textContent='@media(max-width:720px){html.stack-minimal-loading #screenToday>*{visibility:hidden!important}}';document.head.appendChild(s)}}
function shell(){document.title='STACK — Персональная система управления';document.querySelector('meta[name="stack-build"]')?.setAttribute('content','v29.0');const brand=document.querySelector('.brand');if(brand)brand.textContent='STACK';const sub=document.querySelector('.sub');if(sub)sub.textContent='Действия → данные → траектория';document.querySelectorAll('.variant').forEach(el=>el.style.display='none')}
function load(id,src,ready){return new Promise(resolve=>{if(ready?.()){resolve();return}const old=document.getElementById(id);if(old){if(old.dataset.ready==='1')resolve();else old.addEventListener('load',resolve,{once:true});return}const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onload=()=>{s.dataset.ready='1';resolve()};s.onerror=()=>resolve();document.body.appendChild(s)})}
async function boot(){shell();
  await load('stackV27CoreScript',`./stack-v27-core.js?build=${BUILD}`,()=>!!globalThis.STACK_CORE);
  await load('stackV271FitnessTabsScript',`./stack-v27-1-fitness-tabs.js?build=${BUILD}`,()=>!!document.getElementById('stackFitnessTabsFix'));
  await load('stackNutritionScript',`./stack-nutrition.js?build=${BUILD}`,()=>!!globalThis.STACK_NUTRITION);
  shell();document.documentElement.classList.remove('stack-minimal-loading');
  window.addEventListener('pageshow',shell);document.addEventListener('visibilitychange',()=>{if(!document.hidden)shell()});Object.defineProperty(globalThis,'STACK_BOOTSTRAP',{value:Object.freeze({build:BUILD,refresh:shell}),configurable:true});console.info('STACK bootstrap',BUILD)}
preflight();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{boot().catch(releaseFail)},{once:true});else boot().catch(releaseFail);
})();