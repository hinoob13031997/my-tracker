/* STACK v22.41 — FX history repair-only worker. No aggregate DOM ownership. */
(()=>{'use strict';
const HKEY='stack_fx_history_v1';
const D=()=>globalThis.STACK_DATA,F=()=>globalThis.STACK_FX;
let busy=false,last='',refreshTimer=0;
function goals(){return D()?.goals?.()||[]}
function history(){return F()?.history?.()||{}}
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
function emitComplete(detail){
  try{window.dispatchEvent(new CustomEvent('stack:fx-repair-complete',{detail}))}catch(e){}
}
async function repairHistory(){
  if(busy||!F())return;
  busy=true;
  let h=history(),changed=false,cbr=0,fallback=0,actual=0;
  try{
    for(const g of goals()){
      let c=F().currency(g?.currency);
      if(c==='RUB')continue;
      let start=Number(g?.start??g?.current)||0;
      if(start&&g?.startDate){
        let sk=F().startKey(g),old=h[sk];
        if(!((old?.source==='CBR'||old?.source==='actual')&&Number(old.rate)>0)){
          let got=await fetchHistorical(g.startDate,c);
          if(got){h[sk]={...got,date:g.startDate,currency:c,kind:'start'};changed=true;cbr++}
          else if(!old){let fb=fallbackEntry(g.startDate,c,'start');if(fb){h[sk]=fb;changed=true;fallback++}}
        }
      }
      for(const t of (D()?.transactions?.(g)||[])){
        if(!t?.date)continue;
        let k=F().txKey(g,t),old=h[k];
        if(Number(t.actualRate)>0){
          if(old?.source!=='actual'||Number(old.rate)!==Number(t.actualRate)){
            h[k]={rate:Number(t.actualRate),source:'actual',rateDate:t.date,date:t.date,currency:c,rubAmount:Number(t.rubAmount)||0};changed=true;actual++
          }
          continue
        }
        if((old?.source==='CBR'||old?.source==='actual')&&Number(old.rate)>0)continue;
        let got=await fetchHistorical(t.date,c);
        if(got){h[k]={...got,date:t.date,currency:c};changed=true;cbr++}
        else if(!old){let fb=fallbackEntry(t.date,c,'tx');if(fb){h[k]=fb;changed=true;fallback++}}
      }
    }
    if(changed){
      try{localStorage.setItem(HKEY,JSON.stringify(h))}catch(e){}
      window.dispatchEvent(new CustomEvent('stack:fx-history-changed',{detail:{source:'fx-repair'}}))
    }
    emitComplete({changed,cbr,fallback,actual})
  }catch(e){
    emitComplete({changed:false,error:true})
  }finally{busy=false}
}
function signature(){return goals().map(g=>[g?.id,g?.currency,g?.start,g?.startDate,(D()?.transactions?.(g)||[]).map(t=>[t?.id,t?.date,t?.amount,t?.actualRate,t?.rubAmount]).join(':')].join('|')).join(';')+'|'+JSON.stringify(D()?.fxCache?.()||{})}
function refresh(force=false){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{let sig=signature();if(force||sig!==last){last=sig;repairHistory()}},force?0:80)
}
function installEvents(){
  window.addEventListener('stack:fx-ready',()=>refresh(true));
  window.addEventListener('stack:data-ready',()=>refresh(true));
  window.addEventListener('stack:data-changed',()=>refresh(false));
  window.addEventListener('storage',e=>{const k=D()?.keys||{};if([k.main,k.fx,HKEY].includes(e.key))refresh(false)});
  window.addEventListener('focus',()=>refresh(true));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh(true)})
}
function init(){installEvents();refresh(true);console.info('STACK v22.41 FX repair-only worker')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1500),{once:true});else setTimeout(init,1500)
})();