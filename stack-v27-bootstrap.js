/* STACK v28.5 — unified runtime bootstrap. Minimal shell loads first. */
(()=>{'use strict';
const BUILD='28.5.0';
function releaseFail(){document.documentElement.classList.remove('stack-minimal-loading');document.documentElement.classList.add('stack-minimal-ready')}
function preflight(){document.documentElement.classList.add('stack-minimal-loading');if(!document.getElementById('stackMinimalPreflight')){const s=document.createElement('style');s.id='stackMinimalPreflight';s.textContent='@media(max-width:720px){html.stack-minimal-loading #screenToday>*{visibility:hidden!important}}';document.head.appendChild(s)}}
function shell(){document.title='STACK — Персональная система управления';document.querySelector('meta[name="stack-build"]')?.setAttribute('content','v28.5');const brand=document.querySelector('.brand');if(brand)brand.textContent='STACK';const sub=document.querySelector('.sub');if(sub)sub.textContent='Действия → данные → траектория';document.querySelectorAll('.variant').forEach(el=>el.style.display='none')}
function load(id,src,ready){return new Promise(resolve=>{if(ready?.()){resolve();return}const old=document.getElementById(id);if(old){if(old.dataset.ready==='1')resolve();else old.addEventListener('load',resolve,{once:true});return}const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onload=()=>{s.dataset.ready='1';resolve()};s.onerror=()=>resolve();document.body.appendChild(s)})}
async function boot(){shell();
  await load('stackV28MinimalScript',`./stack-v28-minimal.js?build=${BUILD}`,()=>!!globalThis.STACK_MINIMAL);
  await load('stackV27CoreScript',`./stack-v27-core.js?build=${BUILD}`,()=>!!globalThis.STACK_CORE);
  await load('stackV271FitnessTabsScript',`./stack-v27-1-fitness-tabs.js?build=${BUILD}`,()=>!!document.getElementById('stackFitnessTabsFix'));
  await load('stackV273NutritionScript',`./stack-v27-3-nutrition.js?build=${BUILD}`,()=>!!document.getElementById('v273NutritionStyle'));
  await load('stackV2731NutritionOverflowScript',`./stack-v27-3-1-nutrition-overflow.js?build=${BUILD}`,()=>!!document.getElementById('v2731NutritionOverflow'));
  await load('stackV274NutritionGoalsScript',`./stack-v27-4-nutrition-goals.js?build=${BUILD}`,()=>!!globalThis.STACK_NUTRITION_GOALS);
  await load('stackV275QuickFoodsScript',`./stack-v27-5-quick-foods.js?build=${BUILD}`,()=>!!globalThis.STACK_QUICK_FOODS);
  await load('stackV2751NutritionSimplifyScript',`./stack-v27-5-1-nutrition-simplify.js?build=${BUILD}`,()=>!!globalThis.STACK_NUTRITION_SIMPLIFY);
  await load('stackV2752NutritionMinimalScript',`./stack-v27-5-2-nutrition-minimal.js?build=${BUILD}`,()=>!!globalThis.STACK_NUTRITION_MINIMAL);
  await load('stackV2753RationScript',`./stack-v27-5-3-ration.js?build=${BUILD}`,()=>!!globalThis.STACK_RATION);
  await load('stackV2755NutritionReorderScript',`./stack-v27-5-5-nutrition-reorder.js?build=${BUILD}`,()=>!!globalThis.STACK_NUTRITION_REORDER);
  await load('stackV281SectionsScript',`./stack-v28-1-sections.js?build=${BUILD}`,()=>!!globalThis.STACK_SECTIONS);
  globalThis.STACK_MINIMAL?.refresh?.();globalThis.STACK_SECTIONS?.refresh?.();shell();document.documentElement.classList.remove('stack-minimal-loading');
  window.addEventListener('pageshow',()=>{shell();globalThis.STACK_MINIMAL?.refresh?.()});document.addEventListener('visibilitychange',()=>{if(!document.hidden){shell();globalThis.STACK_MINIMAL?.refresh?.()}});Object.defineProperty(globalThis,'STACK_BOOTSTRAP',{value:Object.freeze({build:BUILD,refresh:shell}),configurable:true});console.info('STACK bootstrap',BUILD)}
preflight();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{boot().catch(releaseFail)},{once:true});else boot().catch(releaseFail);
})();