/* STACK v22.39 — central currency-switch scroll lock for iPhone/VK WebView. */
(()=>{'use strict';
let lock=null,timers=[];
function isCurrencyButton(el){let b=el?.closest?.('button');if(!b)return null;let t=(b.textContent||'').trim().toUpperCase();if(t==='₽'||t==='RUB'||t.includes('РУБ'))return b;if(t==='$'||t==='USD'||t.includes('ДОЛЛ'))return b;if(t==='€'||t==='EUR'||t.includes('ЕВРО'))return b;return null}
function clear(){timers.forEach(clearTimeout);timers=[];lock=null}
function capture(el){const b=isCurrencyButton(el);if(!b)return;const tabs=b.parentElement||b;const r=tabs.getBoundingClientRect();lock={tabs,top:r.top,scrollY:window.scrollY,at:Date.now()};document.documentElement.classList.add('stack-scroll-lock')}
function restore(){if(!lock)return;const {tabs,top,scrollY}=lock;if(!tabs?.isConnected){try{window.scrollTo(0,scrollY)}catch(e){};return}const now=tabs.getBoundingClientRect().top,delta=now-top,target=Math.max(0,window.scrollY+delta);try{window.scrollTo({top:target,left:0,behavior:'instant'})}catch(e){window.scrollTo(0,target)}}
function schedule(){if(!lock)return;timers.forEach(clearTimeout);timers=[];[0,40,100,180,300,480].forEach(ms=>timers.push(setTimeout(()=>{restore();if(ms===480){document.documentElement.classList.remove('stack-scroll-lock');lock=null}},ms)))}
function boot(){document.addEventListener('pointerdown',e=>capture(e.target),true);document.addEventListener('touchstart',e=>capture(e.target),{capture:true,passive:true});document.addEventListener('click',e=>{if(isCurrencyButton(e.target)){if(!lock)capture(e.target);schedule()}},true);window.addEventListener('stack:data-changed',()=>schedule());window.addEventListener('stack:fx-history-changed',()=>schedule());console.info('STACK v22.39 central currency scroll lock')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();