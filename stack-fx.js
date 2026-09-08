/* STACK FX Engine v1 — shared read/calculation layer. No DOM, no savings writes, no migrations. */
(()=>{'use strict';
const D=()=>globalThis.STACK_DATA,HKEY='stack_fx_history_v1';
function history(){try{const h=JSON.parse(localStorage.getItem(HKEY)||'{}');return h&&typeof h==='object'?h:{}}catch(e){return{}}}
function currency(v){return D()?.currency?.(v)||'RUB'}
function currentRate(c){c=currency(c);return c==='RUB'?1:(Number(D()?.rate?.(c))||0)}
function txKey(g,t){return t?.id||[g?.id,t?.date,t?.amount,t?.note||''].join('|')}
function startKey(g){return ['start',g?.id,g?.startDate||'',currency(g?.currency)].join('|')}
function historicalEntry(g,t){return history()[txKey(g,t)]||null}
function transactionRate(g,t){const c=currency(g?.currency);if(c==='RUB')return {rate:1,source:'RUB',rateDate:t?.date||''};const actual=Number(t?.actualRate)||0;if(actual>0)return {rate:actual,source:'actual',rateDate:t?.date||'',rubAmount:Number(t?.rubAmount)||0};const h=historicalEntry(g,t),r=Number(h?.rate)||0;if(r>0)return {rate:r,source:h?.source||'history',rateDate:h?.rateDate||t?.date||'',rubAmount:Number(h?.rubAmount)||0};return {rate:currentRate(c),source:'current-fallback',rateDate:'',rubAmount:0}}
function activeGoals(c){c=currency(c);return (D()?.goals?.()||[]).filter(g=>currency(g?.currency)===c&&g?.status!=='archived')}
function portfolio(c){c=currency(c);const nowRate=currentRate(c),h=history();let native=0,costRub=0,known=0,missing=0,actual=0;for(const g of activeGoals(c)){let start=Number(g?.start??g?.current)||0,n=start;if(start){const sh=h[startKey(g)],sr=Number(sh?.rate)||0;if(sr>0&&(sh?.source==='CBR'||sh?.source==='actual')){costRub+=start*sr;known++;if(sh.source==='actual')actual++}else{costRub+=start*nowRate;missing++}}for(const t of (D()?.transactions?.(g)||[])){const a=Number(t?.amount)||0;n+=a;const x=transactionRate(g,t);if(x.rate>0&&(x.source==='CBR'||x.source==='actual')){costRub+=a*x.rate;known++;if(x.source==='actual')actual++}else{costRub+=a*nowRate;missing++}}native+=n}const nowRub=native*nowRate;return {currency:c,native,currentRate:nowRate,costRub,nowRub,diffRub:nowRub-costRub,known,missing,actual}}
const api=Object.freeze({version:1,history,currency,currentRate,txKey,startKey,historicalEntry,transactionRate,activeGoals,portfolio});
Object.defineProperty(globalThis,'STACK_FX',{value:api,writable:false,configurable:true});
window.dispatchEvent(new CustomEvent('stack:fx-ready',{detail:{version:1}}));
console.info('STACK FX Engine v1 ready');
})();