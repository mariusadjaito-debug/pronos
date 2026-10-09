/* intro.js : intro « stade bleu » (caméra au-dessus du terrain, un seul laser) + données estimées en rouge */
(function(){
const css=`
/* données estimées : tout en rouge, dans un cadre rouge */
.sx:has(.es){margin:6px 0;padding:10px 6px;border:1.5px solid #ff4d4d;border-radius:12px;background:rgba(255,50,50,.09)}
.sx:has(.es) .nv,.sx:has(.es) .ev,.sx:has(.es) .pv2,.sx:has(.es) .pv2 small,.sx:has(.es) .alt2{color:#ff6b6b!important;--c:#ff6b6b!important}
.es{color:#ff6b6b;border:1px solid #ff6b6b;background:rgba(255,60,60,.14);font-weight:800}
.stx:has(.es) .st::after{content:" · ⚠ ESTIMÉ, NON RÉEL";color:#ff6b6b;font-weight:800}
.stx:has(.es) .stl{flex-wrap:wrap}
.stx:has(.es) .stl::after{content:"▢ Rouge encadré : données estimées, pas de statistiques réelles pour ce championnat";display:block;width:100%;text-align:center;color:#ff6b6b;margin-top:6px;font-size:.66rem}
/* intro */
html #sp.ci{background:#010716!important}
html #sp.ci::before{display:none!important}
html #sp.ci::after{background:radial-gradient(120% 85% at 50% 52%,transparent 50%,rgba(0,3,14,.8) 100%)!important}
.ci-st{position:absolute;inset:0;background:radial-gradient(70% 38% at 50% -6%,rgba(120,175,255,.55),transparent 72%),radial-gradient(26% 20% at 6% 5%,rgba(255,255,255,.55),transparent 70%),radial-gradient(26% 20% at 94% 5%,rgba(255,255,255,.55),transparent 70%),linear-gradient(180deg,#020a2c,#031242 45%,#010716)}
.ci-pt{position:absolute;left:50%;bottom:-2%;width:200vw;height:175vh;margin-left:-100vw;opacity:0;transform-origin:50% 100%;transform:perspective(800px) rotateX(52deg);will-change:transform,opacity;animation:ciC 8s linear forwards,ciF 1.4s ease forwards;animation-delay:calc(0ms - var(--o)),calc(0ms - var(--o))}
.ci-pt svg{display:block;width:100%;height:100%}
@keyframes ciC{to{transform:perspective(800px) rotateX(46deg) scale(1.07)}}
@keyframes ciF{to{opacity:1}}
.ci-fog{position:absolute;inset:0;background:radial-gradient(62% 13% at 50% 40%,rgba(1,7,22,.6),transparent),linear-gradient(180deg,#010716 0%,rgba(1,7,22,.8) 10%,rgba(1,7,22,.25) 24%,transparent 38%)}
.ci-lz{position:absolute;left:0;right:0;top:0;height:0;will-change:transform;animation:ciL 2.4s ease-in-out infinite alternate;animation-delay:calc(0ms - var(--o))}
.ci-lz i{position:absolute;left:0;right:0;top:-70px;height:140px;background:linear-gradient(180deg,transparent,rgba(120,185,255,.1) 30%,rgba(190,225,255,.34) 50%,rgba(120,185,255,.1) 70%,transparent)}
.ci-lz b{position:absolute;left:0;right:0;top:-1px;height:3px;background:linear-gradient(90deg,transparent,#3d86ff 15%,#eaf5ff 50%,#3d86ff 85%,transparent);box-shadow:0 0 10px 2px rgba(70,150,255,.85)}
@keyframes ciL{from{transform:translateY(0)}to{transform:translateY(var(--H,100vh))}}
.ci-t{position:absolute;left:0;right:0;top:41%;transform:translateY(-50%);text-align:center;white-space:nowrap;font:400 min(17vw,4.6rem)/1 'Audiowide','Arial Black',Impact,sans-serif;letter-spacing:.04em}
.ci-t::before{content:attr(data-t);position:absolute;left:0;right:0;color:#3d86ff;filter:blur(16px);opacity:0;animation:ciG 2.2s ease-in-out infinite alternate;animation-delay:calc(3200ms - var(--o))}
@keyframes ciG{from{opacity:.2}to{opacity:.65}}
.ci-t span{position:relative;display:inline-block;opacity:0;background:linear-gradient(180deg,#fff 10%,#b6dcff 55%,#4d8dff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;animation:ciR .9s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(2000ms + var(--i)*160ms - var(--o))}
@keyframes ciR{from{opacity:0;transform:translateY(34px) scale(.6)}to{opacity:1;transform:none}}
.ci-s{position:absolute;left:0;right:0;bottom:9%;display:grid;place-items:center}
.ci-s svg{width:min(66vw,280px);height:auto;overflow:visible}
.ci-s path{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:ciD 2.8s ease-in-out forwards;animation-delay:calc(4300ms - var(--o))}
.ci-s .g{stroke:#ffd978;stroke-width:3.2}.ci-s .h{stroke:#ffd978;stroke-width:9;opacity:.22}
@keyframes ciD{to{stroke-dashoffset:0}}
.ci-k{position:absolute;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font-size:.72rem;opacity:0;animation:ciK .6s ease forwards;animation-delay:calc(3000ms - var(--o))}
@keyframes ciK{to{opacity:.75}}
@media (prefers-reduced-motion:reduce){.ci-lz{animation:none;top:50%}.ci-pt{animation:ciF 1s forwards}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const lk=document.createElement('link');lk.rel='stylesheet';lk.href='https://fonts.googleapis.com/css2?family=Audiowide&display=swap';document.head.appendChild(lk);
const sp=document.getElementById('sp');
if(!sp||!document.documentElement.classList.contains('spl'))return;
const an=(document.getAnimations?document.getAnimations():[]).find(a=>a.animationName==='lzm'),off=an?Math.round(an.currentTime||0):0;
let pitch='';for(let i=0;i<10;i++)pitch+=`<rect x="0" y="${i*105}" width="680" height="105" fill="${i%2?'#0a3799':'#0c42b0'}"/>`;
const ln='fill="none" stroke="#d9eaff" stroke-width="4" stroke-opacity=".8"';
pitch+=`<g ${ln}><rect x="20" y="20" width="640" height="1010"/><line x1="20" y1="525" x2="660" y2="525"/><circle cx="340" cy="525" r="60"/><rect x="209" y="20" width="262" height="107"/><rect x="209" y="923" width="262" height="107"/><rect x="280" y="20" width="120" height="36"/><rect x="280" y="994" width="120" height="36"/><path d="M291 127 A60 60 0 0 0 389 127"/><path d="M291 923 A60 60 0 0 1 389 923"/></g><circle cx="340" cy="525" r="5" fill="#d9eaff"/><circle cx="340" cy="92" r="4" fill="#d9eaff"/><circle cx="340" cy="958" r="4" fill="#d9eaff"/>`;
const sig='M10 72 C 18 44, 28 10, 40 12 C 52 14, 40 54, 44 66 C 46 38, 58 12, 70 16 C 82 20, 66 56, 74 64 C 90 62, 100 34, 114 36 C 124 38, 114 58, 104 54 C 118 48, 146 40, 168 46 C 184 50, 190 64, 172 64 C 156 64, 164 46, 196 38 C 226 30, 256 26, 290 12 M26 84 C 100 74, 200 88, 292 68';
sp.className=(sp.className+' ci').trim();sp.style.setProperty('--o',off+'ms');sp.style.setProperty('--H',innerHeight+'px');
sp.innerHTML=`<div class="ci-st"></div><div class="ci-pt"><svg viewBox="0 0 680 1050" preserveAspectRatio="none">${pitch}</svg></div><div class="ci-fog"></div><div class="ci-lz"><i></i><b></b></div><div class="ci-t" data-t="M-ADJ">${[...'M-ADJ'].map((c,i)=>`<span style="--i:${i}">${c}</span>`).join('')}</div><div class="ci-s"><svg viewBox="0 0 300 100"><path class="h" pathLength="1" d="${sig}"/><path class="g" pathLength="1" d="${sig}"/></svg></div><button class="ci-k">Passer ›</button>`;
sp.querySelector('.ci-k').onclick=()=>{sp.classList.add('out');document.documentElement.classList.remove('spl');setTimeout(()=>sp.remove(),800)};
})();
