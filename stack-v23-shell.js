/* STACK v23 shell — what is left of it (v29.84): the shared mobile skin (body background, hidden legacy header/footer, card/button/modal glow, version-label padding).
   Removed: the legacy «Сегодня» renderer and the legacy bottom nav (it looked for #mobileNav, which no longer exists in the markup). Every page wider than
   720px is now shown in a phone-width frame, so the v29 shell is the only «Сегодня» and the only navigation. */
(()=>{'use strict';
const BUILD='v29.84-shell-skin';
const css=`:root{--v23-bg:#020711;--v23-panel:#06101e;--v23-line:#1b2d49;--v23-cyan:#13d7e8;--v23-blue:#0877f3;--v23-purple:#9133e4;--v23-pink:#f12bb8;--v23-text:#eef4ff;--v23-muted:#8491a7}@media(max-width:720px){body{background:radial-gradient(circle at 50% -15%,#101142 0,#030817 35%,#01050b 72%);padding-bottom:70px!important}.head,.variant,.mobile-hint,.foot{display:none!important}.app{padding-top:max(8px,env(safe-area-inset-top))!important}.neon,.today-card,.v2214fx,.fi-card{border-color:#263d69!important;box-shadow:0 0 16px #0877f314,inset 0 0 16px #9133e407!important}.btn{border-color:#453183!important;box-shadow:0 0 9px #9133e422!important}.modal-card{border-color:#7b37c6!important;box-shadow:0 0 28px #9133e444!important}#stackVersion{padding:8px 0 max(70px,calc(env(safe-area-inset-bottom) + 58px))!important}}
`;
function installStyle(){if(document.getElementById('stackV23ShellStyle'))return;const s=document.createElement('style');s.id='stackV23ShellStyle';s.textContent=css;document.head.appendChild(s)}
function boot(){installStyle();console.info('STACK',BUILD)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
