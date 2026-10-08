/* M-ADJ : extensions de l'application (intro, sélection, moteurs d'analyse, coupons) */
(function(){
document.title='M-ADJ';
for(let i=1;i<=200;i++)clearInterval(i);
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const css=`
html.spl{overflow:hidden}
#sp{position:fixed;inset:0;z-index:200;overflow:hidden;background:radial-gradient(120% 90% at 50% 45%,#1d0b38 0%,#0b051b 55%,#030108 100%);transition:opacity .7s ease}
#sp.out{opacity:0;pointer-events:none}
#sp::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 4px);pointer-events:none}
.lz{position:absolute;left:-10%;right:-10%;top:0;height:3px;will-change:transform;animation:lzm var(--d) ease-in-out infinite alternate;animation-delay:var(--l)}
.lz::before,.lz::after{content:"";position:absolute;left:0;right:0;height:var(--g)}
.lz::before{bottom:100%;background:linear-gradient(0deg,var(--c1),transparent)}.lz::after{top:100%;background:linear-gradient(180deg,var(--c2),transparent)}
.lz.a{--d:1.9s;--l:0s;--g:130px;--c1:rgba(255,43,214,.26);--c2:rgba(43,217,255,.22);background:linear-gradient(90deg,transparent,#ff2bd6 18%,#fff 50%,#2bd9ff 82%,transparent);box-shadow:0 0 18px 4px rgba(255,43,214,.7),0 0 60px 14px rgba(43,217,255,.35)}
.lz.b{--d:2.7s;--l:-.9s;--g:70px;--c1:rgba(43,217,255,.16);--c2:rgba(43,217,255,.1);height:2px;background:linear-gradient(90deg,transparent,#2bd9ff 30%,#fff 50%,#2bd9ff 70%,transparent);box-shadow:0 0 14px 3px rgba(43,217,255,.6)}
.lz.c{--d:3.4s;--l:-1.7s;--g:50px;--c1:rgba(255,200,60,.14);--c2:rgba(255,200,60,.08);height:2px;background:linear-gradient(90deg,transparent,#ffc83c 30%,#fff 50%,#ffc83c 70%,transparent);box-shadow:0 0 12px 3px rgba(255,200,60,.5)}
@keyframes lzm{from{transform:translateY(-4px)}to{transform:translateY(var(--H))}}
.spt{position:absolute;left:0;right:0;top:44%;transform:translateY(-50%);text-align:center;font:900 min(21vw,6.4rem)/1 'Orbitron','Arial Black',Impact,sans-serif;letter-spacing:.05em;white-space:nowrap}
.spt span{display:inline-block;opacity:0;background:linear-gradient(180deg,#fff 15%,#9be7ff 55%,#d28bff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;animation:rv 1.1s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--s) + var(--i)*.17s)}
@keyframes rv{from{opacity:0;transform:translateY(46px) scale(.55);filter:blur(14px)}to{opacity:1;transform:none;filter:blur(0)}}
.spg{position:absolute;left:0;right:0;top:44%;transform:translateY(-50%);text-align:center;font:900 min(21vw,6.4rem)/1 'Orbitron','Arial Black',Impact,sans-serif;letter-spacing:.05em;color:#b45cff;filter:blur(22px);opacity:0;animation:gp 2.4s ease-in-out infinite alternate;animation-delay:calc(var(--s) + 1.2s)}
@keyframes gp{from{opacity:.15}to{opacity:.55}}
.sps{position:absolute;left:0;right:0;bottom:11%;text-align:center}
.sps b{display:inline-block;font:400 min(14vw,3.6rem)/1.1 'Great Vibes','Brush Script MT',cursive;background:linear-gradient(90deg,#ffd978,#fff6d2 50%,#ffd978);-webkit-background-clip:text;background-clip:text;color:transparent;clip-path:inset(0 100% 0 0);animation:wr 2.4s ease-in-out forwards;animation-delay:calc(var(--s) + 2.4s);padding:0 .25em}
@keyframes wr{to{clip-path:inset(0 0 0 0)}}
.sps svg{display:block;margin:2px auto 0;width:min(60vw,260px);height:20px}.sps path{fill:none;stroke:#ffd978;stroke-width:2;stroke-linecap:round;stroke-dasharray:300;stroke-dashoffset:300;animation:ds 1.8s ease-out forwards;animation-delay:calc(var(--s) + 4s)}
@keyframes ds{to{stroke-dashoffset:0}}
.spk{position:absolute;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:.72rem;opacity:0;animation:ki .6s ease 3s forwards}
@keyframes ki{to{opacity:.7}}
@media (prefers-reduced-motion:reduce){.lz{animation:none}.lz.a{top:50%}}
.mh{align-items:flex-start}.lgc{display:grid;justify-items:end;gap:4px}
.sel{position:relative;display:block;width:20px;height:20px;margin:-4px -6px -6px 0;padding:0}
.sel input{position:absolute;inset:-8px;width:36px;height:36px;margin:0;opacity:0;cursor:pointer;z-index:2}
.sel i{display:block;width:20px;height:20px;border-radius:6px;border:1.5px solid rgba(255,255,255,.6);background:rgba(255,255,255,.08);position:relative}
.sel input:checked+i{background:linear-gradient(180deg,var(--g1),var(--g2));border-color:transparent;box-shadow:0 0 8px rgba(46,224,111,.6)}
.sel input:checked+i::after{content:"";position:absolute;left:6px;top:2px;width:5px;height:10px;border:solid #fff;border-width:0 2.4px 2.4px 0;transform:rotate(45deg)}
.tri{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:7px}
.tri div{text-align:center}.tri span{font-size:.62rem;color:var(--mu);font-weight:800;letter-spacing:.06em;margin-right:5px}.tri b{font-size:.8rem;color:#fff}
.tri i{display:block;position:relative;overflow:hidden;height:3px;margin-top:4px;border-radius:2px;background:rgba(255,255,255,.18)}
.tri i::after{content:"";position:absolute;left:0;top:0;bottom:0;width:var(--w);background:rgba(255,255,255,.7)}
.tri .hi b{color:var(--c)}.tri .hi i::after{background:var(--c)}
.sx{grid-template-columns:76px 1fr 1fr 1.7fr;gap:4px}
.sx.h span,.pv2{text-align:center}.sx.h span:last-child{text-align:center}
.nv{font-size:1.06rem}.pv2{font-size:1.05rem}.pv2 small{font-size:.88rem}
.ev{font-size:.64rem}.ev i{font-size:1.4rem}
.es{display:inline-block;margin-left:5px;padding:0 6px;border-radius:999px;font-size:.6rem;font-weight:700;color:var(--mu);border:1px dashed rgba(255,255,255,.4);vertical-align:middle}
.esn{color:var(--mu);font-size:.66rem;text-align:center;padding-top:6px}
nav button{position:relative}.bd{position:absolute;top:-2px;left:calc(50% + 6px);min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:var(--g1);color:#04223f;font-size:.62rem;font-weight:800;line-height:17px;text-align:center}
.seg{display:flex;gap:6px;margin:6px 4px 12px;padding:4px;border-radius:14px;background:rgba(4,38,66,.7);border:1px solid var(--ln)}
.seg button{flex:1;padding:9px 6px;border-radius:10px;border:0;background:none;color:var(--mu);font-weight:800;font-size:.74rem}.seg button[aria-pressed=true]{background:linear-gradient(180deg,var(--g1),var(--g2));color:#fff}
.mcard{margin-bottom:10px;border-radius:18px;padding:12px}
.cpbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0}
.stp{display:flex;align-items:center;gap:6px}.stp button{width:34px;height:34px;border-radius:50%;border:1px solid var(--ln);background:rgba(255,255,255,.1);font-size:1.1rem;font-weight:800}.stp b{min-width:34px;text-align:center;font-size:1.3rem}
.mo{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 4px}.mo button{padding:6px 12px;border-radius:999px;border:1px solid var(--ln);background:rgba(255,255,255,.08);color:var(--mu);font-size:.72rem;font-weight:700}.mo button[aria-pressed=true]{color:#fff;border-color:var(--g1);background:rgba(46,224,111,.18)}
.big{width:100%;padding:12px;border-radius:14px;border:0;color:#fff;font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:.82rem;background:linear-gradient(180deg,var(--g1),var(--g2));box-shadow:0 5px 14px rgba(18,163,74,.45)}.big:disabled{opacity:.45}
.sl{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--ln);font-size:.82rem}.sl:last-child{border:0}.sl span:first-child{flex:1;min-width:0}.sl button{border:0;background:none;color:var(--mu);font-size:1rem;padding:4px 8px}
.cp summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0;cursor:pointer}.cp summary::-webkit-details-marker{display:none}
.cp summary strong{font-size:.95rem}.cp summary em{font-style:normal;color:var(--mu);font-size:.7rem;display:block;font-weight:500}.cp summary::after{content:"▾";color:var(--mu);transition:transform .2s}.cp[open] summary::after{transform:rotate(180deg)}
.pr2{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0;border-top:1px solid var(--ln);font-size:.82rem}.pr2 div{min-width:0}.pr2 small{display:block;color:var(--mu);font-size:.68rem}.pr2 b{font-size:1.05rem;color:var(--c);white-space:nowrap}
.cpt{margin-top:8px;padding-top:10px;border-top:1px solid var(--ln);text-align:center;font-size:.8rem;color:var(--mu)}.cpt b{font-size:1.2rem;color:#fff}
.lvh{display:flex;justify-content:space-between;font-size:.72rem;color:var(--mu);font-weight:600;margin-bottom:8px}
.lvs{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const lk=document.createElement('link');lk.rel='stylesheet';lk.href='https://fonts.googleapis.com/css2?family=Orbitron:wght@900&family=Great+Vibes&display=swap';document.head.appendChild(lk);

/* ---------- intro : lasers + nom M-ADJ (8 secondes) ---------- */
const sp=document.getElementById('sp')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'sp'}));
document.documentElement.classList.add('spl');
const H=()=>sp.style.setProperty('--H',(innerHeight-4)+'px');H();addEventListener('resize',H);
function intro(){const S=2;
sp.innerHTML=`<div class="lz a"></div><div class="lz b"></div><div class="lz c"></div><div class="spg" style="--s:${S}s">M-ADJ</div><div class="spt" style="--s:${S}s">${[...'M-ADJ'].map((c,i)=>`<span style="--i:${i};--s:${S}s">${c}</span>`).join('')}</div><div class="sps" style="--s:${S}s"><b>M-ADJ</b><svg viewBox="0 0 260 20"><path d="M6 12 C50 2 90 18 130 9 S210 4 254 11"/></svg></div><button class="spk">Passer ›</button>`;
sp.querySelector('.spk').onclick=end;}
let ended=0;function end(){if(ended)return;ended=1;sp.classList.add('out');document.documentElement.classList.remove('spl');setTimeout(()=>sp.remove(),800)}
intro();setTimeout(end,8000);

/* ---------- logos fiables : préchargés, mémorisés ---------- */
const LOK=new Set(),LBAD=new Set();window.CR={};
function fixLogos(){document.querySelectorAll('.av:not(.has) img').forEach(i=>{if(i.complete&&i.naturalWidth)i.parentNode.classList.add('has')})}
function pre(u){if(!u||LOK.has(u)||LBAD.has(u))return;const im=new Image();im.referrerPolicy='no-referrer';im.onload=()=>{LOK.add(u);fixLogos()};im.onerror=()=>LBAD.add(u);im.src=u}
window.av2=function(n,u){u=u||CR[String(n).toLowerCase()];const h=hue(n),ok=u&&LOK.has(u);
return `<span class="av${ok?' has':''}" style="background:hsl(${h} 35% 22%);color:hsl(${h} 75% 82%)"><b>${ini(n)}</b>${u&&!LBAD.has(u)?`<img src="${esc(u)}" alt="" decoding="async" referrerpolicy="no-referrer" onload="this.parentNode.classList.add('has')" onerror="this.remove()">`:''}</span>`};
const preAll=()=>M.forEach(m=>{pre(m.hc||CR[m.h.toLowerCase()]);pre(m.ac||CR[m.a.toLowerCase()])});
loadPred=function(){fetch('predictions.json?'+Date.now()).then(r=>r.json()).then(d=>{Object.assign(CR,d.crests||{});if(d.updated!==up){up=d.updated;M=merge(d.matches);preAll();render(1)}}).catch(()=>{if(!M.length)$('upd').textContent='Pas encore de données : la première mise à jour automatique arrive bientôt.'})};
loadScores=function(){fetch('scores.json?'+Date.now()).then(r=>r.ok?r.json():null).then(d=>{if(d&&d.t!==SCT){SC=d.m||{};SCT=d.t;su=d.u;render();if(maOn)renderMA()}}).catch(()=>{})};

/* ---------- sélection des matchs pour les coupons ---------- */
const SELK='pronos_sel_v1';let SEL=new Set();try{SEL=new Set(JSON.parse(localStorage.getItem(SELK)||'[]'))}catch(e){}
const saveSel=()=>{try{localStorage.setItem(SELK,JSON.stringify([...SEL]))}catch(e){}};
function badge(){const b=document.querySelector('nav button[data-t=g]');if(!b)return;let e=b.querySelector('.bd');if(!SEL.size){e&&e.remove();return}if(!e){e=document.createElement('b');e.className='bd';b.appendChild(e)}e.textContent=SEL.size}
window.selTog=function(i,el){const id=idOf(M[i]);el.checked?SEL.add(id):SEL.delete(id);saveSel();badge();if(maOn)renderMA()};

/* ---------- estimations pour les championnats sans statistiques ---------- */
const EB={s:25,c:8.6,r:10.2,f:24,k:4};
function est(m){const t=m.x+m.y,sc=Math.min(1.15,Math.max(.88,.88+.1*t)),hs=.5+.28*(m.x-m.y)/(t+1.2),o={};
['s','c','r'].forEach(k=>{const T0=EB[k]*sc;o[k]=[+(T0*hs).toFixed(2),+(T0*(1-hs)).toFixed(2)]});
o.f=[+(EB.f*.49).toFixed(2),+(EB.f*.51).toFixed(2)];o.k=[+(EB.k*.48).toFixed(2),+(EB.k*.52).toFixed(2)];return o}

/* ---------- carte de match : trois traits V1 / X / V2 + case coupon + logos ---------- */
card=function(m,sv,sd){const [,top,r]=pk(m),c=lv(top)[0],o=stOf(m),id=idOf(m),i=M.indexOf(m);
const day=sd?' · '+new Date(m.d).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'}):'';
const head=o.s==='live'?`<span class="lt2"><i class="dot"></i>${o.est?'EN COURS':'EN DIRECT'}${day}</span>`:o.s==='fin'?`<span class="ft2">TERMINÉ · ${HM(m.d)}${day}</span>`:`<span>🕐 <b>${HM(m.d)}</b>${day}</span>`;
const g=o.g||[],sc=`${g[0]??'–'} - ${g[1]??'–'}`;
const pill=o.s==='pre'?`<div class="pill v">VS</div>`:o.s==='live'?`<div class="pill">${sc}<small class="lv mn" data-i="${i}">${mnText(o,m)}</small></div>`:`<div class="pill">${sc}<small class="fn">FIN</small></div>`;
const busy=BUSY.get(id),open=OPEN.has(id),label=busy!=null?'Analyse…':open?'Masquer':sv.has(id)?"Voir l'analyse":'Analyse';
const body=busy!=null?scan(id):open?ana(m):'';
const tri=[['V1',r.h],['X',r.d],['V2',r.a]].map(([l,v])=>`<div${v===top?` class="hi ${c}"`:''}><span>${l}</span><b>${Math.round(v*100)}%</b><i style="--w:${Math.round(v*100)}%"></i></div>`).join('');
return `<article class="mc gl" data-k="${esc(id)}"><div class="mh">${head}<div class="lgc"><span>${m.l}</span><label class="sel" aria-label="Ajouter au coupon"><input type="checkbox" ${SEL.has(id)?'checked ':''}onchange="selTog(${i},this)"><i></i></label></div></div>
<div class="vs"><div class="tm">${av2(m.h,m.hc)}<span class="nm">${m.h}</span></div><div class="ct">${pill}<button class="an" ${busy!=null?'disabled ':''}onclick="tog(${i},this)">${ICO}<span>${label}</span></button></div><div class="tm">${av2(m.a,m.ac)}<span class="nm">${m.a}</span></div></div>
<div class="tri">${tri}</div>${o.est&&o.s==='fin'?'<div class="nt">Score non disponible</div>':''}<div class="ana"${body?'':' hidden'}>${body}</div></article>`};
const rr=render;render=function(f){rr(f);fixLogos();preAll()};

/* ---------- analyse : statistiques en pleine largeur, estimations signalées ---------- */
ana=function(m){const r=calc(m.x,m.y),ai=aiPicks(m),b=ai.top[0]||{t:'Aucun pronostic fiable',p:.5},[bc,bl]=lv(b.p),E=est(m);let es=0;
const dc=[[m.h+' ou nul',r.h+r.d],['Nul ou '+m.a,r.d+r.a],[m.h+' ou '+m.a,r.h+r.a]].sort((u,v)=>v[1]-u[1])[0];
const hc=(p,a,c)=>p>=.5?[a,p]:[c,1-p];
const h1=hc(r.g,m.h+' -1,5',m.a+' +1,5'),h2=hc(r.w,m.h+' +1,5',m.a+' -1,5');
const mk=(n,c)=>`<div class="mr"><span>${n}</span><span>${c}</span></div>`;
const sc=r.sc.map(s=>`<span class="sc">${s[0]}-${s[1]} · ${P(s[2])}</span>`).join('');
const rows=EV.map(([k,n,line,ic])=>{let v=m.e[k],x=0;if(!v){if(k==='o')return `<div class="sx na"><div class="ev"><i>${ic}</i>${n}</div><span class="nv">–</span><span class="nv">–</span><div class="pv2">Non disponible</div></div>`;v=E[k];x=1;es=1}
const [a,c]=v,t=a+c,p=over(t,line),pl=p>=.5,pp=pl?p:1-p;
return `<div class="sx"><div class="ev"><i>${ic}</i>${n}</div><span class="nv">${F(a)}</span><span class="nv">${F(c)}</span><div class="pv2 ${lv(pp)[0]}">${pl?'Plus':'Moins'} de ${fm(line)}${x?'<span class="es">≈ estimé</span>':''}<small>${Math.round(pp*100)} %</small></div></div>`}).join('');
return `<div class="ai ${bc}"><div class="ah"><span>🧠 Pronostic IA</span><span>${bl}</span></div><div class="ab"><strong>${b.t}</strong><b>${Math.round(b.p*100)} %</b></div><div class="as">Choisi parmi ${ai.n} marchés selon leur fiabilité${ai.top.length>1?' · autres bons choix : '+ai.top.slice(1).map(x=>`<span class="alt">${x.t} ${Math.round(x.p*100)} %</span>`).join(''):''}</div></div>`
+`<div class="st">Marchés</div><div class="mkt">`+mk(r.o>=.5?'Plus de 2,5 buts':'Moins de 2,5 buts',chip(Math.max(r.o,1-r.o)))+mk('Les deux marquent : '+(r.b>=.5?'oui':'non'),chip(Math.max(r.b,1-r.b)))+mk('Double chance : '+dc[0],chip(dc[1]))+mk('Handicap : '+h1[0],chip(h1[1]))+mk('Handicap : '+h2[0],chip(h2[1]))+mk('3 scores probables',sc)+`</div>`
+`<div class="stx"><div class="st">Statistiques attendues</div><div class="sx h"><span>Événement</span><span>Dom.</span><span>Ext.</span><span>Pronostic</span></div>${rows}<div class="stl"><span class="ok">Sûr</span><span class="mid">Moyen</span><span class="bad">Faible</span></div>${es?'<div class="esn">≈ estimé : estimation générale, car ce championnat n\'a pas de statistiques détaillées</div>':''}</div>`};

/* ---------- moteur 1 : analyse des matchs en direct (non enregistrée) ---------- */
function liveModel(m,o){const t=mnText(o,m),mn=t==='MT'?45:parseInt(t)||1,g=o.g||[0,0],gh=+g[0]||0,ga=+g[1]||0,f=Math.max(.02,(90-Math.min(mn,90))/90);
let lh=m.x*f,la=m.y*f;if(gh>ga){lh*=.9;la*=1.12}else if(ga>gh){la*=.9;lh*=1.12}
let h=0,d=0,a=0,o1=0,o2=0,b=0;
for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){const p=pois(i,lh)*pois(j,la),fh=gh+i,fa=ga+j;if(fh>fa)h+=p;else if(fh===fa)d+=p;else a+=p;if(i+j>=1)o1+=p;if(i+j>=2)o2+=p;if(fh>0&&fa>0)b+=p}
const s=h+d+a;[h,d,a,o1,o2,b]=[h,d,a,o1,o2,b].map(v=>v/s);
const ls=lh+la||1,ng=1-Math.exp(-ls),nh=lh/ls*ng,na=la/ls*ng,tot=gh+ga,L=[];
const add=(t,p,w,mx)=>{if(p>=.5&&p<=mx)L.push({t,p,s:.5+(p-.5)*w})};
add('Victoire '+m.h+' (V1)',h,1,.97);add('Match nul (X)',d,1,.97);add('Victoire '+m.a+' (V2)',a,1,.97);
add('Plus de '+fm(tot+.5)+' buts',o1,.95,.93);add('Moins de '+fm(tot+.5)+' buts',1-o1,.95,.93);add('Plus de '+fm(tot+1.5)+' buts',o2,.95,.93);add('Moins de '+fm(tot+1.5)+' buts',1-o2,.95,.93);
add('Les deux marquent : oui',b,.95,.93);add('Les deux marquent : non',1-b,.95,.93);
add('Prochain but : '+m.h,nh,.9,.9);add('Prochain but : '+m.a,na,.9,.9);add('Aucun autre but',1-ng,.9,.93);
add('Double chance : '+m.h+' ou nul',h+d,.7,.9);add('Double chance : nul ou '+m.a,d+a,.7,.9);
L.sort((x,y)=>y.s-x.s);return{mn:t,gh,ga,h,d,a,L}}
function liveCard(m){const o=stOf(m),M1=liveModel(m,o),top=M1.L[0],c=top?lv(top.p)[0]:'mid',tri=[['V1',M1.h],['X',M1.d],['V2',M1.a]],mx=Math.max(M1.h,M1.d,M1.a);
return `<article class="mcard gl"><div class="lvh"><span class="lt2"><i class="dot"></i>EN DIRECT · <span>${M1.mn}</span></span><span>${m.l}</span></div>
<div class="vs"><div class="tm">${av2(m.h,m.hc)}<span class="nm">${m.h}</span></div><div class="ct"><div class="pill">${M1.gh} - ${M1.ga}</div></div><div class="tm">${av2(m.a,m.ac)}<span class="nm">${m.a}</span></div></div>
<div class="tri">${tri.map(([l,v])=>`<div${v===mx?` class="hi ${lv(v)[0]}"`:''}><span>${l}</span><b>${Math.round(v*100)}%</b><i style="--w:${Math.round(v*100)}%"></i></div>`).join('')}</div>
<div class="ai ${c}" style="margin:10px 0 8px"><div class="ah"><span>🧠 Pronostic IA · direct</span><span>${top?lv(top.p)[1]:''}</span></div><div class="ab"><strong>${top?top.t:'Match presque terminé'}</strong><b>${top?Math.round(top.p*100)+' %':''}</b></div></div>
<div class="mkt">${M1.L.slice(0,5).map(x=>`<div class="mr"><span>${x.t}</span><span>${chip(x.p)}</span></div>`).join('')}</div></article>`}

/* ---------- moteur 2 : coupons ---------- */
let maOn=0,maTab='live',cpN=3,cpMode='auto',cpT0=0,cpTimer=0,CPR=null;
function pickFor(m){const o=stOf(m);if(o.s==='live'){const L=liveModel(m,o).L[0];return L?{t:L.t,p:L.p,s:L.s,live:1}:null}
if(o.s==='pre'){const a=aiPicks(m).top[0];return a?{t:a.t,p:a.p,s:a.s,live:0}:null}return null}
function elig(){return M.filter(m=>SEL.has(idOf(m))).map(m=>({m,k:pickFor(m)})).filter(x=>x.k&&(cpMode==='auto'||(cpMode==='live')===!!x.k.live))}
function buildCp(){const E=elig().sort((a,b)=>b.k.s-a.k.s).slice(0,cpN),prob=E.reduce((p,x)=>p*x.k.p,1);
return{id:'cp|'+Date.now(),t:Date.now(),type:'cp',n:E.length,prob,picks:E.map(x=>({h:x.m.h,a:x.m.a,l:x.m.l,d:x.m.d,t:x.k.t,p:x.k.p,live:x.k.live}))}}
const cpHTML=(c,del)=>`<details class="cp mcard gl" ${del==null?'open':''}><summary><div><strong>🎟️ Coupon M-ADJ · ${c.n} sélection${c.n>1?'s':''}</strong><em>${new Date(c.t).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}${del!=null?' · expire dans '+Math.max(1,Math.ceil((LIFE-(Date.now()-c.t))/864e5))+' j':''}</em></div>${chip(c.prob)}</summary>
${c.picks.map(p=>`<div class="pr2 ${lv(p.p)[0]}"><div><strong>${p.h} – ${p.a}</strong><small>${p.l}${p.live?' · en direct':''} · ${p.t}</small></div><b>${Math.round(p.p*100)} %</b></div>`).join('')}
<div class="cpt">Probabilité que tout passe : <b>${Math.round(c.prob*100)} %</b>${c.n>3?'<br>Plus il y a de sélections, plus cette probabilité baisse.':''}</div>${del!=null?`<button class="go" onclick="delAn(${del})">Supprimer</button>`:''}</details>`;
window.cpGo=function(){if(cpT0)return;cpT0=Date.now();renderMA();cpTimer=setInterval(()=>{const p=Math.min(100,Math.round((Date.now()-cpT0)/ANALYSE_MS*100)),e=document.querySelector('#cpscan .pc'),s=document.querySelector('#cpscan .st2');if(e)e.textContent=p+'%';if(s)s.textContent=['Lecture des matchs sélectionnés…','Calcul des probabilités…','Classement des pronostics les plus sûrs…','Construction du coupon…'][Math.min(3,Math.floor(p/25))]},120);
setTimeout(()=>{clearInterval(cpTimer);cpT0=0;CPR=buildCp();if(CPR.n){const a=rd();a.unshift(CPR);wr(a);toast('Coupon enregistré dans l\'onglet Analyses · 30 jours')}renderMA()},ANALYSE_MS)};
window.maSet=function(k,v){if(k==='tab')maTab=v;if(k==='mode')cpMode=v;if(k==='n')cpN=Math.max(1,Math.min(20,cpN+v));if(k==='rm'){SEL.delete(v);saveSel();badge();const c=cardOf(v);c&&(c.querySelector('.sel input').checked=false)}renderMA()};
window.renderMA=function(){const el=$('v-g');if(!el)return;let h=`<h1 class="pgt">M.A</h1><div class="seg"><button aria-pressed="${maTab==='live'}" onclick="maSet('tab','live')">⚡ Moteur 1 · Direct</button><button aria-pressed="${maTab==='cp'}" onclick="maSet('tab','cp')">🎟️ Moteur 2 · Coupons</button></div>`;
if(maTab==='live'){const L=M.filter(m=>stOf(m).s==='live');h+=L.length?L.map(liveCard).join('')+'<div class="note">Analyse automatique : score, minute et force des équipes. Les statistiques détaillées en direct (tirs, corners) ne sont pas disponibles gratuitement. Ces analyses ne sont pas enregistrées.</div>':'<div class="empty"><div>⚡</div>Aucun match en direct pour le moment.<br>Dès qu\'un match commence, il est analysé ici automatiquement.</div>'}
else{const S=M.filter(m=>SEL.has(idOf(m))),E=elig();cpN=Math.max(1,Math.min(cpN,20,E.length||1));
h+=`<div class="mcard gl"><div class="st" style="margin-top:0">Matchs sélectionnés (${S.length})</div>${S.length?S.map(m=>{const o=stOf(m);return `<div class="sl"><span>${m.h} – ${m.a}</span><span class="b ${o.s==='live'?'ok':o.s==='fin'?'bad':'mid'}">${o.s==='live'?'direct':o.s==='fin'?'terminé':HM(m.d)}</span><button aria-label="Retirer" onclick="maSet('rm',${esc(JSON.stringify(idOf(m)))})">✕</button></div>`}).join(''):'<div class="note" style="margin:0">Coche la petite case ☑ sous le nom du championnat sur les matchs que tu veux dans ton coupon.</div>'}
<div class="cpbar"><div class="stp"><button onclick="maSet('n',-1)" aria-label="Moins">−</button><b>${cpN}</b><button onclick="maSet('n',1)" aria-label="Plus">+</button></div><span class="note" style="margin:0">sélection${cpN>1?'s':''} (1 à 20)</span></div>
<div class="mo">${[['auto','Auto'],['pre','Avant-match'],['live','En direct']].map(([k,l])=>`<button aria-pressed="${cpMode===k}" onclick="maSet('mode','${k}')">${l}</button>`).join('')}</div>
<button class="big" onclick="cpGo()" ${E.length&&!cpT0?'':'disabled'}>🎟️ Construire le coupon (${Math.min(cpN,E.length)}/${E.length} possibles)</button></div>`;
if(cpT0)h+=`<div class="mcard gl"><div class="scan" id="cpscan"><div class="gr"></div><div class="lh"></div><div class="lh b2"></div><div class="lw"></div><i></i><i></i><i></i><i></i><div class="sx2"><div class="pc">0%</div><div class="st2">Lecture des matchs sélectionnés…</div></div></div></div>`;
else if(CPR)h+=CPR.n?cpHTML(CPR,null):'<div class="empty">Aucun pronostic possible avec cette sélection.</div>'}
el.innerHTML=h};
const sh=show;show=function(t){sh(t);maOn=t==='g';if(t==='g')renderMA()};
renderAn=function(){const a=rd();wr(a);
$('an').innerHTML=a.length?a.map((e,i)=>{if(e.type==='cp')return cpHTML(e,i);const m=e.m,[txt,top]=pk(m),left=Math.max(1,Math.ceil((LIFE-(Date.now()-e.t))/864e5));
return `<article class="card gl"><div class="hd"><span>${m.l} · ${T(m.d)}</span><span>expire dans ${left} j</span></div><div class="vs"><div class="tm">${av2(m.h,m.hc)}<span class="nm">${m.h}</span></div><div class="ct"><div class="pill v">VS</div></div><div class="tm">${av2(m.a,m.ac)}<span class="nm">${m.a}</span></div></div><div class="pk"><div><small>Pronostic</small><strong>${txt}</strong></div>${chip(top)}</div><details><summary>Voir l'analyse complète</summary><div class="ana">${ana(m)}</div></details><button class="go" onclick="delAn(${i})">Supprimer</button></article>`}).join(''):`<div class="empty"><div>✨</div>Aucune analyse pour le moment.<br>Analyse un match ou construis un coupon : ils sont conservés ici pendant 30 jours.</div>`};

/* ---------- démarrage ---------- */
badge();setInterval(loadPred,3e5);setInterval(loadScores,6e4);setInterval(()=>{if(!document.hidden){render();if(maOn&&maTab==='live')renderMA()}},3e4);
loadPred();loadScores();render(1);
})();
