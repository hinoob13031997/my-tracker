/* STACK v27.1.4 — mobile fitness tabs/nutrition layout hardening + tab-switch fade; #v234Progress panel added to width guards. */
(()=>{'use strict';
function install(){if(document.getElementById('stackFitnessTabsFix'))return;const s=document.createElement('style');s.id='stackFitnessTabsFix';s.textContent=`@media(max-width:720px){
#v234Fitness,.v234-fit,.v234-tabs,.v234-body,#v234Progress,#v234Today,#v234Nutrition{min-width:0;max-width:100%;width:100%;box-sizing:border-box}
.v234-tabs{grid-template-columns:repeat(3,minmax(0,1fr))!important;overflow:hidden!important}
.v234-tabs button{min-width:0!important;width:100%!important;max-width:100%!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-left:1px!important;padding-right:1px!important}
.fx-nutrow{grid-template-columns:repeat(4,minmax(0,1fr))!important;min-width:0;max-width:100%;overflow:hidden}
.fx-nut{min-width:0;padding-left:2px!important;padding-right:2px!important}
.fx-nut b,.fx-nut small{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
}
@media(max-width:360px){.v234-tabs button{font-size:8px!important}.fx-nutrow{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
#v234Fitness{transition:opacity .18s ease,transform .18s ease}
#v234Fitness.v2712-tabswitch{transition:none;opacity:.28;transform:translateY(2px)}
`;document.head.appendChild(s)}
function bindFade(){
if(document.getElementById('stackFitnessTabFadeBound'))return;const marker=document.createElement('meta');marker.id='stackFitnessTabFadeBound';document.head.appendChild(marker);
document.addEventListener('click',e=>{
const btn=e.target.closest('#v234Fitness .v234-tabs [data-v234]');if(!btn)return;
const root=document.getElementById('v234Fitness');if(!root)return;
root.classList.add('v2712-tabswitch');
clearTimeout(root.__v2712Timer);
root.__v2712Timer=setTimeout(()=>root.classList.remove('v2712-tabswitch'),110);
},true);
}
function boot(){install();bindFade()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
