/* live.js : scores en quasi-direct, analyse d'avant-match figée, analyse en direct séparée, statistiques en direct */
(function(){
const RAW='https://raw.githubusercontent.com/mariusadjaito-debug/pronos/live/scores.json';
const f0=window.fetch.bind(window);
/* les scores sont lus sur la branche « live » (mise à jour en continu) ; si elle manque, on retombe sur scores.json */
window.fetch=function(u,o){const s=String(u);if(s.startsWith('scores.json'))return f0(RAW+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r:f0(s,o)).catch(()=>f0(s,o));return f0(u,o)};
const css=`.lvn .fz{font-weight:800}.lvn.old{background:rgba(255,90,90,.14);border-color:rgba(255,90,90,.5);color:#ffb3b3}
.fzn{margin:0 0 10px;padding:7px 10px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid var(--ln);font-size:.72rem;color:var(--mu)}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const FZ=new Set(),LVO=new Set(),js=s=>esc(JSON.stringify(s));

function fzTxt(){if(typeof SCT==='undefined'||!SCT)return{t:'⚠ scores en direct indisponibles : l\'analyse peut être fausse',old:1};
const a=Math.max(0,Math.floor(Date.now()/1000-SCT));
if(a<120)return{t:`scores à jour (il y a ${a} s)`,old:0};
return{t:`⚠ scores en retard de ${Math.floor(a/60)} min : l'analyse peut être fausse`,old:1}}
const PHI={k:1.15,r:1.3,c:1.3,s:1.45,f:1.2};
function nbcdf(mu,phi,k){const r=mu/(phi-1),pr=r/(r+mu);let pm=Math.pow(pr,r),c=pm;for(let i=0;i<k;i++){pm*=(i+r)/(i+1)*(1-pr);c+=pm}return Math.min(1,c)}
const lvl=p=>p>=.75?['ok','Très sûr']:p>=.65?['lm','Sûr']:p>=.55?['mid','Modéré']:['bad','Faible'];

/* statistiques en direct : valeurs réelles si la source les fournit, sinon ce qu'il reste à jouer d'après la moyenne du match */
function liveStats(m){const o=stOf(m),t=mnText(o,m),mn=t==='MT'?45:parseInt(t)||1,f=Math.max(.02,(90-Math.min(mn,90))/90),sc=m.i&&SC[m.i],ls=sc&&sc[5]||null;
const rows=_mo.rowsOf(m).map(r=>{const[a,b]=r.v,mu=(a+b)*f,real=ls&&ls[r.k],cur=real?real[0]+real[1]:0,c=[],phi=PHI[r.k]||1.2,k0=Math.max(0,Math.floor(cur+mu)-3);
for(let x=k0;x<=Math.floor(cur+mu)+3;x++){const l=x+.5;if(l<=cur)continue;const u=nbcdf(mu,phi,Math.floor(l-cur));c.push({side:'Moins',line:l,p:u},{side:'Plus',line:l,p:1-u})}
const ok=c.filter(x=>x.p>=.5&&x.p<=.9).sort((p,q)=>Math.abs(p.p-.68)-Math.abs(q.p-.68))[0]||c.sort((p,q)=>q.p-p.p)[0]||{side:'Plus',line:cur+.5,p:.5};
return{r,real,a:a*f,b:b*f,ok}}).sort((p,q)=>q.ok.p-p.ok.p),any=rows.some(x=>x.real);
if(!any&&rows.every(x=>x.r.es&&m.se!=='nat'))return '<div class="note" style="margin:10px 0 0;text-align:center">📊 Statistiques en direct indisponibles pour ce championnat : aucune donnée réelle.</div>';return `<div class="st">${any?'Statistiques en direct · total du match':'Statistiques attendues d\'ici la fin du match'}</div>${rows.map(({r,real,a,b,ok})=>{const L=lvl(ok.p);return `<div class="sx ${L[0]}"><div class="ev"><i>${r.d.i}</i>${r.d.n}</div><span class="nv">${real?real[0]:F(a)}</span><span class="nv">${real?real[1]:F(b)}</span><div class="pv2 ${L[0]}">${ok.side} de ${fm(ok.line)}${r.es&&!real&&m.se!=='nat'?'<span class="es">≈ estimé</span>':''}<small>${Math.round(ok.p*100)} % · ${L[1]}</small></div></div>`}).join('')}<div class="note" style="margin:6px 0 0">${any?'Les colonnes affichent les chiffres réels du match en cours ; les lignes portent sur le total final.':'Les statistiques en direct (corners, tirs, cartons déjà joués) ne sont pas fournies par cette clé : les lignes portent sur ce qu\'il reste à jouer. Elles passent en chiffres réels dès que la source les fournit.'}</div>`}

/* cartes des matchs commencés : l'analyse d'avant-match reste intacte, l'analyse en direct est à part et n'est jamais enregistrée */
function cardFix(mc,m){const o=stOf(m);if(o.s==='pre')return;const id=idOf(m);OPEN.delete(id);
const snap=rd().find(e=>e.id===id&&e.m),ct=mc.querySelector('.ct'),pill=ct&&ct.querySelector('.pill'),pn=mc.querySelector('.ana');if(!ct||!pill||!pn)return;
const live=o.s==='live'&&!o.est,busy=BUSY.has(id),fo=FZ.has(id)&&!!snap,lo=LVO.has(id)&&live,sig=[fo,lo,busy,!!snap,live,lo?Math.floor(Date.now()/6e4)+'.'+SCT:0].join('|');
if(mc.dataset.sg===sig)return;mc.dataset.sg=sig;
ct.innerHTML=pill.outerHTML+(snap?`<button class="an" onclick="fzTog(${js(id)})">${ICO}<span>${fo?'Masquer':"Voir l'analyse"}</span></button>`:'')+(live?`<button class="an lv" ${busy?'disabled ':''}onclick="lvTog(${js(id)})">${ICO}<span>${busy?'Analyse…':lo?'Masquer le live':'⚡ Analyse live'}</span></button>`:'');
let h='',sh=false;
if(busy){h=scan(id);sh=true}
else if(fo){const f=Object.assign({},snap.m,{i:null,st:'pre'});h=`<div class="fzn">📌 Analyse d'avant-match · figée le ${new Date(snap.t).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} : elle ne change pas pendant le match</div>`+ana(f);sh=true}
else if(lo){h=ana(m);sh=true}
pn.innerHTML=h;pn.hidden=!sh}
window.fzTog=function(id){if(FZ.has(id))FZ.delete(id);else{FZ.add(id);LVO.delete(id)}enh()};
window.lvTog=function(id){if(BUSY.has(id))return;if(LVO.has(id)){LVO.delete(id);enh();return}
FZ.delete(id);BUSY.set(id,Date.now());if(!scanI)scanI=setInterval(scanTick,120);enh();setTimeout(()=>{BUSY.delete(id);LVO.add(id);enh()},ANALYSE_MS)};

/* amélioration de l'écran après chaque affichage */
function enh(){const mp=new Map((typeof M!=='undefined'?M:[]).map(m=>[idOf(m),m]));
const find=el=>{const c=el.closest('.mc');if(c)return mp.get(c.dataset.k);const g=el.closest('.mcard');if(!g)return null;const n=[...g.querySelectorAll('.nm')].map(e=>e.textContent.trim());return M.find(m=>m.h===n[0]&&m.a===n[1])};
document.querySelectorAll('.mc[data-k]').forEach(c=>{const m=mp.get(c.dataset.k);if(m)cardFix(c,m)});
document.querySelectorAll('.lvn').forEach(l=>{if(!l.querySelector('.fz')){const z=fzTxt();l.insertAdjacentHTML('afterbegin',`<span class="fz">${z.t}</span> · `);l.classList.toggle('old',!!z.old)}
const root=l.parentElement,m=find(l);if(!m||!window._mo)return;
const note=[...root.querySelectorAll('.note')].find(n=>n.textContent.startsWith('Statistiques détaillées en direct'));if(note){try{note.outerHTML=liveStats(m)}catch(e){}}});
document.querySelectorAll('.stx .esn').forEach(n=>{if(n.dataset.e)return;n.dataset.e=1;const m=find(n);if(m&&m.se==='nat')n.textContent='Statistiques calculées d\'après le championnat national de chaque club (pas de statistiques réelles de coupe d\'Europe)'})}
let tm=0;const ob=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(enh,120)});
function start(){
/* l'onglet Analyses montre toujours l'analyse d'avant-match telle qu'elle a été faite */
const ra0=renderAn;renderAn=function(){const a1=ana;ana=function(m){return a1(Object.assign({},m,{i:null,st:'pre'}))};try{ra0()}finally{ana=a1}};
ob.observe(document.body,{childList:true,subtree:true});enh();
setInterval(()=>{if(!document.hidden&&typeof loadScores==='function')loadScores()},15000);
setInterval(()=>{if(document.hidden)return;if(typeof tick==='function')tick();document.querySelectorAll('.lvn .fz').forEach(e=>{const z=fzTxt();e.textContent=z.t;e.parentElement.classList.toggle('old',!!z.old)})},1000);
if(typeof loadScores==='function')loadScores()}
if(document.readyState==='complete')setTimeout(start,250);else addEventListener('load',()=>setTimeout(start,250));
})();
