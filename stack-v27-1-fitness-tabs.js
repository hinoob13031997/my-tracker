/* STACK v27.1.1 — mobile fitness tabs/nutrition layout hardening. */
(()=>{'use strict';
function install(){if(document.getElementById('stackFitnessTabsFix'))return;const s=document.createElement('style');s.id='stackFitnessTabsFix';s.textContent=`@media(max-width:720px){
#v234Fitness,.v234-fit,.v234-tabs,.v234-body{min-width:0;max-width:100%;width:100%;box-sizing:border-box}
.v234-tabs{grid-template-columns:repeat(4,minmax(0,1fr))!important;overflow:hidden!important}
.v234-tabs button{min-width:0!important;width:100%!important;max-width:100%!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-left:1px!important;padding-right:1px!important}
.fx-nutrow{grid-template-columns:repeat(4,minmax(0,1fr))!important;min-width:0;max-width:100%;overflow:hidden}
.fx-nut{min-width:0;padding-left:2px!important;padding-right:2px!important}
.fx-nut b,.fx-nut small{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
}
@media(max-width:360px){.v234-tabs button{font-size:8px!important}.fx-nutrow{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
`;document.head.appendChild(s)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
