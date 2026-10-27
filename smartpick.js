/* smartpick.js : SmartPick = 1 à 2 pronostics par match, probables, de bonne cote et confirmés par les derniers matchs.
   - une seule proposition par événement de statistiques (la seconde ligne « Plus sûr » disparaît)
   - remplace les anciens ⭐ : on ne retient que des lignes que les bookmakers proposent en général
   - probabilité du calcul de 55 à 69 % (cote juste 1,45 à 1,82), confirmée par les 20 derniers matchs de chaque équipe */
(function(){
const fl=s=>parseFloat(String(s).replace(',','.')),fo=p=>(1/p).toFixed(2).replace('.',',');
const st0=document.createElement('style');st0.textContent=`.spb{border-color:rgba(167,139,250,.65)!important;background:linear-gradient(180deg,rgba(124,58,237,.16),rgba(2,18,36,.45))!important}
.spb .ah span:first-child{color:#c4b5fd}.spi{padding:8px 0;border-top:1px solid var(--ln)}.spt{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.spt strong{font-size:1rem}.spt b{font-size:1.15rem;color:#c4b5fd}
.sps{font-size:.72rem;color:var(--mu);margin-top:3px}.spm{margin-right:4px}`;document.head.appendChild(st0);
const STN={'Cart.':'k','Corn.':'r','Tirs cadrés':'c','Tirs totaux':'s','Fautes':'f'};
const RNG={'Cart.':[2.5,6.5],'Corn.':[7.5,12.5],'Tirs cadrés':[6.5,11.5],'Tirs totaux':[20.5,30.5],'Fautes':[20.5,30.5]};
/* le pronostic est-il validé si le match finit a-b (domicile-extérieur) ? */
function hit(t,m,a,b){let r;
if(t==='Victoire '+m.h+' (V1)')return a>b;if(t==='Victoire '+m.a+' (V2)')return b>a;if(t==='Match nul (X)')return a===b;
if(r=t.match(/^(Plus|Moins) de ([\d,]+) buts$/))return r[1]==='Plus'?a+b>fl(r[2]):a+b<fl(r[2]);
if(t==='Les deux marquent : oui')return a>0&&b>0;if(t==='Les deux marquent : non')return!(a>0&&b>0);
if(t==='Double chance : '+m.h+' ou nul')return a>=b;if(t==='Double chance : nul ou '+m.a)return b>=a;if(t==='Double chance : '+m.h+' ou '+m.a)return a!==b;
if(r=t.match(/^Handicap (.+) ([+-])([\d,]+)$/)){const k=fl(r[3])*(r[2]==='-'?-1:1),d=r[1]===m.h?a-b:b-a;return d+k>0}
if(r=t.match(/^(.+) : (plus|moins) de ([\d,]+) buts?$/)){const g=r[1]===m.h?a:r[1]===m.a?b:null;if(g==null)return null;return r[2]==='plus'?g>fl(r[3]):g<fl(r[3])}
return null}
/* famille du pronostic, ou null si la ligne n'est en général pas proposée par les bookmakers */
function cat(t){let r;
if(/^Victoire .* \(V[12]\)$/.test(t)||t==='Match nul (X)')return'r';
if(/^Double chance : /.test(t))return'd';
if(r=t.match(/^Handicap (.+) ([+-])([\d,]+)$/)){const k=fl(r[3]);return k===.5||k===1.5?'h':null}
if(r=t.match(/^(Plus|Moins) de ([\d,]+) buts$/)){const l=fl(r[2]);return l>=1.5&&l<=4.5?'g':null}
if(/^Les deux marquent/.test(t))return'b';
if(r=t.match(/^(.+) : (plus|moins) de ([\d,]+) buts?$/)){const l=fl(r[3]);return l>=1.5&&l<=2.5?'t':null}
if(r=t.match(/^(Cart\.|Corn\.|Tirs cadrés|Tirs totaux|Fautes) : (plus|moins) de ([\d,]+)$/)){const l=fl(r[3]),R=RNG[r[1]];return l>=R[0]&&l<=R[1]?'s'+STN[r[1]]:null}
return null}
/* confirmation par les 20 derniers matchs de chaque équipe (et les confrontations directes) */
function evid(m,t){const z=m.z;if(!z)return null;let A,B,H=null;
const sm=t.match(/^(Cart\.|Corn\.|Tirs cadrés|Tirs totaux|Fautes) : (plus|moins) de ([\d,]+)$/);
if(sm){const zz=(z.ts&&z.ts[STN[sm[1]]])||z[STN[sm[1]]];if(!zz)return null;const l=fl(sm[3]),f=v=>sm[2]==='plus'?v>l:v<l;A=zz[0].map(f);B=zz[1].map(f)}
else{const th=z.th||z.gh,ta=z.ta||z.ga;if(!th||!ta)return null;A=th.map(x=>hit(t,m,x[0],x[1]));B=ta.map(x=>hit(t,m,x[1],x[0]));if(A.includes(null))return null;if(z.hm&&z.hm.length>=4)H=z.hm.map(x=>hit(t,m,x[0],x[1]))}
if(A.length<8||B.length<8)return null;const q=a=>a.filter(Boolean).length/a.length,c=a=>a.filter(Boolean).length;
return{a:q(A),b:q(B),q:q(A.concat(B)),h:H?q(H):null,ka:c(A),kb:c(B),na:A.length,nb:B.length}}
/* style de jeu et xG estimé (à partir des tirs) : petit bonus, jamais une condition */
function style(m){const s=m.z&&m.z.sx;if(!s||!s.la||!s.h||!s.a)return null;
const ag=p=>p.fl&&p.yc&&s.la.fl&&s.la.yc?(p.fl[0]/s.la.fl+2*p.yc[0]/s.la.yc)/3:null,g=ag(s.h),h=ag(s.a),lab=x=>x==null?'?':x>=1.12?'agressif':x<=.88?'discipliné':'normal';
const xt=s.h.xg&&s.a.xg?(s.h.xg[0]+s.a.xg[1])/2+(s.a.xg[0]+s.h.xg[1])/2:null;return{g,h,lg:lab(g),lh:lab(h),xt}}
function bonus(m,t,s){if(!s)return[0,''];let r;
if(r=t.match(/^(Plus|Moins) de ([\d,]+) buts$/)){if(s.xt==null)return[0,''];const l=fl(r[2]),ok=r[1]==='Plus'?s.xt>=l+.2:s.xt<=l-.2;return ok?[.03,'xG estimé du match '+s.xt.toFixed(1).replace('.',',')]:[0,'']}
if(/^Cart\./.test(t)){if(s.g==null||s.h==null)return[0,''];const a=(s.g+s.h)/2,ok=/: plus/.test(t)?a>=1.08:a<=.92;return ok?[.03,'style : '+m.h+' '+s.lg+', '+m.a+' '+s.lh]:[0,'']}
if(/^Fautes/.test(t)){if(s.g==null||s.h==null)return[0,''];const a=(s.g+s.h)/2,ok=/: plus/.test(t)?a>=1.08:a<=.92;return ok?[.03,'style : '+m.h+' '+s.lg+', '+m.a+' '+s.lh]:[0,'']}
return[0,'']}
function picks(m){if(!window._mo)return[];const A=_mo.allPicks(m);if(A.R&&A.R.live)return[];const sy=style(m),out=[];
A.all.forEach(c=>{const fam=cat(c.t);if(!fam||c.p<.55||c.p>.69)return;const e=evid(m,c.t);if(!e||e.a<.6||e.b<.6||e.q<c.p||(e.h!=null&&e.h<.5))return;const bn=bonus(m,c.t,sy);out.push({t:c.t,p:c.p,fam,e,sc:c.p+.7*(e.q-c.p)+bn[0],why:bn[1]})});
out.sort((a,b)=>b.sc-a.sc);const res=[];out.forEach(c=>{if(res.length<2&&!res.some(x=>x.fam===c.fam))res.push(c)});return res}
function box(m,P2){const it=P2.length?P2.map(c=>`<div class="spi"><div class="spt"><strong>${c.t}</strong><b>${Math.round(c.p*100)} %</b></div><div class="sps">cote juste ${fo(c.p)} · confirmé ${c.e.ka}/${c.e.na} (${m.h}) et ${c.e.kb}/${c.e.nb} (${m.a}) des derniers matchs${c.e.h!=null?' · confrontations directes ok':''}${c.why?' · '+c.why:''}</div></div>`).join(''):'<div class="sps" style="margin:6px 0">Aucun pronostic ne remplit toutes les conditions pour ce match : mieux vaut ne pas forcer.</div>';
return `<div class="ai spb"><div class="ah"><span>🧠 SmartPick</span><span>${P2.length} pronostic${P2.length>1?'s':''}</span></div>${it}<div class="as">Lignes proposées en général par les bookmakers · probabilité 55 à 69 % (cote juste 1,45 à 1,82) · confirmé par les 20 derniers matchs de chaque équipe.</div></div>`}
function matchOf(el){const c=el.closest('.mc');if(c&&c.dataset.k){const m=M.find(x=>idOf(x)===c.dataset.k);if(m)return m}
const g=el.closest('.mcard');if(g){const n=[...g.querySelectorAll('.nm')].map(e=>e.textContent.trim()),m=M.find(x=>x.h===n[0]&&x.a===n[1]);if(m)return m;const sv=rd().find(e=>e.m&&e.m.h===n[0]&&e.m.a===n[1]);if(sv)return sv.m}
return null}
function mark(root,P2){P2.forEach(c=>{const t=c.t.toLowerCase();
root.querySelectorAll('.mr').forEach(r=>{const s=r.firstElementChild;if(!s||s.querySelector('.spm'))return;if(s.textContent.replace(/^Plus sûr : /i,'').trim().toLowerCase()===t)s.insertAdjacentHTML('afterbegin','<span class="spm">🧠</span>')});
root.querySelectorAll('.sx').forEach(r=>{const ev=r.querySelector('.ev'),pv=r.querySelector('.pv2');if(!ev||!pv||pv.querySelector('.spm'))return;const nm=ev.lastChild&&ev.lastChild.textContent.trim(),tx=[...pv.childNodes].find(n=>n.nodeType===3);if(!tx)return;
const side=tx.textContent.trim();if((nm+' : '+side.replace(/^Plus/,'plus').replace(/^Moins/,'moins')).toLowerCase()===t)pv.insertAdjacentHTML('afterbegin','<span class="spm">🧠</span>')})})}
function enh(){
document.querySelectorAll('.alt2,.stp').forEach(e=>e.remove());
document.querySelectorAll('.note').forEach(n=>{if(n.textContent.startsWith('⭐ = pronostic'))n.remove()});
document.querySelectorAll('.ai:not(.spb)').forEach(a=>{const root=a.parentElement;if(!root||root.querySelector('.spb')||root.querySelector('.lvn'))return;const m=matchOf(a);if(!m)return;
const P2=picks(m),d=document.createElement('div');d.innerHTML=box(m,P2);a.after(d.firstChild);mark(root,P2)})}
let tm=0;const ob=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(enh,150)});
function start(){ob.observe(document.body,{childList:true,subtree:true});enh()}
if(document.readyState==='complete')setTimeout(start,400);else addEventListener('load',()=>setTimeout(start,400));
})();
