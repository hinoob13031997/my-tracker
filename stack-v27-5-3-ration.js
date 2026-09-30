/* STACK v27.5.3 — lightweight four-variant ration under Nutrition Minimal.
   v27.5.3.3 — each product's grams and КБЖУ are written inline in the existing meal card
   (no separate per-product rows). Without a daily target the portions are the base template
   for BASE_KCAL and the card says so.
   v27.5.3.4 — an eaten meal («Поел») counts into plan/fact with exactly the КБЖУ shown on the card,
   across all four variants. A manual entry with replaces='<variant>-<meal>' stands in for that
   planned meal, so the same breakfast is never counted twice.
   v27.5.3.5 — portions are solved for the whole day against all four targets (kcal, P, F, C) with
   realistic per-food limits and the meal kcal split as a soft goal. Before, grams only split each
   meal's calories in fixed shares, so a full day gave ~100% kcal but ~200% protein / ~150% fat /
   ~60% carbs.
   v27.5.3.6 — calories are the priority (they drive the weight trend); protein weighs less, since
   a protein surplus is harmless while a calorie gap slows the planned gain. */
(()=>{'use strict';
const BUILD='27.5.3.6-kcal-first',MARKS='stack_fitness_nutrition_plan_v2311',VARIANT='stack_fitness_nutrition_variant_v241',NUT='stack_fitness_nutrition_v2310';
const VARIANTS=[
 {name:'Вариант 1',meals:[['Завтрак','Овсянка · яйца · фрукт'],['Обед','Рис · курица · овощи'],['Перекус','Творог · банан · орехи'],['Ужин','Паста · говядина · овощи']]},
 {name:'Вариант 2',meals:[['Завтрак','Яйца · тосты · йогурт'],['Обед','Гречка · индейка · овощи'],['Перекус','Кефир · банан · арахисовая паста'],['Ужин','Картофель · рыба · салат']]},
 {name:'Вариант 3',meals:[['Завтрак','Овсянка · йогурт · ягоды'],['Обед','Рис · говядина · овощи'],['Перекус','Творог · мёд · орехи'],['Ужин','Гречка · курица · овощи']]},
 {name:'Вариант 4',meals:[['Завтрак','Омлет · сыр · хлеб · фрукт'],['Обед','Паста · индейка · овощи'],['Перекус','Йогурт · гранола · банан'],['Ужин','Рис · лосось · овощи']]}
];
const RATIOS=[.24,.31,.16,.29],BASE_KCAL=2000,EGG_G=55;
const FOOD_DB={
 'овсянка':{kcal:370,protein:13,fat:7,carbs:62},'яйца':{kcal:155,protein:13,fat:11,carbs:1.1},
 'фрукт':{kcal:52,protein:.3,fat:.2,carbs:14},'рис':{kcal:344,protein:6.7,fat:.7,carbs:78.9},
 'курица':{kcal:165,protein:31,fat:3.6,carbs:0},'овощи':{kcal:35,protein:2,fat:.3,carbs:7},
 'творог':{kcal:121,protein:18,fat:5,carbs:3},'банан':{kcal:89,protein:1.1,fat:.3,carbs:23},
 'орехи':{kcal:607,protein:20,fat:54,carbs:20},'паста':{kcal:350,protein:11,fat:1.3,carbs:71},
 'говядина':{kcal:250,protein:26,fat:15,carbs:0},'тосты':{kcal:265,protein:9,fat:3,carbs:49},
 'йогурт':{kcal:61,protein:3.5,fat:3.3,carbs:4.7},'гречка':{kcal:313,protein:12.6,fat:3.3,carbs:62},
 'индейка':{kcal:135,protein:30,fat:1,carbs:0},'кефир':{kcal:41,protein:3.4,fat:1,carbs:4.1},
 'арахисовая паста':{kcal:588,protein:25,fat:50,carbs:20},'картофель':{kcal:77,protein:2,fat:.4,carbs:16.3},
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
const FOOD_LIMITS={'овсянка':[40,150],'яйца':[55,220],'фрукт':[80,300],'рис':[40,200],'курица':[70,250],'овощи':[100,350],'творог':[80,300],'банан':[80,250],'орехи':[5,30],'паста':[40,200],'говядина':[70,220],'тосты':[25,150],'йогурт':[100,350],'гречка':[40,200],'индейка':[70,250],'кефир':[150,500],'арахисовая паста':[10,30],'картофель':[150,600],'рыба':[70,250],'салат':[60,250],'ягоды':[60,250],'мёд':[5,35],'омлет':[100,250],'сыр':[10,40],'хлеб':[25,150],'гранола':[20,80],'лосось':[70,220]};
const MACROS=['kcal','protein','fat','carbs'];
function dayTargets(){const t=targets();if(t&&+t.kcal>0)return{kcal:+t.kcal,protein:+t.protein||0,fat:+t.fat||0,carbs:+t.carbs||0,base:false};return{kcal:BASE_KCAL,protein:Math.round(BASE_KCAL*.2/4),fat:Math.round(BASE_KCAL*.3/9),carbs:Math.round(BASE_KCAL*.5/4),base:true}}
/* Bounded least squares by coordinate descent: day kcal/P/F/C (relative error), each meal's kcal
   share (soft), and a light pull toward the template proportions so dishes stay plausible. */
function solveDay(v,T){
 const foods=[];VARIANTS[v].meals.forEach((m,i)=>{const names=String(m[1]).split('·').map(x=>x.trim()).filter(Boolean),known=names.filter(n=>FOOD_DB[n.toLowerCase()]),tw=known.reduce((s,n)=>s+(FOOD_WEIGHT[n.toLowerCase()]||.2),0);names.forEach(n=>{const k=n.toLowerCase(),db=FOOD_DB[k];if(!db){foods.push({meal:i,name:n,db:null});return}const [lo,hi]=FOOD_LIMITS[k]||[20,400],g0=Math.min(hi,Math.max(lo,T.kcal*(RATIOS[i]||0)*(FOOD_WEIGHT[k]||.2)/tw/db.kcal*100));foods.push({meal:i,name:n,k,db,lo,hi,g0,g:g0})})});
 const x=foods.filter(f=>f.db),terms=[],day=(key,w)=>{if(T[key]>0)terms.push({c:x.map(f=>f.db[key]/100),t:T[key],w:w/(T[key]*T[key])})};
 day('kcal',30);day('protein',.3);day('fat',1);day('carbs',1);
 RATIOS.forEach((r,i)=>{const t=T.kcal*r;if(t>0)terms.push({c:x.map(f=>f.meal===i?f.db.kcal/100:0),t,w:.25/(t*t)})});
 x.forEach((f,j)=>terms.push({c:x.map((_,q)=>q===j?1:0),t:f.g0,w:.01/(f.g0*f.g0)}));
 for(let it=0;it<300;it++)x.forEach((f,j)=>{let num=0,den=0;for(const tm of terms){const cj=tm.c[j];if(!cj)continue;let s=0;for(let q=0;q<x.length;q++)s+=tm.c[q]*x[q].g;num+=tm.w*cj*(s-tm.t);den+=tm.w*cj*cj}if(den)f.g=Math.min(f.hi,Math.max(f.lo,f.g-num/den))});
 return VARIANTS[v].meals.map((_m,i)=>foods.filter(f=>f.meal===i).map(f=>{if(!f.db)return{name:f.name,grams:null};const egg=f.k==='яйца',grams=egg?Math.max(1,Math.round(f.g/EGG_G))*EGG_G:Math.max(5,Math.round(f.g/5)*5),q=grams/100;return{name:f.name,grams,pcs:egg?grams/EGG_G:0,kcal:Math.round(f.db.kcal*q),protein:Math.round(f.db.protein*q*10)/10,fat:Math.round(f.db.fat*q*10)/10,carbs:Math.round(f.db.carbs*q*10)/10}}));
}
const planCache=new Map();
function dayPlan(v){const T=dayTargets(),key=v+'|'+MACROS.map(k=>T[k]).join('|');if(!planCache.has(key)){if(planCache.size>16)planCache.clear();planCache.set(key,solveDay(v,T))}return planCache.get(key)}
function daySummary(v){const T=dayTargets(),tot=VARIANTS[v].meals.reduce((s,_m,i)=>{const k=mealKbju(v,i)||{};MACROS.forEach(x=>s[x]+=k[x]||0);return s},{kcal:0,protein:0,fat:0,carbs:0}),p=k=>T[k]?Math.round(tot[k]/T[k]*100):0;return `<div class="v2753-day">За день: ${Math.round(tot.kcal)} ккал · Б ${Math.round(tot.protein)} · Ж ${Math.round(tot.fat)} · У ${Math.round(tot.carbs)}<small>от ${T.base?'базовой ':''}цели: ккал ${p('kcal')}% · Б ${p('protein')}% · Ж ${p('fat')}% · У ${p('carbs')}%</small></div>`}
function mealItems(v,i){return dayPlan(v)[i]||null}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);
const FOOD_STATE={'овсянка':'сух.','рис':'сух.','паста':'сух.','гречка':'сух.','картофель':'сыр.','курица':'готов.','говядина':'готов.'};
function productText(it,k){const name=k?it.name.toLowerCase():cap(it.name);if(!it.grams)return esc(name);const st=FOOD_STATE[it.name.toLowerCase()];return esc(`${name} ${it.pcs?`${it.pcs} шт.`:`${it.grams} ${it.name.toLowerCase()==='кефир'?'мл':'г'}`}${st?' '+st:''}`)}
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
function mealKbju(v,i){const items=mealItems(v,i);return items&&items.length?items.reduce((t,x)=>({kcal:t.kcal+(x.kcal||0),protein:t.protein+(x.protein||0),fat:t.fat+(x.fat||0),carbs:t.carbs+(x.carbs||0)}),{kcal:0,protein:0,fat:0,carbs:0}):null}
function replaced(){const a=read(NUT,[]),d=dateKey();return new Set((Array.isArray(a)?a:[]).filter(x=>x&&x.date===d&&x.replaces).map(x=>String(x.replaces)))}
function eaten(){const r=replaced(),out=[];VARIANTS.forEach((pl,v)=>pl.meals.forEach((m,i)=>{if(!isDone(v,i)||r.has(`${v}-${i}`))return;const k=mealKbju(v,i);if(k)out.push({key:`${v}-${i}`,variant:v+1,meal:m[0],kcal:Math.round(k.kcal),protein:Math.round(k.protein*10)/10,fat:Math.round(k.fat*10)/10,carbs:Math.round(k.carbs*10)/10})}));return out}
function rationFact(){return eaten().reduce((s,x)=>({kcal:s.kcal+x.kcal,protein:s.protein+x.protein,fat:s.fat+x.fat,carbs:s.carbs+x.carbs,count:s.count+1}),{kcal:0,protein:0,fat:0,carbs:0,count:0})}
function meals(){const v=variant(),r=replaced();return VARIANTS[v].meals.map((m,i)=>({key:`${v}-${i}`,name:m[0],done:isDone(v,i),replaced:r.has(`${v}-${i}`),kbju:mealKbju(v,i)}))}
function syncSummary(){const card=document.getElementById('v2752NutritionMinimal');if(!card)return;const m=manual(),r=rationFact(),t=targets(),f={kcal:m.kcal+r.kcal,protein:m.protein+r.protein,fat:m.fat+r.fat,carbs:m.carbs+r.carbs},plan=+t?.kcal||0,left=plan?Math.max(0,Math.round(plan-f.kcal)):0,over=plan&&f.kcal>plan?Math.round(f.kcal-plan):0,pct=plan?Math.min(100,Math.round(f.kcal/plan*100)):0;const kcal=card.querySelector('.v2752-kcal b');if(kcal)kcal.textContent=Math.round(f.kcal);const status=card.querySelector('.v2752-status');if(status&&plan){status.textContent=over?`Выше ориентира на ${over} ккал`:`Осталось ${left} ккал`;status.classList.toggle('over',!!over)}const bar=card.querySelector('.v2752-bar i');if(bar)bar.style.width=pct+'%';const macros=card.querySelector('.v2752-macros');if(macros)macros.textContent=t?`Б ${Math.round(f.protein)}/${Math.round(+t.protein||0)} · Ж ${Math.round(f.fat)}/${Math.round(+t.fat||0)} · У ${Math.round(f.carbs)}/${Math.round(+t.carbs||0)}`:`Б ${Math.round(f.protein)} · Ж ${Math.round(f.fat)} · У ${Math.round(f.carbs)}`}
function render(){if(innerWidth>720||!active())return;const body=document.querySelector('#v234Fitness #v234Nutrition'),anchor=document.getElementById('v2752NutritionMinimal');if(!body||!anchor)return;const v=variant(),plan=VARIANTS[v],repl=replaced(),done=plan.meals.filter((_x,i)=>isDone(v,i)||repl.has(`${v}-${i}`)).length,html=`<div class="v2753-top"><div><div class="v2753-kicker">РАЦИОН · СЕГОДНЯ</div><h3>Предложенное питание</h3>${daySummary(v)}</div><span>${done}/${plan.meals.length}</span></div><div class="v2753-tabs">${VARIANTS.map((x,i)=>`<button class="${i===v?'on':''}" data-v2753-variant="${i}">${i+1}</button>`).join('')}</div><div class="v2753-list">${plan.meals.map((m,i)=>{const rep=repl.has(`${v}-${i}`),ok=isDone(v,i)||rep,items=mealItems(v,i),sum=mealKbju(v,i);return `<article class="${ok?'done':''}"><div class="v2753-meal"><b>${m[0]}</b><p>${items?items.map((x,k)=>productText(x,k)).join(', '):m[1]}</p>${sum?`<small class="v2753-kbju">${Math.round(sum.kcal)} ккал · Б ${Math.round(sum.protein)} · Ж ${Math.round(sum.fat)} · У ${Math.round(sum.carbs)}</small>`:''}</div>${rep?`<button data-v2753-own>✎ СВОЁ</button>`:`<button data-v2753-mark="${i}">${ok?'✓ ПОЕЛ':'○ НЕ ЕЛ'}</button>`}</article>`}).join('')}</div><div class="v2753-note">${targets()?'Граммы подобраны под твои калории, белки, жиры и углеводы на день.':`Базовые порции на ${BASE_KCAL} ккал — задай цель на день, и граммы подстроятся.`} Вес круп и макарон — в сухом виде, мяса — в готовом. «Поел» сразу идёт в план/факт. Ел другое — «Добавить еду» → «Вместо приёма». Это шаблон рациона, а не медицинское назначение.</div>`;let s=document.getElementById('v2753Ration'),created=false;if(!s){s=document.createElement('section');s.id='v2753Ration';s.className='v2753-card';anchor.after(s);created=true}if(created||s.innerHTML!==html){s.innerHTML=html;s.querySelectorAll('[data-v2753-variant]').forEach(b=>b.onclick=()=>{localStorage.setItem(VARIANT,String(+b.dataset.v2753Variant));render();globalThis.STACK_NUTRITION_REORDER?.refresh?.()});s.querySelectorAll('[data-v2753-mark]').forEach(b=>b.onclick=()=>toggle(v,+b.dataset.v2753Mark));s.querySelectorAll('[data-v2753-own]').forEach(b=>b.onclick=()=>globalThis.STACK_NUTRITION_MINIMAL?.openHistory?.())}syncSummary()}
function style(){if(document.getElementById('v2753RationStyle'))return;const s=document.createElement('style');s.id='v2753RationStyle';s.textContent=`@media(max-width:720px){.v2753-card{width:100%;max-width:100%;box-sizing:border-box;margin-top:9px;padding:14px;border:1px solid #1f4058;border-radius:17px;background:#050d18}.v2753-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v2753-kicker{color:#8290a6;font-size:8px;font-weight:900;letter-spacing:.09em}.v2753-top h3{margin:4px 0 0;font-size:16px}.v2753-day{margin-top:5px;color:#b8c6d8;font-size:9px;line-height:1.45}.v2753-day small{display:block;color:#70849b;font-size:8px}.v2753-top>span{color:#8ea0b5;font-size:9px}.v2753-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:11px 0}.v2753-tabs button{min-height:38px;border:1px solid #29455e;border-radius:9px;background:#071321;color:#8796a9;font-size:10px;font-weight:900}.v2753-tabs button.on{border-color:#9133e4;background:#21123b;color:#fff}.v2753-list{display:grid;gap:5px}.v2753-list article{display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:8px;align-items:center;padding:10px;border:1px solid #173149;border-radius:11px;background:#07111d}.v2753-list article.done{border-color:#285a3d;background:#071a12}.v2753-meal{min-width:0}.v2753-meal b{display:block;font-size:10px}.v2753-meal p{margin:4px 0;color:#8b9aae;font-size:9px;line-height:1.55;overflow-wrap:anywhere}.v2753-meal small{color:#70849b;font-size:7px}.v2753-meal p{color:#dce6f4!important}.v2753-meal .v2753-kbju{display:block;color:#8ea0b5;font-size:8px}.v2753-list article>button{min-height:40px;border:1px solid #29455e;border-radius:9px;background:#06111e;color:#91a0b4;font-size:7px;font-weight:900}.v2753-list article.done>button{border-color:#68d43f;color:#8ee276}.v2753-note{margin-top:9px;color:#73869b;font-size:7px;line-height:1.45}}`;document.head.appendChild(s)}
function boot(){style();document.addEventListener('click',e=>{if(e.target.closest('[data-v234="nutrition"]'))queueMicrotask(render)});const kit=globalThis.STACK_OWNER_KIT;if(kit)kit.onRenderTriggers(render,{events:['stack:data-changed','visibilitychange']});else{window.addEventListener('stack:data-changed',()=>setTimeout(render,0));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(render,0)});}setTimeout(render,0);Object.defineProperty(globalThis,'STACK_RATION',{value:Object.freeze({build:BUILD,refresh:render,snapshot:()=>({variant:variant(),fact:rationFact(),marks:read(MARKS,{})}),eaten,meals}),configurable:true});console.info('STACK ration',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
