/* STACK Finance Engine v1 — pure calculations on STACK_DATA. No DOM, no writes. */
(()=>{'use strict';
const D=()=>globalThis.STACK_DATA;
function monthKey(v){return /^\d{4}-\d{2}$/.test(String(v||''))?String(v):new Date().toISOString().slice(0,7)}
function incomeMonth(k){k=monthKey(k);const x=D()?.income?.()||{};const income=Number(x.values?.[k])||0,expenses=Number(x.expenses?.[k])||0,reserve=Number(x.reserve?.[k])||0;return {key:k,income,expenses,reserve,free:Math.max(0,income-expenses-reserve)}}
function savedNative(currency,k){return Number(D()?.savedNative?.(currency,monthKey(k)))||0}
function savedRub(k){return savedNative('RUB',k)}
function savedRubEquivalent(k){return Number(D()?.savedRubEquivalent?.(monthKey(k)))||0}
function activeGoals(currency){const c=D()?.currency?.(currency)||'RUB';return (D()?.goals?.()||[]).filter(g=>D()?.goalCurrency?.(g)===c&&g.status!=='archived')}
function monthlyPlan(currency){return activeGoals(currency).reduce((s,g)=>s+Math.max(0,Number(g.monthly)||0),0)}
function totalBalance(currency){return activeGoals(currency).reduce((s,g)=>s+(Number(D()?.balance?.(g))||0),0)}
function month(currency,k){const c=D()?.currency?.(currency)||'RUB',base=incomeMonth(k),saved=savedNative(c,k),plan=monthlyPlan(c);return {...base,currency:c,saved,plan,remaining:Math.max(0,plan-saved),planRate:plan?saved/plan*100:0,incomeRate:base.income?saved/base.income*100:0,total:totalBalance(c)}}
function monthsForYear(year){const y=Number(year)||new Date().getFullYear(),inc=D()?.income?.()||{};return Array.from({length:12},(_,i)=>{const k=`${y}-${String(i+1).padStart(2,'0')}`;return {key:k,income:Number(inc.values?.[k])||0,savedRubEquivalent:savedRubEquivalent(k),savedRub:savedRub(k)}})}
function year(year){const months=monthsForYear(year),income=months.reduce((s,x)=>s+x.income,0),saved=months.reduce((s,x)=>s+x.savedRubEquivalent,0),withIncome=months.filter(x=>x.income>0),withSavings=months.filter(x=>x.savedRubEquivalent!==0),best=months.reduce((a,x)=>x.savedRubEquivalent>a.savedRubEquivalent?x:a,months[0]||{key:'',savedRubEquivalent:0});return {year:Number(year)||new Date().getFullYear(),months,income,saved,savingsRate:income?saved/income*100:0,averageIncome:withIncome.length?income/withIncome.length:0,averageSaved:withSavings.length?saved/withSavings.length:0,monthsWithIncome:withIncome.length,monthsWithSavings:withSavings.length,best}}
const api=Object.freeze({version:1,monthKey,incomeMonth,savedNative,savedRub,savedRubEquivalent,activeGoals,monthlyPlan,totalBalance,month,monthsForYear,year});
Object.defineProperty(globalThis,'STACK_FINANCE',{value:api,writable:false,configurable:true});
window.dispatchEvent(new CustomEvent('stack:finance-ready',{detail:{version:1}}));
console.info('STACK Finance Engine v1 ready');
})();