/* STACK v27.5.5 — reorder existing nutrition blocks only. No replacement cards. */
(()=>{'use strict';
const BUILD='27.5.5';
const active=()=>document.querySelector('[data-v234="nutrition"]')?.classList.contains('on');
function nodes(){const body=document.querySelector('#v234Fitness .v234-body');if(!body)return null;const goal=body.querySelector('[data-goal-card],.fx-goal');const plan=body.querySelector('#v274NutritionGoals');const ration=body.querySelector('#v2753Ration');const add=body.querySelector('#v2752NutritionMinimal');return{body,goal,plan,ration,add}}
function reorder(){if(innerWidth>720||!active())return;document.getElementById('v2754NutritionOrder')?.remove();const x=nodes();if(!x)return;x.body.classList.remove('v2754-active');x.body.classList.add('v2755-reordered');const ordered=[x.goal,x.plan,x.ration,x.add].filter(Boolean);const children=[...x.body.children],current=ordered.filter(el=>children.includes(el)).sort((a,b)=>children.indexOf(a)-children.indexOf(b));if(ordered.every((el,i)=>el===current[i]))return;let cursor=x.body.firstChild;for(const el of ordered){if(el===cursor){cursor=cursor?.nextSibling;continue}x.body.insertBefore(el,cursor)} }
function style(){if(document.getElementById('v2755NutritionReorderStyle'))return;const s=document.createElement('style');s.id='v2755NutritionReorderStyle';s.textContent=`@media(max-width:720px){
#v234Fitness .v234-body.v2755-reordered>#v274NutritionGoals,
#v234Fitness .v234-body.v2755-reordered>#v2753Ration,
#v234Fitness .v234-body.v2755-reordered>#v2752NutritionMinimal{display:block!important}
#v234Fitness .v234-body.v2755-reordered>#v2754NutritionOrder{display:none!important}
#v234Fitness .v234-body.v2755-reordered>#v2752NutritionMinimal{margin-top:9px!important;padding:0!important;border:0!important;background:none!important}
#v234Fitness .v234-body.v2755-reordered>#v2752NutritionMinimal>.v2752-kicker,
#v234Fitness .v234-body.v2755-reordered>#v2752NutritionMinimal>.v2752-kcal,
#v234Fitness .v234-body.v2755-reordered>#v2752NutritionMinimal>.v2752-status,
#v234Fitness .v234-body.v2755-reordered>#v2752NutritionMinimal>.v2752-bar,
#v234Fitness .v234-body.v2755-reordered>#v2752NutritionMinimal>.v2752-macros{display:none!important}
#v234Fitness .v234-body.v2755-reordered>#v2752NutritionMinimal>.v2752-add{display:block!important}
#v234Fitness .v234-body.v2755-reordered>#v2752NutritionMinimal>.v2752-history{display:block!important}
}`;document.head.appendChild(s)}
function refresh(){setTimeout(()=>{globalThis.STACK_NUTRITION_GOALS?.refresh?.();globalThis.STACK_RATION?.refresh?.();globalThis.STACK_NUTRITION_MINIMAL?.refresh?.();setTimeout(reorder,20)},0)}
function boot(){style();document.addEventListener('click',e=>{if(e.target.closest('[data-v234="nutrition"]'))setTimeout(refresh,0)});window.addEventListener('stack:data-changed',()=>setTimeout(reorder,30));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(refresh,0)});setTimeout(refresh,40);Object.defineProperty(globalThis,'STACK_NUTRITION_REORDER',{value:Object.freeze({build:BUILD,refresh}),configurable:true});console.info('STACK nutrition reorder',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
