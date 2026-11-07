/* intro.js : introduction « stade de la Ligue des champions » + nom M.Adj.Pro en profondeur */
(function(){
const css=`
/* intro */
html #sp.ci{background:#010716!important}
html #sp.ci::before{display:none!important}
html #sp.ci::after{background:radial-gradient(120% 85% at 50% 52%,transparent 55%,rgba(0,3,14,.72) 100%)!important}
.ci-bg{position:absolute;inset:0;overflow:hidden;background:#020b2c}
.ci-zoom{position:absolute;inset:-5%;transform-origin:50% 76%;will-change:transform;animation:ciDrift 9s linear forwards;animation-delay:calc(0ms - var(--o))}
.ci-img{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 90%,#1b5fd6,#041348 60%,#010716),#031242;background-size:cover;will-change:clip-path,filter,opacity,transform;animation:ciRev 5s cubic-bezier(.22,.7,.2,1) forwards;animation-delay:calc(0ms - var(--o))}
.ci-img.ok{background:url(stade.jpg) center/cover no-repeat,#031242}
@keyframes ciRev{0%{clip-path:circle(0% at 50% 82%);opacity:0;filter:brightness(.25) blur(10px);transform:scale(1.3)}25%{opacity:1}100%{clip-path:circle(150% at 50% 82%);opacity:1;filter:brightness(1) blur(0);transform:scale(1)}}
@keyframes ciDrift{to{transform:scale(1.08)}}
.ci-fl{position:absolute;left:0;right:0;bottom:16%;height:30%;background:radial-gradient(18% 40% at 12% 60%,rgba(255,255,255,.9),transparent 70%),radial-gradient(18% 40% at 50% 70%,rgba(190,225,255,.9),transparent 70%),radial-gradient(18% 40% at 88% 60%,rgba(255,255,255,.9),transparent 70%);mix-blend-mode:screen;opacity:0;animation:ciFl 3.4s ease-out forwards;animation-delay:calc(900ms - var(--o))}
@keyframes ciFl{0%{opacity:0}18%{opacity:.95}26%{opacity:.25}38%{opacity:1}60%{opacity:.35}100%{opacity:.18}}
.ci-n{position:absolute;left:0;right:0;top:35%;transform:translateY(-50%);text-align:center;perspective:760px;pointer-events:none}
.ci-nm{display:inline-block;position:relative;font:900 clamp(30px,11.4vw,64px)/1 'Orbitron','Arial Black',Impact,sans-serif;letter-spacing:.03em;white-space:nowrap;opacity:0;transform-style:preserve-3d;will-change:transform,opacity,filter;animation:ciFly 2.7s cubic-bezier(.16,.84,.24,1) forwards;animation-delay:calc(2100ms - var(--o))}
@keyframes ciFly{0%{opacity:0;transform:translateZ(-1300px) rotateX(28deg) scale(.45);filter:blur(16px)}55%{opacity:1;filter:blur(1px)}100%{opacity:1;transform:translateZ(0) rotateX(0) scale(1);filter:blur(0)}}
.ci-nm::before{content:"";position:absolute;inset:-30% -8%;background:radial-gradient(closest-side,rgba(70,150,255,.55),transparent);filter:blur(18px);z-index:-1;opacity:0;animation:ciGl 2.4s ease-in-out infinite alternate;animation-delay:calc(4200ms - var(--o))}
@keyframes ciGl{from{opacity:.25}to{opacity:.8}}
.ci-ex{display:block;color:#0a2f78;text-shadow:0 1px #0d3f9a,0 2px #0d3f9a,0 3px #0c3b92,0 4px #0b368a,0 5px #0a3182,0 6px #092c7a,0 7px #082772,0 8px #07226a,0 14px 18px rgba(0,0,0,.65)}
.ci-fr{position:absolute;left:0;top:0;white-space:nowrap}
.ci-fr b{font:inherit;background:linear-gradient(110deg,#fff 0%,#d4e8ff 30%,#fff 46%,#8fc0ff 70%,#4f8dff 100%);background-size:260% 100%;background-position:120% 0;-webkit-background-clip:text;background-clip:text;color:transparent;animation:ciSh 2.6s ease-in-out forwards;animation-delay:calc(4700ms - var(--o))}
.ci-fr b.pr{background-image:linear-gradient(110deg,#fff3c4 0%,#ffd978 35%,#fff 48%,#ffb92e 72%,#c98700 100%)}
@keyframes ciSh{from{background-position:120% 0}to{background-position:-20% 0}}
.ci-k{position:absolute;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font-size:.72rem;opacity:0;animation:ciK .6s ease forwards;animation-delay:calc(2500ms - var(--o))}
@keyframes ciK{to{opacity:.75}}
@media (prefers-reduced-motion:reduce){.ci-zoom,.ci-fl,.ci-nm::before{animation:none}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const lk=document.createElement('link');lk.rel='stylesheet';lk.href='https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap';document.head.appendChild(lk);
const sp=document.getElementById('sp');
if(!sp||!document.documentElement.classList.contains('spl'))return;
let started=0;
function go(ok){if(started)return;started=1;
const an=(document.getAnimations?document.getAnimations():[]).find(a=>a.animationName==='lzm'),off=an?Math.round(an.currentTime||0):0;
sp.className=(sp.className+' ci').trim();sp.style.setProperty('--o',off+'ms');
const nm='<span class="ci-ex">M.Adj.Pro</span><span class="ci-fr"><b>M.Adj.</b><b class="pr">Pro</b></span>';
sp.innerHTML=`<div class="ci-bg"><div class="ci-zoom"><div class="ci-img${ok?' ok':''}"></div></div><div class="ci-fl"></div></div><div class="ci-n"><div class="ci-nm">${nm}</div></div><button class="ci-k">Passer ›</button>`;
sp.querySelector('.ci-k').onclick=()=>{sp.classList.add('out');document.documentElement.classList.remove('spl');setTimeout(()=>sp.remove(),800)}}
const im=new Image();im.onload=()=>go(true);im.onerror=()=>go(false);im.src='stade.jpg';setTimeout(()=>go(false),1100);
})();
