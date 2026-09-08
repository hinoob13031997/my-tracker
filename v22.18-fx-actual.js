/* STACK v22.37 — actual FX purchase cost on shared STACK_DATA/STACK_FX + data events. */
(()=>{'use strict';
const MKEY='stack_fx_dash_month_v1',HKEY='stack_fx_history_v1';
const D=()=>globalThis.STACK_DATA,F=()=>globalThis.STACK_FX;
let installed=false;
const liveGoals=()=>Array.isArray(globalThis.state?.savings?.goals)?globalThis.state.savings.goals:(D()?.goals?.()||[]);
const selected=()=>{
  try{if(typeof globalThis.selectedSavingsGoal==='function'){const g=globalThis.selectedSavingsGoal();if(g)return g}}catch(e){}
  let s=globalThis.state?.savings||D()?.savings?.();if(!s)return null;
  let a=liveGoals().filter(g=>(D()?.goalCurrency?.(g)||'RUB')===(D()?.currency?.(s.currency)||'RUB'));
  return a.find(g=>g.id===s.selectedId)||a[0]||null
};
const fmt=(v,n=2)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:n}).format(Number(v)||0);
const key=(g,t)=>F()?.txKey?.(g,t)||(t?.id||[g?.id,t?.date,t?.amount,t?.note||''].join('|'));
function emit(source='fx-actual'){
  try{window.dispatchEvent(new CustomEvent('stack:data-changed',{detail:{source}}))}catch(e){}
  try{window.dispatchEvent(new CustomEvent('stack:fx-history-changed',{detail:{source}}))}catch(e){}
}
function addField(){
  let amount=document.getElementById('stAmount');if(!amount||document.getElementById('stRubCost'))return;
  let row=document.createElement('div');row.className='form-row';row.id='stRubCostRow';
  row.innerHTML='<label>Списано в рублях <small style="color:#7f899c">для расчёта фактического курса</small></label><input id="stRubCost" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Например, 9000"><div id="stActualRate" style="font-size:9px;color:#7f899c;margin-top:5px"></div>';
  amount.closest('.form-row')?.after(row);
  let calc=()=>{let g=selected(),a=Math.abs(Number(amount.value)||0),rub=Math.abs(Number(document.getElementById('stRubCost')?.value)||0),c=D()?.goalCurrency?.(g)||'RUB',out=document.getElementById('stActualRate');if(!out)return;out.textContent=(c!=='RUB'&&a>0&&rub>0)?`Фактический курс: ${fmt(rub/a,2)} ₽/${c}`:''};
  amount.addEventListener('input',calc);document.getElementById('stRubCost').addEventListener('input',calc)
}
function showField(){
  addField();let g=selected(),row=document.getElementById('stRubCostRow'),inp=document.getElementById('stRubCost');if(!row)return;
  let foreign=g&&(D()?.goalCurrency?.(g)||'RUB')!=='RUB';row.style.display=foreign?'block':'none';if(inp)inp.value='';
  let out=document.getElementById('stActualRate');if(out)out.textContent=''
}
function patchOpen(){
  if(typeof globalThis.openSavingsTx!=='function'||globalThis.openSavingsTx.__v2237)return false;
  let old=globalThis.openSavingsTx;
  globalThis.openSavingsTx=function(t){old(t);setTimeout(showField,0)};
  globalThis.openSavingsTx.__v2237=1;return true
}
function patchSave(){
  if(typeof globalThis.saveSavingsTx!=='function'||globalThis.saveSavingsTx.__v2237)return false;
  let old=globalThis.saveSavingsTx;
  globalThis.saveSavingsTx=function(){
    let g=selected(),foreign=g&&(D()?.goalCurrency?.(g)||'RUB')!=='RUB',rub=foreign?Math.abs(Number(document.getElementById('stRubCost')?.value)||0):0,date=document.getElementById('stDate')?.value||'',before=g?.tx?.length||0;
    old();
    let after=g?.tx?.length||0,historyChanged=false;
    if(after>before){
      let t=g.tx[after-1];
      if(rub>0&&Number(t.amount)){
        t.rubAmount=rub;t.actualRate=rub/Math.abs(Number(t.amount));
        try{let h=F()?.history?.()||{};h[key(g,t)]={rate:t.actualRate,source:'actual',rateDate:t.date,date:t.date,currency:D()?.goalCurrency?.(g)||g.currency,rubAmount:rub};localStorage.setItem(HKEY,JSON.stringify(h));historyChanged=true}catch(e){}
        try{if(typeof globalThis.save==='function')globalThis.save()}catch(e){}
      }
      if(date&&/^\d{4}-\d{2}/.test(date)){try{localStorage.setItem(MKEY,date.slice(0,7))}catch(e){}}
    }
    try{globalThis.renderSavings?.()}catch(e){}
    emit(historyChanged?'fx-actual-history':'fx-actual')
  };
  globalThis.saveSavingsTx.__v2237=1;
  let b=document.getElementById('stSave');if(b)b.onclick=globalThis.saveSavingsTx;
  return true
}
function patchExisting(){
  let changed=false;
  try{
    let h=F()?.history?.()||{};
    for(const g of liveGoals()){
      if((D()?.goalCurrency?.(g)||'RUB')==='RUB')continue;
      for(const t of (D()?.transactions?.(g)||[])){
        if(Number(t.actualRate)>0){
          let k=key(g,t);
          if(h[k]?.source!=='actual'||Number(h[k].rate)!==Number(t.actualRate)){h[k]={rate:Number(t.actualRate),source:'actual',rateDate:t.date,date:t.date,currency:D()?.goalCurrency?.(g)||g.currency,rubAmount:Number(t.rubAmount)||0};changed=true}
        }
      }
    }
    if(changed){localStorage.setItem(HKEY,JSON.stringify(h));emit('fx-actual-backfill')}
  }catch(e){}
}
function init(){
  addField();let a=patchOpen(),b=patchSave();patchExisting();if(a&&b)installed=true;if(!installed)setTimeout(init,500);
  console.info('STACK v22.37 actual FX on shared engine')
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1800),{once:true});else setTimeout(init,1800)
})();