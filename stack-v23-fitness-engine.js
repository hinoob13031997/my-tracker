/* STACK v23.22 — goal-aware training, exercise library and smart rotation. */
(()=>{'use strict';
const BUILD='v23.22-goal-intelligence';
const START=new Date(2026,7,10),DAY=86400000;
const GOAL_KEY='stack_fitness_goal_v2318';
const PROFILE_KEY='stack_fitness_profile_v2320';
const SETS_KEY='stack_fitness_sets_v2320';
const SWAPS_KEY='stack_fitness_exercise_swaps_v2321';
const BODY_KEY='stack_fitness_log_v2310';

const EX={
 squat:{name:'Присед до комфортной глубины',base:'3 × 8–10',range:[8,10]},
 bench:{name:'Жим лёжа',base:'3 × 8–12',range:[8,12]},
 pulldown:{name:'Тяга верхнего блока',base:'3 × 10–12',range:[10,12]},
 core:{name:'Упражнение на корпус',base:'3 подхода',range:[10,15]},
 rdl:{name:'Румынская тяга',base:'3 × 8–10',range:[8,10]},
 dbbench:{name:'Жим гантелей лёжа',base:'3 × 8–12',range:[8,12]},
 row:{name:'Тяга горизонтального блока',base:'3 × 10–12',range:[10,12]},
 dbpress:{name:'Жим гантелей сидя',base:'2–3 × 8–12',range:[8,12]},
 goblet:{name:'Гоблет-присед',base:'3 × 10–12',range:[10,12]},
 legpress:{name:'Жим ногами',base:'3 × 10–12',range:[10,12]},
 split:{name:'Болгарский сплит-присед',base:'3 × 8–10',range:[8,10]},
 hipthrust:{name:'Ягодичный мост со штангой',base:'3 × 8–12',range:[8,12]},
 legcurl:{name:'Сгибание ног лёжа',base:'3 × 10–15',range:[10,15]},
 backext:{name:'Гиперэкстензия',base:'3 × 10–15',range:[10,15]},
 incline:{name:'Наклонный жим гантелей',base:'3 × 8–12',range:[8,12]},
 cablefly:{name:'Сведение рук в кроссовере',base:'3 × 10–15',range:[10,15]},
 lateral:{name:'Подъём гантелей в стороны',base:'3 × 12–15',range:[12,15]},
 assisted:{name:'Подтягивания с поддержкой',base:'3 × 8–12',range:[8,12]},
 onerow:{name:'Тяга гантели одной рукой',base:'3 × 8–12',range:[8,12]},
 facepull:{name:'Тяга каната к лицу',base:'3 × 12–15',range:[12,15]},
 deadbug:{name:'Мёртвый жук',base:'3 × 8–12',range:[8,12]},
 sideplank:{name:'Боковая планка',base:'3 × 20–40 сек',range:[20,40],unit:'сек'},
 calf:{name:'Подъём на носки с гантелями',base:'3 × 12–15',range:[12,15]}
};

const PHASES=[
 {name:'Адаптация',from:1,to:8,days:3,focus:'Техника и устойчивый ритм',next:'Рост объёма'},
 {name:'Рост объёма',from:9,to:20,days:4,focus:'Больше качественной работы',next:'Сила + масса'},
 {name:'Сила + масса',from:21,to:36,days:4,focus:'Тяжёлые и объёмные дни',next:'Закрепление'},
 {name:'Закрепление',from:37,to:52,days:3,focus:'Стабильный результат и слабые места',next:'Новый годовой цикл'}
];

const TEMPLATES={
 A:{name:'Тренировка A',ids:['squat','bench','pulldown','core']},
 B:{name:'Тренировка B',ids:['rdl','dbbench','row','dbpress']},
 UA:{name:'Верх тела · основная',ids:['bench','assisted','dbpress','onerow']},
 LA:{name:'Низ тела · основная',ids:['squat','hipthrust','legcurl','calf']},
 UB:{name:'Верх тела · объёмная',ids:['incline','row','lateral','facepull']},
 LB:{name:'Низ тела · объёмная',ids:['rdl','legpress','split','sideplank']},
 SA:{name:'Сила · тренировка A',ids:['squat','bench','row','core']},
 SB:{name:'Сила · тренировка B',ids:['rdl','dbbench','pulldown','dbpress']}
};

const ROTATION={
 pulldown:['pulldown','assisted','pulldown'],core:['core','deadbug','sideplank'],
 dbbench:['dbbench','incline','cablefly'],row:['row','onerow','row'],dbpress:['dbpress','lateral','dbpress'],
 assisted:['assisted','pulldown','assisted'],onerow:['onerow','row','onerow'],
 hipthrust:['hipthrust','backext','hipthrust'],legcurl:['legcurl','split','legcurl'],
 incline:['incline','dbbench','cablefly'],lateral:['lateral','dbpress','lateral'],facepull:['facepull','pulldown','facepull'],
 legpress:['legpress','goblet','legpress'],split:['split','legcurl','split'],sideplank:['sideplank','deadbug','core']
};

const css=`@media(max-width:720px){
.fx-engine-card{margin:9px 0;padding:14px;border:1px solid #205271;border-radius:17px;background:radial-gradient(circle at 90% 0,#0eb1db24,transparent 44%),linear-gradient(155deg,#071522,#030914 72%);box-shadow:0 0 18px #0877f319}
.fx-engine-head{display:flex;justify-content:space-between;gap:9px;align-items:flex-start}.fx-engine-head h2{font-size:19px;margin:5px 0}.fx-engine-week{font-size:9px;font-weight:900;color:#0ed2e7}.fx-engine-note{font-size:9px;line-height:1.45;color:#8998ad}.fx-engine-chips{display:flex;gap:5px;flex-wrap:wrap;margin:9px 0}.fx-engine-chips span{padding:5px 8px;border:1px solid #294b64;border-radius:999px;color:#aab8ca;font-size:8px}.fx-engine-chips .hot{border-color:#9133e4;color:#dfc4ff;box-shadow:0 0 10px #9133e433}
.fx-engine-ex{display:grid;grid-template-columns:23px minmax(78px,1fr) 44px 44px 44px;gap:5px;align-items:center;padding:10px 0;border-top:1px solid #10283d}.fx-engine-ex b{display:block;font-size:10px}.fx-engine-ex small{display:block;margin-top:3px;color:#8291a6;font-size:9px}.fx-engine-num{width:21px;height:21px;display:grid;place-items:center;border:1px solid #15516b;border-radius:7px;background:#082437;color:#0ed2e7;font-size:8px;font-weight:900}.fx-engine-icon{width:44px;min-height:44px;border:1px solid #31516b;border-radius:10px;background:#07131f;color:#0ed2e7;font-weight:900}.fx-engine-swap{color:#d6b7ff;border-color:#7134ad}.fx-engine-log{color:#fff;border-color:#9133e4;background:#1a0c2b}
.fx-engine-status{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:11px}.fx-engine-status button{min-height:44px;border:1px solid #29455e;border-radius:10px;background:#06111e;color:#8e9caf;font-size:8px;font-weight:900}.fx-engine-status .done.on{border-color:#68d43f;color:#68d43f}.fx-engine-status .skip.on{border-color:#f04b6c;color:#f06b85}.fx-engine-status .clear.on{border-color:#0eb1db;color:#0ed2e7}
.fx-cycle-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0}.fx-cycle-stat{padding:10px;border:1px solid #183b55;border-radius:11px;background:#050e19}.fx-cycle-stat b{display:block;margin:3px 0;font-size:15px}.fx-cycle-stat small{color:#8090a5;font-size:8px}.fx-phase-list{display:grid;gap:7px;margin-top:10px}.fx-phase-item{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px;border:1px solid #183950;border-radius:12px;background:#050e19}.fx-phase-item.on{border-color:#9133e4;box-shadow:0 0 12px #9133e42d}.fx-phase-item b{font-size:11px}.fx-phase-item p{margin:4px 0 0;color:#8190a5;font-size:8px}.fx-phase-item span{color:#0ed2e7;font-size:8px;font-weight:900}
.fx-analytics{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:9px 0}.fx-analytic{padding:11px;border:1px solid #1a405b;border-radius:13px;background:#050e19}.fx-analytic b{display:block;margin:4px 0;font-size:17px}.fx-analytic small{color:#8190a5;font-size:8px}.fx-ex-history{padding:9px 0;border-top:1px solid #10283d}.fx-ex-history b{font-size:10px}.fx-ex-history p{margin:4px 0 0;color:#8b9aaf;font-size:9px;line-height:1.4}.fx-positive{color:#68d43f}.fx-neutral{color:#0ed2e7}
.fx-effort{display:grid;grid-template-columns:1fr 1fr;gap:6px}.fx-effort label{min-height:44px;display:grid;place-items:center;padding:4px;border:1px solid #29455e;border-radius:10px;background:#06111e;color:#9cabbe;text-align:center;font-size:9px}.fx-effort input{position:absolute;opacity:0}.fx-effort label:has(input:checked){border-color:#9133e4;background:#21123b;color:#fff}.fx-help{margin-top:8px;padding:9px;border-left:2px solid #0eb1db;background:#071522;color:#94a3b7;font-size:9px;line-height:1.45}
.fx-profile-fields{margin:10px 0;padding-top:8px;border-top:1px solid #183950}.fx-profile-fields h4{margin:4px 0 8px;font-size:12px;color:#d9e5f4}.fx-profile-fields .fx-form-grid{margin-bottom:7px}
}`;

function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch(e){return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function key(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fromKey(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)}
function weekNo(d){return Math.max(1,Math.min(52,Math.floor((new Date(d.getFullYear(),d.getMonth(),d.getDate())-START)/DAY/7)+1))}
function phaseFor(w){return PHASES.find(p=>w>=p.from&&w<=p.to)||PHASES[3]}
function goal(){return read(GOAL_KEY,{start:56,target:70,training:'stack',nutrition:'stack'})}
function goalDirection(){const g=goal(),start=Number(g.start)||0,target=Number(g.target)||0;return target>start?'gain':target<start?'loss':'maintain'}
function phaseText(p){const d=goalDirection();if(d==='loss'){if(p.name==='Рост объёма')return{name:'Рабочий объём',focus:'Сохраняем мышцы и технику'};if(p.name==='Сила + масса')return{name:'Сила + сохранение мышц',focus:'Удерживаем рабочие веса'}}if(d==='maintain'){if(p.name==='Рост объёма')return{name:'Баланс объёма',focus:'Поддерживаем форму без перегруза'};if(p.name==='Сила + масса')return{name:'Сила + форма',focus:'Сохраняем силу и мышечный тонус'}}return{name:p.name,focus:p.focus}}
function selectedDate(){const s=document.querySelector('#v234Fitness [data-day].on')?.dataset.day;return s?fromKey(s):new Date()}
function workoutStatus(d){try{const v=localStorage.getItem('stack_fitness_workout_'+key(d));return v==='1'?'done':v==='skip'?'skip':''}catch(e){return''}}
function setWorkoutStatus(d,v){try{localStorage.setItem('stack_fitness_workout_'+key(d),v==='done'?'1':v==='skip'?'skip':'0')}catch(e){}}
function deload(w){return w>1&&w%4===0}

function workoutFor(d){
 const w=weekNo(d),day=d.getDay(),p=phaseFor(w),light=deload(w),odd=w%2===1;
 let code=null;
 if(p.days===3){
   if(day===1)code=odd?'A':'B';
   if(day===3)code=odd?'B':'A';
   if(day===5)code=odd?'A':'B';
   if(w>=21&&w<=36&&code)code=code==='A'?'SA':'SB';
 }else{
   const schedule={1:'UA',2:'LA',4:'UB',5:'LB'};code=schedule[day]||null;
 }
 if(!code)return null;
 const t=TEMPLATES[code],rotation=Math.floor((w-1)/4)%3,block=Math.floor((w-1)/4)+1,baseIds=t.ids.slice(),manual=read(SWAPS_KEY,{});
 let ids=baseIds.map(id=>ROTATION[id]?.[rotation]||id);
 ids=ids.map((id,i)=>manual[block+'|'+baseIds[i]]||id);
 return {...t,ids,baseIds,light,week:w,phase:p,cycle:block};
}

function prescription(id,wo){
 const e=EX[id],p=wo.phase.name;
 const d=goalDirection();
 if(wo.light)return id==='sideplank'?'2 × 20 сек':id==='core'?'2 лёгких подхода':'2 × 8 · лёгкий вес';
 if(p==='Адаптация')return e.base;
 if(p==='Рост объёма')return id==='sideplank'?'3 × 20–40 сек':id==='core'?'3 подхода':`${d==='gain'?4:3} × ${e.range[0]}–${e.range[1]}`;
 if(p==='Сила + масса')return ['squat','bench','rdl'].includes(id)?`${d==='gain'?4:3} × 5–7`:'3 × 8–12';
 return id==='sideplank'?'3 × 20–40 сек':id==='core'?'3 подхода':`3 × ${e.range[0]}–${e.range[1]}`;
}

function suggestion(id){
 const all=read(SETS_KEY,[]).filter(x=>x.exercise===id).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(!all.length)return 'Начни с веса, с которым техника остаётся уверенной.';
 const lastDate=all[all.length-1].date,last=all.filter(x=>x.date===lastDate),top=EX[id].range[1];
 const complete=last.length>=2&&last.every(x=>Number(x.reps)>=top);
 const controlled=last.every(x=>x.effort==='easy'||x.effort==='normal');
 if(complete&&controlled)return 'Следующий раз: немного увеличь вес и начни с нижней границы повторов.';
 if(last.some(x=>x.effort==='limit'))return 'Следующий раз: сохрани вес и не работай до предела.';
 return 'Следующий раз: сохрани вес и добавляй повторы внутри диапазона.';
}

function todayCard(d,wo){
 const w=weekNo(d),p=phaseFor(w),pt=phaseText(p),st=workoutStatus(d),label=d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
 if(!wo)return `<section class="fx-engine-card" data-engine-today><div class="fx-engine-head"><div><div class="fx-eye">FITNESS · ВЫБРАННЫЙ ДЕНЬ</div><h2>День восстановления</h2></div><span class="fx-engine-week">НЕДЕЛЯ ${w}</span></div><div class="fx-engine-note">${label}. По текущему циклу силовой тренировки нет.</div><div class="fx-engine-chips"><span class="hot">${pt.name}</span><span>${pt.focus}</span></div></section>`;
 return `<section class="fx-engine-card" data-engine-today><div class="fx-engine-head"><div><div class="fx-eye">FITNESS · ВЫБРАННЫЙ ДЕНЬ</div><h2>${wo.light?'Разгрузка · ':''}${wo.name}</h2><div class="fx-engine-note">${label} · ${wo.light?'35–45':'45–65'} минут</div></div><span class="fx-engine-week">НЕДЕЛЯ ${w}</span></div><div class="fx-engine-chips"><span class="hot">${phaseText(wo.phase).name}</span><span>ЦИКЛ ${wo.cycle}</span><span>${wo.light?'ОБЛЕГЧЁННАЯ НЕДЕЛЯ':'РАБОЧАЯ НЕДЕЛЯ'}</span></div>${wo.ids.map((id,i)=>{const e=EX[id],base=wo.baseIds[i];return `<div class="fx-engine-ex"><span class="fx-engine-num">${i+1}</span><div><b>${e.name}</b><small>${prescription(id,wo)}</small></div><button class="fx-engine-icon" data-info="${id}" aria-label="Как выполнять ${esc(e.name)}">i</button><button class="fx-engine-icon fx-engine-swap" data-swap-exercise="${id}" data-swap-base="${base}" data-swap-block="${wo.cycle}" aria-label="Заменить ${esc(e.name)}">↻</button><button class="fx-engine-icon fx-engine-log" data-log-exercise="${id}" data-log-date="${key(d)}" aria-label="Записать подходы ${esc(e.name)}">＋</button></div>`}).join('')}<div class="fx-help">${suggestion(wo.ids[0])}</div><div class="fx-engine-status"><button class="done ${st==='done'?'on':''}" data-engine-status="done">✓ ВЫПОЛНЕНА</button><button class="skip ${st==='skip'?'on':''}" data-engine-status="skip">○ ПРОПУЩЕНА</button><button class="clear ${!st?'on':''}" data-engine-status="">· БЕЗ ОТМЕТКИ</button></div></section>`;
}

function programCard(){
 const w=weekNo(new Date()),p=phaseFor(w),pt=phaseText(p),left=p.to-w,nextDeload=w%4===0?w:w+(4-w%4),cycle=Math.floor((w-1)/4)+1;
 return `<section class="fx-engine-card" data-engine-program><div class="fx-engine-head"><div><div class="fx-eye">УМНАЯ ПРОГРАММА · 23 УПРАЖНЕНИЯ</div><h2>${pt.name}</h2></div><span class="fx-engine-week">НЕДЕЛЯ ${w}</span></div><div class="fx-engine-note">${pt.focus}. Тренировки чередуются между неделями; вспомогательные упражнения и акцент меняются каждые 4 недели.</div><div class="fx-cycle-grid"><div class="fx-cycle-stat"><small>ТЕКУЩИЙ ЦИКЛ</small><b>${cycle}</b><small>4 недели</small></div><div class="fx-cycle-stat"><small>ОСТАЛОСЬ В ФАЗЕ</small><b>${left}</b><small>${left===1?'неделя':'недель'}</small></div><div class="fx-cycle-stat"><small>БЛИЖАЙШАЯ РАЗГРУЗКА</small><b>${nextDeload}</b><small>неделя программы</small></div><div class="fx-cycle-stat"><small>СЛЕДУЮЩАЯ ФАЗА</small><b style="font-size:11px">${phaseText(PHASES.find(x=>x.from===p.to+1)||p).name}</b><small>${p.to<52?'с '+(p.to+1)+' недели':'после оценки'}</small></div></div><div class="fx-help">Основные движения сохраняются для измеримого прогресса. Кнопка ↻ позволяет выбрать безопасную замену из той же группы до конца текущего четырёхнедельного цикла.</div><div class="fx-phase-list">${PHASES.map(x=>{const tx=phaseText(x);return`<div class="fx-phase-item ${x===p?'on':''}"><div><b>${tx.name}</b><p>${tx.focus} · ${x.days} тренировки в неделю</p></div><span>${x.from}–${x.to}</span></div>`}).join('')}</div></section>`;
}

function estimatedMax(weight,reps){return weight>0&&reps>0?weight*(1+reps/30):0}
function statusCount(value){let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('stack_fitness_workout_')&&localStorage.getItem(k)===value)n++}}catch(e){}return n}
function analyticsCard(){
 const sets=read(SETS_KEY,[]),done=statusCount('1'),skip=statusCount('skip'),rate=done+skip?Math.round(done/(done+skip)*100):0;
 const body=read(BODY_KEY,[]).filter(x=>Number(x.body)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date))),first=body[0],last=body[body.length-1],delta=first&&last?Number(last.body)-Number(first.body):0;
 const volume=Math.round(sets.reduce((s,x)=>s+(Number(x.weight)||0)*(Number(x.reps)||0),0));
 const groups={};sets.forEach(x=>{(groups[x.exercise]||(groups[x.exercise]=[])).push(x)});
 const histories=Object.entries(groups).map(([id,a])=>{const e=EX[id];if(!e)return'';const sorted=a.slice().sort((x,y)=>String(x.date).localeCompare(String(y.date))),lastSet=sorted[sorted.length-1],best=Math.max(...sorted.map(x=>estimatedMax(+x.weight,+x.reps)));return `<div class="fx-ex-history"><b>${e.name}</b><p>Последнее: ${+lastSet.weight||0} кг × ${+lastSet.reps||0} · расчётный максимальный вес ${best?best.toFixed(1):'—'} кг<br>${suggestion(id)}</p></div>`}).join('');
 return `<section class="fx-engine-card" data-engine-progress><div class="fx-eye">АНАЛИТИКА ТРЕНИРОВОК</div><h2 style="margin:5px 0">Становлюсь ли я сильнее?</h2><div class="fx-analytics"><div class="fx-analytic"><small>СОБЛЮДЕНИЕ ПРОГРАММЫ</small><b class="${rate>=75?'fx-positive':'fx-neutral'}">${rate}%</b><small>${done} выполнено · ${skip} пропущено</small></div><div class="fx-analytic"><small>ВЕС ТЕЛА</small><b>${last?Number(last.body)+' кг':'—'}</b><small>${first&&last?(delta>=0?'+':'')+delta.toFixed(1)+' кг за журнал':'нужны записи'}</small></div><div class="fx-analytic"><small>ЗАПИСАНО ПОДХОДОВ</small><b>${sets.length}</b><small>по упражнениям</small></div><div class="fx-analytic"><small>ОБЩИЙ ОБЪЁМ</small><b>${volume?volume.toLocaleString('ru-RU'):'—'}</b><small>кг × повторения</small></div></div>${histories||'<div class="fx-empty-plan">После первой тренировки здесь появятся история упражнений, расчёт силы и подсказка следующего шага.</div>'}</section>`;
}

function modal(id,date){
 const e=EX[id];if(!e)return;document.getElementById('fxEngineModal')?.remove();
 const last=read(SETS_KEY,[]).filter(x=>x.exercise===id).sort((a,b)=>String(a.date).localeCompare(String(b.date))).pop();
 const measure=e.unit==='сек'?'Время, секунд':'Повторения';const s=document.createElement('div');s.id='fxEngineModal';s.className='fx-sheet';s.innerHTML=`<div class="fx-editor"><div class="fx-eye">ЗАПИСЬ ПОДХОДА</div><h3>${e.name}</h3><form data-engine-set><input type="hidden" name="exercise" value="${id}"><input type="hidden" name="date" value="${date}"><div class="fx-form-grid"><label>Номер подхода<input name="set" type="number" inputmode="numeric" min="1" max="12" value="1" required></label><label>Рабочий вес, кг<input name="weight" type="number" inputmode="decimal" min="0" step="0.1" value="${last?.weight??''}" placeholder="0"></label></div><label>${measure}<input name="reps" type="number" inputmode="numeric" min="1" max="300" value="${last?.reps??''}" required></label><label>Насколько тяжело было?</label><div class="fx-effort"><label><input type="radio" name="effort" value="easy">Легко<br>ещё 3–4</label><label><input type="radio" name="effort" value="normal" checked>Нормально<br>ещё около 2</label><label><input type="radio" name="effort" value="hard">Тяжело<br>ещё примерно 1</label><label><input type="radio" name="effort" value="limit">Предел<br>запаса нет</label></div><div class="fx-help">Оцени запас: сколько повторов ты ещё смог бы сделать с правильной техникой.</div><button class="fx-save">СОХРАНИТЬ ПОДХОД</button><button type="button" class="fx-close" data-engine-close>ОТМЕНА</button></form></div>`;document.body.appendChild(s);
 s.onclick=x=>{if(x.target===s||x.target.closest('[data-engine-close]'))s.remove()};
 s.querySelector('[data-engine-set]').onsubmit=x=>{x.preventDefault();const f=new FormData(x.currentTarget),a=read(SETS_KEY,[]);a.push({id:Date.now().toString(36),date:String(f.get('date')),exercise:String(f.get('exercise')),set:+f.get('set'),weight:+f.get('weight')||0,reps:+f.get('reps'),effort:String(f.get('effort'))});write(SETS_KEY,a);s.remove();refresh()};
}

function fixGoalCard(){
 const card=document.querySelector('#v234Fitness [data-goal-card]');if(!card)return;const v=goal(),body=read(BODY_KEY,[]).filter(x=>Number(x.body)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date))),now=body.length?Number(body[body.length-1].body):Number(v.start),start=Number(v.start),target=Number(v.target),den=target-start,raw=den===0?100:(now-start)/den*100,pct=Math.max(0,Math.min(100,Math.round(raw))),left=Math.abs(target-now),direction=target>start?'Набор массы':target<start?'Снижение веса':'Поддержание веса';
 const eye=card.querySelector('.fx-eye'),strong=card.querySelector('strong'),bar=card.querySelector('.fx-goal-track i'),meta=card.querySelector('.fx-goal-meta'),eyeText='МОЯ ЦЕЛЬ · '+direction.toUpperCase(),strongText=`${now} кг → ${target} кг`,metaText=`Старт ${start} кг · осталось ${left.toFixed(1).replace('.0','')} кг · прогресс оценивается по динамике веса`;if(eye&&eye.textContent!==eyeText)eye.textContent=eyeText;if(strong&&strong.textContent!==strongText)strong.textContent=strongText;if(bar&&bar.style.width!==pct+'%')bar.style.width=pct+'%';if(meta&&meta.textContent!==metaText)meta.textContent=metaText;
}

function enhanceSettings(){
 const form=document.querySelector('#fxPlanEditor [data-settings]');if(!form||form.querySelector('.fx-profile-fields'))return;const p=read(PROFILE_KEY,{height:'',age:'',sex:'',experience:'beginner',days:3,duration:60,limitations:''}),box=document.createElement('section');box.className='fx-profile-fields';box.innerHTML=`<h4>Данные для программы</h4><div class="fx-form-grid"><label>Рост, см<input name="profileHeight" type="number" inputmode="numeric" min="100" max="230" value="${esc(p.height)}" placeholder="175"></label><label>Возраст<input name="profileAge" type="number" inputmode="numeric" min="14" max="100" value="${esc(p.age)}" placeholder="29"></label></div><label>Пол<select name="profileSex"><option value="">Не выбран</option><option value="male">Мужской</option><option value="female">Женский</option></select></label><label>Опыт тренировок<select name="profileExperience"><option value="beginner">Начинаю / после перерыва</option><option value="intermediate">Регулярно 6–24 месяца</option><option value="advanced">Регулярно больше 2 лет</option></select></label><div class="fx-form-grid"><label>Дней в неделю<select name="profileDays"><option>3</option><option>4</option></select></label><label>Минут на тренировку<select name="profileDuration"><option>45</option><option>60</option><option>75</option></select></label></div><label>Ограничения по здоровью<textarea name="profileLimitations" placeholder="Если ограничений нет — оставь пустым">${esc(p.limitations)}</textarea></label><div class="fx-help">Сложные показатели STACK рассчитывает сам. Выбор оборудования не требуется.</div>`;form.querySelector('.fx-save')?.before(box);form.elements.profileSex.value=p.sex;form.elements.profileExperience.value=p.experience;form.elements.profileDays.value=String(p.days);form.elements.profileDuration.value=String(p.duration);
 form.addEventListener('submit',()=>{write(PROFILE_KEY,{height:+form.elements.profileHeight.value||'',age:+form.elements.profileAge.value||'',sex:form.elements.profileSex.value,experience:form.elements.profileExperience.value,days:+form.elements.profileDays.value,duration:+form.elements.profileDuration.value,limitations:form.elements.profileLimitations.value.trim()})},{capture:true});
}

function draw(){
 const root=document.getElementById('v234Fitness'),body=root?.querySelector('.v234-body'),tab=root?.querySelector('[data-v234].on')?.dataset.v234;if(!root||!body||!tab)return;fixGoalCard();enhanceSettings();const v=goal();
 root.classList.toggle('fx-engine-owned-program',v.training==='stack'&&tab==='program');
 if(v.training==='stack'&&tab==='today'){const view=body.querySelector('#fxDayView'),old=view?.querySelector(':scope > .fx-card.fx-pad');if(view&&old&&!view.querySelector('[data-engine-today]'))old.outerHTML=todayCard(selectedDate(),workoutFor(selectedDate()));}
 if(v.training==='stack'&&tab==='program'&&!body.querySelector('[data-engine-program]')){const anchor=body.querySelector('[data-goal-card]');if(anchor)anchor.insertAdjacentHTML('afterend',programCard());else body.insertAdjacentHTML('afterbegin',programCard())}
 if(tab==='progress'&&!body.querySelector('[data-engine-progress]')){const anchor=body.querySelector('[data-goal-card]');if(anchor)anchor.insertAdjacentHTML('afterend',analyticsCard());else body.insertAdjacentHTML('afterbegin',analyticsCard())}
}
function refresh(){const today=document.querySelector('#v234Fitness [data-engine-today]');if(today)today.outerHTML=todayCard(selectedDate(),workoutFor(selectedDate()));document.querySelectorAll('#v234Fitness [data-engine-program],#v234Fitness [data-engine-progress]').forEach(x=>x.remove());draw()}

document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.matches('[data-log-exercise]'))modal(b.dataset.logExercise,b.dataset.logDate);else if(b.matches('[data-engine-status]')){setWorkoutStatus(selectedDate(),b.dataset.engineStatus);refresh()}});
window.addEventListener('stack:fitness-library-change',refresh);
const style=document.createElement('style');style.id='v2320EngineStyle';style.textContent=css+'@media(max-width:720px){.fx-engine-owned-program .v234-body>.fx-program,.fx-engine-owned-program .v234-body>.fx-program+.fx-note{display:none!important}}';document.head.appendChild(style);
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;draw()})}new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});draw();console.info('STACK',BUILD);
})();
