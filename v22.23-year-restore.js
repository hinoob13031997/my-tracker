/* STACK v22.23 — restore annual savings analytics. Month RUB fact stays RUB-only; year converts all goal operations to RUB equivalent. */
(()=>{'use strict';
const MAIN='stack_neon_mix9_calendar_v1',INCOME='stack_income_tracker_v1',FXKEY='stack_fx_cbr_v1';
const MN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const fmt=v=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Number(v)||0);
function read(k){try{return JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(e){return{}}}
function goals(){let a=read(MAIN)?.savings?.goals;return Array.isArray(a)?a:[]}
function txs(g){return Array.isArray(g?.tx)?g.tx:(Array.isArray(g?.transactions)?g.transactions:[])}
function gc(g){let c=String(g?.currency||'RUB').toUpperCase();if(c==='₽')c='RUB';if(c==='€')c='EUR';if(c==='$')c='USD';return c}
function rate(c){if(c==='RUB')return 1;let f=read(FXKEY);return Number(globalThis.FX?.[c])||Number(f?.[c])||Number(f?.rates?.[c])||0}
function savedAll(k){let s=0;for(const g of goals()){let r=rate(gc(g));if(!r)continue;for(const t of txs(g))if(String(t?.date||'').slice(0,7)===k)s+=(Number(t?.amount)||0)*r}return s}
function selectedYear(){let t=document.querySelector('#stackIncome .fi-month b')?.textContent||'',y=Number(t.match(/\d{4}/)?.[0]);return y||new Date().getFullYear()}
function patch(){let root=document.getElementById('v2220Finance'),yearBtn=root?.querySelector('[data-tab="year"].on');if(!root||!yearBtn)return;let y=selectedYear(),incData=read(INCOME),arr=Array.from({length:12},(_,i)=>{let k=`${y}-${String(i+1).padStart(2,'0')}`;return{k,sv:savedAll(k),inc:Number(incData?.values?.[k])||0}}),inc=arr.reduce((s,z)=>s+z.inc,0),sv=arr.reduce((s,z)=>s+z.sv,0),mx=Math.max(1,...arr.map(z=>Math.abs(z.sv))),tabs=root.querySelector('.v2220-tabs')?.outerHTML||'';root.innerHTML=tabs+`<div class="v2220-title">${y} · все накопления в ₽</div><div class="v2220-grid"><div class="v2220-box"><span>ДОХОД</span><b>${fmt(inc)} ₽</b></div><div class="v2220-box"><span>ОТЛОЖЕНО · ВСЕ ВАЛЮТЫ</span><b class="v2220-green">${fmt(sv)} ₽</b></div></div>${arr.map((z,i)=>`<div class="v2220-mrow"><span>${MN[i].slice(0,3)}</span><div class="v2220-mbar"><i style="width:${Math.max(0,z.sv/mx*100)}%"></i></div><b>${fmt(z.sv)} ₽</b></div>`).join('')}`;
root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{document.querySelector(`#v2220Finance [data-tab="${b.dataset.tab}"]`)?.click()},0),{once:true}));
root.dataset.yearRestored=String(Date.now())}
function init(){let screen=document.getElementById('screenSavings');screen?.addEventListener('click',e=>{if(e.target.closest('#v2220Finance [data-tab="year"]'))setTimeout(patch,60)},true);window.addEventListener('stack:finance-render',()=>setTimeout(patch,0));console.info('STACK v22.23 annual analytics restore')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,2100),{once:true});else setTimeout(init,2100)})();