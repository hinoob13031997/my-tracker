/* STACK v22.1 — Savings portfolio overview */
(()=>{'use strict';
const BUILD='v22.1-portfolio-2026-09-04';

function fmt(v,max=0){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:max}).format(Number(v)||0)}
function curMoney(v,c){const s={RUB:'₽',USD:'$',EUR:'€'}[c]||c;return `${fmt(v,c==='RUB'?0:2)} ${s}`}
function rateToRub(c){if(c==='RUB')return 1;return Number(FX?.[c])||0}
function rub(v,c){const r=rateToRub(c);return r?(Number(v)||0)*r:null}
function totals(){
 const out={RUB:0,USD:0,EUR:0};
 (state?.savings?.goals||[]).forEach(g=>{if(out[g.currency]===undefined)out[g.currency]=0;out[g.currency]+=goalBalance(g)});
 return out;
}
function monthDeltaRub(){
 const n=new Date(),y=n.getFullYear(),m=n.getMonth();let total=0;
 (state?.savings?.goals||[]).forEach(g=>(g.tx||[]).forEach(t=>{
   if(!t.date)return;const d=new Date(t.date+'T12:00:00');if(d.getFullYear()!==y||d.getMonth()!==m)return;
   const x=rub(+t.amount||0,g.currency);if(x!==null)total+=x;
 }));
 return total;
}
function ensureStyle(){if(document.getElementById('stackPortfolioStyle'))return;const s=document.createElement('style');s.id='stackPortfolioStyle';s.textContent=`
#savPortfolio{margin:7px 0 8px;padding:10px 11px;border-radius:11px;background:linear-gradient(145deg,rgba(8,16,31,.98),rgba(3,8,18,.98));border:1px solid #1d2d49;box-shadow:inset 0 0 24px #0877f30a,0 0 16px #9133e414;overflow:hidden;position:relative}
#savPortfolio:after{content:"";position:absolute;right:-42px;top:-48px;width:115px;height:115px;border-radius:50%;background:radial-gradient(circle,#a9ff1d30 0,#a9ff1d0b 42%,transparent 70%);pointer-events:none}
.sp-grid{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.2fr);gap:12px;align-items:stretch}.sp-left{padding-right:10px;border-right:1px solid #18243a}.sp-kicker{font-size:8px;font-weight:800;letter-spacing:.05em;color:#a987ff}.sp-sub{font-size:7px;color:#748096;margin-top:3px}.sp-total{font-size:25px;line-height:1;font-weight:900;margin:10px 0 6px;letter-spacing:-.03em;text-shadow:0 0 12px #ffffff15}.sp-delta{font-size:9px;font-weight:800}.sp-delta.up{color:#68d43f;text-shadow:0 0 8px #68d43f55}.sp-delta.down{color:#f04b6c;text-shadow:0 0 8px #f04b6c55}.sp-month{font-size:7px;color:#8d96a7;margin-top:3px}.sp-list{display:grid;gap:7px}.sp-row{display:grid;grid-template-columns:minmax(70px,1fr) auto 39px;gap:7px;align-items:center;padding:3px 0;cursor:pointer}.sp-name{font-size:8px;color:#d4d8e1}.sp-name i{display:inline-block;width:4px;height:4px;border-radius:50%;margin-right:6px;vertical-align:2px;box-shadow:0 0 6px currentColor}.sp-rub{font-size:6px;color:#7e8798;margin-top:2px;text-align:right}.sp-value{text-align:right;font-size:10px;font-weight:800}.sp-share{font-size:7px;color:#9ea7b8;border:1px solid #26334a;border-radius:6px;padding:4px 5px;text-align:center;background:#0a1220}.sp-foot{margin-top:9px;padding-top:6px;border-top:1px solid #142035;font-size:6px;color:#768196;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sp-live{color:#5ecbff}.sav-total,.sav-total-sub,#savFxNote,.fx-total{display:none!important}
@media(max-width:720px){#savPortfolio{padding:10px;margin-top:6px}.sp-grid{grid-template-columns:minmax(0,.9fr) minmax(0,1.25fr);gap:9px}.sp-left{padding-right:8px}.sp-total{font-size:21px;margin-top:9px}.sp-row{grid-template-columns:minmax(58px,1fr) auto 36px;gap:5px}.sp-name{font-size:7.5px}.sp-value{font-size:9px}.sp-share{font-size:6.5px;padding:4px}.sp-foot{font-size:5.8px}}
@media(max-width:390px){.sp-grid{grid-template-columns:1fr}.sp-left{border-right:0;border-bottom:1px solid #18243a;padding:0 0 9px}.sp-total{font-size:23px}.sp-row{grid-template-columns:1fr auto 40px}}
`;document.head.appendChild(s)}
function ensureCard(){const hero=document.querySelector('#screenSavings .sav-hero');if(!hero)return null;let el=document.getElementById('savPortfolio');if(el)return el;el=document.createElement('div');el.id='savPortfolio';const head=hero.querySelector('.sav-head');if(head)head.after(el);else hero.prepend(el);return el}
function renderPortfolio(){
 try{
  ensureStyle();const el=ensureCard();if(!el||typeof state==='undefined')return;
  const p=totals(),rubParts={};let all=0,complete=true;
  ['RUB','USD','EUR'].forEach(c=>{const x=rub(p[c],c);rubParts[c]=x;if(x===null)complete=false;else all+=x});
  const delta=monthDeltaRub(),start=Math.max(0,all-delta),dp=start>0?delta/start*100:0;
  const rows=[['RUB','₽','Рубли','#a987ff'],['USD','$','Доллары','#9133e4'],['EUR','€','Евро','#13d7e8']].map(([c,sym,name,color])=>{
    const rr=rubParts[c],share=all>0&&rr!==null?rr/all*100:0;
    return `<div class="sp-row" data-cur="${c}"><div class="sp-name" style="color:${color}"><i style="background:${color}"></i><span style="color:#d4d8e1">${sym} ${name}</span></div><div class="sp-value">${curMoney(p[c],c)}${c!=='RUB'?`<div class="sp-rub">${rr===null?'курс не загружен':'≈ '+fmt(rr)+' ₽'}</div>`:''}</div><div class="sp-share">${Math.round(share)}%</div></div>`
  }).join('');
  let fx='';if(FX?.USD&&FX?.EUR)fx=`Курс ЦБ: $ ${Number(FX.USD).toFixed(2)} ₽ · € ${Number(FX.EUR).toFixed(2)} ₽`;
  const upd=FX?.date?new Date(FX.date).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'курс ожидается';
  el.innerHTML=`<div class="sp-grid"><div class="sp-left"><div class="sp-kicker">ВСЕ НАКОПЛЕНИЯ</div><div class="sp-sub">в рублях</div><div class="sp-total">${complete?fmt(all)+' ₽':'—'}</div><div class="sp-delta ${delta>=0?'up':'down'}">${delta>=0?'↑':'↓'} ${delta>=0?'+':'−'}${fmt(Math.abs(delta))} ₽${start>0?` (${delta>=0?'+':'−'}${Math.abs(dp).toFixed(1).replace('.',',')}%)`:''}</div><div class="sp-month">за этот месяц</div></div><div class="sp-list">${rows}</div></div><div class="sp-foot">ⓘ ${fx||'Курс валют ещё не загружен'} <span class="sp-live">· Обновлено ${upd}</span></div>`;
  el.querySelectorAll('[data-cur]').forEach(r=>r.onclick=()=>{const c=r.dataset.cur;if(state?.savings){state.savings.currency=c;state.savings.selectedId=null;try{save()}catch(e){}try{renderSavings()}catch(e){}}});
 }catch(e){console.warn('STACK portfolio render failed',e)}
}
function wrap(){if(typeof renderSavings==='function'&&!renderSavings.__portfolioWrapped){const old=renderSavings;const fn=function(...a){const x=old.apply(this,a);renderPortfolio();return x};fn.__portfolioWrapped=true;renderSavings=fn}}
function init(){if(typeof state==='undefined'||!state.savings)return;wrap();renderPortfolio();setTimeout(renderPortfolio,1200);console.info('STACK',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,20),{once:true});else setTimeout(init,20);
})();