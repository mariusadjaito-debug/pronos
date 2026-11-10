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
/* ---------- forme offensive / défensive et match ouvert ou fermé (analyse profonde) ---------- */
const pmfP=(k,l)=>{let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p};
function dist(m,A,B){const N=9,mod=Array(N+1).fill(0);for(let a=0;a<=N;a++)for(let b=0;b<=N;b++){const t=Math.min(N,a+b);mod[t]+=pmfP(a,m.x)*pmfP(b,m.y)}
const vals=A.slice(-30).map(x=>x[0]+x[1]).concat(B.slice(-30).map(x=>x[0]+x[1])),w=vals.map((v,i)=>({v,w:(i%Math.max(1,vals.length/2|0))>=Math.max(1,vals.length/2|0)-10?2:1}));
const emp=Array(N+1).fill(0);let tw=0;w.forEach(o=>{emp[Math.min(N,o.v)]+=o.w;tw+=o.w});emp.forEach((_,i)=>emp[i]/=tw||1);return mod.map((p,i)=>.5*p+.5*emp[i])}
function team(name,P,la){if(!P||P.length<5)return null;const L=P.slice(-10),gf=L.map(x=>x[0]),ga=L.map(x=>x[1]),mf=av(gf),mg=av(ga);
const att=mf/la-1,def=la/Math.max(.2,mg)-1,cvf=sd(gf)/Math.max(.5,mf),cvg=sd(ga)/Math.max(.5,mg),n=Math.min(1,L.length/10);
return{name,att,def,cA:n*(1-Math.min(.6,cvf/2)),cD:n*(1-Math.min(.6,cvg/2)),tot:L.map(x=>x[0]+x[1]),btts:L.map(x=>x[0]>0&&x[1]>0),cs:L.map(x=>x[1]===0),fts:L.map(x=>x[0]===0),gf:mf,ga:mg}}
function formStats(m){const z=m.z;if(!z)return null;const R=rec(m),la=(z.sx&&z.sx.la&&z.sx.la.gf)||1.35,A=team(m.h,R.A,la),B=team(m.a,R.B,la);if(!A||!B)return null;
const D=dist(m,R.A,R.B),E=D.reduce((s,p,i)=>s+p*i,0),ge=k=>D.slice(k).reduce((s,p)=>s+p,0);
let sc=0;const vote=(v,w)=>{sc+=v*w};
vote(E>=2.9?1:E<=2.3?-1:0,2);vote(ge(3)>=.5?1:ge(3)<=.33?-1:0,2);
const m10=av(A.tot.concat(B.tot));vote(m10>=3?1:m10<=2.2?-1:0,1);
const bt=av(A.btts.concat(B.btts).map(v=>v?1:0));vote(bt>=.6?1:bt<=.35?-1:0,1);
vote(A.att>=.1&&B.att>=.1&&A.def<=0&&B.def<=0?1:A.att<=-.1&&B.att<=-.1&&A.def>=.1&&B.def>=.1?-1:0,1);
const sx=z.sx&&z.sx.h&&z.sx.a&&z.sx.h.xg&&z.sx.a.xg?(z.sx.h.xg[0]+z.sx.a.xg[1])/2+(z.sx.a.xg[0]+z.sx.h.xg[1])/2:null;if(sx!=null)vote(sx>=2.8?1:sx<=2.2?-1:0,1);
const low=av(A.tot.concat(B.tot).map(v=>v<=1?1:0));vote(low>=.5?-1:low<=.2?1:0,1);
const kind=sc>=3?'open':sc<=-3?'closed':'bal',conf=Math.min(1,Math.abs(sc)/6);
let txt,cov;
if(kind==='open'){let k=1;for(const c of[4,3,2,1])if(ge(c)>=.7){k=c;break}cov=ge(k);txt='Match ouvert : '+k+' but'+(k>1?'s':'')+' ou plus ('+Math.round(cov*100)+' %)'}
else if(kind==='closed'){let k=3;for(const c of[1,2,3])if(1-ge(c+1)>=.7){k=c;break}cov=1-ge(k+1);txt='Match fermé : '+k+' but'+(k>1?'s':'')+' ou moins ('+Math.round(cov*100)+' %)'}
else{let best=null;for(let a=0;a<=5;a++)for(let b=a+1;b<=6;b++){const c=D.slice(a,b+1).reduce((s,p)=>s+p,0);if(c>=.7&&(!best||b-a<best.b-best.a||(b-a===best.b-best.a&&c>best.c)))best={a,b,c}}
 best=best||{a:1,b:3,c:D.slice(1,4).reduce((s,p)=>s+p,0)};txt='Match équilibré : '+best.a+' à '+best.b+' buts ('+Math.round(best.c*100)+' %)'}
return{A,B,kind,conf,txt,E,sc}}
function seg(c){const n=Math.round(Math.max(0,Math.min(1,c))*5);return '<span class="fm-cf">'+[0,1,2,3,4].map(i=>'<i class="'+(i<n?'on':'')+'"></i>').join('')+'</span>'}
function bar(p){const w=Math.max(4,Math.min(100,50+p*100)),c=p>=.1?'#4ade80':p<=-.1?'#ff6b6b':'#4da3ff';return `<div class="fm-bar"><i style="width:${w}%;background:${c}"></i></div>`}
const pc=p=>(p>=0?'+':'')+Math.round(p*100)+' %';
function formHTML(F){const lab=F.kind==='open'?['n-ok','Ouvert']:F.kind==='closed'?['n-mid','Fermé']:['n-lm','Équilibré'];
const blk=T=>`<div class="fm-t">${T.name}</div><div class="fm-l"><span>Attaque</span>${bar(T.att)}<b>${pc(T.att)}</b>${seg(T.cA)}</div><div class="fm-l"><span>Défense</span>${bar(T.def)}<b>${pc(T.def)}</b>${seg(T.cD)}</div>`;
return `<div class="ai nip fmc" data-cl="fm"><div class="cl-h"><span class="nip-t">FORME OFFENSIVE ET DÉFENSIVE</span><span class="cl-r"><span class="nip-q ${lab[0]}">${lab[1]}</span><span class="cl-a">▾</span></span></div><div class="cl-b">${blk(F.A)}${blk(F.B)}<div class="fm-open"><span class="${lab[0]}">${F.txt}</span>${seg(F.conf)}</div></div></div>`}
/* ---------- NIPER PRO : analyse indépendante, très sélective ---------- */
const shr=(k,n,p,s)=>(k+(s||4)*p)/(n+(s||4));
function niper(m,F){if(!window._mo)return null;const Q=quality(m);if(!Q.ok)return null;const A0=_mo.allPicks(m);if(A0.R&&A0.R.live)return null;const R=rec(m),z=m.z,cand=[];
const closed=F&&F.kind==='closed'&&F.conf>=.5,open=F&&F.kind==='open'&&F.conf>=.5;
A0.all.forEach(c=>{const fam=cat(c.t);if(!fam||fam==='s'||c.p<.64||c.p>.82)return;
 const hA=R.A.map(x=>hit(c.t,m,x[0],x[1])),hB=R.B.map(x=>hit(c.t,m,x[1],x[0]));if(hA.includes(null))return;
 const cnt=a=>a.filter(Boolean).length,a10=hA.slice(-10),b10=hB.slice(-10);
 const e10A=shr(cnt(a10),a10.length,c.p),e10B=shr(cnt(b10),b10.length,c.p),e30A=shr(cnt(hA),hA.length,c.p),e30B=shr(cnt(hB),hB.length,c.p);
 if(e10A<.68||e10B<.68||e30A<.6||e30B<.6)return;
 const h2=R.H.length>=4?cnt(R.H.map(x=>hit(c.t,m,x[0],x[1])))/R.H.length:null;if(h2!==null&&h2<.5)return;
 if(z.gh&&z.ga&&z.gh.length>=6&&z.ga.length>=6){const vh=z.gh.map(x=>hit(c.t,m,x[0],x[1])),va=z.ga.map(x=>hit(c.t,m,x[1],x[0]));if((cnt(vh)+cnt(va))/(vh.length+va.length)<.6)return}
 const over=/^Plus de/.test(c.t)||c.t==='Les deux marquent : oui',under=/^Moins de/.test(c.t)||c.t==='Les deux marquent : non';
 if((closed&&over&&fam!=='t')||(open&&under&&fam!=='t'))return;
 let margin=Math.max(0,Math.min(1,(Math.min(e10A,e10B)-.5)*2)),stab=1-Math.abs(e10A-e10B);
 const g=c.t.match(/^(Plus|Moins) de ([\d,]+) buts$/);
 if(g){const l=fl(g[2]),ov=g[1]==='Plus',ta=R.A.slice(-10).map(x=>x[0]+x[1]),tb=R.B.slice(-10).map(x=>x[0]+x[1]),mA=av(ta),mB=av(tb),all=R.A.concat(R.B).map(x=>x[0]+x[1]),s=sd(all)||1;
  if(ov?!(mA>l&&mB>l):!(mA<l&&mB<l))return;if(Math.abs(av(ta.concat(tb))-av(all))>1.2*s)return;
  const d=ov?Math.min(mA,mB)-l:l-Math.max(mA,mB);margin=Math.max(0,Math.min(2,d/s))/2;stab=1-Math.min(1,s/(av(all)||1))}
 cand.push({t:c.t,p:c.p,fam,pb:(2*c.p+e10A+e10B+e30A+e30B)/6,f10A:e10A,f10B:e10B,margin,stab})});
_mo.rowsOf(m).forEach(r=>{const s=statChoice(m,r);if(!s||s.p<.64)return;const arr=(z.ts&&z.ts[s.k])||z[s.k],A=arr[0],B=arr[1],over=s.side==='Plus',cn=a=>a.filter(v=>over?v>s.line:v<s.line).length;
 const e10A=shr(cn(A.slice(-10)),10,s.p),e10B=shr(cn(B.slice(-10)),10,s.p),e30A=shr(cn(A),A.length,s.p),e30B=shr(cn(B),B.length,s.p);if(e10A<.68||e10B<.68||e30A<.6||e30B<.6)return;
 const a10=s.A10,b10=s.B10,mA=av(a10),mB=av(b10),all=A.concat(B),sdv=sd(all)||1,d=over?Math.min(mA,mB)-s.line:s.line-Math.max(mA,mB);if(d<=0)return;
 if(Math.abs(av(a10.concat(b10))-av(all))>1.2*sdv)return;
 s.pb=(2*s.p+e10A+e10B+e30A+e30B)/6;s.f10A=e10A;s.f10B=e10B;s.margin=Math.max(0,Math.min(2,d/sdv))/2;s.stab=1-Math.min(1,sdv/(av(all)||1));cand.push(s)});
const ok=cand.filter(c=>c.pb>=.7);ok.forEach(c=>{c.ev=.4*(c.f10A+c.f10B)/2+.3*c.margin+.2*c.stab+.1*Q.q});ok.sort((a,b)=>b.ev-a.ev);
const sel=[];ok.forEach(c=>{if(sel.length>=3||sel.some(x=>x.fam===c.fam))return;if(sel.some(x=>{const r=joint(m,x.t,c.t);return r!==null&&(r<.8||r>1.35)}))return;sel.push(c)});
if(!sel.length)return null;return{sel,star:sel[0].ev>=.75&&sel[0].margin>=.35?sel[0]:null,q:Q.q}}
function nipHTML(N){const rows=N.sel.map(c=>{const L=lvl(c.pb);return `<div class="nip-r"><strong>${N.star===c?'⭐ ':''}${c.t}</strong><b class="n-${L[0]}">${Math.round(c.pb*100)} %</b></div>`}).join('');
return `<div class="ai nip" data-cl="nip"><div class="cl-h"><span class="nip-t">NIPER PRO</span><span class="cl-r"><span class="nip-q">Données ${Math.round(N.q*100)} %</span><span class="cl-a">▾</span></span></div><div class="cl-b">${rows}</div></div>`}
/* ---------- contexte : quel match, quelle analyse enregistrée ---------- */
function ctx(el){const c=el.closest('.mc');
if(c&&c.dataset.k){const id=c.dataset.k,e=rd().find(x=>x.id===id&&x.m),m=(e&&e.m)||M.find(x=>idOf(x)===id);return m?{m,entry:e||null,key:id}:null}
const g=el.closest('article.card')||el.closest('.mcard');if(!g)return null;
const b=g.querySelector('[onclick*="delAn("]'),ix=b?+((b.getAttribute('onclick').match(/delAn\((\d+)\)/)||[])[1]):-1,arr=rd(),e=ix>=0&&arr[ix]&&arr[ix].m?arr[ix]:null;
if(e)return{m:e.m,entry:e,key:e.id};
const n=[...g.querySelectorAll('.nm')].map(x=>x.textContent.trim()),e2=arr.find(x=>x.m&&x.m.h===n[0]&&x.m.a===n[1]);if(e2)return{m:e2.m,entry:e2,key:e2.id};
const m=M.find(x=>x.h===n[0]&&x.a===n[1]);return m?{m,entry:null,key:idOf(m)}:null}
const CACHE=new Map(),PEND=new Map();
function compute(m,key){const ck=key+'|'+m.x+'|'+m.y+'|'+((m.z&&m.z.th&&m.z.th.length)||0);if(CACHE.has(ck))return CACHE.get(ck);
const F=formStats(m),N=niper(m,F),o={n:N?nipHTML(N):'',f:F?formHTML(F):''};CACHE.set(ck,o);return o}
function persist(entry,data){try{const arr=rd(),i=arr.findIndex(e=>e.id===entry.id&&e.t===entry.t);if(i>=0&&!arr[i].nip){arr[i].nip=data;wr(arr)}}catch(e){}}
/* ---------- repli / dépli ---------- */
const OPEN=new Set();
function bindToggle(e){const h=e.querySelector('.cl-h');if(!h||h.dataset.b)return;h.dataset.b=1;h.onclick=()=>{e.classList.toggle('cl-open');e.classList.contains('cl-open')?OPEN.add(e.dataset.ck):OPEN.delete(e.dataset.ck)};if(OPEN.has(e.dataset.ck))e.classList.add('cl-open')}
function collapsible(el,head){if(el.dataset.clk)return;el.dataset.clk='1';el.classList.add('cl-wrap');
let body=el.querySelector(':scope>.cl-b');if(!body){body=document.createElement('div');body.className='cl-b';[...el.childNodes].forEach(c=>{if(c!==head)body.appendChild(c)});el.appendChild(body)}
if(!head.querySelector('.cl-a')){head.classList.add('cl-h');const a=document.createElement('span');a.className='cl-a';a.textContent='▾';head.appendChild(a)}bindToggle(el)}
/* ---------- lignes de statistiques : une seule, classée du très sûr au faible ---------- */
function statRows(box,m){const by={};_mo.rowsOf(m).forEach(r=>by[r.d.n]=r);
box.querySelectorAll('.sx:not(.h)').forEach(r=>{const ev=r.querySelector('.ev'),nm=ev&&ev.lastChild&&ev.lastChild.textContent.trim();
 if(/hors-jeu/i.test(nm||'')){r.remove();return}
 const row=by[nm],pv=r.querySelector('.pv2');if(!row||!pv||r.dataset.nip)return;r.dataset.nip='1';const s=statChoice(m,row);if(!s)return;
 const L=lvl(s.pb);r.dataset.pb=s.pb;r.className='sx '+L[0];pv.className='pv2 '+L[0];pv.innerHTML=s.side+' de '+fm(s.line)+'<small>'+Math.round(s.pb*100)+' % · '+L[1]+' · cote '+fo(s.pb)+'</small>'});
sortRows(box)}
function sortRows(box){const rs=[...box.querySelectorAll('.sx:not(.h)')];if(rs.length<2)return;const par=rs[0].parentElement,anchor=rs[rs.length-1].nextSibling;
rs.sort((a,b)=>(+b.dataset.pb||0)-(+a.dataset.pb||0));rs.forEach(r=>par.insertBefore(r,anchor))}
function clean(){document.querySelectorAll('.stp,.spb,.smpb,.smpmode,.alt2').forEach(e=>e.remove());
document.querySelectorAll('.sx').forEach(r=>{const ev=r.querySelector('.ev');if(ev&&/hors-jeu/i.test(ev.textContent))r.remove()});
document.querySelectorAll('.note').forEach(n=>{if(/^Lignes choisies d/.test(n.textContent)||n.textContent.startsWith('⭐ = pronostic'))n.remove()})}
let busy=0;
function enh(){if(busy)return;busy=1;try{clean();
document.querySelectorAll('.ai:not(.nip)').forEach(a=>{const root=a.parentElement;if(!root||root.dataset.nipd||root.querySelector('.lvn'))return;const c=ctx(a);if(!c)return;root.dataset.nipd='1';const m=c.m,mk=c.key;
 const as=a.querySelector('.as');if(as){const cj=(as.textContent.match(/Cote juste ([\d,]+)/)||[])[1],alts=[...as.querySelectorAll('.alt')].map(x=>x.outerHTML).join('');as.innerHTML=(cj?'Cote juste '+cj:'')+(alts?' · '+alts:'')}
 const ah=a.querySelector('.ah');if(ah&&!a.dataset.clk){a.dataset.ck=mk+'|ia';a.dataset.clk='1';a.classList.add('cl-wrap');const body=document.createElement('div');body.className='cl-b';if(as)body.appendChild(as);a.appendChild(body);
  const x=document.createElement('span');x.className='cl-a';x.textContent='▾';ah.classList.add('cl-h');ah.appendChild(x);bindToggle(a)}
 const sv=c.entry&&c.entry.nip,data=sv||compute(m,mk);let after=a;
 [data.n,data.f].forEach((h,i)=>{if(!h)return;const d=document.createElement('div');d.innerHTML=h;const e=d.firstChild;e.dataset.ck=mk+'|'+(i?'fm':'nip');after.after(e);after=e;bindToggle(e)});
 const el=[...root.children].find(x=>x.firstElementChild&&/Éléments pris en compte/i.test(x.firstElementChild.textContent));
 if(el&&!el.dataset.clk){el.dataset.ck=mk+'|el';collapsible(el,el.firstElementChild)}
 const stx=root.parentElement&&root.parentElement.querySelector('.stx')||root.querySelector('.stx');
 if(stx){if(sv&&sv.s){stx.innerHTML=sv.s;stx.dataset.nip2='1';clean()}else{stx.dataset.nip2='1';statRows(stx,m)}}
 root.dataset.key=mk;if(c.entry&&!c.entry.nip){PEND.set(c.entry.id+'|'+c.entry.t,data);root.dataset.pend='1'}});
/* enregistrement : on garde exactement ce qui s'affiche, une fois pour toutes */
document.querySelectorAll('[data-pend]').forEach(root=>{const c=ctx(root);if(!c||!c.entry||c.entry.nip)return;const stx=(root.parentElement&&root.parentElement.querySelector('.stx'))||root.querySelector('.stx'),d=PEND.get(c.entry.id+'|'+c.entry.t);if(!d){root.removeAttribute('data-pend');return}
 persist(c.entry,{n:d.n,f:d.f,s:stx?stx.innerHTML:''});root.removeAttribute('data-pend')});
document.querySelectorAll('.stx:not([data-nip2])').forEach(x=>{const c=ctx(x);if(c){x.dataset.nip2='1';const sv=c.entry&&c.entry.nip;if(sv&&sv.s){x.innerHTML=sv.s;clean()}else statRows(x,c.m)}})}
finally{busy=0}}
const ob=new MutationObserver(()=>enh());
function start(){ob.observe(document.body,{childList:true,subtree:true});enh()}
if(document.readyState==='complete')setTimeout(start,300);else addEventListener('load',()=>setTimeout(start,300));
})();
