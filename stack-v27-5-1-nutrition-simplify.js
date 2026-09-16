/* STACK v27.5.7 — simplify Nutrition hierarchy without removing features or data.
   v27.5.7: apply() ran on every mutation of .v234-body (its own MutationObserver)
   and unconditionally rewrote .fx-eye/h2 textContent to the same string every
   time — setting textContent, even to an identical value, still replaces the
   text node, which re-triggered the same observer: an infinite render loop
   (thousands of calls/sec) the entire time the Nutrition tab was open. That
   was the real "screen jumps" cause, not just a one-time flash on open. Fixed
   by only writing when the text actually needs to change. */
(()=>{'use strict';
const BUILD='27.5.8-nutrition-panel-unification';
let applying=false,observer=null;
function active(){return innerWidth<=720&&document.querySelector('[data-v234="nutrition"]')?.classList.contains('on')}
function button(label,open){const b=document.createElement('button');b.type='button';b.className='v2751-toggle';b.innerHTML=`<span>${label}</span><b>${open?'Скрыть':'Открыть'}</b>`;return b}
function makeCollapsible(node,label,key,bodySelector){if(!node||node.dataset.v2751Ready==='1')return;node.dataset.v2751Ready='1';const saved=sessionStorage.getItem(key)==='1';node.classList.add('v2751-collapsible');node.classList.toggle('open',saved);const toggle=button(label,saved);node.prepend(toggle);const set=open=>{node.classList.toggle('open',open);toggle.querySelector('b').textContent=open?'Скрыть':'Открыть';try{sessionStorage.setItem(key,open?'1':'0')}catch(_){}};toggle.onclick=()=>set(!node.classList.contains('open'));if(bodySelector)node.querySelectorAll(bodySelector).forEach(x=>x.classList.add('v2751-fold'))}
function apply(){if(applying||!active())return;applying=true;try{
 const body=document.querySelector('#v234Fitness #v234Nutrition');if(!body)return;
 // Legacy totals duplicate v27.4 plan/fact.
 body.querySelector('.fx-nutrow')?.classList.add('v2751-hide');
 const plan=body.querySelector('#v274NutritionGoals');
 const form=body.querySelector('[data-nutrition]');
 const formCard=form?.closest('section.fx-card');
 if(formCard){formCard.classList.add('v2751-add-card');const eye=formCard.querySelector('.fx-eye');if(eye&&eye.textContent!=='ДОБАВИТЬ ЕДУ')eye.textContent='ДОБАВИТЬ ЕДУ';const h=formCard.querySelector('h2');if(h&&h.textContent!=='Новая запись')h.textContent='Новая запись';if(plan&&formCard.previousElementSibling!==plan)plan.after(formCard)}
 // Today's detailed entries become secondary and collapsed by default.
 const today=document.getElementById('v273Nutrition');
 if(today){today.querySelector('.v273-head')?.classList.add('v2751-hide');makeCollapsible(today,'Сегодняшние записи','stack_v2751_today_open','.v273-list')}
 // Quick foods stay available but out of the primary flow.
 const quick=document.getElementById('v275QuickFoods');
 if(quick){makeCollapsible(quick,'Быстрый ввод · шаблоны и недавние','stack_v2751_quick_open','.v275-head,.v275-label,.v275-list,.v275-empty');if(formCard&&quick.previousElementSibling!==formCard)formCard.after(quick)}
 // Original all-time history remains available, collapsed.
 const history=[...body.querySelectorAll('section.fx-card.fx-pad')].find(s=>s!==formCard&&s.querySelector('.fx-eye')?.textContent.trim()==='ИСТОРИЯ');
 if(history){makeCollapsible(history,'Вся история питания','stack_v2751_history_open','.fx-eye,.fx-entry,.fx-empty');if(quick&&history.previousElementSibling!==quick)quick.after(history)}
 // Keep primary order: plan -> add -> quick -> today -> all history.
 if(history&&today&&today.previousElementSibling!==history)history.after(today);
 }finally{applying=false}}
function style(){if(document.getElementById('v2751NutritionSimplifyStyle'))return;const s=document.createElement('style');s.id='v2751NutritionSimplifyStyle';s.textContent=`@media(max-width:720px){#v234Fitness .v2751-hide{display:none!important}#v234Fitness .v2751-add-card{margin:0 0 10px!important;border-color:#24516b!important}#v234Fitness .v2751-add-card h2{font-size:18px;margin:5px 0 10px}#v234Fitness .v2751-add-card .fx-form{gap:7px}#v234Fitness .v2751-collapsible{padding:0!important;margin:0 0 8px!important;border:1px solid #1c3951!important;border-radius:13px!important;background:#040c16!important;overflow:hidden!important}#v234Fitness .v2751-toggle{display:flex;width:100%;min-height:46px;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;border:0;background:#06111e;color:#dbe7f3;text-align:left;font-size:9px;font-weight:900}#v234Fitness .v2751-toggle b{color:#0eb1db;font-size:8px}#v234Fitness .v2751-collapsible:not(.open) .v2751-fold{display:none!important}#v234Fitness .v2751-collapsible.open .v2751-fold{display:block}#v234Fitness #v275QuickFoods.v2751-collapsible .v275-head,#v234Fitness #v275QuickFoods.v2751-collapsible .v275-label,#v234Fitness #v275QuickFoods.v2751-collapsible .v275-list,#v234Fitness #v275QuickFoods.v2751-collapsible .v275-empty{margin-left:10px;margin-right:10px}#v234Fitness #v275QuickFoods.v2751-collapsible .v275-head{margin-top:10px}#v234Fitness #v275QuickFoods.v2751-collapsible .v275-list:last-child,#v234Fitness #v273Nutrition.v2751-collapsible .v273-list{margin-bottom:10px}#v234Fitness #v273Nutrition.v2751-collapsible .v273-list{margin-left:10px;margin-right:10px}#v234Fitness section.v2751-collapsible.fx-card .fx-entry,#v234Fitness section.v2751-collapsible.fx-card .fx-empty,#v234Fitness section.v2751-collapsible.fx-card>.fx-eye{margin-left:10px;margin-right:10px}#v234Fitness section.v2751-collapsible.fx-card>.fx-eye{margin-top:10px}#v234Fitness section.v2751-collapsible.fx-card>:last-child{margin-bottom:10px}.v274-metrics{gap:5px!important}.v274-metric{padding:8px!important}.v274-insight{margin-top:7px!important}}`;document.head.appendChild(s)}
function boot(){style();const root=document.querySelector('#v234Fitness #v234Nutrition');if(root){observer=new MutationObserver(()=>setTimeout(apply,0));observer.observe(root,{childList:true,subtree:true})}document.addEventListener('click',e=>{if(e.target.closest('[data-v234="nutrition"]'))setTimeout(apply,20)});window.addEventListener('stack:data-changed',()=>setTimeout(apply,20));window.addEventListener('resize',()=>setTimeout(apply,30));setTimeout(apply,40);Object.defineProperty(globalThis,'STACK_NUTRITION_SIMPLIFY',{value:Object.freeze({build:BUILD,refresh:apply}),configurable:true});console.info('STACK nutrition simplify',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
