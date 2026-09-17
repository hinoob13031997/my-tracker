/* STACK v27.3.1 — hard mobile overflow guard for Fitness → Nutrition. */
(()=>{'use strict';
const BUILD='27.3.1.1-nutrition-panel-unification';
function style(){if(document.getElementById('v2731NutritionOverflow'))return;const s=document.createElement('style');s.id='v2731NutritionOverflow';s.textContent=`@media(max-width:720px){
html,body{max-width:100%;overflow-x:hidden}
#v234Fitness,#v234Fitness .v234-body,#v234Fitness #v234Nutrition,#v234Fitness [data-v234-panel="nutrition"],#v234Fitness [data-nutrition],#v234Fitness .v273-wrap{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;overflow-x:hidden!important}
#v234Fitness [data-v234-panel="nutrition"] *,#v234Fitness [data-nutrition] *,.v273-wrap *{box-sizing:border-box;min-width:0}
#v234Fitness [data-nutrition] input,#v234Fitness [data-nutrition] select,#v234Fitness [data-nutrition] textarea,#v234Fitness [data-nutrition] button,.v273-sheet input,.v273-sheet select,.v273-sheet textarea,.v273-sheet button{max-width:100%;min-width:0;box-sizing:border-box}
#v234Fitness [data-nutrition] input,#v234Fitness [data-nutrition] select,#v234Fitness [data-nutrition] textarea{width:100%}
#v234Fitness [data-nutrition] .grid,#v234Fitness [data-nutrition] [class*="grid"],.v273-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%;max-width:100%}
#v234Fitness [data-nutrition] form,#v234Fitness [data-nutrition] section,#v234Fitness [data-nutrition] article{max-width:100%;min-width:0}
.v273-head,.v273-item{grid-template-columns:minmax(0,1fr) auto!important;max-width:100%}
.v273-head button{max-width:145px;white-space:normal}
}
@media(max-width:380px){#v234Fitness [data-nutrition] .grid,#v234Fitness [data-nutrition] [class*="grid"],.v273-grid{grid-template-columns:minmax(0,1fr)!important}.v273-head{grid-template-columns:minmax(0,1fr)!important}.v273-head button{width:100%;max-width:none}}
`;document.head.appendChild(s)}
function clamp(){if(innerWidth>720)return;const root=document.querySelector('#v234Fitness');if(!root)return;root.style.maxWidth='100%';root.style.minWidth='0';root.style.overflowX='hidden';document.querySelectorAll('#v234Fitness input,#v234Fitness select,#v234Fitness textarea').forEach(el=>{el.style.maxWidth='100%';el.style.minWidth='0';el.style.boxSizing='border-box'})}
function boot(){style();clamp();window.addEventListener('resize',clamp,{passive:true});document.addEventListener('click',e=>{if(e.target.closest('[data-v234="nutrition"]'))queueMicrotask(clamp)});window.addEventListener('stack:data-changed',()=>setTimeout(clamp,0));console.info('STACK nutrition overflow fix',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
