/* smartpick.js (v3) : SmartPick = jusqu'à 4 pronostics par match, classés, avec au maximum 1 étoile, détection des contradictions
   et qualité des données. Sélecteur de lignes de statistiques : Équilibré (≈ 66 %) ou Prudent (≈ 85 %).
   Chaque pronostic est noté sur plusieurs ingrédients : équipe 1, équipe 2, ensemble des deux équipes, confrontations directes,
   matchs à domicile / à l'extérieur, style de jeu et xG estimé, moyennes. Seules des lignes proposées en général par les
   bookmakers sont retenues, avec une probabilité qui laisse une cote intéressante (cote juste d'environ 1,4 à 1,9). */
(function(){
const fl=s=>parseFloat(String(s).replace(',','.')),fo=p=>(1/p).toFixed(2).replace('.',','),av=a=>a.reduce((s,v)=>s+v,0)/a.length;
const st0=document.createElement('style');st0.textContent=`.smpb{border-color:rgba(167,139,250,.65)!important;background:linear-gradient(180deg,rgba(124,58,237,.16),rgba(2,18,36,.45))!important}
.smpb .ah span:first-child{color:#c4b5fd}.smpi{padding:9px 0;border-top:1px solid var(--ln)}.smpt{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.smpt strong{font-size:1rem}.smpt b{font-size:1.15rem;color:#c4b5fd;white-space:nowrap}
.smps{font-size:.72rem;color:var(--mu);margin-top:3px;line-height:1.45}.smpg{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.smpg span{font-size:.66rem;padding:2px 8px;border-radius:999px;border:1px solid var(--ln)}.smpg .y{color:#4ade80;border-color:rgba(74,222,128,.5)}.smpg .n{color:#ff9a9a;border-color:rgba(255,120,120,.5)}.smpm{margin-right:4px}.smpmode{display:flex;gap:6px;align-items:center;margin:8px 0;font-size:.72rem;color:var(--mu)}.smpmode button{padding:5px 12px;border-radius:999px;border:1px solid var(--ln);background:transparent;color:inherit;font-size:.72rem}.smpmode button.on{background:rgba(124,58,237,.35);border-color:#a78bfa;color:#fff}
.mSf{display:none}body.smp-sf .mEq{display:none}body.smp-sf .mSf{display:inline}.smpq{font-size:.7rem;color:var(--mu);margin-top:6px;line-height:1.45}.smpr{color:#c4b5fd;font-weight:800;margin-right:6px}`;document.head.appendChild(st0);
const MK='pronos_mode_v1',mode=()=>{try{return localStorage.getItem(MK)==='sf'?'sf':'eq'}catch(e){return'eq'}};
const STN={'Cart.':'k','Corn.':'r','Tirs cadrés':'c','Tirs totaux':'s','Fautes':'f'};
const RNG={'Cart.':[2.5,6.5],'Corn.':[7.5,12.5],'Tirs cadrés':[6.5,11.5],'Tirs totaux':[20.5,30.5],'Fautes':[20.5,30.5]};
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
if(r=t.match(/^(Cart\.|Corn\.|Tirs cadrés|Tirs totaux|Fautes) : (plus|moins) de ([\d,]+)$/)){const l=fl(r[3]),R=RNG[r[1]];return l>=R[0]&&l<=R[1]?'s'+STN[r[1]]:null}
return null}
/* les ingrédients d'un pronostic : [libellé, réussi (true/false) ou null si non applicable] */
function ingr(m,c,sy){const z=m.z,t=c.t,p=c.p;if(!z)return[];const q=a=>a.filter(Boolean).length/a.length,out=[];let A,B,H=null,V=null,AV=null;
const sm=t.match(/^(Cart\.|Corn\.|Tirs cadrés|Tirs totaux|Fautes) : (plus|moins) de ([\d,]+)$/);
if(sm){const k=STN[sm[1]],zz=(z.ts&&z.ts[k])||z[k];if(!zz)return[];const l=fl(sm[3]),f=v=>sm[2]==='plus'?v>l:v<l;A=zz[0].map(f);B=zz[1].map(f);
 if(z[k]&&z.ts&&z.ts[k])V=[z[k][0].map(f),z[k][1].map(f)];AV=[zz[0],zz[1],l,sm[2]==='plus']}
else{const th=z.th||z.gh,ta=z.ta||z.ga;if(!th||!ta)return[];A=th.map(x=>hit(t,m,x[0],x[1]));B=ta.map(x=>hit(t,m,x[1],x[0]));if(A.includes(null))return[];
 if(z.hm&&z.hm.length>=4)H=z.hm.map(x=>hit(t,m,x[0],x[1]));if(z.gh&&z.ga&&z.th)V=[z.gh.map(x=>hit(t,m,x[0],x[1])),z.ga.map(x=>hit(t,m,x[1],x[0]))];
 const g=t.match(/^(Plus|Moins) de ([\d,]+) buts$/);if(g)AV=[th.map(x=>x[0]+x[1]),ta.map(x=>x[0]+x[1]),fl(g[2]),g[1]==='Plus']}
if(A.length<8||B.length<8)return[];
out.push([m.h+' '+A.filter(Boolean).length+'/'+A.length,q(A)>=.6],[m.a+' '+B.filter(Boolean).length+'/'+B.length,q(B)>=.6],['Ensemble',q(A.concat(B))>=p]);
out.push(['Confrontations',H?q(H)>=.5:null]);
out.push(['Dom./ext.',V&&V[0].length>=6&&V[1].length>=6?q(V[0].concat(V[1]))>=p-.03:null]);
out.push(['Moyennes',AV?(AV[3]?av(AV[0])>=AV[2]&&av(AV[1])>=AV[2]:av(AV[0])<=AV[2]&&av(AV[1])<=AV[2]):null]);
const bn=bonus(m,t,sy);out.push(['Style / xG',bn[0]>0?true:(bn[2]?false:null)]);out.why=bn[1];out.q=q(A.concat(B));return out}
function style(m){const s=m.z&&m.z.sx;if(!s||!s.la||!s.h||!s.a)return null;
const ag=p=>p.fl&&p.yc&&s.la.fl&&s.la.yc?(p.fl[0]/s.la.fl+2*p.yc[0]/s.la.yc)/3:null,g=ag(s.h),h=ag(s.a),lab=x=>x==null?'?':x>=1.12?'agressif':x<=.88?'discipliné':'normal';
const xt=s.h.xg&&s.a.xg?(s.h.xg[0]+s.a.xg[1])/2+(s.a.xg[0]+s.h.xg[1])/2:null;return{g,h,lg:lab(g),lh:lab(h),xt}}
function bonus(m,t,s){if(!s)return[0,'',0];let r;
if(r=t.match(/^(Plus|Moins) de ([\d,]+) buts$/)){if(s.xt==null)return[0,'',0];const l=fl(r[2]),ok=r[1]==='Plus'?s.xt>=l+.2:s.xt<=l-.2;return[ok?.03:0,ok?'xG estimé du match '+s.xt.toFixed(1).replace('.',','):'',1]}
if(/^(Cart\.|Fautes)/.test(t)){if(s.g==null||s.h==null)return[0,'',0];const a=(s.g+s.h)/2,ok=/: plus/.test(t)?a>=1.08:a<=.92;return[ok?.03:0,ok?'style : '+m.h+' '+s.lg+', '+m.a+' '+s.lh:'',1]}
return[0,'',0]}
const pmf=(k,l)=>{let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p};
/* probabilité (grille de Poisson) d'un pronostic et de deux pronostics ensemble ; null si le pronostic ne dépend pas du score */
function joint(m,t1,t2){const G=[];for(let a=0;a<=9;a++)for(let b=0;b<=9;b++)G.push([a,b,pmf(a,m.x)*pmf(b,m.y)]);
const f1=(a,b)=>hit(t1,m,a,b),f2=(a,b)=>hit(t2,m,a,b);if(f1(1,1)===null||f2(1,1)===null)return null;
let p1=0,p2=0,p12=0;G.forEach(([a,b,p])=>{const x=f1(a,b),y=f2(a,b);if(x)p1+=p;if(y)p2+=p;if(x&&y)p12+=p});return p1>0&&p2>0?p12/(p1*p2):null}
function dataQuality(m){const z=m.z;if(!z)return 0;const th=z.th||z.gh||[],ta=z.ta||z.ga||[],hm=z.hm||[];
const mt=Math.min(1,(th.length+ta.length)/60),stt=z.ts&&Object.keys(z.ts).length>=4?1:(z.k||z.r?.5:0),h2=Math.min(1,hm.length/4),sx=z.sx&&z.sx.h&&z.sx.h.xg?1:0;
return .45*mt+.3*stt+.15*h2+.1*sx}
function picks(m){if(!window._mo)return{sel:[],compared:0,dq:0,star:null};const A=_mo.allPicks(m);if(A.R&&A.R.live)return{sel:[],compared:0,dq:0,star:null};const sy=style(m);
let cand=A.all.map(c=>({t:c.t,p:c.p,fam:cat(c.t)})).filter(c=>c.fam);const compared=cand.length;
let win=cand.filter(c=>c.p>=.52&&c.p<=.72);if(!win.length)win=cand.filter(c=>c.p>=.5&&c.p<=.8);
win.forEach(c=>{const g=ingr(m,c,sy),ap=g.filter(x=>x[1]!==null);c.g=g;c.k=ap.filter(x=>x[1]).length;c.n=ap.length;c.conf=c.n?c.k/c.n:0;c.q=g.q||0;c.sc=c.conf*10+(c.n?(c.q-c.p):0)*2-Math.abs(c.p-.62)});
win.sort((a,b)=>b.sc-a.sc);const sel=[];
win.forEach(c=>{if(sel.length>=4||sel.some(x=>x.fam===c.fam))return;
 /* contradiction ou redondance avec un pronostic déjà retenu : les deux événements sont trop liés (rapport des probabilités) */
 if(sel.some(x=>{const r=joint(m,x.t,c.t);return r!==null&&(r<.8||r>1.35)}))return;sel.push(c)});
const dq=dataQuality(m);let star=null;
sel.forEach(c=>{if(!star&&c.n>=5&&c.k===c.n&&c.p>=.55&&c.p<=.70&&dq>=.7)star=c});
return{sel,compared,dq,star}}
function box(m,R){const P2=R.sel,it=P2.length?P2.map((c,i)=>`<div class="smpi"><div class="smpt"><strong><span class="smpr">#${i+1}</span>${R.star===c?'⭐ ':''}${c.t}</strong><b>${Math.round(c.p*100)} %</b></div><div class="smps">cote juste ${fo(c.p)}${c.n?' · confiance '+c.k+'/'+c.n:' · calcul seul (pas assez de matchs pour confirmer)'}${c.g.why?' · '+c.g.why:''}</div>${c.n?`<div class="smpg">${c.g.filter(x=>x[1]!==null).map(x=>`<span class="${x[1]?'y':'n'}">${x[1]?'✔':'✘'} ${x[0]}</span>`).join('')}</div>`:''}</div>`).join(''):'<div class="smps" style="margin:6px 0">Aucune ligne standard exploitable pour ce match.</div>';
return `<div class="ai smpb"><div class="ah"><span>🧠 SmartPick</span><span>${P2.length} retenu${P2.length>1?'s':''} · ${R.compared} marchés comparés</span></div>${it}<div class="smpq">⭐ ${R.star?'attribuée au n°'+(P2.indexOf(R.star)+1)+' (tous les ingrédients validés, données suffisantes)':'non attribuée (aucun pronostic ne valide tous les ingrédients avec des données suffisantes)'}<br>Qualité des données : ${Math.round(R.dq*100)} % (disponibilité et complétude des statistiques : ce n'est pas une probabilité de réussite)</div><div class="as">Lignes proposées en général par les bookmakers · cote juste d'environ 1,4 à 1,9 · les contradictions entre pronostics sont écartées · jamais une certitude.</div></div>`}
function matchOf(el){const c=el.closest('.mc');if(c&&c.dataset.k){const m=M.find(x=>idOf(x)===c.dataset.k);if(m)return m}
const g=el.closest('.mcard');if(g){const n=[...g.querySelectorAll('.nm')].map(e=>e.textContent.trim()),m=M.find(x=>x.h===n[0]&&x.a===n[1]);if(m)return m;const sv=rd().find(e=>e.m&&e.m.h===n[0]&&e.m.a===n[1]);if(sv)return sv.m}
return null}
function mark(root,P2){P2.forEach(c=>{const t=c.t.toLowerCase();
root.querySelectorAll('.mr').forEach(r=>{const s=r.firstElementChild;if(!s||s.querySelector('.smpm'))return;if(s.textContent.replace(/^Plus sûr : /i,'').trim().toLowerCase()===t)s.insertAdjacentHTML('afterbegin','<span class="smpm">🧠</span>')});
root.querySelectorAll('.sx').forEach(r=>{const ev=r.querySelector('.ev'),pv=r.querySelector('.pv2');if(!ev||!pv||pv.querySelector('.smpm'))return;const nm=ev.lastChild&&ev.lastChild.textContent.trim(),tx=[...pv.childNodes].find(n=>n.nodeType===3);if(!tx)return;
const side=tx.textContent.trim();if((nm+' : '+side.replace(/^Plus/,'plus').replace(/^Moins/,'moins')).toLowerCase()===t)pv.insertAdjacentHTML('afterbegin','<span class="smpm">🧠</span>')})})}
/* deux lignes par événement de statistiques : « Équilibré » (principale) et « Prudent » (plus sûre) ; une seule est affichée */
function prep(r){if(r.dataset.smp)return;const pv=r.querySelector('.pv2'),alt=r.querySelector('.alt2');r.dataset.smp='1';if(!pv||!alt)return;
const g=alt.textContent.match(/(plus|moins) de ([\d,]+) · (\d+) % · cote ([\d,]+)/i);if(!g){alt.remove();return}
const pct=+g[3],cs=pct>=80?'ok':pct>=60?'lm':'mid',lv=pct>=80?'Très sûr':pct>=60?'Sûr':'Modéré',ce=(r.className.match(/\b(ok|lm|mid|bad)\b/)||[])[1]||'lm';
r.dataset.ceq=ce;r.dataset.csf=cs;pv.dataset.ceq=pv.className;pv.dataset.csf='pv2 '+cs;alt.remove();
pv.innerHTML='<span class="mEq">'+pv.innerHTML+'</span><span class="mSf">'+g[1][0].toUpperCase()+g[1].slice(1).toLowerCase()+' de '+g[2]+'<small>'+pct+' % · '+lv+' · cote '+g[4]+'</small></span>'}
function applyMode(){const sf=mode()==='sf';document.body.classList.toggle('smp-sf',sf);
document.querySelectorAll('.sx[data-smp]').forEach(r=>{const c=sf?r.dataset.csf:r.dataset.ceq;if(!c)return;r.className='sx '+c;const pv=r.querySelector('.pv2');if(pv)pv.className=sf?pv.dataset.csf:pv.dataset.ceq});
document.querySelectorAll('.smpmode button').forEach(b=>b.classList.toggle('on',b.dataset.m===(sf?'sf':'eq')))}
function enh(){
document.querySelectorAll('.stp,.spb').forEach(e=>e.remove());
document.querySelectorAll('.note').forEach(n=>{if(n.textContent.startsWith('⭐ = pronostic'))n.remove()});
document.querySelectorAll('.ai:not(.smpb)').forEach(a=>{const root=a.parentElement;if(!root||root.querySelector('.smpb')||root.querySelector('.lvn'))return;const m=matchOf(a);if(!m)return;
const R=picks(m),d=document.createElement('div');d.innerHTML=box(m,R);a.after(d.firstChild);mark(root,R.sel)});
document.querySelectorAll('.stx').forEach(x=>{if(!x.querySelector('.smpmode')){const d=document.createElement('div');d.className='smpmode';d.innerHTML='<span>Lignes :</span><button data-m="eq">Équilibré · ≈ 66 %</button><button data-m="sf">Prudent · ≈ 85 %</button>';
 d.querySelectorAll('button').forEach(b=>b.onclick=()=>{try{localStorage.setItem(MK,b.dataset.m)}catch(e){}applyMode()});x.insertBefore(d,x.firstChild)}});
document.querySelectorAll('.sx').forEach(prep);applyMode()}
let tm=0;const ob=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(enh,150)});
function start(){ob.observe(document.body,{childList:true,subtree:true});enh()}
if(document.readyState==='complete')setTimeout(start,400);else addEventListener('load',()=>setTimeout(start,400));
})();
