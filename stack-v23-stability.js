/* STACK v23.23 — whole-app navigation, touch and overlay stability. */
(()=>{'use strict';
const BUILD='v23.23-whole-app-stability';
const SCREEN_IDS=new Set(['screenToday','screenTasks','screenTracker','screenSavings','screenAnalytics']);
const OVERLAY_SELECTOR='.app-modal.active,.v2212-modal.open,.v227-modal.open,.v235-modal.open,.fx-sheet';
const CLOSE_SELECTOR='.fx-close,.v235-close,.v2212-close,.v227-close,.modal-close,[data-close-sav],#closeDetailModal';
let previousFocus=null;

function installStyle(){
  if(document.getElementById('stackV23StabilityStyle'))return;
  const style=document.createElement('style');
  style.id='stackV23StabilityStyle';
  style.textContent=`
    button,[role="button"],a{-webkit-tap-highlight-color:transparent}
    button{touch-action:manipulation}
    ${OVERLAY_SELECTOR}{overscroll-behavior:contain}
    @media(max-width:720px){
      #mobileNav button,.v23-open,.v233-tabs button,.fx-tabs button,.fx-btn,.fx-close,
      .v235-close,.v235-save,.v2212-close,.v2212-save,.v2212-delete,
      .modal-close,[data-close-sav],#closeDetailModal{min-height:44px}
      #mobileNav{padding-bottom:max(7px,env(safe-area-inset-bottom))}
    }
    @media(prefers-reduced-motion:reduce){
      *,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}
    }
  `;
  document.head.appendChild(style);
}

function openScreen(id,source='navigation'){
  if(!SCREEN_IDS.has(id)||!document.getElementById(id))return false;
  document.querySelectorAll('.mobile-screen,.today-screen').forEach(screen=>{
    const active=screen.id===id;
    screen.classList.toggle('active',active);
    screen.setAttribute('aria-hidden',active?'false':'true');
  });
  document.querySelectorAll('#mobileNav [data-screen]').forEach(button=>{
    const active=button.dataset.screen===id;
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
    if(!button.hasAttribute('type'))button.setAttribute('type','button');
  });
  document.body.classList.toggle('savings-active',id==='screenSavings');
  try{sessionStorage.setItem('stack_v23_screen',id)}catch(_e){}
  window.dispatchEvent(new CustomEvent('stack:screen-change',{detail:{id,source}}));
  return true;
}

function savedScreen(){
  try{const id=sessionStorage.getItem('stack_v23_screen');return SCREEN_IDS.has(id)?id:null}catch(_e){return null}
}

function currentScreen(){
  const active=document.querySelector('.mobile-screen.active,.today-screen.active');
  return active&&SCREEN_IDS.has(active.id)?active.id:null;
}

function handleNavigation(event){
  if(innerWidth>720)return;
  const target=event.target.closest?.('#mobileNav [data-screen],[data-v23-open]');
  if(!target)return;
  const id=target.dataset.screen||target.dataset.v23Open;
  if(!SCREEN_IDS.has(id))return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openScreen(id,target.dataset.screen?'bottom-nav':'shortcut');
}

function activeOverlays(){return [...document.querySelectorAll(OVERLAY_SELECTOR)]}

function isOverlayOpen(node){
  return node?.matches?.(OVERLAY_SELECTOR)||Boolean(node?.querySelector?.(OVERLAY_SELECTOR));
}

function prepareOverlay(overlay){
  if(!overlay||overlay.dataset.stackStable==='1')return;
  overlay.dataset.stackStable='1';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  requestAnimationFrame(()=>{
    const focusable=overlay.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])');
    if(focusable&&overlay.matches(OVERLAY_SELECTOR)&&!overlay.contains(document.activeElement))focusable.focus({preventScroll:true});
  });
}

function restoreFocus(){
  const target=previousFocus;
  previousFocus=null;
  if(target?.isConnected)requestAnimationFrame(()=>target.focus({preventScroll:true}));
}

function syncOverlays(){
  const overlays=activeOverlays();
  overlays.forEach(prepareOverlay);
  document.body.classList.toggle('stack-overlay-open',overlays.length>0);
  if(!overlays.length)restoreFocus();
}

function closeTopOverlay(){
  const overlays=activeOverlays(),overlay=overlays.at(-1);
  if(!overlay)return false;
  const close=overlay.querySelector(CLOSE_SELECTOR);
  if(close){close.click();return true}
  if(overlay.classList.contains('fx-sheet'))overlay.remove();
  else{
    overlay.classList.remove('active');
    overlay.classList.remove('open');
  }
  syncOverlays();
  return true;
}

function handleKey(event){
  if(event.key==='Escape'&&closeTopOverlay()){
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

function annotateNav(){
  const nav=document.getElementById('mobileNav');
  if(!nav)return;
  nav.setAttribute('aria-label','Основная навигация');
  nav.querySelectorAll('[data-screen]').forEach(button=>{
    if(!button.hasAttribute('type'))button.setAttribute('type','button');
    const label=button.textContent.trim();
    if(label&&!button.hasAttribute('aria-label'))button.setAttribute('aria-label',label);
  });
}

function boot(){
  installStyle();
  annotateNav();
  if(innerWidth<=720)openScreen(savedScreen()||currentScreen()||'screenToday','restore');
  document.addEventListener('click',handleNavigation,true);
  document.addEventListener('keydown',handleKey,true);
  const observer=new MutationObserver(records=>{
    let navChanged=false,overlayChanged=false;
    for(const record of records){
      const target=record.target;
      if(target?.id==='mobileNav'||target?.closest?.('#mobileNav'))navChanged=true;
      if(isOverlayOpen(target)||[...record.addedNodes].some(isOverlayOpen)||[...record.removedNodes].some(isOverlayOpen))overlayChanged=true;
      if(record.type==='attributes'&&target?.matches?.('.app-modal,.v2212-modal,.v227-modal,.v235-modal,.fx-sheet'))overlayChanged=true;
    }
    if(navChanged){annotateNav();const id=savedScreen()||currentScreen()||'screenToday';openScreen(id,'nav-refresh')}
    if(overlayChanged)syncOverlays();
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  syncOverlays();
  globalThis.STACK_STABILITY=Object.freeze({build:BUILD,openScreen,closeTopOverlay});
  console.info('STACK stability',BUILD);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
