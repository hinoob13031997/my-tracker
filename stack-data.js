/* STACK Data Layer v1 — read-only shared access. No migrations, no writes. */
(()=>{'use strict';
const KEYS=Object.freeze({main:'stack_neon_mix9_calendar_v1',income:'stack_income_tracker_v1',fx:'stack_fx_cbr_v1',fxHistory:'stack_fx_history_v1',taskDetails:'stack_task_details_v227'});
function read(key,fallback={}){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:fallback}catch(e){return fallback}}
function main(){return read(KEYS.main,{})}function income(){return read(KEYS.income,{})}function savings(){return main()?.savings||{}}function goals(){const a=savings()?.goals;return Array.isArray(a)?a:[]}
function currency(v){let c=String(v||'RUB').toUpperCase();if(c==='₽')c='RUB';if(c==='$')c='USD';if(c==='€')c='EUR';return ['RUB','USD','EUR'].includes(c)?c:'RUB'}
function goalCurrency(g){return currency(g?.currency)}function transactions(g){return Array.isArray(g?.tx)?g.tx:(Array.isArray(g?.transactions)?g.transactions:[])}
function fxCache(){return read(KEYS.fx,{})}function rate(c){c=currency(c);if(c==='RUB')return 1;const f=fxCache();return Number(globalThis.FX?.[c])||Number(f?.[c])||Number(f?.rates?.[c])||0}
function balance(g){return (Number(g?.start??g?.current)||0)+transactions(g).reduce((s,t)=>s+(Number(t?.amount)||0),0)}
function monthTransactions(g,k){return transactions(g).filter(t=>String(t?.date||'').slice(0,7)===k)}
function savedNative(c,k){c=currency(c);let n=0;for(const g of goals()){if(goalCurrency(g)!==c)continue;for(const t of monthTransactions(g,k))n+=Number(t?.amount)||0}return n}
function savedRubEquivalent(k){let n=0;for(const g of goals()){const r=rate(goalCurrency(g));if(!r)continue;for(const t of monthTransactions(g,k))n+=(Number(t?.amount)||0)*r}return n}
const api=Object.freeze({version:1,keys:KEYS,read,main,income,savings,goals,currency,goalCurrency,transactions,fxCache,rate,balance,monthTransactions,savedNative,savedRubEquivalent});
Object.defineProperty(globalThis,'STACK_DATA',{value:api,writable:false,configurable:true});
window.dispatchEvent(new CustomEvent('stack:data-ready',{detail:{version:1}}));
console.info('STACK Data Layer v1 ready');
})();