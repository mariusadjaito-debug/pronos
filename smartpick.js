/* smartpick.js (v2) : SmartPick = 1 à 2 pronostics par match, toujours proposés, classés par niveau de confiance.
   Chaque pronostic est noté sur plusieurs ingrédients : équipe 1, équipe 2, ensemble des deux équipes, confrontations directes,
   matchs à domicile / à l'extérieur, style de jeu et xG estimé, moyennes. Seules des lignes proposées en général par les
   bookmakers sont retenues, avec une probabilité qui laisse une cote intéressante (cote juste d'environ 1,4 à 1,9). */
(function(){
const fl=s=>parseFloat(String(s).replace(',','.')),fo=p=>(1/p).toFixed(2).replace('.',','),av=a=>a.reduce((s,v)=>s+v,0)/a.length;
const st0=document.createElement('style');st0.textContent=`.smpb{border-color:rgba(167,139,250,.65)!important;background:linear-gradient(180deg,rgba(124,58,237,.16),rgba(2,18,36,.45))!important}
.smpb .ah span:first-child{color:#c4b5fd}.smpi{padding:9px 0;border-top:1px solid var(--ln)}.smpt{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.smpt strong{font-size:1rem}.smpt b{font-size:1.15rem;color:#c4b5fd;white-space:nowrap}
.smps{font-size:.72rem;color:var(--mu);margin-top:3px;line-height:1.45}.smpg{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.smpg span{font-size:.66rem;padding:2px 8px;border-radius:999px;border:1px solid var(--ln)}.smpg .y{color:#4ade80;border-color:rgba(74,222,128,.5)}.smpg .n{color:#ff9a9a;border-color:rgba(255,120,120,.5)}.smpm{margin-right:4px}`;document.head.appendChild(st0);
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
function picks(m){if(!window._mo)return[];const A=_mo.allPicks(m);if(A.R&&A.R.live)return[];const sy=style(m);
let cand=A.all.map(c=>({t:c.t,p:c.p,fam:cat(c.t)})).filter(c=>c.fam);
let win=cand.filter(c=>c.p>=.52&&c.p<=.72);if(!win.length)win=cand.filter(c=>c.p>=.5&&c.p<=.8);
win.forEach(c=>{const g=ingr(m,c,sy),ap=g.filter(x=>x[1]!==null);c.g=g;c.k=ap.filter(x=>x[1]).length;c.n=ap.length;c.conf=c.n?c.k/c.n:0;c.q=g.q||0;c.sc=c.conf*10+(c.n?(c.q-c.p):0)*2-Math.abs(c.p-.62)});
win.sort((a,b)=>b.sc-a.sc);const res=[];win.forEach(c=>{if(res.length<2&&!res.some(x=>x.fam===c.fam))res.push(c)});return res}
function box(m,P2){const it=P2.length?P2.map(c=>`<div class="smpi"><div class="smpt"><strong>${c.t}</strong><b>${Math.round(c.p*100)} %</b></div><div class="smps">cote juste ${fo(c.p)}${c.n?' · confiance '+c.k+'/'+c.n:' · calcul seul (pas assez de matchs pour confirmer)'}${c.g.why?' · '+c.g.why:''}</div>${c.n?`<div class="smpg">${c.g.filter(x=>x[1]!==null).map(x=>`<span class="${x[1]?'y':'n'}">${x[1]?'✔':'✘'} ${x[0]}</span>`).join('')}</div>`:''}</div>`).join(''):'<div class="smps" style="margin:6px 0">Aucune ligne standard exploitable pour ce match.</div>';
return `<div class="ai smpb"><div class="ah"><span>🧠 SmartPick</span><span>${P2.length} pronostic${P2.length>1?'s':''}</span></div>${it}<div class="as">Lignes proposées en général par les bookmakers · cote juste d'environ 1,4 à 1,9 · plus il y a de ✔, plus les derniers matchs confirment le pronostic. Ce n'est jamais une certitude.</div></div>`}
function matchOf(el){const c=el.closest('.mc');if(c&&c.dataset.k){const m=M.find(x=>idOf(x)===c.dataset.k);if(m)return m}
const g=el.closest('.mcard');if(g){const n=[...g.querySelectorAll('.nm')].map(e=>e.textContent.trim()),m=M.find(x=>x.h===n[0]&&x.a===n[1]);if(m)return m;const sv=rd().find(e=>e.m&&e.m.h===n[0]&&e.m.a===n[1]);if(sv)return sv.m}
return null}
function mark(root,P2){P2.forEach(c=>{const t=c.t.toLowerCase();
root.querySelectorAll('.mr').forEach(r=>{const s=r.firstElementChild;if(!s||s.querySelector('.smpm'))return;if(s.textContent.replace(/^Plus sûr : /i,'').trim().toLowerCase()===t)s.insertAdjacentHTML('afterbegin','<span class="smpm">🧠</span>')});
root.querySelectorAll('.sx').forEach(r=>{const ev=r.querySelector('.ev'),pv=r.querySelector('.pv2');if(!ev||!pv||pv.querySelector('.smpm'))return;const nm=ev.lastChild&&ev.lastChild.textContent.trim(),tx=[...pv.childNodes].find(n=>n.nodeType===3);if(!tx)return;
const side=tx.textContent.trim();if((nm+' : '+side.replace(/^Plus/,'plus').replace(/^Moins/,'moins')).toLowerCase()===t)pv.insertAdjacentHTML('afterbegin','<span class="smpm">🧠</span>')})})}
function enh(){
document.querySelectorAll('.alt2,.stp,.spb').forEach(e=>e.remove());
document.querySelectorAll('.note').forEach(n=>{if(n.textContent.startsWith('⭐ = pronostic'))n.remove()});
document.querySelectorAll('.ai:not(.smpb)').forEach(a=>{const root=a.parentElement;if(!root||root.querySelector('.smpb')||root.querySelector('.lvn'))return;const m=matchOf(a);if(!m)return;
const P2=picks(m),d=document.createElement('div');d.innerHTML=box(m,P2);a.after(d.firstChild);mark(root,P2)})}
let tm=0;const ob=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(enh,150)});
function start(){ob.observe(document.body,{childList:true,subtree:true});enh()}
if(document.readyState==='complete')setTimeout(start,400);else addEventListener('load',()=>setTimeout(start,400));
})();
