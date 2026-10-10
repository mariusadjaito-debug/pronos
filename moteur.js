/* moteur.js v2 : moteur de pronostic (lignes comparées aux matchs récents, niveaux colorés, coupons variés, direct manuel) */
(function(){
const css=`.lm{--c:#4da3ff}.ai.lm{--c:#4da3ff}
.mr.ok,.mr.lm,.mr.mid,.mr.bad{border:1.5px solid var(--c);background:rgba(2,18,36,.5)}
.sx.ok,.sx.lm,.sx.mid,.sx.bad{margin:6px 0;padding:9px 8px;border:1.5px solid var(--c);border-radius:12px;background:rgba(2,18,36,.4)}
.stx .sx:has(.es){border:1.5px dashed #ff4d4d}
.alt2{display:block;margin-top:3px;font-size:.72rem;font-weight:600;color:var(--c)}
.fb2{margin:0 0 12px;padding:10px 12px;border-radius:14px;background:rgba(2,18,36,.45);border:1px solid var(--ln);font-size:.76rem;line-height:1.6;color:var(--mu)}
.fb2 b{color:#fff}.fb2 .t{font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
.gd{display:flex;gap:6px;align-items:flex-end;height:84px;margin-top:6px}.gd div{flex:1;text-align:center;font-size:.64rem;color:var(--mu)}.gd i{display:block;margin:0 auto 3px;width:100%;min-height:2px;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#9fd0ff,#2b7bff)}.gd b{display:block;color:#fff;font-size:.7rem}
.lvn{margin:0 0 10px;padding:7px 10px;border-radius:10px;background:rgba(46,224,111,.12);border:1px solid rgba(46,224,111,.35);font-size:.72rem;color:#bfffd6}
.tg{margin-top:8px;font-size:.72rem;color:var(--mu);line-height:1.6}.tg b{color:#fff}
.lg{flex-wrap:wrap;gap:4px 10px}.big[disabled]{background:rgba(255,255,255,.12);box-shadow:none;color:var(--mu)}`;
const stl=document.createElement('style');stl.textContent=css;document.head.appendChild(stl);

/* ---------- niveaux, scores, distributions ---------- */
/* RÉGLAGE : true = lignes d'hier (≈ 66 % et ≈ 85 %, modèle seul) ; false = lignes proches de la moyenne, comparées aux matchs récents */
const HIER=true;
const N=10,RHO=-.06,rng=(a,b)=>{const o=[];for(let v=a;v<=b;v++)o.push(v+.5);return o};
const lv2=p=>{p=Math.round(p*100)/100;return p>=.75?['ok','Très sûr']:p>=.65?['lm','Sûr']:p>=.55?['mid','Modéré']:['bad','Faible']};
const chip2=p=>{const [c,t]=lv2(p);return `<span class="b ${c}">${P(p)} · ${t}</span>`};
const cnt=(a,f)=>a.filter(f).length,avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const bl=(pm,hits,n)=>{if(HIER||n<4)return pm;const w=Math.min(.35,n/40);return(1-w)*pm+w*((hits+1)/(n+2))};
function grid(x,y,dc){const G=[];let s=0;for(let i=0;i<=N;i++){G[i]=[];for(let j=0;j<=N;j++){let p=pois(i,x)*pois(j,y);if(dc&&i<2&&j<2)p*=i===0&&j===0?1-x*y*RHO:i===0&&j===1?1+x*RHO:i===1&&j===0?1+y*RHO:1-RHO;G[i][j]=p;s+=p}}for(const r of G)for(let j=0;j<=N;j++)r[j]/=s;return G}
const FC=new Map();
function fg(m){const o=stOf(m),live=o.s==='live'&&!o.est;let gh=0,ga=0,mn=0;
if(live){gh=+(o.g||[])[0]||0;ga=+(o.g||[])[1]||0;const t=mnText(o,m);mn=t==='MT'?45:parseInt(t)||1}
const key=[m.x,m.y,live,gh,ga,mn].join();let R=FC.get(key);if(R)return R;
let x=m.x,y=m.y;
if(live){const I=u=>.85*u+.15*u*u/90,f=Math.max(.01,(I(90)-I(Math.min(mn,90)))/I(90));x*=f;y*=f;const d=gh-ga,k=Math.min(Math.abs(d),2);if(d>0){x*=1-.05*k;y*=1+.08*k}else if(d<0){y*=1-.05*k;x*=1+.08*k}}
R={G:grid(x,y,!live),gh,ga,live,mn};if(FC.size>400)FC.clear();FC.set(key,R);return R}
function fin(R){if(R.F)return R.F;const{G,gh,ga}=R,T=[],D={},Hd=[],Ad=[],sc=[];let h=0,d=0,a=0,b=0;
for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){const p=G[i][j],fh=gh+i,fa=ga+j;fh>fa?h+=p:fh===fa?d+=p:a+=p;if(fh>0&&fa>0)b+=p;T[fh+fa]=(T[fh+fa]||0)+p;D[fh-fa]=(D[fh-fa]||0)+p;Hd[fh]=(Hd[fh]||0)+p;Ad[fa]=(Ad[fa]||0)+p;sc.push([fh,fa,p])}
sc.sort((u,v)=>v[2]-u[2]);return R.F={h,d,a,b,T,D,Hd,Ad,sc:sc.slice(0,3),gh,ga}}
function nbcdf(mu,phi,k){const r=mu/(phi-1),pr=r/(r+mu);let pm=Math.pow(pr,r),c=pm;for(let i=0;i<k;i++){pm*=(i+r)/(i+1)*(1-pr);c+=pm}return Math.min(1,c)}
const nearT=(c,t,lo,hi)=>{let ok=c.filter(x=>x.p>=lo&&x.p<=hi);if(!ok.length)ok=c.filter(x=>x.p>=.5);return ok.sort((a,b)=>Math.abs(a.p-t)-Math.abs(b.p-t))[0]||{side:'Plus',line:.5,p:.5}};
const best=(c,mu)=>HIER?nearT(c,.66,.58,.76):[c.filter(x=>x.side==='Plus'&&x.line<mu).sort((a,b)=>b.line-a.line)[0],c.filter(x=>x.side==='Moins'&&x.line>mu).sort((a,b)=>a.line-b.line)[0]].filter(Boolean).sort((a,b)=>b.p-a.p)[0]||c.slice().sort((a,b)=>b.p-a.p)[0]||{side:'Plus',line:.5,p:.5};
const safe=c=>HIER?nearT(c,.85,.78,.93):c.filter(x=>x.p>=.76&&x.p<=.86).sort((a,b)=>a.p-b.p)[0]||c.filter(x=>x.p>.5&&x.p<=.86).sort((a,b)=>b.p-a.p)[0]||{side:'Plus',line:.5,p:.5};
const SD={k:{n:'Cart.',i:'🟨',L:rng(0,9),phi:1.15},r:{n:'Corn.',i:'🚩',L:rng(3,17),phi:1.3},c:{n:'Tirs cadrés',i:'🎯',L:rng(1,15),phi:1.3},s:{n:'Tirs totaux',i:'🎯',L:rng(11,40),phi:1.45},f:{n:'Fautes',i:'👊',L:rng(13,37),phi:1.2}};
const EB={s:25,c:8.6,r:10.2,f:24,k:4};
function est2(m){const t=m.x+m.y,sc=Math.min(1.15,Math.max(.88,.88+.1*t)),hs=.5+.28*(m.x-m.y)/(t+1.2),o={};
['s','c','r'].forEach(k=>{const T0=EB[k]*sc;o[k]=[+(T0*hs).toFixed(2),+(T0*(1-hs)).toFixed(2)]});o.f=[+(EB.f*.49).toFixed(2),+(EB.f*.51).toFixed(2)];o.k=[+(EB.k*.48).toFixed(2),+(EB.k*.52).toFixed(2)];return o}
/* statistiques : la moyenne du modèle est comparée aux 20 derniers matchs réels des deux équipes avant de choisir la ligne */
function rowsOf(m){const E=est2(m),rows=[];
for(const k of['k','r','c','s','f']){const d=SD[k];let v=m.e&&m.e[k],es=0;if(!v){v=E[k];es=1}
const mu=v[0]+v[1],sd=Math.sqrt(mu*d.phi),arr=!es&&m.z&&m.z[k]?[...m.z[k][0],...m.z[k][1]]:[],n=arr.length,c=[];
for(const l of d.L){const u=nbcdf(mu,d.phi,Math.floor(l)),eu=cnt(arr,x=>x<l),z=Math.abs(l-mu)/sd;c.push({side:'Moins',line:l,p:bl(u,eu,n),z},{side:'Plus',line:l,p:bl(1-u,n-eu,n),z})}
rows.push({k,d,v,es,n,mn:best(c,mu),sf:safe(c)})}
return rows.sort((a,b)=>b.mn.p-a.mn.p)}
function gl(m,Fn,tot,live){const z=!live&&m.z?[...(m.z.gh||[]),...(m.z.ga||[])].map(x=>x[0]+x[1]):[],n=z.length;let mu=0,v=0;Fn.T.forEach((p,t)=>{mu+=p*t});Fn.T.forEach((p,t)=>{v+=p*(t-mu)*(t-mu)});const sd=Math.sqrt(v)||1,c=[];
for(const l of rng(0,9)){if(l<tot||l===.5)continue;let o=0;Fn.T.forEach((p,t)=>{if(t>l)o+=p});const eo=cnt(z,x=>x>l),zz=Math.abs(l-mu)/sd;c.push({side:'Plus',line:l,p:bl(o,eo,n),z:zz},{side:'Moins',line:l,p:bl(1-o,n-eo,n),z:zz})}
return{main:best(c,mu),safe:safe(c)}}
function teamG(m,Fn,live){const o=[];[['h',m.h,Fn.Hd,'gh'],['a',m.a,Fn.Ad,'ga']].forEach(([s,nm,Dd,zk])=>{const g=!live&&m.z&&m.z[zk]?m.z[zk].map(x=>x[0]):[],n=g.length,c=[];
for(const l of[.5,1.5]){let pl=0;Dd.forEach((p,t)=>{if(t>l)pl+=p});const eo=cnt(g,x=>x>l),zz=Math.abs(l-(Dd.reduce((s,p,t)=>s+p*t,0)));c.push({side:'Plus',line:l,p:bl(pl,eo,n),z:zz},{side:'Moins',line:l,p:bl(1-pl,n-eo,n),z:zz})}
const b=c.filter(x=>x.p>=.55&&x.p<=.9&&!(x.side==='Plus'&&x.line===.5&&x.p>.9)).sort((a,b)=>b.p-a.p)[0];if(b)o.push({t:nm+' : '+b.side.toLowerCase()+' de '+fm(b.line)+' but'+(b.line>1?'s':''),p:b.p})});return o}
function hcap(m,Fn){const fav=m.x>=m.y?1:-1,D=Fn.D,out=[],cov=k=>{let p=0;for(const d in D)if(fav*(+d)>k)p+=D[d];return p};
for(let k=5.5;k>=.5;k--){const p=cov(k);if(p>=.62){out.push({t:'Handicap '+(fav>0?m.h:m.a)+' -'+fm(k),p});break}}
for(let k=.5;k<=9.5;k++){const p=1-cov(k);if(p>=.72){out.push({t:'Handicap '+(fav>0?m.a:m.h)+' +'+fm(k),p});break}}return out}
function bttsP(m,Fn,live){const z=!live&&m.z?[...(m.z.gh||[]),...(m.z.ga||[])]:[];return bl(Fn.b,cnt(z,x=>x[0]>0&&x[1]>0),z.length)}
/* tous les pronostics possibles d'un match, classés ; chaque famille de marché a son poids de fiabilité */
function allPicks(m){const R=fg(m),Fn=fin(R),L=[],tot=R.gh+R.ga,add=(t,p,w,mx,k)=>{if(p>=.5&&p<=mx)L.push({t,p,s:.5+(p-.5)*w,k})};
add('Victoire '+m.h+' (V1)',Fn.h,1,.97,'r');add('Match nul (X)',Fn.d,1,.97,'r');add('Victoire '+m.a+' (V2)',Fn.a,1,.97,'r');
const g=gl(m,Fn,tot,R.live);add(g.main.side+' de '+fm(g.main.line)+' buts',g.main.p,.95,.93,'g');add(g.safe.side+' de '+fm(g.safe.line)+' buts',g.safe.p,.75,.86,'g');
const bp=bttsP(m,Fn,R.live);add('Les deux marquent : '+(bp>=.5?'oui':'non'),Math.max(bp,1-bp),.92,.93,'b');
add('Double chance : '+[[m.h+' ou nul',Fn.h+Fn.d],['nul ou '+m.a,Fn.d+Fn.a],[m.h+' ou '+m.a,Fn.h+Fn.a]].sort((u,v)=>v[1]-u[1])[0][0],Math.max(Fn.h+Fn.d,Fn.d+Fn.a,Fn.h+Fn.a),.6,.85,'d');
hcap(m,Fn).forEach(x=>add(x.t,x.p,.7,.88,'h'));teamG(m,Fn,R.live).forEach(x=>add(x.t,x.p,.88,.9,'t'));
if(!R.live)rowsOf(m).forEach(r=>{if(!r.es){add(r.d.n+' : '+r.mn.side.toLowerCase()+' de '+fm(r.mn.line),r.mn.p,.72,.93,'s');add(r.d.n+' : '+r.sf.side.toLowerCase()+' de '+fm(r.sf.line),r.sf.p,.55,.86,'s')}});
L.sort((a,b)=>b.s-a.s);return{top:L.slice(0,3),all:L,n:L.length,R,Fn,g,bp}}

/* ---------- analyse complète d'un match ---------- */
const FL=s=>[...s].map(c=>`<b style="color:${{V:'#4ade80',N:'#fbbf24',D:'#ff7a7a'}[c]}">${c}</b>`).join('');
const pc=v=>(v>=0?'+':'')+Math.round(v*100)+' %',a1=(a,i)=>fm(avg(a.map(x=>x[i])).toFixed(1));
function feat(m){const f=m.f,z=m.z;return `<div class="fb2"><div class="t">📊 Éléments pris en compte</div>Buts attendus : <b>${fm(m.x)}</b> – <b>${fm(m.y)}</b> · ${HIER?'modèle : forces d\'attaque et de défense, forme (6 derniers matchs), domicile / extérieur (15 derniers), confrontations directes':'3 modèles combinés : forces d\'attaque et de défense + forme, 10 derniers matchs à domicile / à l\'extérieur, confrontations directes depuis 2021'}`
+(f?`<br>Forme (5 derniers) : <b>${m.h}</b> ${FL(f.fh)} · <b>${m.a}</b> ${FL(f.fa)}`:'')
+(!HIER&&z&&z.gh&&z.gh.length?`<br>${m.h} à domicile (${z.gh.length} derniers) : <b>${a1(z.gh,0)}</b> buts marqués, <b>${a1(z.gh,1)}</b> encaissés<br>${m.a} à l'extérieur (${z.ga.length} derniers) : <b>${a1(z.ga,0)}</b> marqués, <b>${a1(z.ga,1)}</b> encaissés`:'')
+(f?`<br>Confrontations directes${HIER?'':' depuis 2021'} : ${f.h2[3]?`${f.h2[0]}V · ${f.h2[1]}N · ${f.h2[2]}D (sur ${f.h2[3]})`:'aucune'}<br>${m.h} : attaque ${pc(f.at[0]-1)} · défense ${pc(1-f.df[0])} · ${m.a} : attaque ${pc(f.at[1]-1)} · défense ${pc(1-f.df[1])}`:'<br>Forme et confrontations directes : disponibles après la prochaine mise à jour des données.')+`</div>`}
function ana2(m){const A=allPicks(m),{R,Fn,g,bp}=A,b=A.top[0]||{t:'Aucun pronostic fiable',p:.5},[bc,bl2]=lv2(b.p),hc=hcap(m,Fn),tg=teamG(m,Fn,R.live);
const dc=[[m.h+' ou nul',Fn.h+Fn.d],['Nul ou '+m.a,Fn.d+Fn.a],[m.h+' ou '+m.a,Fn.h+Fn.a]].sort((u,v)=>v[1]-u[1])[0],o25=1-(Fn.T.reduce((s,p,t)=>t<3?s+p:s,0));
const rows0=[[g.main.side+' de '+fm(g.main.line)+' buts',g.main.p],['Plus sûr : '+g.safe.side.toLowerCase()+' de '+fm(g.safe.line)+' buts',g.safe.p],[(o25>=.5?'Plus':'Moins')+' de 2,5 buts (ligne standard)',Math.max(o25,1-o25)],['Les deux marquent : '+(bp>=.5?'oui':'non'),Math.max(bp,1-bp)],['Double chance : '+dc[0],dc[1]],...hc.map(x=>[x.t,x.p]),...tg.map(x=>[x.t,x.p])].filter(x=>x[1]<.995&&x[1]>.005).sort((p,q)=>q[1]-p[1]);
const mk=([n,p])=>`<div class="mr ${lv2(p)[0]}"><span>${n}</span><span>${chip2(p)}</span></div>`;
const sc=Fn.sc.map(s=>`<span class="sc">${s[0]}-${s[1]} · ${P(s[2])}</span>`).join('');
const T=[0,1,2,3,4].map(t=>t<4?Fn.T[t]||0:Fn.T.reduce((a,p,i)=>i>=4?a+p:a,0)),mx=Math.max(...T,.01),bt=T.indexOf(mx);
let h=R.live?`<div class="lvn">⚡ En direct : ${R.gh} - ${R.ga} · ${R.mn}' · analyse recalculée avec le score et la minute</div>`:'';
h+=`<div class="ai ${bc}"><div class="ah"><span>🧠 Pronostic IA</span><span>${bl2}</span></div><div class="ab"><strong>${b.t}</strong><b>${Math.round(b.p*100)} %</b></div><div class="as">Choisi parmi ${A.n} marchés selon leur fiabilité${A.top.length>1?' · autres bons choix : '+A.top.slice(1).map(x=>`<span class="alt">${x.t} ${Math.round(x.p*100)} %</span>`).join(''):''}</div></div>`;
if(!R.live)h+=feat(m);
h+=`<div class="st">Marchés · du plus sûr au plus faible</div><div class="mkt">${rows0.map(mk).join('')}<div class="mr"><span>${R.live?'Scores finaux probables':'3 scores probables'}</span><span>${sc}</span></div></div>`;
const td=(Dd)=>[0,1,2].map(i=>`${i} but${i>1?'s':''} <b>${Math.round((Dd[i]||0)*100)} %</b>`).concat([`3+ <b>${Math.round(Dd.reduce((s,p,i)=>i>=3?s+p:s,0)*100)} %</b>`]).join(' · ');
h+=`<div class="st">Buts du match</div><div class="gd">${T.map((p,i)=>`<div><b>${Math.round(p*100)}%</b><i style="height:${Math.round(p/mx*58)+2}px${i===bt?';background:linear-gradient(180deg,#d7ffb0,#4ade80)':''}"></i>${i<4?i:'4+'}</div>`).join('')}</div><div class="tg">${m.h} : ${td(Fn.Hd)}<br>${m.a} : ${td(Fn.Ad)}</div>`;
if(R.live)return h+`<div class="note">Statistiques détaillées en direct (tirs, corners, cartons) : disponibles dès que la clé complète est branchée.</div>`;
const rr=rowsOf(m),rows=rr.map(r=>{const[a,c]=r.v;return `<div class="sx ${lv2(r.mn.p)[0]}"><div class="ev"><i>${r.d.i}</i>${r.d.n}</div><span class="nv">${F(a)}</span><span class="nv">${F(c)}</span><div class="pv2 ${lv2(r.mn.p)[0]}">${r.mn.side} de ${fm(r.mn.line)}${r.es?'<span class="es">≈ estimé</span>':''}<small>${Math.round(r.mn.p*100)} % · ${lv2(r.mn.p)[1]}</small><span class="alt2 ${lv2(r.sf.p)[0]}">Plus sûr : ${r.sf.side.toLowerCase()} de ${fm(r.sf.line)} · ${Math.round(r.sf.p*100)} %</span></div></div>`}).join('');
return h+`<div class="stx"><div class="st">Statistiques attendues · du plus sûr au plus faible</div><div class="sx h"><span>Événement</span><span>Dom.</span><span>Ext.</span><span>Pronostic</span></div>${rows}<div class="sx na"><div class="ev"><i>🚩</i>Hors-jeu</div><span class="nv">–</span><span class="nv">–</span><div class="pv2">Non disponible</div></div><div class="stl"><span class="ok">Très sûr</span><span class="lm">Sûr</span><span class="mid">Modéré</span><span class="bad">Faible</span></div>${rr.some(r=>r.es)?'<div class="esn">≈ estimé : estimation générale, ce championnat n\'a pas de statistiques détaillées</div>':`<div class="esn">${HIER?'Lignes choisies d\'après la moyenne du modèle (≈ 66 % et ≈ 85 %)':'Ligne choisie en comparant la moyenne du modèle aux 20 derniers matchs réels des deux équipes'}</div>`}</div>`}

/* ---------- carte de match (probabilités recalculées en direct) ---------- */
let SELC=new Set();const readSel=()=>{try{return new Set(JSON.parse(localStorage.getItem('pronos_sel_v1')||'[]'))}catch(e){return new Set()}};
const triH=Fn=>{const mx=Math.max(Fn.h,Fn.d,Fn.a);return[['V1',Fn.h],['X',Fn.d],['V2',Fn.a]].map(([l,v])=>`<div${v===mx?` class="hi ${lv2(v)[0]}"`:''}><span>${l}</span><b>${Math.round(v*100)}%</b><i style="--w:${Math.round(v*100)}%"></i></div>`).join('')};
function card2(m,sv,sd){const o=stOf(m),id=idOf(m),i=M.indexOf(m),Fn=fin(fg(m));
const day=sd?' · '+new Date(m.d).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'}):'';
const head=o.s==='live'?`<span class="lt2"><i class="dot"></i>${o.est?'EN COURS':'EN DIRECT'}${day}</span>`:o.s==='fin'?`<span class="ft2">TERMINÉ · ${HM(m.d)}${day}</span>`:`<span>🕐 <b>${HM(m.d)}</b>${day}</span>`;
const g=o.g||[],sc=`${g[0]??'–'} - ${g[1]??'–'}`;
const pill=o.s==='pre'?`<div class="pill v">VS</div>`:o.s==='live'?`<div class="pill">${sc}<small class="lv mn" data-i="${i}">${mnText(o,m)}</small></div>`:`<div class="pill">${sc}<small class="fn">FIN</small></div>`;
const busy=BUSY.get(id),open=OPEN.has(id),label=busy!=null?'Analyse…':open?'Masquer':sv.has(id)?"Voir l'analyse":'Analyse',body=busy!=null?scan(id):open?ana2(m):'';
return `<article class="mc gl" data-k="${esc(id)}"><div class="mh">${head}<div class="lgc"><span>${m.l}</span><label class="sel" aria-label="Ajouter au coupon"><input type="checkbox" ${SELC.has(id)?'checked ':''}onchange="selTog(${i},this)"><i></i></label></div></div>
<div class="vs"><div class="tm">${av2(m.h,m.hc)}<span class="nm">${m.h}</span></div><div class="ct">${pill}<button class="an" ${busy!=null?'disabled ':''}onclick="tog(${i},this)">${ICO}<span>${label}</span></button></div><div class="tm">${av2(m.a,m.ac)}<span class="nm">${m.a}</span></div></div>
<div class="tri">${triH(Fn)}</div>${o.est&&o.s==='fin'?'<div class="nt">Score non disponible</div>':''}<div class="ana"${body?'':' hidden'}>${body}</div></article>`}
function updLive(){const mp=new Map(M.map(m=>[idOf(m),m]));document.querySelectorAll('.mc').forEach(e=>{const m=mp.get(e.dataset.k);if(m&&stOf(m).s==='live'){const t=e.querySelector('.tri');if(t)t.innerHTML=triH(fin(fg(m)))}})}

/* ---------- M.A : moteur 1 (direct, bouton visible) et moteur 2 (coupons variés) ---------- */
let TAB='live',NB=3,MODE='auto',CPT0=0,CPR=null;const LV=new Set();
const selList=()=>{const s=readSel();return M.filter(m=>s.has(idOf(m)))};
const rm=id=>`<button aria-label="Retirer" onclick="maSet('rm',${esc(JSON.stringify(id))})" style="border:0;background:none;color:var(--mu);font-size:1rem;padding:2px 6px">✕</button>`;
function goLive(){show('m');tabF='live';render(1)}
function liveBlock(m){const id=idOf(m),o=stOf(m),i=M.indexOf(m),g=o.g||[],isL=o.s==='live'&&!o.est,st=isL?`<span class="lt2"><i class="dot"></i>EN DIRECT · ${mnText(o,m)}</span>`:o.s==='fin'?'<span class="ft2">TERMINÉ</span>':o.s==='live'?'<span class="lt2">EN COURS</span>':`<span>🕐 ${HM(m.d)}</span>`;
let body;if(isL)body=BUSY.has(id)?scan(id):LV.has(id)?`<div style="margin-top:10px">${ana2(m)}</div>`:`<button class="big" style="margin-top:10px" onclick="lvGo(${i})">⚡ Lancer l'analyse en direct</button>`;
else body=o.s==='pre'?`<button class="big" style="margin-top:10px" disabled>⏳ Disponible au coup d'envoi (${HM(m.d)})</button>`:`<div class="note" style="margin:10px 0 0">${o.s==='fin'?'Match terminé.':'Score en direct indisponible pour ce championnat.'}</div>`;
return `<article class="mcard gl"><div class="lvh">${st}<span>${m.l} ${rm(id)}</span></div><div class="vs"><div class="tm">${av2(m.h,m.hc)}<span class="nm">${m.h}</span></div><div class="ct"><div class="pill${o.s==='pre'?' v':''}">${o.s==='pre'?'VS':(g[0]??'–')+' - '+(g[1]??'–')}</div></div><div class="tm">${av2(m.a,m.ac)}<span class="nm">${m.a}</span></div></div>${body}</article>`}
/* coupon : un seul pronostic par match, jamais plus d'un tiers de la même famille de marché */
function elig(){return selList().map(m=>({m,o:stOf(m),c:allPicks(m).all.slice(0,8)})).filter(x=>x.c.length&&x.o.s!=='fin'&&(MODE==='auto'||(MODE==='live')===(x.o.s==='live')))}
function buildCp(){const E=elig().sort((a,b)=>b.c[0].s-a.c[0].s),cap=Math.max(1,Math.ceil(NB/3)),used={},P2=[];
for(const x of E){if(P2.length>=NB)break;const c=x.c.find(c=>(used[c.k]||0)<cap)||x.c[0];used[c.k]=(used[c.k]||0)+1;P2.push({x,c})}
return{id:'cp|'+Date.now(),t:Date.now(),type:'cp',n:P2.length,prob:P2.reduce((p,y)=>p*y.c.p,1),picks:P2.map(y=>({h:y.x.m.h,a:y.x.m.a,l:y.x.m.l,d:y.x.m.d,t:y.c.t,p:y.c.p,live:y.x.o.s==='live'?1:0}))}}
const cpCard=c=>`<details class="cp mcard gl" open><summary><div><strong>🎟️ Coupon M-ADJ · ${c.n} sélection${c.n>1?'s':''}</strong><em>${new Date(c.t).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</em></div>${chip2(c.prob)}</summary>${c.picks.map(p=>`<div class="pr2 ${lv2(p.p)[0]}" style="border-left:3px solid var(--c);padding-left:8px"><div><strong>${p.h} – ${p.a}</strong><small>${p.l}${p.live?' · en direct':''} · ${p.t}</small></div><b>${Math.round(p.p*100)} %</b></div>`).join('')}<div class="cpt">Probabilité que tout passe : <b>${Math.round(c.prob*100)} %</b>${c.n>3?'<br>Plus il y a de sélections, plus cette probabilité baisse.':''}</div></details>`;
function renderMA(){const el=$('v-g');if(!el)return;let h=`<h1 class="pgt">M.A</h1><div class="seg"><button aria-pressed="${TAB==='live'}" onclick="maSet('tab','live')">⚡ Moteur 1 · Direct</button><button aria-pressed="${TAB==='cp'}" onclick="maSet('tab','cp')">🎟️ Moteur 2 · Coupons</button></div>`;
const S=selList(),nl=M.filter(m=>stOf(m).s==='live'&&!stOf(m).est).length;
if(TAB==='live'){h+=`<div class="mcard gl"><div class="st" style="margin-top:0">Comment analyser un match en direct</div><div class="note" style="margin:0 0 10px">1. Va sur l'onglet <b>Matchs</b> et coche la case ☑ du match.<br>2. Reviens ici.<br>3. Appuie sur le bouton vert <b>⚡ Lancer l'analyse en direct</b> du match : l'analyse se met ensuite à jour toute seule.</div><button class="big" onclick="goLive()">Voir les matchs en direct (${nl})</button></div>`;
h+=S.length?S.map(liveBlock).join('')+'<div class="note">Ces analyses ne sont pas enregistrées : elles disparaissent quand tu fermes l\'application.</div>':'<div class="empty"><div>⚡</div>Aucun match sélectionné pour le moment.</div>'}
else{const E=elig();NB=Math.max(1,Math.min(NB,20,E.length||1));
h+=`<div class="mcard gl"><div class="st" style="margin-top:0">Matchs sélectionnés (${S.length})</div>${S.length?S.map(m=>{const o=stOf(m);return `<div class="sl"><span>${m.h} – ${m.a}</span><span class="b ${o.s==='live'?'ok':o.s==='fin'?'bad':'mid'}">${o.s==='live'?'direct':o.s==='fin'?'terminé':HM(m.d)}</span>${rm(idOf(m))}</div>`}).join(''):'<div class="note" style="margin:0">Coche la petite case ☑ sous le nom du championnat sur les matchs à mettre dans ton coupon.</div>'}
<div class="cpbar"><div class="stp"><button onclick="maSet('n',-1)" aria-label="Moins">−</button><b>${NB}</b><button onclick="maSet('n',1)" aria-label="Plus">+</button></div><span class="note" style="margin:0">sélection${NB>1?'s':''} (1 à 20)</span></div>
<div class="mo">${[['auto','Auto'],['pre','Avant-match'],['live','En direct']].map(([k,l])=>`<button aria-pressed="${MODE===k}" onclick="maSet('mode','${k}')">${l}</button>`).join('')}</div>
<button class="big" onclick="cpGo()" ${E.length&&!CPT0?'':'disabled'}>🎟️ Construire le coupon (${Math.min(NB,E.length)}/${E.length} possibles)</button></div>`;
if(CPT0)h+=`<div class="mcard gl"><div class="scan" id="cpscan"><div class="gr"></div><div class="lh"></div><div class="lh b2"></div><div class="lw"></div><i></i><i></i><i></i><i></i><div class="sx2"><div class="pc">0%</div><div class="st2">Lecture des matchs sélectionnés…</div></div></div></div>`;
else if(CPR)h+=CPR.n?cpCard(CPR):'<div class="empty">Aucun pronostic possible avec cette sélection.</div>'}
el.innerHTML=h}
function lvGo(i){const id=idOf(M[i]);if(BUSY.has(id))return;BUSY.set(id,Date.now());if(!scanI)scanI=setInterval(scanTick,120);renderMA();setTimeout(()=>{BUSY.delete(id);LV.add(id);renderMA()},ANALYSE_MS)}
function cpGo(){if(CPT0)return;CPT0=Date.now();renderMA();const tm=setInterval(()=>{const p=Math.min(100,Math.round((Date.now()-CPT0)/ANALYSE_MS*100)),e=document.querySelector('#cpscan .pc'),s=document.querySelector('#cpscan .st2');if(e)e.textContent=p+'%';if(s)s.textContent=['Lecture des matchs sélectionnés…','Calcul des probabilités…','Choix du meilleur marché de chaque match…','Construction du coupon…'][Math.min(3,Math.floor(p/25))]},120);
setTimeout(()=>{clearInterval(tm);CPT0=0;CPR=buildCp();if(CPR.n){const a=rd();a.unshift(CPR);wr(a);toast('Coupon enregistré dans l\'onglet Analyses · 30 jours')}renderMA()},ANALYSE_MS)}

/* ---------- mise en service (après chargement de m-adj.js) ---------- */
function apply(){const oldSet=window.maSet;
calc=function(x,y){const G=grid(x,y,1);let h=0,d=0,a=0,o=0,b=0,g=0,w=0,sc=[];for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){const p=G[i][j];if(i>j)h+=p;else if(i===j)d+=p;else a+=p;if(i+j>2)o+=p;if(i>0&&j>0)b+=p;if(i-j>=2)g+=p;if(i-j>=-1)w+=p;sc.push([i,j,p])}sc.sort((u,v)=>v[2]-u[2]);return{h,d,a,o,b,g,w,sc:sc.slice(0,3)}};
aiPicks=function(m){const A=allPicks(m);return{top:A.top,n:A.n}};ana=ana2;card=card2;window.renderMA=renderMA;window.lvGo=lvGo;window.cpGo=cpGo;window.goLive=goLive;
window.maSet=function(k,v){if(k==='rm'){oldSet(k,v);return}if(k==='tab')TAB=v;if(k==='mode')MODE=v;if(k==='n')NB=Math.max(1,Math.min(20,NB+v));renderMA()};
const r0=render;render=function(f){SELC=readSel();r0(f);updLive()};
const lg=document.querySelector('.lg');if(lg)lg.innerHTML='<span class="ok">Très sûr · 75 % et +</span><span class="lm">Sûr · 65 à 74 %</span><span class="mid">Modéré · 55 à 64 %</span><span class="bad">Faible · moins de 55 %</span>';
render(1);if(!$('v-g').hidden)renderMA()}
window._mo={allPicks,hcap,rowsOf,fg,fin,buildCp:()=>buildCp()};
if(document.readyState==='complete')setTimeout(apply,0);else addEventListener('load',apply);
})();
