/* STACK v24.7 — unified Today, Deals, Finance and More experience. */
(()=>{'use strict';
const BUILD='v24.7-fitness-analytics-progression';
const GOAL_KEY='stack_fitness_goal_v2318';
const BODY_KEY='stack_fitness_log_v2310';
const NUTRITION_KEY='stack_fitness_nutrition_v2310';
const PLAN_MARKS='stack_fitness_nutrition_plan_v2311';
const CUSTOM_MARKS='stack_fitness_custom_nutrition_marks_v2319';
const VARIANT_KEY='stack_fitness_nutrition_variant_v241';
const START=new Date(2026,7,10),DAY=86400000;
let lastToday='',lastDeals='',lastFinance='',lastMore='',queued=false;

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function read(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch(_e){return fallback}}
function dateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function monthKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function mainState(){try{if(typeof state!=='undefined'&&state&&typeof state==='object')return state}catch(_e){}return globalThis.STACK_DATA?.main?.()||{}}
function doneTask(task){const value=String(task?.status||'').toLowerCase();return value.includes('готов')||value.includes('выполн')}
function priorityColor(priority){const value=String(priority||'').toLowerCase();return value.includes('выс')?'#f12bb8':value.includes('низ')?'#68d43f':'#0877f3'}
function money(value){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Number(value)||0)+' ₽'}
function hash(value){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function icon(name){
  const paths={
    fitness:'<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
    goal:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 3v2M21 12h-2M12 21v-2M3 12h2"/>',
    tasks:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6M8 10l1.5 1.5L12 9M8 16l1.5 1.5L12 15M14 10h2M14 16h2"/>',
    processes:'<path d="M18.5 8A7.5 7.5 0 0 0 6 6.5L4 9M5.5 16A7.5 7.5 0 0 0 18 17.5l2-2.5"/><path d="M4 5v4h4M20 19v-4h-4"/>',
    nutrition:'<circle cx="13" cy="13" r="7"/><path d="M13 9v8M9 13h8M4 3v7M2.5 3v4A1.5 1.5 0 0 0 4 8.5 1.5 1.5 0 0 0 5.5 7V3M4 8.5V21"/>',
    finance:'<path d="M4 7h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M21 11h-6a2 2 0 0 0 0 4h6M16 13h.01"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]||''}</svg>`;
}

function installStyle(){
  if(document.getElementById('stackV24Style'))return;
  const style=document.createElement('style');
  style.id='stackV24Style';
  style.textContent=`@media(max-width:720px){
    #screenToday{padding:0 2px 8px!important}.v24-page{display:grid;gap:9px;padding-bottom:4px}.v24-head{padding:7px 3px 4px}.v24-kicker{font-size:9px;letter-spacing:.09em;color:#8090a7}.v24-head h1{margin:2px 0 0;font-size:28px;line-height:1;color:#fff;text-shadow:0 0 18px #9133e466}.v24-date{margin-top:6px;color:#8f9db0;font-size:10px;text-transform:capitalize}
    .v24-hero{position:relative;overflow:hidden;padding:15px;border:1px solid #7134ad;border-radius:18px;background:radial-gradient(circle at 88% 0,#f12bb82a,transparent 42%),radial-gradient(circle at 0 100%,#0877f322,transparent 45%),linear-gradient(150deg,#091426,#030914 72%);box-shadow:0 0 20px #9133e429,inset 0 0 22px #0877f30b}.v24-hero-grid{display:grid;grid-template-columns:82px 1fr;gap:14px;align-items:center}.v24-ring{--p:0;width:80px;height:80px;border-radius:50%;display:grid;place-items:center;position:relative;background:conic-gradient(#f12bb8 0 calc(var(--p)*1%),#9133e4 calc(var(--p)*1%) calc(var(--p)*1% + 4%),#142139 0);box-shadow:0 0 13px #f12bb83c}.v24-ring:after{content:'';position:absolute;inset:10px;border-radius:50%;background:#040b16;box-shadow:inset 0 0 11px #0877f329}.v24-ring b{position:relative;z-index:1;font-size:18px}.v24-hero small,.v24-card small{color:#8291a7;font-size:9px;line-height:1.4}.v24-hero h2{margin:4px 0;font-size:19px}.v24-pills{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.v24-pill{padding:5px 8px;border:1px solid #294766;border-radius:999px;background:#06111e;color:#a9b8ca;font-size:8px}.v24-pill.hot{border-color:#9133e4;color:#dfc4ff;box-shadow:0 0 9px #9133e43b}
    .v24-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v24-card{min-width:0;padding:13px;border:1px solid #253e63;border-radius:16px;background:radial-gradient(circle at 100% 0,var(--glow,#0877f31a),transparent 48%),linear-gradient(160deg,#071321,#030914);box-shadow:0 0 15px #0877f312}.v24-card.wide{grid-column:1/-1}.v24-card.cyan{border-color:#17566d;--glow:#0eb1db25}.v24-card.pink{border-color:#65305c;--glow:#f12bb820}.v24-card.purple{border-color:#563079;--glow:#9133e425}.v24-eye{color:#8291a7;font-size:8px;font-weight:900;letter-spacing:.08em}.v24-card h3{margin:5px 0 3px;font-size:15px}.v24-big{display:block;margin:5px 0 3px;color:#fff;font-size:20px;font-weight:900;text-shadow:0 0 11px currentColor}.v24-big.cyan{color:#20d9ea}.v24-big.pink{color:#f45cc9}.v24-big.green{color:#79df61}.v24-progress{height:6px;margin:10px 0 5px;border-radius:99px;background:#111f31;overflow:hidden}.v24-progress i{display:block;height:100%;background:linear-gradient(90deg,#0877f3,#9133e4,#f12bb8);box-shadow:0 0 9px #9133e4}.v24-open{width:100%;min-height:44px;margin-top:10px;border:1px solid #3c5380;border-radius:11px;background:linear-gradient(135deg,#0a1d34,#1d0e32);color:#eef5ff;font-size:10px;font-weight:850}.v24-list{margin-top:8px;border-top:1px solid #142740}.v24-row{display:grid;grid-template-columns:7px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 0;border-bottom:1px solid #12233a}.v24-row:last-child{border-bottom:0}.v24-bar{width:6px;height:28px;border-radius:5px;background:var(--c);box-shadow:0 0 8px var(--c)}.v24-row b{display:block;overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.v24-row small{display:block;margin-top:3px;font-size:8px}.v24-state{color:#aab7c8;font-size:9px}.v24-process-mark{width:44px;height:44px;border:1px solid var(--c);border-radius:11px;background:#06111e;color:var(--c);font-size:17px;font-weight:900}.v24-empty{padding:12px 0 3px;color:#7f8da2;font-size:10px;line-height:1.45}
    .v24-deals-pulse{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:-3px 0 10px}.v24-pulse{padding:9px 5px;border:1px solid #203957;border-radius:11px;background:#06101d;text-align:center}.v24-pulse b{display:block;font-size:16px}.v24-pulse span{font-size:7px;color:#7f8da2}.v24-pulse.alert b{color:#f06b85}.v24-deal-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:-2px 0 10px}.v24-deal-actions button{min-height:44px;border:1px solid #3b4e72;border-radius:10px;background:#071321;color:#dfe8f6;font-size:9px;font-weight:850}
    #screenSavings.v24-finance-ready{padding-top:0!important}.v24-finance-head{margin:0 2px 9px;padding-top:7px}.v24-finance-title{font-size:27px;font-weight:900;line-height:1;text-shadow:0 0 18px #f12bb855}.v24-finance-pulse{margin-top:10px;padding:14px;border:1px solid #65308f;border-radius:17px;background:radial-gradient(circle at 90% 0,#f12bb823,transparent 44%),linear-gradient(155deg,#091321,#030914);box-shadow:0 0 17px #9133e423}.v24-finance-main{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.v24-finance-stat{padding:10px;border:1px solid #213b58;border-radius:11px;background:#050e19}.v24-finance-stat span{display:block;color:#8190a5;font-size:7px}.v24-finance-stat b{display:block;margin-top:4px;font-size:14px}.v24-finance-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:9px}.v24-finance-tabs button{min-height:44px;border:1px solid #314465;border-radius:9px;background:#071321;color:#a6b4c6;font-size:8px;font-weight:900}
    #screenAnalytics.v24-more-ready{padding:0 2px 8px!important}#screenAnalytics.v24-more-ready:not(.v24-analytics-open)>:not(#v24More){display:none!important}.v24-more-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v24-more-action{min-height:104px;padding:13px;border:1px solid #263e61;border-radius:15px;background:radial-gradient(circle at 90% 0,var(--glow,#0877f31e),transparent 48%),linear-gradient(155deg,#071321,#030914);color:#edf4ff;text-align:left}.v24-more-action b{display:block;margin:7px 0 4px;font-size:13px}.v24-more-action span{display:block;color:#8392a7;font-size:8px;line-height:1.4}.v24-more-action i{font-style:normal;color:var(--accent,#0eb1db);font-size:21px;text-shadow:0 0 10px var(--accent,#0eb1db)}.v24-more-status{margin:9px 0;padding:13px;border:1px solid #28425f;border-radius:15px;background:#050e19}.v24-status-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #13263c;font-size:9px}.v24-status-row:first-child{border-top:0}.v24-status-row span{color:#8190a5}.v24-status-row b{color:#bdefff}.v24-analytics-open #v24More{margin-bottom:10px}.v24-analytics-toggle{width:100%;min-height:44px;margin-top:9px;border:1px solid #7134ad;border-radius:10px;background:#170b28;color:#e9dbff;font-weight:850}
    @media(max-width:370px){.v24-hero-grid{grid-template-columns:72px 1fr}.v24-ring{width:70px;height:70px}.v24-grid{gap:7px}.v24-card{padding:11px}.v24-more-action{padding:11px}.v24-finance-tabs button{font-size:7px}}
  }`;
  style.textContent+=`@media(max-width:720px){.v24-card-head{display:grid;grid-template-columns:38px minmax(0,1fr);gap:9px;align-items:center}.v24-card-icon{width:36px;height:36px;display:grid;place-items:center;border:1px solid currentColor;border-radius:11px;color:var(--icon,#0eb1db);background:#06111e;box-shadow:0 0 11px currentColor}.v24-card-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.v24-pill{display:inline-flex;align-items:center;gap:4px}.v24-pill svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.v24-card-head h3{margin:3px 0 0}.v24-card.cyan{--icon:#0eb1db}.v24-card.pink{--icon:#f12bb8}.v24-card.purple{--icon:#9133e4}#screenSavings.v24-finance-ready #v2220Finance>.v2220-tabs{display:none!important}.v24-finance-tabs button.on{border-color:#9133e4;background:#21103b;color:#fff;box-shadow:0 0 11px #9133e444}}`;
  document.head.appendChild(style);
}

function taskData(data,today){
  const tasks=Array.isArray(data.journal)?data.journal:[],relevant=[],overdue=[];
  for(const task of tasks){
    if(task.date===today||task.due===today)relevant.push(task);
    if(!doneTask(task)&&task.due&&task.due<today)overdue.push(task);
  }
  return{tasks,relevant,overdue,open:tasks.filter(x=>!doneTask(x)),doneToday:relevant.filter(doneTask).length};
}

function processData(data,date){
  const rows=[];
  const processes=Array.isArray(data.processes)?data.processes:[];
  const mi=typeof dateToMonthIndex==='function'?dateToMonthIndex(date):-1;
  processes.forEach((process,index)=>{
    let scheduled=false;
    try{scheduled=typeof isScheduledOnDate==='function'?isScheduledOnDate(index,date):true}catch(_e){scheduled=true}
    if(!scheduled)return;
    const mark=mi>=0?(data.months?.[mi]?.[index]?.[date.getDate()-1]||''):'';
    rows.push({index,name:process.name||`Процесс ${index+1}`,color:process.color||'#9133e4',mark});
  });
  return rows;
}

function goalData(){
  const goal=read(GOAL_KEY,{start:56,target:70,training:'stack',nutrition:'stack',workouts:[],meals:[]});
  goal.workouts=Array.isArray(goal.workouts)?goal.workouts:[];
  goal.meals=Array.isArray(goal.meals)?goal.meals:[];
  const body=read(BODY_KEY,[]).filter(x=>Number(x.body)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const start=Number(goal.start)||56,target=Number(goal.target)||70,current=body.length?Number(body.at(-1).body):start;
  const distance=Math.abs(target-start),made=target>=start?current-start:start-current;
  const pct=distance?Math.max(0,Math.min(100,Math.round(made/distance*100))):100;
  const direction=target>start?'Набор массы':target<start?'Снижение веса':'Поддержание';
  return{...goal,start,target,current,pct,direction};
}

function fitnessData(goal,date){
  let workout;
  if(goal.training==='trainer'){
    const day=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][date.getDay()],items=goal.workouts.filter(x=>(x.days||[]).includes(day));
    workout={planned:items.length>0,name:items[0]?.name||(items.length?'Тренировка тренера':'День восстановления'),week:null,phase:'План тренера',deload:false,count:items.reduce((sum,x)=>sum+(x.exercises?.length||0),0)};
  }else workout=globalThis.STACK_FITNESS?.summary?.(date)||{planned:false,name:'Программа временно недоступна',week:null,phase:'Fitness Engine',deload:false,count:0};
  let status='';try{const value=localStorage.getItem('stack_fitness_workout_'+dateKey(date));status=value==='1'?'done':value==='skip'?'skip':''}catch(_e){}
  return{...workout,status,source:goal.training==='trainer'?'МОЙ ПЛАН':'ПЛАН STACK'};
}

function nutritionData(goal,date){
  const key=dateKey(date),manual=read(NUTRITION_KEY,[]).filter(x=>x.date===key);
  const manualFact=manual.reduce((sum,x)=>sum+(Number(x.kcal)||0),0);
  if(goal.nutrition==='trainer'){
    const marks=read(CUSTOM_MARKS,{}),eaten=goal.meals.filter(x=>marks[key+'-'+x.id]),done=eaten.length,fact=manualFact+eaten.reduce((sum,x)=>sum+(Number(x.kcal)||0),0);
    return{source:'РАЦИОН ДИЕТОЛОГА',done,total:goal.meals.length,fact,entries:manual.length};
  }
  const gain=goal.target>goal.start;
  if(!gain)return{source:'ОРИЕНТИР STACK',done:0,total:0,fact:manualFact,entries:manual.length};
  const plan=globalThis.STACK_NUTRITION_PLAN?.snapshot?.(key);
  if(plan)return{source:'РАЦИОН STACK',done:plan.done,total:plan.total,fact:manualFact+plan.fact.kcal,entries:manual.length};
  const marks=read(PLAN_MARKS,{}),variant=Math.max(0,Math.min(3,Number(localStorage.getItem(VARIANT_KEY))||0)),prefix=key+'-'+variant+'-';
  const done=Object.keys(marks).filter(x=>marks[x]&&x.startsWith(prefix)).length;
  return{source:'РАЦИОН STACK',done,total:5,fact:manualFact,entries:manual.length};
}

function todayHTML(){
  const date=new Date(),key=dateKey(date),data=mainState(),tasks=taskData(data,key),processes=processData(data,date),goal=goalData(),fitness=fitnessData(goal,date),nutrition=nutritionData(goal,date);
  const activeProcesses=processes.filter(x=>x.mark!=='—'),processDone=activeProcesses.filter(x=>x.mark==='✓').length;
  const total=tasks.relevant.length+activeProcesses.length+(fitness.planned?1:0)+nutrition.total;
  const complete=tasks.doneToday+processDone+(fitness.status==='done'?1:0)+nutrition.done;
  const pct=total?Math.round(complete/total*100):0,attention=Math.max(0,total-complete);
  const taskRows=[...tasks.overdue,...tasks.relevant.filter(x=>!doneTask(x)&&!tasks.overdue.includes(x))].slice(0,4);
  const workoutMeta=fitness.planned?`${fitness.count||'—'} упражнения · ${fitness.phase}${fitness.deload?' · разгрузка':''}`:`${fitness.phase} · восстановление`;
  const workoutState=fitness.status==='done'?'✓ выполнена':fitness.status==='skip'?'○ пропущена':fitness.planned?'· без отметки':'отдых';
  const goalLeft=Math.abs(goal.target-goal.current).toFixed(1).replace('.0','');
  const finance=globalThis.STACK_FINANCE?.month?.('RUB',monthKey(date))||{},goals=globalThis.STACK_FINANCE?.activeGoals?.('RUB')||[];
  const dateLabel=date.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
  return `<div class="v24-page"><header class="v24-head"><div class="v24-kicker">STACK · ЕДИНЫЙ ДЕНЬ</div><h1>Сегодня</h1><div class="v24-date">${esc(dateLabel)}</div></header>
  <section class="v24-hero"><div class="v24-hero-grid"><div class="v24-ring" style="--p:${pct}"><b>${pct}%</b></div><div><small>ОБЩИЙ ПРОГРЕСС ДНЯ</small><h2>${attention?`${attention} требуют внимания`:'Всё отмечено'}</h2><small>${complete} из ${total} запланированных пунктов выполнено</small></div></div><div class="v24-pills"><span class="v24-pill hot">${icon('tasks')} ${tasks.relevant.length} дел</span><span class="v24-pill">${icon('processes')} ${processes.length} процессов</span><span class="v24-pill">${icon('fitness')} ${fitness.planned?'тренировка':'восстановление'}</span></div></section>
  <div class="v24-grid">
    <section class="v24-card cyan"><div class="v24-card-head"><span class="v24-card-icon">${icon('fitness')}</span><div><div class="v24-eye">FITNESS · ${fitness.source}</div><h3>${esc(fitness.name)}</h3></div></div><strong class="v24-big cyan">${esc(workoutState)}</strong><small>${esc(workoutMeta)}</small><button class="v24-open" data-v24-route="screenTracker" data-v24-tab="today">Открыть тренировку</button></section>
    <section class="v24-card purple"><div class="v24-card-head"><span class="v24-card-icon">${icon('goal')}</span><div><div class="v24-eye">МОЯ ЦЕЛЬ · ${esc(goal.direction).toUpperCase()}</div><h3>${goal.current} → ${goal.target} кг</h3></div></div><strong class="v24-big">${goal.pct}%</strong><div class="v24-progress"><i style="width:${goal.pct}%"></i></div><small>До цели ${goalLeft} кг</small><button class="v24-open" data-v24-route="screenTracker" data-v24-tab="progress">Смотреть прогресс</button></section>
    <section class="v24-card wide pink"><div class="v24-card-head"><span class="v24-card-icon">${icon('tasks')}</span><div><div class="v24-eye">ДЕЛА · ПЛАН НА СЕГОДНЯ</div><h3>${tasks.overdue.length?`${tasks.overdue.length} просрочено`:`${tasks.relevant.length} на сегодня`}</h3></div></div><div class="v24-list">${taskRows.length?taskRows.map(task=>`<div class="v24-row"><i class="v24-bar" style="--c:${priorityColor(task.priority)}"></i><div><b>${esc(task.task||'Без названия')}</b><small>${task.due&&task.due<key?'Просрочено · ':''}${esc(task.priority||'Средний')} приоритет</small></div><span class="v24-state">${esc(task.status||'Не начато')}</span></div>`).join(''):`<div class="v24-empty">Открытых задач на сегодня нет</div>`}</div><button class="v24-open" data-v24-route="screenTasks" data-v24-tab="tasks">Все задачи</button></section>
    <section class="v24-card wide"><div class="v24-card-head"><span class="v24-card-icon">${icon('processes')}</span><div><div class="v24-eye">ПРОЦЕССЫ · СЕГОДНЯ</div><h3>${processDone} из ${activeProcesses.length} выполнено</h3></div></div><div class="v24-list">${processes.length?processes.slice(0,5).map(x=>`<div class="v24-row"><i class="v24-bar" style="--c:${x.color}"></i><div><b>${esc(x.name)}</b><small>${x.mark==='✓'?'Выполнено':x.mark==='○'?'Не выполнено':x.mark==='—'?'Не требовалось':'Без отметки'}</small></div><button class="v24-process-mark" style="--c:${x.color}" data-v24-process="${x.index}" aria-label="Изменить статус ${esc(x.name)}">${esc(x.mark||'·')}</button></div>`).join(''):`<div class="v24-empty">Активных процессов на сегодня нет</div>`}</div><button class="v24-open" data-v24-route="screenTasks" data-v24-tab="processes">Все процессы</button></section>
    <section class="v24-card"><div class="v24-card-head"><span class="v24-card-icon">${icon('nutrition')}</span><div><div class="v24-eye">ПИТАНИЕ · ${nutrition.source}</div><h3>${nutrition.done}/${nutrition.total||'—'} приёмов</h3></div></div><strong class="v24-big green">${nutrition.fact} ккал</strong><small>Ручной журнал: ${nutrition.entries} записей</small><button class="v24-open" data-v24-route="screenTracker" data-v24-tab="nutrition">Открыть питание</button></section>
    <section class="v24-card pink"><div class="v24-card-head"><span class="v24-card-icon">${icon('finance')}</span><div><div class="v24-eye">ФИНАНСЫ · РУБЛИ</div><h3>Отложено за месяц</h3></div></div><strong class="v24-big pink">${money(finance.saved)}</strong><small>${goals.length} активных рублёвых целей · план ${money(finance.plan)}</small><button class="v24-open" data-v24-route="screenSavings" data-v24-tab="month">Открыть финансы</button></section>
  </div></div>`;
}

function renderToday(){
  if(innerWidth>720)return;
  const root=document.getElementById('screenToday');if(!root)return;
  const html=todayHTML(),sig=hash(html);if(sig===lastToday&&root.querySelector('.v24-page'))return;
  lastToday=sig;root.innerHTML=html;
}

function dealsHTML(){
  const data=mainState(),key=dateKey(),tasks=taskData(data,key),todayOpen=tasks.relevant.filter(x=>!doneTask(x)).length;
  return `<div class="v24-deals-pulse" data-v24-deals><div class="v24-pulse"><b>${tasks.open.length}</b><span>ОТКРЫТО</span></div><div class="v24-pulse"><b>${todayOpen}</b><span>НА СЕГОДНЯ</span></div><div class="v24-pulse ${tasks.overdue.length?'alert':''}"><b>${tasks.overdue.length}</b><span>ПРОСРОЧЕНО</span></div></div><div class="v24-deal-actions" data-v24-deal-actions><button data-v24-new-task>+ Новая задача</button><button data-v24-route="screenTasks" data-v24-tab="processes">Все процессы</button></div>`;
}

function renderDeals(){
  if(innerWidth>720)return;
  const shell=document.getElementById('v233shell'),tabs=shell?.querySelector('.v233-tabs');if(!shell||!tabs)return;
  const html=dealsHTML(),sig=hash(html);if(sig===lastDeals&&shell.querySelector('[data-v24-deals]'))return;
  lastDeals=sig;shell.querySelectorAll('[data-v24-deals],[data-v24-deal-actions]').forEach(x=>x.remove());tabs.insertAdjacentHTML('afterend',html);
}

function financeHTML(){
  const month=globalThis.STACK_FINANCE?.month?.('RUB',monthKey())||{},goals=globalThis.STACK_FINANCE?.activeGoals?.('RUB')||[];
  const rate=month.plan?Math.max(0,Math.round((Number(month.saved)||0)/month.plan*100)):0;
  const active=globalThis.STACK_FINANCE_UI?.currentTab?.()||'month';
  const tabs=[['month','Месяц'],['goals','Цели'],['year','Год'],['summary','Итог']].map(([name,label])=>`<button class="${active===name?'on':''}" data-v24-finance="${name}">${label}</button>`).join('');
  return `<section id="v24FinancePulse" class="v24-finance-head"><div class="v24-kicker">STACK · ФИНАНСЫ</div><div class="v24-finance-title">Финансы</div><div class="v24-finance-pulse"><div class="v24-eye">ТЕКУЩИЙ МЕСЯЦ · ТОЛЬКО РУБЛЁВЫЕ ОПЕРАЦИИ ЦЕЛЕЙ</div><strong class="v24-big pink">${money(month.saved)}</strong><small>План рублёвых целей ${money(month.plan)} · выполнено ${rate}%</small><div class="v24-progress"><i style="width:${Math.min(100,rate)}%"></i></div><div class="v24-finance-main"><div class="v24-finance-stat"><span>МОЖНО ОТЛОЖИТЬ</span><b>${money(month.free)}</b></div><div class="v24-finance-stat"><span>АКТИВНЫХ ЦЕЛЕЙ ₽</span><b>${goals.length}</b></div></div><div class="v24-finance-tabs">${tabs}</div></div></section>`;
}

function renderFinance(){
  if(innerWidth>720)return;
  const screen=document.getElementById('screenSavings');if(!screen)return;
  const html=financeHTML(),sig=hash(html),old=document.getElementById('v24FinancePulse');
  screen.classList.add('v24-finance-ready');
  if(sig===lastFinance&&old)return;lastFinance=sig;
  if(old)old.outerHTML=html;else screen.insertAdjacentHTML('afterbegin',html);
}

function moreHTML(){
  const data=mainState(),processes=Array.isArray(data.processes)?data.processes.length:0,tasks=Array.isArray(data.journal)?data.journal.length:0,goals=Array.isArray(data.savings?.goals)?data.savings.goals.length:0;
  const online=navigator.onLine?'Онлайн':'Офлайн',controlled=navigator.serviceWorker?.controller?'Активна':'Подключается';
  return `<div id="v24More" class="v24-page"><header class="v24-head"><div class="v24-kicker">STACK · УПРАВЛЕНИЕ</div><h1>Ещё</h1><div class="v24-date">Данные, аналитика и состояние приложения</div></header><div class="v24-more-grid">
    <button class="v24-more-action" data-v24-action="analytics" style="--accent:#9133e4;--glow:#9133e426"><i>⌁</i><b>Аналитика процессов</b><span>Год, месяцы и динамика выполнения</span></button>
    <button class="v24-more-action" data-v24-action="backup" style="--accent:#0eb1db;--glow:#0eb1db24"><i>⬡</i><b>Резервная копия</b><span>Скачать актуальную копию данных STACK</span></button>
    <button class="v24-more-action" data-v24-action="export" style="--accent:#0877f3;--glow:#0877f324"><i>⇧</i><b>Экспорт данных</b><span>Сохранить основной файл в формате JSON</span></button>
    <button class="v24-more-action" data-v24-action="import" style="--accent:#f12bb8;--glow:#f12bb824"><i>⇩</i><b>Импорт данных</b><span>Восстановить данные из выбранного файла</span></button>
  </div><section class="v24-more-status"><div class="v24-eye">СОСТОЯНИЕ STACK</div><div class="v24-status-row"><span>Версия</span><b>v24.7</b></div><div class="v24-status-row"><span>Соединение</span><b>${online}</b></div><div class="v24-status-row"><span>PWA-кэш</span><b>${controlled}</b></div><div class="v24-status-row"><span>Защита данных</span><b>${globalThis.STACK_RECOVERY?'Активна':'Загружается'}</b></div><div class="v24-status-row"><span>Содержимое</span><b>${processes} процессов · ${tasks} задач · ${goals} целей</b></div><button class="v24-analytics-toggle" data-v24-action="analytics">Показать аналитику процессов</button></section></div>`;
}

function renderMore(){
  if(innerWidth>720)return;
  const screen=document.getElementById('screenAnalytics');if(!screen)return;
  screen.classList.add('v24-more-ready');
  const html=moreHTML(),sig=hash(html),old=document.getElementById('v24More');if(sig===lastMore&&old)return;
  lastMore=sig;if(old)old.outerHTML=html;else screen.insertAdjacentHTML('afterbegin',html);
  syncAnalyticsLabel();
}

function syncAnalyticsLabel(){
  const screen=document.getElementById('screenAnalytics'),open=screen?.classList.contains('v24-analytics-open');
  screen?.querySelectorAll('[data-v24-action="analytics"]').forEach((button,index)=>{if(index>0)button.textContent=open?'Скрыть аналитику процессов':'Показать аналитику процессов'});
}

function route(screen,tab){
  const opened=globalThis.STACK_STABILITY?.openScreen?.(screen,'v24-route');
  if(!opened)return;
  setTimeout(()=>{
    if(screen==='screenTracker'&&tab)document.querySelector(`#v234Fitness [data-v234="${tab}"]`)?.click();
    if(screen==='screenTasks'&&tab)document.querySelector(`#v233shell [data-v233="${tab}"]`)?.click();
    if(screen==='screenSavings'&&tab){
      const rub=document.querySelector('#savCurrencyTabs [data-cur="RUB"]');if(rub&&!rub.classList.contains('active'))rub.click();
      setTimeout(()=>{if(globalThis.STACK_FINANCE_UI?.openTab)globalThis.STACK_FINANCE_UI.openTab(tab);else document.querySelector(`#v2220Finance [data-tab="${tab}"]`)?.click();schedule(20)},50);
    }
  },30);
}

function setProcessMark(index){
  const data=mainState(),date=new Date(),mi=typeof dateToMonthIndex==='function'?dateToMonthIndex(date):-1;if(mi<0||!data.months?.[mi]?.[index])return;
  const day=date.getDate()-1,current=data.months[mi][index][day]||'',next=current===''?'✓':current==='✓'?'○':current==='○'?'—':'';
  data.months[mi][index][day]=next;try{if(typeof save==='function')save()}catch(_e){}window.dispatchEvent(new CustomEvent('stack:data-changed',{detail:{source:'v24-today-process'}}));schedule(20);
}

function handleClick(event){
  const routeButton=event.target.closest?.('[data-v24-route]');if(routeButton){event.preventDefault();route(routeButton.dataset.v24Route,routeButton.dataset.v24Tab);return}
  const processButton=event.target.closest?.('[data-v24-process]');if(processButton){event.preventDefault();setProcessMark(+processButton.dataset.v24Process);return}
  const newTask=event.target.closest?.('[data-v24-new-task]');if(newTask){event.preventDefault();document.getElementById('v2212Add')?.click();return}
  const finance=event.target.closest?.('[data-v24-finance]');if(finance){event.preventDefault();const name=finance.dataset.v24Finance;if(globalThis.STACK_FINANCE_UI?.openTab)globalThis.STACK_FINANCE_UI.openTab(name);else document.querySelector(`#v2220Finance [data-tab="${name}"]`)?.click();schedule(20);return}
  const action=event.target.closest?.('[data-v24-action]');if(!action)return;
  event.preventDefault();const name=action.dataset.v24Action;
  if(name==='analytics'){const screen=document.getElementById('screenAnalytics');screen?.classList.toggle('v24-analytics-open');syncAnalyticsLabel()}
  if(name==='backup')document.getElementById('stackBackupBtn')?.click();
  if(name==='export')document.getElementById('exportBtn')?.click();
  if(name==='import')document.getElementById('importBtn')?.click();
}

function renderAll24(){if(innerWidth>720)return;renderToday();renderDeals();renderFinance();renderMore()}
function schedule(delay=40){if(queued)return;queued=true;setTimeout(()=>{queued=false;renderAll24()},delay)}
function hookCoreRender(){try{if(typeof renderAll==='function'&&!renderAll.__stackV24){const original=renderAll;renderAll=function(...args){const result=original.apply(this,args);schedule(25);return result};renderAll.__stackV24=true}}catch(_e){}}

function boot(){
  installStyle();hookCoreRender();document.addEventListener('click',handleClick);document.addEventListener('click',()=>schedule(120));document.addEventListener('submit',()=>schedule(80));
  window.addEventListener('stack:data-changed',()=>schedule(50));window.addEventListener('stack:screen-change',()=>schedule(20));
  window.addEventListener('storage',()=>schedule(40));window.addEventListener('stack:fx-history-changed',()=>schedule(40));window.addEventListener('stack:fitness-library-change',()=>schedule(40));window.addEventListener('online',()=>schedule(10));window.addEventListener('offline',()=>schedule(10));navigator.serviceWorker?.addEventListener('controllerchange',()=>schedule(10));
  renderAll24();setTimeout(renderAll24,180);setTimeout(renderAll24,1200);
  globalThis.STACK_V24=Object.freeze({build:BUILD,render:renderAll24});console.info('STACK',BUILD);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
