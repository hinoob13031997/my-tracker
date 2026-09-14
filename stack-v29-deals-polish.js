/* STACK v29.4 — Deals mobile alignment polish. UI only; task data/schema unchanged. */
(()=>{'use strict';
const BUILD='29.4.0';
function install(){
 if(document.getElementById('stackV294DealsPolish'))return;
 const s=document.createElement('style');
 s.id='stackV294DealsPolish';
 s.textContent=`@media(max-width:720px){
 #screenTasks,#screenTasks *{box-sizing:border-box}
 #screenTasks{overflow-x:hidden!important}
 #screenTasks>.v2212-tasks{width:100%!important;max-width:100%!important;padding-left:10px!important;padding-right:10px!important}
 #screenTasks.v233-mode-tasks #v2212Tasks .v2212-head{min-height:44px!important;height:44px!important;margin:0 0 8px!important;padding:0 2px!important;align-items:center!important;justify-content:flex-end!important}
 #screenTasks.v233-mode-tasks #v2212Tasks .v2212-add{width:44px!important;height:44px!important;min-width:44px!important;max-width:44px!important;min-height:44px!important;margin:0!important;padding:0!important;display:grid!important;place-items:center!important;border-radius:12px!important;line-height:1!important}
 #screenTasks .v2212-filters,#screenTasks .v2212-group,#screenTasks .v2212-list,#screenTasks .v2212-row{max-width:100%!important;min-width:0!important}
 .v2212-modal{padding:0!important;overflow:hidden!important}
 .v2212-card{box-sizing:border-box!important;width:100%!important;max-width:100vw!important;margin:0!important;padding:14px 12px max(20px,env(safe-area-inset-bottom))!important;overflow-x:hidden!important}
 .v2212-card *{box-sizing:border-box!important;min-width:0}
 .v2212-cardhead{width:100%!important;margin:0 0 12px!important;gap:10px!important}
 .v2212-field{width:100%!important;max-width:100%!important;margin:9px 0!important}
 .v2212-field input,.v2212-field select,.v2212-field textarea{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:11px 12px!important;border-width:1px!important;border-style:solid!important;border-radius:10px!important;font-size:16px!important;line-height:1.35!important}
 .v2212-field input,.v2212-field select{min-height:46px!important;height:46px!important}
 .v2212-field textarea{resize:vertical!important;overflow-x:hidden!important}
 .v2212-grid{width:100%!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important}
 .v2212-checkrow{width:100%!important;grid-template-columns:24px minmax(0,1fr) 36px!important;gap:8px!important;align-items:center!important}
 .v2212-checkrow input[type=text]{width:100%!important;max-width:100%!important;min-width:0!important;height:40px!important;padding:8px 10px!important}
 .v2212-checkrow button{width:36px!important;height:36px!important;padding:0!important}
 #v2212AddCheck{width:100%!important;min-height:42px!important;margin-top:5px!important}
 .v2212-actions{width:100%!important;grid-template-columns:minmax(0,1fr) 94px!important;gap:8px!important;margin-top:14px!important}
 .v2212-save,.v2212-delete{min-height:46px!important;padding:11px 10px!important}
 }
 @media(max-width:430px){
 .v2212-grid{grid-template-columns:minmax(0,1fr)!important}
 .v2212-card{padding-left:11px!important;padding-right:11px!important}
 .v2212-actions{grid-template-columns:minmax(0,1fr) 88px!important}
 }`;
 document.head.appendChild(s);
}
function boot(){install();console.info('STACK Deals polish',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();