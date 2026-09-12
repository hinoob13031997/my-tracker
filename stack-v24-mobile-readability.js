/* STACK v24.8.1 — iPhone readability and nutrition-width stability. Data keys are untouched. */
(()=>{'use strict';
const BUILD='v24.8.1-mobile-readability';
const css=`@media(max-width:720px){
html{-webkit-text-size-adjust:100%}
#v234Fitness,#v234Fitness *{box-sizing:border-box}
#v234Fitness{width:100%;max-width:100%;min-width:0;overflow-x:clip}
#v234Fitness .v234-tabs,#v234Fitness .v234-tabs button,#v234Fitness .v234-body{min-width:0;max-width:100%}
#v234Fitness .v234-tabs button{white-space:normal;overflow-wrap:anywhere}
#v234Fitness .v234-body{overflow-x:hidden}
#v234Fitness .v234-sub{font-size:12px;line-height:1.4}
#v234Fitness .v234-tabs button{font-size:11px;line-height:1.2}
#v234Fitness .v234-kicker,#v234Fitness .fx-eye{font-size:10px;line-height:1.3}
#v234Fitness .fx-meta,#v234Fitness .fx-note{font-size:12px;line-height:1.5}
#v234Fitness .fx-chip{font-size:11px}
#v234Fitness .fx-ex{grid-template-columns:26px minmax(0,1fr) auto}
#v234Fitness .fx-ex b{font-size:13px;line-height:1.3}
#v234Fitness .fx-ex small{font-size:11px;line-height:1.35}
#v234Fitness .fx-status button,#v234Fitness .fx-btn{font-size:11px;line-height:1.2}
#v234Fitness .fx-goal-meta,#v234Fitness .fx-empty-plan,#v234Fitness .fx-legacy{font-size:11px;line-height:1.5}
#v234Fitness .fx-goal-badge{font-size:10px}
#v234Fitness .fx-goal-actions button,#v234Fitness .fx-plan-btn{font-size:11px}
#v234Fitness .fxi-goal-grid span,#v234Fitness .fxi-strategy small,#v234Fitness .fxi-box span{font-size:9.5px;line-height:1.25}
#v234Fitness .fxi-goal-grid b,#v234Fitness .fxi-strategy b{font-size:12px}
#v234Fitness .fxi-note,#v234Fitness .fxi-recommend{font-size:11.5px;line-height:1.5}
#v234Fitness .fxi-box small{font-size:10.5px;line-height:1.4}
#v234Fitness .fxi-warning{font-size:10.5px;line-height:1.45}
#v234Fitness .fx-plan-head h2{font-size:21px}
#v234Fitness .fx-plan,#v234Fitness .fx-custom-card,#v234Fitness .fxi-card{width:100%;min-width:0;max-width:100%}
#v234Fitness .fx-plan-head{flex-wrap:wrap}
#v234Fitness .fx-plan-head>div{min-width:0;flex:1 1 180px}
#v234Fitness .fx-plan-switch{flex:0 0 auto}
#v234Fitness .fx-plan-switch{min-height:44px;font-size:11px}
#v234Fitness .fx-plan-targets span{min-width:0;padding:9px 2px;font-size:10px;line-height:1.25}
#v234Fitness .fx-plan-targets b{font-size:14px}
#v234Fitness .fx-plan-note{font-size:11.5px;line-height:1.5}
#v234Fitness .fx-plan-meal{grid-template-columns:50px minmax(0,1fr) 44px;gap:9px;padding:13px 0}
#v234Fitness .fx-plan-meal>*,#v234Fitness .fx-meal>*{min-width:0}
#v234Fitness .fx-plan-meal time{font-size:12px}
#v234Fitness .fx-plan-meal b{font-size:13px;line-height:1.3}
#v234Fitness .fx-plan-meal p{font-size:12px;line-height:1.45;overflow-wrap:anywhere}
#v234Fitness .fx-plan-meal small{font-size:10.5px;line-height:1.4}
#v234Fitness .fx-plan-meal button{width:44px;min-height:44px}
#v234Fitness .fx-meal-total span{font-size:10px}#v234Fitness .fx-meal-total b{font-size:14px}
#v234Fitness .fx-meal{grid-template-columns:50px minmax(0,1fr) 44px;padding:13px 0}
#v234Fitness .fx-meal time{font-size:12px}
#v234Fitness .fx-meal b{font-size:13px}
#v234Fitness .fx-meal p{font-size:12px;line-height:1.45;overflow-wrap:anywhere}
#v234Fitness .fxa-head h2{font-size:21px}
#v234Fitness .fxa-sub{font-size:12px;line-height:1.45}
#v234Fitness .fxa-controls{grid-template-columns:minmax(0,1fr) auto}
#v234Fitness .fxa-controls select{font-size:16px}
#v234Fitness .fxa-ranges button{font-size:11px}
#v234Fitness .fxa-kpi span{font-size:9.5px;line-height:1.25}
#v234Fitness .fxa-kpi b{font-size:18px}
#v234Fitness .fxa-kpi small{font-size:10.5px;line-height:1.3}
#v234Fitness .fxa-chart{height:190px}
#v234Fitness .fxa-chart text{font-size:11px!important}
#v234Fitness .fxa-empty{font-size:11.5px;line-height:1.5}
#v234Fitness .fxa-rec{font-size:11.5px;line-height:1.5}
#v234Fitness .fxa-week{grid-template-columns:62px minmax(0,1fr) 42px;font-size:10.5px}
#v234Fitness .fxa-row{grid-template-columns:66px minmax(0,1fr) 44px 44px}
#v234Fitness .fxa-row time,#v234Fitness .fxa-body-row time{font-size:10.5px}
#v234Fitness .fxa-row b{font-size:13px}
#v234Fitness .fxa-row small{font-size:10.5px;line-height:1.35}
#v234Fitness .fxa-add{font-size:11px}
#v234Fitness .fx-engine-head h2{font-size:21px}
#v234Fitness .fx-engine-week,#v234Fitness .fx-engine-note{font-size:11.5px;line-height:1.45}
#v234Fitness .fx-engine-chips span{font-size:10.5px}
#v234Fitness .fx-engine-ex{grid-template-columns:24px minmax(0,1fr) 44px 44px 44px}
#v234Fitness .fx-engine-ex b{font-size:12px;line-height:1.3}
#v234Fitness .fx-engine-ex small{font-size:10px;line-height:1.35}
#v234Fitness .fx-engine-status button,#v234Fitness .fx-workout-ready,#v234Fitness .fx-workout-ready button{font-size:11px;line-height:1.4}
#v234Fitness .fx-cycle-stat small,#v234Fitness .fx-phase-item p,#v234Fitness .fx-phase-item span,#v234Fitness .fx-analytic small,#v234Fitness .fx-set-list-title{font-size:10px;line-height:1.35}
#v234Fitness .fx-phase-item b,#v234Fitness .fx-ex-history b,#v234Fitness .fx-set-row b{font-size:12px}
#v234Fitness .fx-ex-history p,#v234Fitness .fx-set-row small,#v234Fitness .fx-help{font-size:11px;line-height:1.45}
#v234Fitness input,#v234Fitness select,#v234Fitness textarea,
#fxEngineModal input,#fxEngineModal select,#fxEngineModal textarea,
#fxPlanEditor input,#fxPlanEditor select,#fxPlanEditor textarea,
#fxaModal input,#fxaModal select,#fxaModal textarea{font-size:16px!important}
#fxEngineModal,#fxPlanEditor,#fxSheet,#fxaModal{width:100%;max-width:100%;box-sizing:border-box}
#fxEngineModal>div,#fxPlanEditor>div,#fxSheet>div,#fxaModal .fxa-sheet{width:100%;max-width:100%;box-sizing:border-box}
#fxEngineModal .fx-editor,#fxPlanEditor .fx-editor,#fxaModal .fxa-sheet{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
#fxEngineModal .fx-editor label,#fxPlanEditor .fx-editor label,#fxaModal .fxa-field{font-size:12px;line-height:1.35}
#fxEngineModal .fx-effort label{font-size:12px;line-height:1.35}
#fxEngineModal .fx-help{font-size:11.5px;line-height:1.5}
#fxEngineModal button,#fxPlanEditor button,#fxaModal button{font-size:11px;line-height:1.25}
#fxSheet p{font-size:13px;line-height:1.55}
#v234Fitness button,#fxEngineModal button,#fxPlanEditor button,#fxSheet button,#fxaModal button{touch-action:manipulation}
}
@media(max-width:390px){
#v234Fitness .fxa-card,#v234Fitness .fx-engine-card,#v234Fitness .fx-card.fx-pad{padding-left:12px;padding-right:12px}
#v234Fitness .fxa-kpis{gap:5px}
#v234Fitness .fxa-kpi{padding:9px 8px}
#v234Fitness .fxa-kpi b{font-size:17px}
}`;
function boot(){if(document.getElementById('stackV248Readability'))return;const style=document.createElement('style');style.id='stackV248Readability';style.textContent=css;document.head.appendChild(style);console.info('STACK',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
