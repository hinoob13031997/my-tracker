/* STACK v22.34 — event-driven per-goal FX history renderer on shared STACK_FX. Read-only. */
(()=>{'use strict';
const HKEY='stack_fx_history_v1';
const D=()=>globalThis.STACK_DATA,F=()=>globalThis.STACK_FX;
let refreshTimer=0;
const fmt=(v,n=2)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:n}).format(Number(v)||0);
function goals(){return D()?.goals?.()||[]}
function selected(){
  const id=D()?.main?.()?.savings?.selectedId;
  return goals().find(g=>g?.id===id)||null
}
function css(){
  if(document.getElementById('v2213css'))return;
  let s=document.createElement('style');s.id='v2213css';
  s.textContent=`.v2213fx{margin:10px 0;border:1px solid #24415f;border-radius:14px;padding:12px;background:#06101d}.v2213ttl{font-size:9px;font-weight:900;color:#e9eef8;margin-bottom:9px}.v2213sub{font-size:7px;color:#7d8ca2;margin-top:2px}.v2213grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.v2213k{border:1px solid #1d3653;border-radius:10px;padding:9px;background:#071523}.v2213k span{display:block;font-size:6px;color:#7d8ca2;line-height:1.3}.v2213k b{display:block;font-size:12px;margin-top:5px}.v2213pos{color:#68d43f}.v2213neg{color:#f04b6c}.v2213row{display:grid;grid-template-columns:62px 1fr auto;gap:7px;align-items:center;border-top:1px solid #14283f;padding:8px 0;font-size:7px;color:#93a0b3}.v2213row b{color:#e8edf6}.v2213native{color:#c4d0e0}.v2213wait{font-size:7px;color:#8391a6;margin-top:8px}@media(max-width:390px){.v2213grid{grid-template-columns:1fr}.v2213row{grid-template-columns:55px 1fr}.v2213row b{grid-column:2}}`;
  document.head.appendChild(s)
}
function render(){
  css();
  let root=document.getElementById('savHistory'),old=document.getElementById('v2213fx');
  if(!root)return;
  if(old)old.remove();
  let api=F(),g=selected();
  if(!api||!g||api.currency(g?.currency)==='RUB')return;
  let c=api.currency(g.currency),nowRate=api.currentRate(c),paid=0,now=0,rows=[],missing=0;
  for(const t of (D()?.transactions?.(g)||[])){
    if(!t?.date)continue;
    let x=api.transactionRate(g,t),r=Number(x?.rate)||0,a=Number(t?.amount)||0;
    if(!r)r=nowRate;
    if(x?.source==='current-fallback')missing++;
    paid+=a*r;
    now+=a*nowRate;
    rows.push({t,r,rub:a*r,source:x?.source})
  }
  let diff=now-paid,b=document.createElement('div');
  b.id='v2213fx';b.className='v2213fx';
  b.innerHTML=`<div class="v2213ttl">ВАЛЮТА · ${c}<div class="v2213sub">Сравнение рублёвой стоимости без изменения суммы цели</div></div><div class="v2213grid"><div class="v2213k"><span>ПО КУРСУ ЦБ НА ДАТЫ ОПЕРАЦИЙ</span><b>${fmt(paid,0)} ₽</b></div><div class="v2213k"><span>СТОИМОСТЬ СЕЙЧАС</span><b>${fmt(now,0)} ₽</b></div><div class="v2213k"><span>ИЗМЕНЕНИЕ ИЗ-ЗА КУРСА</span><b class="${diff>=0?'v2213pos':'v2213neg'}">${diff>=0?'+':''}${fmt(diff,0)} ₽</b></div></div>${missing?`<div class="v2213wait">Исторический курс загружается для ${missing} операций…</div>`:''}${rows.slice().sort((a,b)=>String(b.t.date).localeCompare(String(a.t.date))).map(x=>`<div class="v2213row"><span>${new Date(x.t.date+'T12:00:00').toLocaleDateString('ru-RU')}</span><span><span class="v2213native">${Number(x.t.amount)>=0?'+':''}${fmt(x.t.amount)} ${c}</span> · ${fmt(x.r)} ₽/${c}</span><b>${Number(x.rub)>=0?'+':''}${fmt(x.rub,0)} ₽</b></div>`).join('')}`;
  root.appendChild(b)
}
function refresh(force=false){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(render,force?0:60)
}
function installEvents(){
  document.getElementById('screenSavings')?.addEventListener('click',()=>refresh(false));
  window.addEventListener('stack:fx-ready',()=>refresh(true));
  window.addEventListener('stack:data-ready',()=>refresh(true));
  window.addEventListener('stack:data-changed',()=>refresh(false));
  window.addEventListener('stack:fx-history-changed',()=>refresh(false));
  window.addEventListener('storage',e=>{
    const k=D()?.keys||{};
    if([k.main,k.fx,HKEY].includes(e.key))refresh(false)
  });
  window.addEventListener('focus',()=>refresh(false));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh(false)})
}
function init(){css();installEvents();refresh(true);console.info('STACK v22.34 FX history renderer on shared engine')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,900),{once:true});else setTimeout(init,900)
})();