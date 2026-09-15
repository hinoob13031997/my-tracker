/* STACK v29.17 — Analytics becomes the v29-shell owner of #screenAnalytics.
   Primary: STACK Score, domain scores, one verdict, trend. Old KPI rings/
   charts/trend chart and backup/export/import stay available but secondary
   (behind a toggle), reusing stack-v27-core.js's snapshot/insight/weekly
   and the existing weekly-review / 90-day-focus modal (data-v27-week /
   data-v27-onboard) instead of duplicating that logic. */
(()=>{'use strict';
const BUILD='29.17.0';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MOBILE=()=>innerWidth<=720;
let expanded=false,last='';
function screen(){return document.getElementById('screenAnalytics')}
function core(){return globalThis.STACK_CORE}
function claim(){const s=screen();if(s&&!s.dataset.stackAnalyticsOwner)s.dataset.stackAnalyticsOwner='v29'}
function trendBadge(t){if(!Number.isFinite(t))return'';if(t===0)return'<span class="v29a-trend flat">→ 0</span>';return`<span class="v29a-trend ${t>0?'up':'down'}">${t>0?'↑ +'+t:'↓ '+t}</span>`}
function domainCard(label,route,score){return`<button type="button" class="v29a-domain" data-v29a-route="${route}"><span>${label}</span><b>${Number.isFinite(score)?score:'—'}</b></button>`}
function page(){
 const c=core();
 if(!c?.snapshot)return'<div class="v29a-page"><header><div class="v29a-kicker">STACK · АНАЛИТИКА</div><h1>Аналитика</h1><p>Что означают твои данные и куда движется система</p></header><section class="v29a-hero wait"><div class="v29a-verdict"><b>STACK ещё загружается</b><p>Обнови экран через пару секунд.</p></div></section></div>';
 const s=c.snapshot(),i=c.insight?.(s)||{tone:'wait',title:'STACK собирает базу',text:''},w=c.weekly?.(s)||{summary:''},d=s.domains||{},f=s.focus||{};
 const domains=[domainCard('ПРОЦЕССЫ','deals',d.processes?.score),domainCard('ЗАДАЧИ','deals',d.tasks?.score),domainCard('FITNESS','fitness',d.fitness?.score),domainCard('ФИНАНСЫ','finance',d.finance?.score)];
 const focusBlock=f.goal?`<div class="v29a-focus"><span>ФОКУС 90 ДНЕЙ · ${esc(String(f.area||'').toUpperCase())}</span><b>${esc(f.goal)}</b></div>`:'<button type="button" class="v29a-onboard" data-v27-onboard>Настроить фокус на 90 дней</button>';
 return`<div class="v29a-page"><header><div class="v29a-kicker">STACK · АНАЛИТИКА</div><h1>Аналитика</h1><p>Что означают твои данные и куда движется система</p></header>`+
 `<section class="v29a-hero ${esc(i.tone||'')}"><div class="v29a-score"><b>${s.score}</b><small>/ 100</small>${trendBadge(s.trend)}</div><div class="v29a-verdict"><b>${esc(i.title||'')}</b><p>${esc(i.text||'')}</p></div></section>`+
 `<div class="v29a-domains">${domains.join('')}</div>`+
 `<button type="button" class="v29a-week" data-v27-week><span>НЕДЕЛЬНЫЙ ОБЗОР</span><b>${esc(w.title||i.title||'')}</b><small>${esc(w.summary||'')}</small></button>`+
 focusBlock+
 `<button type="button" class="v29a-toggle" data-v29a-toggle>${expanded?'Скрыть графики и историю':'Показать графики и историю'}</button>`+
 `<div class="v29a-tools"><span>ДАННЫЕ</span><div><button type="button" data-v29a-tool="backup">Резервная копия</button><button type="button" data-v29a-tool="export">Экспорт</button><button type="button" data-v29a-tool="import">Импорт</button></div></div>`+
 `</div>`;
}
function applyExpanded(){const s=screen();if(s)s.classList.toggle('v29a-expanded',expanded)}
function render(){
 if(!MOBILE())return;
 const s=screen();if(!s)return;
 claim();
 s.classList.add('v29a-ready');
 applyExpanded();
 const html=page(),sig=expanded+'|'+html;
 if(sig===last)return;last=sig;
 let root=document.getElementById('v29Analytics');
 if(!root){root=document.createElement('div');root.id='v29Analytics';s.prepend(root)}
 root.innerHTML=html;
}
function route(name){document.querySelector(`[data-v29-nav="${name}"]`)?.click()}
function tool(name){const id=name==='backup'?'stackBackupBtn':name==='export'?'exportBtn':name==='import'?'importBtn':'';document.getElementById(id)?.click()}
function schedule(delay=0){if(delay){setTimeout(render,delay);return}render()}
const css=`@media(max-width:720px){
#screenAnalytics.v29a-ready>#v24More,#screenAnalytics.v29a-ready>#v282AnalyticsSummary{display:none!important}
#screenAnalytics.v29a-ready:not(.v29a-expanded)>#kpis,#screenAnalytics.v29a-ready:not(.v29a-expanded)>.mobile-kpi-hint,#screenAnalytics.v29a-ready:not(.v29a-expanded)>.analytics,#screenAnalytics.v29a-ready:not(.v29a-expanded)>.trend-panel{display:none!important}
#v29Analytics,#v29Analytics *{box-sizing:border-box;min-width:0}
.v29a-page{display:grid;gap:10px;padding:2px 2px 10px}
.v29a-kicker{font-size:9px;letter-spacing:.1em;color:#8290a6;font-weight:900}
.v29a-page h1{margin:3px 0 0;font-size:28px;line-height:1;color:#fff;text-shadow:0 0 18px #9133e455}
.v29a-page header p{margin:6px 0 0;color:#8b9aae;font-size:11px}
.v29a-hero{padding:15px;border:1px solid #563079;border-radius:18px;background:radial-gradient(circle at 90% 0,#9133e429,transparent 45%),linear-gradient(155deg,#071522,#030914)}
.v29a-hero.bad{border-color:#773349}
.v29a-hero.good{border-color:#287550}
.v29a-score{display:flex;align-items:baseline;gap:5px}
.v29a-score b{font-size:42px;line-height:1;color:#fff}
.v29a-score small{color:#8290a6;font-size:10px}
.v29a-trend{margin-left:auto;font-size:11px;font-weight:900;padding:4px 8px;border-radius:999px;border:1px solid #29415f;color:#9caabf}
.v29a-trend.up{color:#7be66a;border-color:#2c5e3a}
.v29a-trend.down{color:#ff7892;border-color:#5e2c39}
.v29a-trend.flat{color:#8b9aae}
.v29a-verdict{margin-top:9px}
.v29a-verdict b{display:block;font-size:15px}
.v29a-verdict p{margin:5px 0 0;color:#98a7b9;font-size:10px;line-height:1.5}
.v29a-domains{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.v29a-domain{min-height:64px;padding:10px;border:1px solid #1d3d58;border-radius:13px;background:#050e19;color:#eef4ff;text-align:left}
.v29a-domain span{display:block;color:#8290a6;font-size:8px;letter-spacing:.06em}
.v29a-domain b{display:block;margin-top:6px;font-size:19px}
.v29a-week,.v29a-onboard{width:100%;min-height:44px;border:1px solid #7134ad;border-radius:11px;background:#140c24;color:#fff;padding:10px;text-align:left}
.v29a-week span{display:block;font-size:8px;color:#9d8ab5}
.v29a-week b{display:block;margin-top:4px;font-size:11px}
.v29a-week small{display:block;margin-top:4px;color:#8e9eb2;font-size:8px;line-height:1.4}
.v29a-onboard{text-align:center;font-size:10px;font-weight:900}
.v29a-focus{padding:11px;border-left:2px solid #0eb1db;background:#071723;border-radius:0 12px 12px 0}
.v29a-focus span{display:block;font-size:8px;color:#8b9aae}
.v29a-focus b{display:block;margin-top:4px;font-size:11px}
.v29a-toggle{width:100%;min-height:44px;border:1px solid #244b69;border-radius:11px;background:#071522;color:#dffaff;font-size:10px;font-weight:900}
.v29a-tools{margin-top:2px}
.v29a-tools>span{display:block;margin-bottom:6px;font-size:8px;color:#8290a6;letter-spacing:.06em}
.v29a-tools>div{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.v29a-tools button{min-height:44px;border:1px solid #29415f;border-radius:10px;background:#050e19;color:#c9d4e2;font-size:9px}
}`;
function install(){if(document.getElementById('stackV29AnalyticsStyle'))return;const s=document.createElement('style');s.id='stackV29AnalyticsStyle';s.textContent=css;document.head.appendChild(s)}
function onClick(e){
 const t=e.target.closest?.('[data-v29a-toggle]');if(t){expanded=!expanded;last='';render();return}
 const r=e.target.closest?.('[data-v29a-route]');if(r){route(r.dataset.v29aRoute);return}
 const b=e.target.closest?.('[data-v29a-tool]');if(b){tool(b.dataset.v29aTool);return}
}
function boot(){
 install();claim();render();
 document.addEventListener('click',onClick);
 window.addEventListener('stack:data-changed',()=>schedule());
 window.addEventListener('stack:data-ready',()=>schedule());
 window.addEventListener('resize',()=>schedule());
 window.addEventListener('focus',()=>schedule());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 setTimeout(()=>schedule(),700);
 setTimeout(()=>schedule(),1900);
 setTimeout(()=>schedule(),3500);
 globalThis.STACK_ANALYTICS_V29=Object.freeze({build:BUILD,render});
 console.info('STACK',BUILD);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
