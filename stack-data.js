/* STACK Data Core v2 — unified read model, compatibility-first, no destructive migrations.
   v29.66: single implementations of logic that used to be copied between modules —
   workout day status (stack_fitness_workout_<date>: '1' | 'skip' | '0') and the STACK КБЖУ formula. */
(()=>{'use strict';
const KEYS=Object.freeze({main:'stack_neon_mix9_calendar_v1',income:'stack_income_tracker_v1',fx:'stack_fx_cbr_v1',fxHistory:'stack_fx_history_v1',taskDetails:'stack_task_details_v227',fitnessGoal:'stack_fitness_goal_v2318',fitnessProfile:'stack_fitness_profile_v2320',fitnessBody:'stack_fitness_log_v2310',fitnessNutrition:'stack_fitness_nutrition_v2310',focus:'stack_v27_focus_v1'});
function read(key,fallback={}){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(e){return fallback}}
function main(){const v=read(KEYS.main,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function income(){return read(KEYS.income,{})}function savings(){return main()?.savings||{}}function goals(){const a=savings()?.goals;return Array.isArray(a)?a:[]}
function currency(v){let c=String(v||'RUB').toUpperCase();if(c==='₽')c='RUB';if(c==='$')c='USD';if(c==='€')c='EUR';return ['RUB','USD','EUR'].includes(c)?c:'RUB'}
function goalCurrency(g){return currency(g?.currency)}function transactions(g){return Array.isArray(g?.tx)?g.tx:(Array.isArray(g?.transactions)?g.transactions:[])}
function fxCache(){return read(KEYS.fx,{})}function rate(c){c=currency(c);if(c==='RUB')return 1;const f=fxCache();return Number(globalThis.FX?.[c])||Number(f?.[c])||Number(f?.rates?.[c])||0}
function balance(g){return (Number(g?.start??g?.current)||0)+transactions(g).reduce((s,t)=>s+(Number(t?.amount)||0),0)}
function monthTransactions(g,k){return transactions(g).filter(t=>String(t?.date||'').slice(0,7)===k)}
function savedNative(c,k){c=currency(c);let n=0;for(const g of goals()){if(goalCurrency(g)!==c)continue;for(const t of monthTransactions(g,k))n+=Number(t?.amount)||0}return n}
function savedRubEquivalent(k){let n=0;for(const g of goals()){const r=rate(goalCurrency(g));if(!r)continue;for(const t of monthTransactions(g,k))n+=(Number(t?.amount)||0)*r}return n}
function fitness(){return{goal:read(KEYS.fitnessGoal,{}),profile:read(KEYS.fitnessProfile,{}),body:read(KEYS.fitnessBody,[]),nutrition:read(KEYS.fitnessNutrition,[])}}
function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function workoutStatus(d=new Date()){try{const v=localStorage.getItem('stack_fitness_workout_'+dateKey(d));return v==='1'?'done':v==='skip'?'skip':''}catch(e){return''}}
/* Every workout status write goes here: it also mirrors the mark onto the «Тренировка» process (v29.55). */
function setWorkoutStatus(d,v){try{localStorage.setItem('stack_fitness_workout_'+dateKey(d),v==='done'?'1':v==='skip'?'skip':'0')}catch(e){}try{globalThis.STACK_V29_SHELL?.syncWorkout?.(d,v)}catch(e){}}
/* STACK daily targets: Mifflin–St Jeor × activity ± goal delta; protein by body weight; fat ≥ 25% kcal (v29.61); carbs = rest. */
function nutritionTargets({goal={},profile={},weight}={}){const n=v=>Number(v)||0,w=n(weight)||n(goal.start),target=n(goal.target),h=n(profile.height),age=n(profile.age),sex=profile.sex;if(!h||!age||!['male','female'].includes(sex)||!w)return null;const dir=target>w?'gain':target&&target<w?'loss':'maintain',bmr=10*w+6.25*h-5*age+(sex==='male'?5:-161),activity=n(profile.days)===4?1.55:1.45,delta=dir==='gain'?250:dir==='loss'?-400:0,floor=sex==='male'?1500:1300,kcal=Math.round(Math.max(floor,bmr*activity+delta)/50)*50,protein=Math.round(w*(dir==='loss'?2:1.8)),fat=Math.round(Math.max(w*.9,kcal*.25/9)),carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));return{kcal,protein,fat,carbs}}
function tasks(){const m=main();return{journal:Array.isArray(m?.journal)?m.journal:[],details:read(KEYS.taskDetails,{})}}
function snapshot(){return{schema:2,main:main(),income:income(),savings:savings(),fx:fxCache(),fxHistory:read(KEYS.fxHistory,{}),fitness:fitness(),tasks:tasks(),focus:read(KEYS.focus,{})}}
function exportBundle(){return{schema:2,build:String(globalThis.STACK_CORE?.build||'27.0.0'),createdAt:new Date().toISOString(),...snapshot()}}
const api=Object.freeze({version:2,schema:2,keys:KEYS,read,main,income,savings,goals,currency,goalCurrency,transactions,fxCache,rate,balance,monthTransactions,savedNative,savedRubEquivalent,fitness,tasks,snapshot,exportBundle,dateKey,workoutStatus,setWorkoutStatus,nutritionTargets});
Object.defineProperty(globalThis,'STACK_DATA',{value:api,writable:false,configurable:true});
window.dispatchEvent(new CustomEvent('stack:data-ready',{detail:{version:2,schema:2}}));
console.info('STACK Data Core v2 ready');
})();