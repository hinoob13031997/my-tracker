/* STACK v23.8 — Calendar visual simplification. UI-only; no data/schema changes. */
(()=>{'use strict';const BUILD='v23.8-calendar-visual';
const css=`@media(max-width:720px){
#v233Calendar .v233-card.v233-cal{padding:12px 10px 9px;border-color:#1a304d;box-shadow:0 0 12px #0877f30b;background:linear-gradient(180deg,#050f1c,#020914)}
#v233Calendar .v233-calhead{padding:1px 2px 14px}
#v233Calendar .v233-calhead b{font-size:17px;letter-spacing:-.01em}
#v233Calendar .v233-week{gap:6px;margin-bottom:4px}
#v233Calendar .v233-week span{font-size:9px;color:#586980;padding-bottom:3px}
#v233Calendar .v233-days{gap:6px}
#v233Calendar .v233-day{aspect-ratio:1;border-color:#0e1b2c;border-radius:11px;background:#030a13;box-shadow:none;font-size:15px;font-weight:800;color:#aeb9c9;transition:none}
#v233Calendar .v233-day.today{border-color:#6d205c;color:#fff;background:#070b16;box-shadow:inset 0 0 0 1px #f12bb81f}
#v233Calendar .v233-day.selected{border-color:#9133e4;background:radial-gradient(circle at 50% 48%,#32104f99,#090d1b 74%);color:#fff;box-shadow:0 0 14px #9133e455,inset 0 0 0 1px #8f4fd5}
#v233Calendar .v233-day.today.selected{border-color:#9133e4;box-shadow:0 0 15px #9133e466,inset 0 0 0 1px #a861e9}
#v233Calendar .v237-state{left:50%;bottom:6px;transform:translateX(-50%);width:14px!important;min-width:14px!important;height:3px!important;border-radius:3px!important;font-size:0!important;line-height:0!important;box-shadow:none!important;background:#0eb1db!important;opacity:.82}
#v233Calendar .v237-state.pending{background:#0eb1db!important;box-shadow:0 0 5px #0eb1db66!important}
#v233Calendar .v237-state.good{background:#68d43f!important;box-shadow:0 0 5px #68d43f55!important}
#v233Calendar .v237-state.bad{background:#f12bb8!important;box-shadow:0 0 5px #f12bb855!important}
#v233Calendar .v237-state.skip{background:#e0ad37!important;box-shadow:0 0 5px #e0ad3744!important}
#v233Calendar .v233-legend{display:none!important}
#v233Calendar .v233-daydetail{margin-top:10px;padding:14px 13px;border-color:#1d3452}
#v233Calendar .v233-daydetail h3{font-size:16px;margin-bottom:4px}
#v233Calendar .v233-dayprogress{font-size:9px;color:#718198;margin-bottom:11px}
#v233Calendar .v233-event{padding:11px 0}
}`;
function apply(){if(!document.getElementById('v238CalendarStyle')){const s=document.createElement('style');s.id='v238CalendarStyle';s.textContent=css;document.head.appendChild(s)}console.info('STACK',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();})();
