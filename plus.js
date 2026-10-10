/* plus.js : bouton « Analyse live » visible, matchs en direct dans M.A, accord des modèles, Palmarès (réussite réelle) */
(function(){
const css=`.an.lv{background:linear-gradient(180deg,#ff7a59,#e63b1f)!important;box-shadow:0 3px 9px rgba(230,59,31,.45)!important}
.lvb{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;border:0;color:#fff;font-weight:800;font-size:.74rem;background:linear-gradient(180deg,#ff7a59,#e63b1f)}
.pr3{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-top:1px solid var(--ln);font-size:.8rem}.pr3 small{display:block;color:var(--mu);font-size:.68rem}.pr3 b{white-space:nowrap}
.kp{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:8px}.kp div{padding:10px;border-radius:12px;background:rgba(2,18,36,.5);border:1px solid var(--ln);text-align:center}.kp b{display:block;font-size:1.5rem}.kp span{font-size:.68rem;color:var(--mu)}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* ---------- suivi réel des pronostics (enregistrés avant le match, jugés avec le score final) ---------- */
const LK='pronos_log_v1',lg=()=>{try{return JSON.parse(localStorage.getItem(LK)||'[]')}catch(e){return[]}},fl=s=>parseFloat(String(s).replace(',','.'));
function evalPick(t,m,sc){const[a,b]=sc,hn=m.h,an=m.a;let r;
if(t==='Victoire '+hn+' (V1)')return a>b;if(t==='Victoire '+an+' (V2)')return b>a;if(t==='Match nul (X)')return a===b;
if(r=t.match(/^(Plus|Moins) de ([\d,]+) buts$/))return r[1]==='Plus'?a+b>fl(r[2]):a+b<fl(r[2]);
if(t==='Les deux marquent : oui')return a>0&&b>0;if(t==='Les deux marquent : non')return!(a>0&&b>0);
if(t==='Double chance : '+hn+' ou nul')return a>=b;if(t==='Double chance : nul ou '+an)return b>=a;if(t==='Double chance : '+hn+' ou '+an)return a!==b;
if(r=t.match(/^Handicap (.+) ([+-])([\d,]+)$/)){const k=fl(r[3])*(r[2]==='-'?-1:1),d=r[1]===hn?a-b:b-a;return d+k>0}
if(r=t.match(/^(.+) : (plus|moins) de ([\d,]+) buts?$/)){const g=r[1]===hn?a:r[1]===an?b:null;if(g==null)return null;return r[2]==='plus'?g>fl(r[3]):g<fl(r[3])}
return null}
function track(){if(!window._mo)return;const L=lg(),ids=new Set(L.map(e=>e.id));let ch=0;
M.forEach(m=>{const id=idOf(m),o=stOf(m);
if(o.s==='pre'&&!ids.has(id)){const A=_mo.allPicks(m);L.unshift({id,t:Date.now(),l:m.l,h:m.h,a:m.a,d:m.d,pk:A.top.map(x=>({t:x.t,p:+x.p.toFixed(3)}))});ids.add(id);ch=1}
if(o.s==='fin'&&!o.est&&o.g&&o.g[0]!=null&&o.g[1]!=null){const e=L.find(e=>e.id===id);if(e&&!e.r){e.sc=[+o.g[0],+o.g[1]];e.r=e.pk.map(x=>evalPick(x.t,m,e.sc));ch=1}}});
if(ch)try{localStorage.setItem(LK,JSON.stringify(L.filter(e=>Date.now()-e.t<45*864e5).slice(0,500)))}catch(e){}}
const lvl=p=>p>=.75?['Très sûr','ok']:p>=.65?['Sûr','lm']:p>=.55?['Modéré','mid']:['Faible','bad'];
function renderP(){const L=lg().filter(e=>e.r),all=[];L.forEach(e=>e.pk.forEach((x,i)=>{if(e.r[i]!=null)all.push({...x,ok:e.r[i],top:i===0,e})}));
const rate=a=>a.length?Math.round(100*a.filter(x=>x.ok).length/a.length):0,pend=lg().filter(e=>!e.r).length;
let h=`<h1 class="pgt">Palmarès</h1><div class="meta">Réussite réelle de tes pronostics, mesurée sur les matchs terminés</div>`;
if(!all.length)h+=`<div class="mcard gl"><div class="note" style="margin:0">Aucun résultat à mesurer pour le moment.<br>L'application enregistre le Pronostic IA de chaque match <b>avant</b> le coup d'envoi, puis le compare au score final dès qu'il est connu. ${pend} match${pend>1?'s':''} en attente de résultat.<br><br>Les scores sont disponibles pour les 8 grands championnats et, avec un peu de retard, pour les autres.</div></div>`;
else{const top=all.filter(x=>x.top);
h+=`<div class="kp"><div><b>${rate(all)} %</b><span>réussite des ${all.length} pronostics</span></div><div><b>${rate(top)} %</b><span>Pronostic IA n°1 (${top.length})</span></div></div>`;
h+=`<div class="mcard gl"><div class="st" style="margin-top:0">Par niveau : annoncé ou réel ?</div>${['Très sûr','Sûr','Modéré','Faible'].map(n=>{const a=all.filter(x=>lvl(x.p)[0]===n);if(!a.length)return '';const k=lvl(a[0].p)[1],att=Math.round(100*a.reduce((s,x)=>s+x.p,0)/a.length),re=rate(a);return `<div class="mr ${k}" style="margin-bottom:6px"><span>${n} · ${a.length} pronostic${a.length>1?'s':''}</span><span><span class="b ${k}">annoncé ${att} % · réel ${re} %</span></span></div>`}).join('')}<div class="note" style="margin:6px 0 0">Si le « réel » est proche de l'« annoncé », le modèle est bien calibré. Plus il y a de pronostics mesurés, plus ces chiffres sont fiables.</div></div>`;
h+=`<div class="mcard gl"><div class="st" style="margin-top:0">Derniers résultats</div>${all.slice(0,12).map(x=>`<div class="pr3"><div><strong>${x.e.h} – ${x.e.a}</strong><small>${x.t} · ${Math.round(x.p*100)} % · score ${x.e.sc[0]}-${x.e.sc[1]}</small></div><b style="color:${x.ok?'#4ade80':'#ff7a7a'}">${x.ok?'✔ validé':'✘ perdu'}</b></div>`).join('')}</div>`}
$('v-p').innerHTML=h}

/* ---------- mise en service (après moteur.js) ---------- */
function apply(){
const c0=card;card=function(m,sv,sd){let h=c0(m,sv,sd);const o=stOf(m);if(o.s==='live'&&!o.est&&h.includes('<span>Analyse</span>'))h=h.replace('<button class="an" ','<button class="an lv" ').replace('<span>Analyse</span>','<span>⚡ Analyse live</span>');return h};
const a0=ana;ana=function(m){let h=a0(m);if(m.ag==null)return h;const t=m.ag>=.7?['Fort','#4ade80']:m.ag>=.4?['Moyen','#fbbf24']:['Faible','#ff7a7a'];
return h.replace('<div class="st">Marchés',`<div class="fb2" style="margin-top:-6px"><b>Accord des modèles</b> (Poisson + Elo) : <b style="color:${t[1]}">${t[0]}</b>${m.f&&m.f.elo?` · Elo ${m.h} ${m.f.elo[0]} / ${m.a} ${m.f.elo[1]}`:''}${t[0]==='Faible'?'<br>Les deux modèles ne voient pas le match pareil : prudence.':''}</div><div class="st">Marchés`)};
const r2=window.renderMA;window.renderMA=function(){r2();const el=$('v-g'),seg=el&&el.querySelector('.seg'),on=seg&&seg.querySelector('button[aria-pressed="true"]');if(!on||!on.textContent.includes('Direct'))return;
const L=M.map((m,i)=>[m,i]).filter(([m])=>{const o=stOf(m);return o.s==='live'&&!o.est});
seg.insertAdjacentHTML('afterend',`<div class="mcard gl"><div class="st" style="margin-top:0">⚡ Matchs en direct maintenant (${L.length})</div>${L.length?L.map(([m,i])=>`<div class="sl"><span>${m.h} – ${m.a} · ${HM(m.d)}</span><button class="lvb" onclick="liveGo(${i})">⚡ Analyser</button></div>`).join(''):'<div class="note" style="margin:0">Aucun match en direct pour le moment. Les boutons rouges apparaissent ici dès qu\'un match commence.</div>'}</div>`)};
window.liveGo=function(i){selTog(i,{checked:true});lvGo(i);window.renderMA();setTimeout(()=>window.renderMA(),5300)};
const sh0=show;show=function(t){sh0(t);if(t==='p')renderP()};
const rr=render;render=function(f){rr(f);track()};
track();if(!$('v-p').hidden)renderP()}
if(document.readyState==='complete')setTimeout(apply,80);else addEventListener('load',()=>setTimeout(apply,80));
})();
