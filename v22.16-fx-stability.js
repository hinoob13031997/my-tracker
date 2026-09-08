/* STACK v22.38 — event-driven FX history repair with explicit fallback state. */
(()=>{'use strict';
const HKEY='stack_fx_history_v1';
const D=()=>globalThis.STACK_DATA,F=()=>globalThis.STACK_FX;
let busy=false,last='',refreshTimer=0;
const fmt=(v,n=0)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:n}).format(Number(v)||0);
function goals(){return D()?.goals?.()||[]}
function history(){return F()?.history?.()||{}}
function currency(){
  let a=[...document.querySelectorAll('#screenSavings button,.sav-currency-tabs button,.sav-tabs button')].find(x=>x.classList.contains('active')||x.getAttribute('aria-selected')==='true'),t=(a?.textContent||'').toUpperCase();
  if(t.includes('USD')||t.includes('ДОЛЛ')||t.includes('$'))return'USD';
  if(t.includes('EUR')||t.includes('ЕВРО')||t.includes('€'))return'EUR';
  let c=D()?.main?.()?.savings?.currency;
  return c==='USD'||c==='EUR'?c:null
}
async function fetchHistorical(date,c){
  if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  let base=new Date(date+'T12:00:00');
  for(let off=0;off<=10;off++){
    let d=new Date(base);d.setDate(d.getDate()+off);
    let y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    try{
      let r=await fetch(`https://www.cbr-xml-daily.ru/archive/${y}/${m}/${day}/daily_json.js`,{cache:'force-cache'});
      if(!r.ok)continue;
      let j=await r.json(),v=j?.Valute?.[c];
      if(v)return {rate:Number(v.Value)/Number(v.Nominal||1),source:'CBR',rateDate:`${y}-${m}-${day}`}
    }catch(e){}
  }
  return null
}
function fallbackEntry(date,c,kind){
  const r=Number(F()?.currentRate?.(c))||0;
  return r?{rate:r,source:'current-fallback',rateDate:new Date().toISOString().slice(0,10),date:date||'',currency:c,kind:kind||'tx'}:null
}
async function repairHistory(){
  if(busy||!F())return;
  busy=true;
  let h=history(),changed=false;
  try{
    for(const g of goals()){
      let c=F().currency(g?.currency);
      if(c==='RUB')continue;
      let start=Number(g?.start??g?.current)||0;
      if(start&&g?.startDate){
        let sk=F().startKey(g),old=h[sk];
        if(!((old?.source==='CBR'||old?.source==='actual')&&Number(old.rate)>0)){
          let got=await fetchHistorical(g.startDate,c);
          if(got){h[sk]={...got,date:g.startDate,currency:c,kind:'start'};changed=true}
          else if(!old){let fb=fallbackEntry(g.startDate,c,'start');if(fb){h[sk]=fb;changed=true}}
        }
      }
      for(const t of (D()?.transactions?.(g)||[])){
        if(!t?.date)continue;
        let k=F().txKey(g,t),old=h[k];
        if(Number(t.actualRate)>0){
          if(old?.source!=='actual'||Number(old.rate)!==Number(t.actualRate)){
            h[k]={rate:Number(t.actualRate),source:'actual',rateDate:t.date,date:t.date,currency:c,rubAmount:Number(t.rubAmount)||0};changed=true
          }
          continue
        }
        if((old?.source==='CBR'||old?.source==='actual')&&Number(old.rate)>0)continue;
        let got=await fetchHistorical(t.date,c);
        if(got){h[k]={...got,date:t.date,currency:c};changed=true}
        else if(!old){let fb=fallbackEntry(t.date,c,'tx');if(fb){h[k]=fb;changed=true}}
      }
    }
    if(changed){
      try{localStorage.setItem(HKEY,JSON.stringify(h))}catch(e){}
      window.dispatchEvent(new CustomEvent('stack:fx-history-changed'))
    }
  }finally{busy=false;renderFx()}
}
function renderFx(){
  let c=currency(),box=document.getElementById('v2214fx'),api=F();
  if(!c||!box||!api)return;
  let x=api.portfolio(c),r=x.currentRate,cards=box.querySelectorAll('.v2214card b');
  if(cards[0])cards[0].textContent=r?fmt(x.costRub)+' ₽':'—';
  if(cards[1])cards[1].textContent=r?fmt(x.nowRub)+' ₽':'—';
  if(cards[2]){cards[2].textContent=r?(x.diffRub>=0?'+':'')+fmt(x.diffRub)+' ₽':'—';cards[2].classList.toggle('v2214pos',x.diffRub>=0);cards[2].classList.toggle('v2214neg',x.diffRub<0)}
  let foot=box.querySelector('.v2214rate');
  if(foot){let extra=x.actual?` · <span style="color:#68d43f">фактический курс: ${x.actual} оп.</span>`:x.pending?` · <span style="color:#e0ad37">уточняем исторический курс: ${x.pending}</span>`:x.fallback?` · <span style="color:#e0ad37">для ${x.fallback} поз. используется текущий курс</span>`:` · <span style="color:#68d43f">исторические курсы ЦБ: ${x.known}</span>`;foot.innerHTML=`Всего: ${fmt(x.native,2)} ${c} · текущий курс ${r?fmt(r,2)+' ₽/'+c:'загрузка курса…'}${extra}`}
  box.dataset.v2238='1'
}
function signature(){return goals().map(g=>[g?.id,g?.currency,g?.start,g?.startDate,(D()?.transactions?.(g)||[]).map(t=>[t?.id,t?.date,t?.amount,t?.actualRate,t?.rubAmount]).join(':')].join('|')).join(';')+'|'+JSON.stringify(D()?.fxCache?.()||{})}
function refresh(force=false){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{renderFx();let sig=signature();if(force||sig!==last){last=sig;repairHistory()}},force?0:80)}
function installEvents(){
  document.getElementById('screenSavings')?.addEventListener('click',()=>refresh(false));
  window.addEventListener('stack:fx-ready',()=>refresh(true));
  window.addEventListener('stack:data-ready',()=>refresh(true));
  window.addEventListener('stack:data-changed',()=>refresh(false));
  window.addEventListener('stack:fx-history-changed',()=>renderFx());
  window.addEventListener('storage',e=>{const k=D()?.keys||{};if([k.main,k.fx,HKEY].includes(e.key))refresh(false)});
  window.addEventListener('focus',()=>refresh(false));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh(false)})
}
function init(){installEvents();refresh(true);console.info('STACK v22.38 FX history fallback state')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1500),{once:true});else setTimeout(init,1500)
})();