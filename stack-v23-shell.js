/* STACK v23.0 — unified mobile shell foundation. UI-only; existing data/storage semantics remain untouched. */
(()=>{'use strict';
const BUILD='v23.0-unified-shell';
const css=`
:root{--v23-bg:#020711;--v23-panel:#06101e;--v23-line:#1b2d49;--v23-cyan:#13d7e8;--v23-blue:#0877f3;--v23-purple:#9133e4;--v23-pink:#f12bb8;--v23-text:#eef4ff;--v23-muted:#8491a7}
@media(max-width:720px){
 body{background:radial-gradient(circle at 50% -15%,#101142 0,#030817 35%,#01050b 72%);padding-bottom:84px!important}
 .head,.variant,.mobile-hint,.foot{display:none!important}
 .app{padding-top:max(10px,env(safe-area-inset-top))!important}
 .mobile-nav{grid-template-columns:repeat(5,1fr)!important;border-top-color:#273565!important;background:rgba(1,5,14,.94)!important;box-shadow:0 -8px 30px #0877f314}
 .mobile-nav button{min-width:0!important;min-height:56px!important;font-size:8px!important;color:#7d8aa5!important}
 .mobile-nav button span{font-size:17px!important}
 .mobile-nav button.active{color:#f55bd1!important;text-shadow:0 0 7px #f12bb8,0 0 15px #9133e488!important}
 .neon,.today-card,.v2214fx,.fi-card{border-color:#263d69!important;box-shadow:0 0 16px #0877f314,inset 0 0 16px #9133e407!important}
 .today-hero{border-color:#5530a0!important;box-shadow:0 0 18px #9133e426!important}
 .today-status.done{box-shadow:0 0 8px var(--pc),0 0 16px color-mix(in srgb,var(--pc) 28%,transparent)!important}
 .btn{border-color:#453183!important;box-shadow:0 0 9px #9133e422!important}
 .modal-card{border-color:#7b37c6!important;box-shadow:0 0 28px #9133e444!important}
 #stackVersion{padding-bottom:max(84px,calc(env(safe-area-inset-bottom) + 70px))!important}
}
`;
function installStyle(){if(document.getElementById('stackV23ShellStyle'))return;const s=document.createElement('style');s.id='stackV23ShellStyle';s.textContent=css;document.head.appendChild(s)}
function installNav(){if(innerWidth>720)return;const nav=document.getElementById('mobileNav');if(!nav)return;const items=[['screenToday','◇','Сегодня'],['screenTasks','▤','Дела'],['screenTracker','⌁','Fitness'],['screenSavings','◉','Финансы'],['screenAnalytics','•••','Ещё']];nav.innerHTML=items.map(([screen,icon,label])=>`<button data-screen="${screen}"><span>${icon}</span>${label}</button>`).join('');const screens=[...document.querySelectorAll('.mobile-screen')];function open(id){screens.forEach(x=>x.classList.toggle('active',x.id===id));nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.screen===id));try{sessionStorage.setItem('stack_v23_screen',id)}catch(e){}}nav.querySelectorAll('button').forEach(b=>b.onclick=()=>open(b.dataset.screen));let start='screenToday';try{const x=sessionStorage.getItem('stack_v23_screen');if(items.some(i=>i[0]===x))start=x}catch(e){}open(start)}
function boot(){installStyle();installNav();console.info('STACK',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();