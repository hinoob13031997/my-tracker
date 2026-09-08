/* STACK v22.36 — FX overview on shared STACK_FX; event-driven and history-aware. */
(()=>{'use strict';
const KEY='stack_fx_history_v1';let last='';
const D=()=>globalThis.STACK_DATA,F=()=>globalThis.STACK_FX;
const fmt=(v,n=0)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:n}).format(Number(v)||0);
function goals(){return D()?.goals?.()||[]}
function gc(g){return D()?.goalCurrency?.(g)||'RUB'}
function txs(g){return D()?.transactions?.(g)||[]}
function main(){return D()?.main?.()||{}}
function css(){if(document.getElementById('v2214css'))return;let s=document.createElement('style');s.id='v2214css';s.textContent=`.v2214fx{margin:9px 0;border:1px solid #24415f;border-radius:14px;padding:12px;background:linear-gradient(160deg,#071524,#030914)}.v2214head{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.v2214head b{font-size:10px}.v2214head span{font-size:7px;color:#7f8da2}.v2214grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.v2214card{border:1px solid #1d3653;border-radius:10px;padding:9px;background:#06111f}.v2214card span{display:block;font-size:6px;color:#7e8ca2;line-height:1.35}.v2214card b{display:block;font-size:13px;margin-top:5px}.v2214pos{color:#68d43f}.v2214neg{color:#f04b6c}.v2214rate{margin-top:9px;font-size:7px;color:#8d9aad}.v2214goals{margin-top:7px;border-top:1px solid #14283f}.v2214row{display:grid;grid-template-columns:1fr auto;gap:8px;padding:8px 0;border-bottom:1px solid #14283f;font-size:8px}.v2214row small{display:block;color:#7e8ca2;font-size:6px;margin-top:3px}@media(max-width:390px){.v2214grid{grid-template-columns:1fr}}`;document.head.appendChild(s)}
function currencyFromUI(){
  let active=[...document.querySelectorAll('#screenSavings button,.sav-currency-tabs button,.sav-tabs button')].find(x=>x.classList.contains('active')||x.getAttribute('aria-selected')==='true'),t=(active?.textContent||'').toUpperCase();
  if(t.includes('ДОЛЛ')||t.includes('USD')||t.includes('$'))return'USD';
  if(t.includes('ЕВРО')||t.includes('EUR')||t.includes('€'))return'EUR';
  let sel=main()?.savings?.currency;
  return sel==='USD'||sel==='EUR'?sel:null
}
function host(){return document.getElementById('savPortfolio')||document.querySelector('#screenSavings .sav-goals')||document.querySelector('#screenSavings .savings-main')||document.getElementById('screenSavings')}
function rows(c){
  const api=F(),r=api?.currentRate?.(c)||0;
  return goals().filter(g=>gc(g)===c&&g.status!=='archived').map(g=>{
    let native=Number(g.start??g.current)||0,cost=0;
    const start=Number(g.start??g.current)||0;
    if(start){
      const h=api?.history?.()?.[api?.startKey?.(g)]||null,sr=Number(h?.rate)||0;
      cost+=start*(sr||r)
    }
    for(const t of txs(g)){let a=Number(t.amount)||0;native+=a;let x=api?.transactionRate?.(g,t),rr=Number(x?.rate)||r;cost+=a*rr}
    return {name:g.name||'Цель',native,cost,now:native*r}
  })
}
function render(){
  css();let c=currencyFromUI(),old=document.getElementById('v2214fx'),api=F();
  if(!c||!api){old?.remove();return}
  let x=api.portfolio(c),r=x.currentRate,rs=rows(c),sig=[c,r,x.costRub,x.nowRub,x.native,x.missing,rs.map(q=>q.name+q.native+q.cost).join('|')].join('|');
  if(sig===last&&old)return;last=sig;old?.remove();
  let root=host();if(!root)return;
  let b=document.createElement('div');b.id='v2214fx';b.className='v2214fx';
  let waiting=x.missing>0;
  b.innerHTML=`<div class="v2214head"><div><b>ВАЛЮТНАЯ АНАЛИТИКА · ${c}</b><span>Все активные цели в ${c}</span></div><span>${rs.length} целей</span></div><div class="v2214grid"><div class="v2214card"><span>ПО КУРСАМ НА ДАТЫ ОПЕРАЦИЙ</span><b>${r?(waiting?'…':fmt(x.costRub)+' ₽'):'—'}</b></div><div class="v2214card"><span>СТОИМОСТЬ СЕЙЧАС</span><b>${r?fmt(x.nowRub)+' ₽':'—'}</b></div><div class="v2214card"><span>ИЗМЕНЕНИЕ КУРСА</span><b class="${x.diffRub>=0?'v2214pos':'v2214neg'}">${r?(waiting?'…':(x.diffRub>=0?'+':'')+fmt(x.diffRub)+' ₽'):'—'}</b></div></div><div class="v2214rate">Всего: ${fmt(x.native,2)} ${c} · текущий курс ${r?fmt(r,2)+' ₽/'+c:'загрузка курса…'}${waiting?' · уточняем исторический курс…':''}</div>${rs.length?`<div class="v2214goals">${rs.map(g=>`<div class="v2214row"><div>${String(g.name).replace(/[<>]/g,'')}<small>${fmt(g.native,2)} ${c}</small></div><div>${r?fmt(g.now)+' ₽':'—'}<small>${waiting?'исторический курс уточняется':r?(g.now-g.cost>=0?'+':'')+fmt(g.now-g.cost)+' ₽ от курса':'курс загружается'}</small></div></div>`).join('')}</div>`:''}`;
  let p=document.getElementById('savPortfolio');if(p&&p.parentNode)p.after(b);else root.prepend(b)
}
function refresh(delay=0){setTimeout(()=>{last='';render()},delay)}
function init(){css();render();document.getElementById('screenSavings')?.addEventListener('click',()=>refresh(100));window.addEventListener('stack:data-ready',()=>refresh());window.addEventListener('stack:data-changed',()=>refresh());window.addEventListener('stack:fx-history-changed',()=>refresh());window.addEventListener('storage',e=>{if(e.key===D()?.keys?.main||e.key===D()?.keys?.fx||e.key===KEY)refresh()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});window.addEventListener('focus',()=>refresh());console.info('STACK v22.36 FX overview shared engine')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1100),{once:true});else setTimeout(init,1100)
})();