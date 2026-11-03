/* smartpick.js — NIPER PRO : confiance de l'application. Fiches repliables, forme offensive / défensive, match ouvert ou fermé,
   une seule ligne par statistique, et NIPER PRO qui ne s'affiche que si la qualité des données est bonne.
   Les moyennes utilisent les 10 derniers matchs de chaque équipe (domicile et extérieur confondus), chaque équipe séparément. */
(function(){
const fl=s=>parseFloat(String(s).replace(',','.')),fo=p=>(1/p).toFixed(2).replace('.',','),av=a=>a.reduce((s,v)=>s+v,0)/a.length;
const sd=a=>{const m=av(a);return Math.sqrt(av(a.map(v=>(v-m)*(v-m))))};
const st0=document.createElement('style');st0.textContent=`
.nip{border-color:rgba(167,139,250,.65)!important;background:linear-gradient(180deg,rgba(124,58,237,.16),rgba(2,18,36,.45))!important}
.cl-h{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer}.cl-h .cl-r{display:flex;align-items:center;gap:10px}
.cl-a{display:inline-flex;width:26px;height:26px;border-radius:50%;align-items:center;justify-content:center;background:rgba(255,255,255,.14);font-size:.8rem;transition:transform .2s}
.cl-open>.cl-h .cl-a{transform:rotate(180deg)}.cl-b{display:none;margin-top:8px}.cl-open>.cl-b{display:block}
.nip-t{font-weight:800;letter-spacing:.08em;color:#c4b5fd}.nip-q{font-size:.72rem;padding:3px 10px;border-radius:999px;border:1px solid rgba(167,139,250,.5);color:#ddd6fe}
.nip-r{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:9px 0;border-top:1px solid var(--ln)}.nip-r strong{font-size:1rem}.nip-r b{font-size:1.15rem;white-space:nowrap}
.n-ok{color:#4ade80}.n-lm{color:#4da3ff}.n-mid{color:#fbbf24}.n-bad{color:#ff6b6b}
.fm-t{font-weight:800;margin:10px 0 6px}.fm-l{display:grid;grid-template-columns:70px 1fr 54px 52px;gap:8px;align-items:center;margin:6px 0;font-size:.8rem}
.fm-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}.fm-bar i{display:block;height:100%;border-radius:99px}
.fm-cf{display:flex;gap:2px}.fm-cf i{width:7px;height:12px;border-radius:2px;background:rgba(255,255,255,.18)}.fm-cf i.on{background:#c4b5fd}
.fm-open{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--ln);font-weight:800}
.pfbg{position:fixed;inset:0;z-index:-1;display:none;background:radial-gradient(120% 80% at 50% 0%,#16233f 0%,#070b14 62%,#03050a 100%)}body.pf .pfbg{display:block}#v-u{padding-bottom:150px}`;document.head.appendChild(st0);
const bg=document.createElement('div');bg.className='pfbg';document.body.appendChild(bg);
const s0=window.show;if(typeof s0==='function')window.show=function(t){s0(t);document.body.classList.toggle('pf',t==='u')};
const lvl=p=>p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:p>=.5?['mid','Modéré']:['bad','Faible'];
const STN={'Cart.':'k','Corn.':'r','Tirs cadrés':'c','Tirs totaux':'s','Fautes':'f'};
const RNG={'Cart.':[2.5,6.5],'Corn.':[7.5,12.5],'Tirs cadrés':[6.5,11.5],'Tirs totaux':[20.5,30.5],'Fautes':[20.5,30.5]};
const PHI={k:1.15,r:1.3,c:1.3,s:1.45,f:1.2};
function nbcdf(mu,phi,k){const r=mu/(phi-1),pr=r/(r+mu);let pm=Math.pow(pr,r),c=pm;for(let i=0;i<k;i++){pm*=(i+r)/(i+1)*(1-pr);c+=pm}return Math.min(1,c)}
function hit(t,m,a,b){let r;
if(t==='Victoire '+m.h+' (V1)')return a>b;if(t==='Victoire '+m.a+' (V2)')return b>a;if(t==='Match nul (X)')return a===b;
if(r=t.match(/^(Plus|Moins) de ([\d,]+) buts$/))return r[1]==='Plus'?a+b>fl(r[2]):a+b<fl(r[2]);
if(t==='Les deux marquent : oui')return a>0&&b>0;if(t==='Les deux marquent : non')return!(a>0&&b>0);
if(t==='Double chance : '+m.h+' ou nul')return a>=b;if(t==='Double chance : nul ou '+m.a)return b>=a;if(t==='Double chance : '+m.h+' ou '+m.a)return a!==b;
if(r=t.match(/^Handicap (.+) ([+-])([\d,]+)$/)){const k=fl(r[3])*(r[2]==='-'?-1:1),d=r[1]===m.h?a-b:b-a;return d+k>0}
if(r=t.match(/^(.+) : (plus|moins) de ([\d,]+) buts?$/)){const g=r[1]===m.h?a:r[1]===m.a?b:null;if(g==null)return null;return r[2]==='plus'?g>fl(r[3]):g<fl(r[3])}
return null}
function cat(t){let r;
if(/^Victoire .* \(V[12]\)$/.test(t)||t==='Match nul (X)')return'r';
if(/^Double chance : /.test(t))return'd';
if(r=t.match(/^Handicap (.+) ([+-])([\d,]+)$/)){const k=fl(r[3]);return k===.5||k===1.5?'h':null}
if(r=t.match(/^(Plus|Moins) de ([\d,]+) buts$/)){const l=fl(r[2]);return l>=1.5&&l<=4.5?'g':null}
if(/^Les deux marquent/.test(t))return'b';
if(r=t.match(/^(.+) : (plus|moins) de ([\d,]+) buts?$/)){const l=fl(r[3]);return l>=1.5&&l<=2.5?'t':null}
return null}
const pmf=(k,l)=>{let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p};
function joint(m,t1,t2){const f1=(a,b)=>hit(t1,m,a,b),f2=(a,b)=>hit(t2,m,a,b);if(f1(1,1)===null||f2(1,1)===null)return null;let p1=0,p2=0,p12=0;
for(let a=0;a<=9;a++)for(let b=0;b<=9;b++){const p=pmf(a,m.x)*pmf(b,m.y),x=f1(a,b),y=f2(a,b);if(x)p1+=p;if(y)p2+=p;if(x&&y)p12+=p}return p1>0&&p2>0?p12/(p1*p2):null}

/* ---------- données récentes de chaque équipe (séparées) ---------- */
function rec(m){const z=m.z||{};return{A:(z.th||z.gh||[]).slice(-30),B:(z.ta||z.ga||[]).slice(-30),H:z.hm||[],z}}
/* ---------- qualité des données (disponibilité et complétude, pas une probabilité de réussite) ---------- */
function quality(m){const z=m.z;if(!z)return{q:0,ok:false};const R=rec(m),nA=R.A.length,nB=R.B.length,stats=z.ts&&Object.keys(z.ts).length>=4&&Object.values(z.ts).every(v=>v[0].length>=8&&v[1].length>=8);
const nm=m.f&&m.f.nm?Math.min(1,(m.f.nm[0]+m.f.nm[1])/100):.5,sx=z.sx&&z.sx.h&&z.sx.h.xg?1:0;
const q=.30*Math.min(1,Math.min(nA,nB)/30)+.25*(stats?1:0)+.15*Math.min(1,R.H.length/3)+.15*sx+.15*nm;return{q,ok:q>=.75&&nA>=10&&nB>=10&&stats}}
/* ---------- une seule ligne par statistique : la mieux confirmée par les deux équipes ---------- */
function statChoice(m,r){const z=m.z;if(!z||r.es)return null;const k=r.k,arr=(z.ts&&z.ts[k])||z[k];if(!arr||arr[0].length<8||arr[1].length<8)return null;
const mu=r.v[0]+r.v[1],phi=PHI[k]||1.2,nm=r.d.n,Rg=RNG[nm];if(!Rg)return null;const A=arr[0],B=arr[1],A10=A.slice(-10),B10=B.slice(-10);let best=null;
for(let l=Math.floor(mu)-4;l<=Math.floor(mu)+4;l++){const line=l+.5;if(line<Rg[0]||line>Rg[1])continue;
 for(const side of['Plus','Moins']){const u=nbcdf(mu,phi,Math.floor(line)),p=side==='Plus'?1-u:u;if(p<.45||p>.82)continue;
  const f=a=>a.filter(v=>side==='Plus'?v>line:v<line).length/a.length,f10A=f(A10),f10B=f(B10),fA=(f10A+f(A))/2,fB=(f10B+f(B))/2,s=Math.min(p,fA,fB);
  if(!best||s>best.s+1e-9||(Math.abs(s-best.s)<1e-9&&p>best.p))best={k,nm,side,line,p,f10A,f10B,fA,fB,s,mu,A10,B10,pb:(2*p+fA+fB)/4,fam:'s'+k,t:nm+' : '+side.toLowerCase()+' de '+fm(line)}}}
return best}
/* ---------- NIPER PRO ---------- */
function niper(m){if(!window._mo)return null;const Q=quality(m);if(!Q.ok)return null;const A0=_mo.allPicks(m);if(A0.R&&A0.R.live)return null;const R=rec(m),cand=[];
A0.all.forEach(c=>{const fam=cat(c.t);if(!fam||fam==='s'||c.p<.62||c.p>.82)return;
 const hA=R.A.map(x=>hit(c.t,m,x[0],x[1])),hB=R.B.map(x=>hit(c.t,m,x[1],x[0]));if(hA.includes(null))return;
 const q=a=>a.filter(Boolean).length/a.length,f10A=q(hA.slice(-10)),f10B=q(hB.slice(-10)),fA=(f10A+q(hA))/2,fB=(f10B+q(hB))/2;
 const h2=R.H.length>=4?q(R.H.map(x=>hit(c.t,m,x[0],x[1]))):null;if(h2!==null&&h2<.5)return;
 let avgOk=true,margin=Math.max(0,Math.min(1,(Math.min(f10A,f10B)-.5)*2)),stab=1-Math.abs(f10A-f10B);
 const g=c.t.match(/^(Plus|Moins) de ([\d,]+) buts$/);
 if(g){const l=fl(g[2]),over=g[1]==='Plus',ta=R.A.slice(-10).map(x=>x[0]+x[1]),tb=R.B.slice(-10).map(x=>x[0]+x[1]),mA=av(ta),mB=av(tb);avgOk=over?mA>l&&mB>l:mA<l&&mB<l;
  const s=sd(ta.concat(tb))||1,d=over?Math.min(mA,mB)-l:l-Math.max(mA,mB);margin=Math.max(0,Math.min(2,d/s))/2;stab=1-Math.min(1,s/(av(ta.concat(tb))||1))}
 cand.push({t:c.t,p:c.p,fam,f10A,f10B,fA,fB,pb:(2*c.p+fA+fB)/4,avgOk,margin,stab})});
_mo.rowsOf(m).forEach(r=>{const s=statChoice(m,r);if(!s||s.p<.62)return;const A=s.A10,B=s.B10,over=s.side==='Plus',mA=av(A),mB=av(B),sdv=sd(A.concat(B))||1;
 const d=over?Math.min(mA,mB)-s.line:s.line-Math.max(mA,mB);s.avgOk=d>0;s.margin=Math.max(0,Math.min(2,d/sdv))/2;s.stab=1-Math.min(1,sdv/(av(A.concat(B))||1));cand.push(s)});
let ok=cand.filter(c=>c.pb>=.66&&c.f10A>=.7&&c.f10B>=.7&&c.avgOk);
ok.forEach(c=>{c.ev=.4*(c.f10A+c.f10B)/2+.3*c.margin+.2*c.stab+.1*Q.q});ok.sort((a,b)=>b.ev-a.ev);
const sel=[];ok.forEach(c=>{if(sel.length>=4||sel.some(x=>x.fam===c.fam))return;if(sel.some(x=>{const r=joint(m,x.t,c.t);return r!==null&&(r<.8||r>1.35)}))return;sel.push(c)});
if(!sel.length)return null;return{sel,star:sel[0].ev>=.7?sel[0]:null,q:Q.q}}
function nipBox(m,N){const rows=N.sel.map(c=>{const L=lvl(c.pb);return `<div class="nip-r"><strong>${N.star===c?'⭐ ':''}${c.t}</strong><b class="n-${L[0]}">${Math.round(c.pb*100)} %</b></div>`}).join('');
return `<div class="ai nip" data-cl="nip"><div class="cl-h"><span class="nip-t">NIPER PRO</span><span class="cl-r"><span class="nip-q">Données ${Math.round(N.q*100)} %</span><span class="cl-a">▾</span></span></div><div class="cl-b">${rows}</div></div>`}
/* ---------- forme offensive / défensive et match ouvert ou fermé ---------- */
function seg(c){const n=Math.round(Math.max(0,Math.min(1,c))*5);return '<span class="fm-cf">'+[0,1,2,3,4].map(i=>'<i class="'+(i<n?'on':'')+'"></i>').join('')+'</span>'}
function team(m,name,P,la){if(!P||P.length<5)return null;const L=P.slice(-10),gf=L.map(x=>x[0]),ga=L.map(x=>x[1]),mf=av(gf),mg=av(ga);
const att=mf/la-1,def=la/Math.max(.2,mg)-1,cvf=sd(gf)/Math.max(.5,mf),cvg=sd(ga)/Math.max(.5,mg),n=Math.min(1,L.length/10);
return{name,att,def,cA:n*(1-Math.min(.6,cvf/2)),cD:n*(1-Math.min(.6,cvg/2)),tot:L.map(x=>x[0]+x[1]),btts:L.map(x=>x[0]>0&&x[1]>0),gf:mf,ga:mg}}
function bar(p){const w=Math.max(4,Math.min(100,50+p*100)),c=p>=.1?'#4ade80':p<=-.1?'#ff6b6b':'#4da3ff';return `<div class="fm-bar"><i style="width:${w}%;background:${c}"></i></div>`}
const pc=p=>(p>=0?'+':'')+Math.round(p*100)+' %';
function formCard(m){const z=m.z;if(!z)return null;const R=rec(m),la=(z.sx&&z.sx.la&&z.sx.la.gf)||1.35,A=team(m,m.h,R.A,la),B=team(m,m.a,R.B,la);if(!A||!B)return null;
let o=0,c=0;const tot=m.x+m.y;if(tot>=2.9)o++;else if(tot<=2.3)c++;
const mt=av(A.tot.concat(B.tot));if(mt>=3)o++;else if(mt<=2.2)c++;
const ov=av(A.tot.concat(B.tot).map(v=>v>=3?1:0));if(ov>=.55)o++;else if(ov<=.3)c++;
const bt=av(A.btts.concat(B.btts).map(v=>v?1:0));if(bt>=.6)o++;else if(bt<=.35)c++;
const d=o-c,lab=d>=2?['Match ouvert en buts','n-ok','Ouvert']:d<=-2?['Match fermé','n-mid','Fermé']:['Match équilibré','n-lm','Équilibré'],conf=Math.min(1,Math.abs(d)/4);
const blk=T=>`<div class="fm-t">${T.name}</div><div class="fm-l"><span>Attaque</span>${bar(T.att)}<b>${pc(T.att)}</b>${seg(T.cA)}</div><div class="fm-l"><span>Défense</span>${bar(T.def)}<b>${pc(T.def)}</b>${seg(T.cD)}</div>`;
return `<div class="ai nip fmc" data-cl="fm"><div class="cl-h"><span class="nip-t">FORME OFFENSIVE ET DÉFENSIVE</span><span class="cl-r"><span class="nip-q ${lab[1]}">${lab[2]}</span><span class="cl-a">▾</span></span></div><div class="cl-b">${blk(A)}${blk(B)}<div class="fm-open"><span class="${lab[1]}">${lab[0]}</span>${seg(conf)}</div></div></div>`}
/* ---------- repli / dépli des fiches ---------- */
const OPEN=new Set();
function collapsible(el,head,key){if(el.dataset.clk)return;el.dataset.clk=key;el.classList.add('cl-wrap');
let body=el.querySelector(':scope>.cl-b');if(!body){body=document.createElement('div');body.className='cl-b';[...el.childNodes].forEach(c=>{if(c!==head)body.appendChild(c)});el.appendChild(body)}
if(!head.querySelector('.cl-a')){head.classList.add('cl-h');const a=document.createElement('span');a.className='cl-a';a.textContent='▾';head.appendChild(a)}
head.onclick=()=>{el.classList.toggle('cl-open');const k=el.dataset.ck;if(el.classList.contains('cl-open'))OPEN.add(k);else OPEN.delete(k)}}
function matchOf(el){const c=el.closest('.mc');if(c&&c.dataset.k){const m=M.find(x=>idOf(x)===c.dataset.k);if(m)return m}
const g=el.closest('.mcard');if(g){const n=[...g.querySelectorAll('.nm')].map(e=>e.textContent.trim()),m=M.find(x=>x.h===n[0]&&x.a===n[1]);if(m)return m;const sv=rd().find(e=>e.m&&e.m.h===n[0]&&e.m.a===n[1]);if(sv)return sv.m}
return null}
/* ---------- lignes de statistiques : une seule, classée du très sûr au faible ---------- */
function statRows(root,m){const rows=_mo.rowsOf(m),by={};rows.forEach(r=>by[r.d.n]=r);
root.querySelectorAll('.sx:not(.h)').forEach(r=>{const ev=r.querySelector('.ev'),nm=ev&&ev.lastChild&&ev.lastChild.textContent.trim();
 if(/hors-jeu/i.test(nm||'')){r.remove();return}
 const row=by[nm],pv=r.querySelector('.pv2');if(!row||!pv||r.dataset.nip)return;const s=statChoice(m,row);r.dataset.nip='1';if(!s){return}
 const L=lvl(s.pb);r.className='sx '+L[0];pv.className='pv2 '+L[0];pv.innerHTML=s.side+' de '+fm(s.line)+'<small>'+Math.round(s.pb*100)+' % · '+L[1]+' · cote '+fo(s.pb)+'</small>'});
root.querySelectorAll('.note').forEach(n=>{if(/^Lignes choisies d/.test(n.textContent)||n.textContent.startsWith('⭐ = pronostic'))n.remove()})}
function enh(){
document.querySelectorAll('.stp,.spb,.smpb,.smpmode,.alt2').forEach(e=>e.remove());
document.querySelectorAll('.ai:not(.nip)').forEach(a=>{const root=a.parentElement;if(!root||root.dataset.nipd||root.querySelector('.lvn'))return;const m=matchOf(a);if(!m)return;root.dataset.nipd='1';
 const mk=(m.h+'|'+m.a+'|'+m.d);
 /* Pronostic IA : on retire la phrase « choisi parmi… » ; on garde le pronostic visible, le reste se déplie */
 const as=a.querySelector('.as');if(as){const cj=(as.textContent.match(/Cote juste ([\d,]+)/)||[])[1],alts=[...as.querySelectorAll('.alt')].map(x=>x.outerHTML).join('');as.innerHTML=(cj?'Cote juste '+cj:'')+(alts?' · '+alts:'')}
 const ah=a.querySelector('.ah'),ab=a.querySelector('.ab');
 if(ah){a.dataset.ck=mk+'|ia';if(!a.querySelector(':scope>.cl-b')){const body=document.createElement('div');body.className='cl-b';if(as)body.appendChild(as);a.appendChild(body)}
  if(!ah.querySelector('.cl-a')){ah.classList.add('cl-h');const x=document.createElement('span');x.className='cl-a';x.textContent='▾';ah.appendChild(x)}
  a.classList.add('cl-wrap');a.dataset.clk='ia';ah.onclick=()=>{a.classList.toggle('cl-open');a.classList.contains('cl-open')?OPEN.add(a.dataset.ck):OPEN.delete(a.dataset.ck)};if(OPEN.has(a.dataset.ck))a.classList.add('cl-open')}
 /* NIPER PRO et forme offensive / défensive */
 let after=a;const N=niper(m);if(N){const d=document.createElement('div');d.innerHTML=nipBox(m,N);const e=d.firstChild;e.dataset.ck=mk+'|nip';after.after(e);after=e;
  e.querySelector('.cl-h').onclick=()=>{e.classList.toggle('cl-open');e.classList.contains('cl-open')?OPEN.add(e.dataset.ck):OPEN.delete(e.dataset.ck)};if(OPEN.has(e.dataset.ck))e.classList.add('cl-open')}
 const fc=formCard(m);if(fc){const d=document.createElement('div');d.innerHTML=fc;const e=d.firstChild;e.dataset.ck=mk+'|fm';after.after(e);after=e;
  e.querySelector('.cl-h').onclick=()=>{e.classList.toggle('cl-open');e.classList.contains('cl-open')?OPEN.add(e.dataset.ck):OPEN.delete(e.dataset.ck)};if(OPEN.has(e.dataset.ck))e.classList.add('cl-open')}
 /* Éléments pris en compte : repliable */
 const el=[...root.children].find(x=>x.firstElementChild&&/Éléments pris en compte/i.test(x.firstElementChild.textContent));
 if(el&&!el.dataset.clk){const h=el.firstElementChild;el.dataset.ck=mk+'|el';collapsible(el,h,'el');if(OPEN.has(el.dataset.ck))el.classList.add('cl-open')}
 statRows(root,m)});
document.querySelectorAll('.stx').forEach(x=>{const root=x.parentElement;const m=matchOf(x);if(m&&!x.dataset.nip2){x.dataset.nip2='1';statRows(x,m)}})}
let tm=0;const ob=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(enh,150)});
function start(){ob.observe(document.body,{childList:true,subtree:true});enh()}
if(document.readyState==='complete')setTimeout(start,400);else addEventListener('load',()=>setTimeout(start,400));
})();
