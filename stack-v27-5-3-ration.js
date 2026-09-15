/* STACK v27.5.3 — lightweight four-variant ration under Nutrition Minimal. */
(()=>{'use strict';
const BUILD='27.5.3',MARKS='stack_fitness_nutrition_plan_v2311',VARIANT='stack_fitness_nutrition_variant_v241',NUT='stack_fitness_nutrition_v2310';
const VARIANTS=[
 {name:'Вариант 1',meals:[['Завтрак','Овсянка · яйца · фрукт'],['Обед','Рис · курица · овощи'],['Перекус','Творог · банан · орехи'],['Ужин','Паста · говядина · овощи']]},
 {name:'Вариант 2',meals:[['Завтрак','Яйца · тосты · йогурт'],['Обед','Гречка · индейка · овощи'],['Перекус','Кефир · банан · арахисовая паста'],['Ужин','Картофель · рыба · салат']]},
 {name:'Вариант 3',meals:[['Завтрак','Овсянка · йогурт · ягоды'],['Обед','Рис · говядина · овощи'],['Перекус','Творог · мёд · орехи'],['Ужин','Гречка · курица · овощи']]},
 {name:'Вариант 4',meals:[['Завтрак','Омлет · сыр · хлеб · фрукт'],['Обед','Паста · индейка · овощи'],['Перекус','Йогурт · гранола · банан'],['Ужин','Рис · лосось · овощи']]}
];
const RATIOS=[.24,.31,.16,.29];
const FOOD_DB={
 'овсянка':{kcal:370,protein:13,fat:7,carbs:62},'яйца':{kcal:155,protein:13,fat:11,carbs:1.1},
 'фрукт':{kcal:52,protein:.3,fat:.2,carbs:14},'рис':{kcal:130,protein:2.7,fat:.3,carbs:28},
 'курица':{kcal:165,protein:31,fat:3.6,carbs:0},'овощи':{kcal:35,protein:2,fat:.3,carbs:7},
 'творог':{kcal:121,protein:18,fat:5,carbs:3},'банан':{kcal:89,protein:1.1,fat:.3,carbs:23},
 'орехи':{kcal:607,protein:20,fat:54,carbs:20},'паста':{kcal:158,protein:6,fat:1,carbs:31},
 'говядина':{kcal:250,protein:26,fat:15,carbs:0},'тосты':{kcal:265,protein:9,fat:3,carbs:49},
 'йогурт':{kcal:61,protein:3.5,fat:3.3,carbs:4.7},'гречка':{kcal:92,protein:3.4,fat:.6,carbs:20},
 'индейка':{kcal:135,protein:30,fat:1,carbs:0},'кефир':{kcal:41,protein:3.4,fat:1,carbs:4.1},
 'арахисовая паста':{kcal:588,protein:25,fat:50,carbs:20},'картофель':{kcal:87,protein:2,fat:.1,carbs:20},
 'рыба':{kcal:105,protein:22,fat:1.5,carbs:0},'салат':{kcal:15,protein:1.4,fat:.2,carbs:2.9},
 'ягоды':{kcal:50,protein:.8,fat:.4,carbs:12},'мёд':{kcal:304,protein:.3,fat:0,carbs:82},
 'омлет':{kcal:154,protein:11,fat:11,carbs:2},'сыр':{kcal:350,protein:25,fat:27,carbs:1.3},
 'хлеб':{kcal:265,protein:9,fat:3,carbs:49},'гранола':{kcal:471,protein:10,fat:20,carbs:64},
 'лосось':{kcal:208,protein:20,fat:13,carbs:0}
};
const FOOD_WEIGHT={
 овсянка:.35,яйца:.4,фрукт:.1,рис:.35,курица:.45,овощи:.1,творог:.35,банан:.15,орехи:.15,
 паста:.35,говядина:.45,тосты:.3,йогурт:.25,гречка:.35,индейка:.45,кефир:.2,
 'арахисовая паста':.15,картофель:.35,рыба:.45,салат:.08,ягоды:.12,мёд:.1,
 омлет:.45,сыр:.2,хлеб:.25,гранола:.3,лосось:.45
};
function foodItems(desc,alloc){
 if(!alloc||!alloc.kcal)return null;
 const names=String(desc||'').split('·').map(x=>x.trim()).filter(Boolean);
 const rows=names.map(name=>({name,db:FOOD_DB[name.toLowerCase()]}));
 const totalW=rows.reduce((s,r)=>s+(r.db?(FOOD_WEIGHT[r.name.toLowerCase()]||.2):0),0);
 if(!totalW)return null;
 return rows.map(r=>{
  if(!r.db)return{name:r.name,grams:null};
  const w=(FOOD_WEIGHT[r.name.toLowerCase()]||.2)/totalW,kcalShare=alloc.kcal*w;
  const grams=Math.max(5,Math.round((kcalShare/r.db.kcal*100)/5)*5),f=grams/100;
  return{name:r.name,grams,kcal:Math.round(r.db.kcal*f),protein:Math.round(r.db.protein*f*10)/10,fat:Math.round(r.db.fat*f*10)/10,carbs:Math.round(r.db.carbs*f*10)/10};
 });
}
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??f}catch(_){return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
const dateKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const active=()=>document.querySelector('[data-v234="nutrition"]')?.classList.contains('on');
const variant=()=>Math.max(0,Math.min(3,Number(localStorage.getItem(VARIANT))||0));
const targets=()=>{try{return globalThis.STACK_NUTRITION_GOALS?.targets?.()||null}catch(_){return null}};
function manual(){const a=read(NUT,[]),d=dateKey();return (Array.isArray(a)?a:[]).filter(x=>x.date===d).reduce((s,x)=>({kcal:s.kcal+(+x.kcal||0),protein:s.protein+(+x.protein||0),fat:s.fat+(+x.fat||0),carbs:s.carbs+(+x.carbs||0),count:s.count+1}),{kcal:0,protein:0,fat:0,carbs:0,count:0})}
function markKey(v,i){return `${dateKey()}-${v}-${i}`}
function isDone(v,i){return !!read(MARKS,{})[markKey(v,i)]}
function toggle(v,i){const m=read(MARKS,{}),k=markKey(v,i);if(m[k])delete m[k];else m[k]=1;if(write(MARKS,m)){window.dispatchEvent(new CustomEvent('stack:data-changed',{detail:{source:'ration-v27.5.3'}}));render()}}
function allocation(i){const t=targets(),r=RATIOS[i]||0;return t?{kcal:Math.round((+t.kcal||0)*r),protein:Math.round((+t.protein||0)*r),fat:Math.round((+t.fat||0)*r),carbs:Math.round((+t.carbs||0)*r)}:null}
function rationFact(v=variant()){return VARIANTS[v].meals.reduce((s,_m,i)=>{if(!isDone(v,i))return s;const a=allocation(i);if(!a)return s;return{kcal:s.kcal+a.kcal,protein:s.protein+a.protein,fat:s.fat+a.fat,carbs:s.carbs+a.carbs,count:s.count+1}}, {kcal:0,protein:0,fat:0,carbs:0,count:0})}
function syncSummary(){const card=document.getElementById('v2752NutritionMinimal');if(!card)return;const m=manual(),r=rationFact(),t=targets(),f={kcal:m.kcal+r.kcal,protein:m.protein+r.protein,fat:m.fat+r.fat,carbs:m.carbs+r.carbs},plan=+t?.kcal||0,left=plan?Math.max(0,Math.round(plan-f.kcal)):0,over=plan&&f.kcal>plan?Math.round(f.kcal-plan):0,pct=plan?Math.min(100,Math.round(f.kcal/plan*100)):0;const kcal=card.querySelector('.v2752-kcal b');if(kcal)kcal.textContent=Math.round(f.kcal);const status=card.querySelector('.v2752-status');if(status&&plan){status.textContent=over?`Выше ориентира на ${over} ккал`:`Осталось ${left} ккал`;status.classList.toggle('over',!!over)}const bar=card.querySelector('.v2752-bar i');if(bar)bar.style.width=pct+'%';const macros=card.querySelector('.v2752-macros');if(macros)macros.textContent=t?`Б ${Math.round(f.protein)}/${Math.round(+t.protein||0)} · Ж ${Math.round(f.fat)}/${Math.round(+t.fat||0)} · У ${Math.round(f.carbs)}/${Math.round(+t.carbs||0)}`:`Б ${Math.round(f.protein)} · Ж ${Math.round(f.fat)} · У ${Math.round(f.carbs)}`}
function render(){if(innerWidth>720||!active())return;const body=document.querySelector('#v234Fitness .v234-body'),anchor=document.getElementById('v2752NutritionMinimal');if(!body||!anchor)return;const v=variant(),plan=VARIANTS[v],done=plan.meals.filter((_x,i)=>isDone(v,i)).length,html=`<div class="v2753-top"><div><div class="v2753-kicker">РАЦИОН · СЕГОДНЯ</div><h3>Предложенное питание</h3></div><span>${done}/${plan.meals.length}</span></div><div class="v2753-tabs">${VARIANTS.map((x,i)=>`<button class="${i===v?'on':''}" data-v2753-variant="${i}">${i+1}</button>`).join('')}</div><div class="v2753-list">${plan.meals.map((m,i)=>{const ok=isDone(v,i),a=allocation(i),items=foodItems(m[1],a);return `<article class="${ok?'done':''}"><div class="v2753-meal"><b>${m[0]}</b><p>${m[1]}</p>${a?`<small>≈ ${a.kcal} ккал</small>`:''}${items?`<ul class="v2753-items">${items.map(it=>it.grams?`<li><div class="v2753-item-row"><b>${it.name}</b><span>${it.grams} г</span></div><small>${it.kcal} ккал · Б${it.protein} Ж${it.fat} У${it.carbs}</small></li>`:`<li><div class="v2753-item-row"><b>${it.name}</b></div></li>`).join('')}</ul>`:''}</div><button data-v2753-mark="${i}">${ok?'✓ ПОЕЛ':'○ НЕ ЕЛ'}</button></article>`}).join('')}</div><div class="v2753-note">Порции подстрой под свой дневной ориентир. Это шаблон рациона, а не медицинское назначение.</div>`;let s=document.getElementById('v2753Ration'),created=false;if(!s){s=document.createElement('section');s.id='v2753Ration';s.className='v2753-card';anchor.after(s);created=true}if(created||s.innerHTML!==html){s.innerHTML=html;s.querySelectorAll('[data-v2753-variant]').forEach(b=>b.onclick=()=>{localStorage.setItem(VARIANT,String(+b.dataset.v2753Variant));render();globalThis.STACK_NUTRITION_REORDER?.refresh?.()});s.querySelectorAll('[data-v2753-mark]').forEach(b=>b.onclick=()=>toggle(v,+b.dataset.v2753Mark))}syncSummary()}
function style(){if(document.getElementById('v2753RationStyle'))return;const s=document.createElement('style');s.id='v2753RationStyle';s.textContent=`@media(max-width:720px){.v2753-card{width:100%;max-width:100%;box-sizing:border-box;margin-top:9px;padding:14px;border:1px solid #1f4058;border-radius:17px;background:#050d18}.v2753-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v2753-kicker{color:#8290a6;font-size:8px;font-weight:900;letter-spacing:.09em}.v2753-top h3{margin:4px 0 0;font-size:16px}.v2753-top>span{color:#8ea0b5;font-size:9px}.v2753-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:11px 0}.v2753-tabs button{min-height:38px;border:1px solid #29455e;border-radius:9px;background:#071321;color:#8796a9;font-size:10px;font-weight:900}.v2753-tabs button.on{border-color:#9133e4;background:#21123b;color:#fff}.v2753-list{display:grid;gap:5px}.v2753-list article{display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:8px;align-items:center;padding:10px;border:1px solid #173149;border-radius:11px;background:#07111d}.v2753-list article.done{border-color:#285a3d;background:#071a12}.v2753-meal{min-width:0}.v2753-meal b{display:block;font-size:10px}.v2753-meal p{margin:3px 0;color:#8b9aae;font-size:8px;line-height:1.35}.v2753-meal small{color:#70849b;font-size:7px}.v2753-items{margin:6px 0 0;display:grid;gap:4px;list-style:none;padding:0}.v2753-items li{padding-top:4px;border-top:1px dashed #14263c}.v2753-items li:first-child{padding-top:0;border-top:0}.v2753-item-row{display:flex;justify-content:space-between;gap:6px;min-width:0}.v2753-item-row b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;color:#c7d3e3;font-size:8px;font-weight:700}.v2753-item-row span{flex-shrink:0;color:#8ea0b5;font-size:8px}.v2753-items li>small{display:block;margin-top:1px;color:#70849b;font-size:7px}.v2753-list article>button{min-height:40px;border:1px solid #29455e;border-radius:9px;background:#06111e;color:#91a0b4;font-size:7px;font-weight:900}.v2753-list article.done>button{border-color:#68d43f;color:#8ee276}.v2753-note{margin-top:9px;color:#73869b;font-size:7px;line-height:1.45}}`;document.head.appendChild(s)}
function boot(){style();document.addEventListener('click',e=>{if(e.target.closest('[data-v234="nutrition"]'))setTimeout(render,0)});window.addEventListener('stack:data-changed',()=>setTimeout(render,0));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(render,0)});setTimeout(render,0);Object.defineProperty(globalThis,'STACK_RATION',{value:Object.freeze({build:BUILD,refresh:render,snapshot:()=>({variant:variant(),fact:rationFact(),marks:read(MARKS,{})})}),configurable:true});console.info('STACK ration',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
