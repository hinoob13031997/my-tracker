/* STACK v29.44 — shared kernel for v29 section-owner modules (Analytics,
   Finance, ...). Each owner still renders its own markup/logic; only the
   repeated lifecycle wiring (inject style once, react to data/resize/focus
   events) is shared, so a new update follows one proven pattern instead of
   every owner reimplementing (and re-bugging) its own event plumbing. */
(()=>{'use strict';
const BUILD='29.44.0';
function installStyle(id,css){if(document.getElementById(id))return;const s=document.createElement('style');s.id=id;s.textContent=css;document.head.appendChild(s)}
const DEFAULT_EVENTS=['stack:data-changed','stack:data-ready','resize'];
function onRenderTriggers(fn,{extra=[]}={}){
 let queued=false;
 function run(){queued=false;fn()}
 function schedule(){if(queued)return;queued=true;queueMicrotask(run)}
 [...DEFAULT_EVENTS,...extra].forEach(name=>window.addEventListener(name,schedule));
 window.addEventListener('focus',schedule);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 return schedule;
}
Object.defineProperty(globalThis,'STACK_OWNER_KIT',{value:Object.freeze({build:BUILD,installStyle,onRenderTriggers}),configurable:true});
console.info('STACK',BUILD);
})();
