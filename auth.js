/* auth.js : comptes (adresse e-mail + mot de passe), espace propriétaire, mise à jour obligatoire, commentaires.
   Service : Firebase (Authentication + Firestore). Réglages dans config.js. */
(function(){
const C=window.PRONOS_CONFIG||{},F=C.firebase||{},VER=String(C.version||'1.0.0'),OWNER=String(C.owner||'').trim().toLowerCase();
if(!F.apiKey||!F.projectId){console.warn('M-ADJ : comptes non configurés (config.js)');return}
const SDK=['app','auth','firestore'].map(n=>'https://www.gstatic.com/firebasejs/10.12.2/firebase-'+n+'-compat.js');
const h=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const load=u=>new Promise((ok,ko)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>ko(new Error('chargement impossible : '+u));document.head.appendChild(s)});
const st=document.createElement('style');st.textContent=`#acct{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;background:radial-gradient(120% 90% at 50% 0%,#0b2a4a 0%,#05030c 70%);color:#eaf4ff;font-family:inherit}
#acct .box{width:100%;max-width:380px;padding:22px 18px;border-radius:20px;background:rgba(2,18,36,.82);border:1px solid rgba(120,190,255,.25);box-shadow:0 20px 60px rgba(0,0,0,.5)}
#acct[hidden]{display:none!important}#acct h2{margin:0 0 4px;font-size:1.5rem;letter-spacing:.06em}#acct p{margin:0 0 14px;color:#9db8d2;font-size:.82rem;line-height:1.5}
#acct input[type=email],#acct input[type=password]{width:100%;box-sizing:border-box;padding:13px 14px;margin:6px 0;border-radius:12px;border:1px solid rgba(120,190,255,.3);background:rgba(255,255,255,.06);color:#fff;font-size:1rem}
#acct .btn,.acb{display:block;width:100%;padding:13px;margin-top:10px;border:0;border-radius:999px;font-weight:800;font-size:.95rem;color:#04140a;background:linear-gradient(180deg,#4ade80,#16a34a);cursor:pointer}
.acb{width:auto;display:inline-block;padding:8px 14px;margin:0;font-size:.78rem}.acb.red{color:#fff;background:linear-gradient(180deg,#ff7a59,#e63b1f)}.acb.gy{color:#fff;background:rgba(255,255,255,.14)}
#acct .lk{display:block;text-align:center;margin-top:12px;color:#7cc4ff;font-size:.82rem;cursor:pointer;background:none;border:0;width:100%}
#acct .er{margin-top:10px;color:#ff9a9a;font-size:.82rem;min-height:1em}#acct .ok{margin-top:10px;color:#4ade80;font-size:.82rem}#acct label{display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:.74rem;color:#9db8d2;line-height:1.4}
.ac-ta{width:100%;box-sizing:border-box;padding:10px;border-radius:12px;border:1px solid var(--ln);background:rgba(255,255,255,.06);color:inherit;font-size:.9rem;font-family:inherit}
.ac-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:.78rem}.ac-it{padding:8px 0;border-top:1px solid var(--ln);font-size:.76rem;line-height:1.45}.ac-it small{display:block;color:var(--mu)}.ac-in{padding:8px;border-radius:10px;border:1px solid var(--ln);background:rgba(255,255,255,.06);color:inherit;width:110px}`;document.head.appendChild(st);
const ov=document.createElement('div');ov.id='acct';document.body.appendChild(ov);
let auth,db,user=null,fb;
const view=(html)=>{ov.hidden=false;ov.innerHTML='<div class="box"><h2>M-ADJ</h2>'+html+'</div>'};
const hide=()=>{ov.hidden=true;ov.innerHTML=''};
const ERR={'auth/invalid-credential':'Adresse ou mot de passe incorrect.','auth/wrong-password':'Adresse ou mot de passe incorrect.','auth/user-not-found':'Adresse ou mot de passe incorrect.','auth/email-already-in-use':'Cette adresse a déjà un compte : connecte-toi.','auth/weak-password':'Mot de passe trop court (6 caractères minimum).','auth/invalid-email':'Adresse e-mail non valide.','auth/too-many-requests':'Trop d\'essais. Réessaie dans quelques minutes.','auth/network-request-failed':'Pas de connexion internet.','auth/operation-not-allowed':'La connexion par e-mail n\'est pas activée dans Firebase.','auth/api-key-not-valid.-please-pass-a-valid-api-key.':'Clé Firebase invalide : vérifie config.js.','permission-denied':'Accès refusé : vérifie les règles de sécurité Firebase.'};
const em=e=>ERR[e&&e.code]||('Erreur : '+((e&&(e.code||e.message))||'inconnue'));
const cmp=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d<0?-1:1}return 0};
const ts=()=>firebase.firestore.FieldValue.serverTimestamp();
const date=t=>{try{return(t&&t.toDate?t.toDate():new Date(t)).toLocaleString('fr-FR',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return'—'}};
const KEEP=['pronos_acct_uid','pronos_mode_v1'];
const wipe=()=>{try{Object.keys(localStorage).filter(k=>k.startsWith('pronos_')&&!KEEP.includes(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}};
const isOwner=()=>user&&OWNER&&String(user.email).toLowerCase()===OWNER;

/* ---------- écrans de connexion ---------- */
function login(msg){view(`<p>Connecte-toi pour utiliser l'application.</p><input id="a-em" type="email" placeholder="Adresse e-mail" autocomplete="email"><input id="a-pw" type="password" placeholder="Mot de passe" autocomplete="current-password"><button class="btn" id="a-go">Se connecter</button><div class="er" id="a-er">${h(msg||'')}</div><button class="lk" id="a-new">Créer un compte</button><button class="lk" id="a-fg">Mot de passe oublié ?</button>`);
$('a-go').onclick=async()=>{const e=$('a-em').value.trim(),p=$('a-pw').value;if(!e||!p){$('a-er').textContent='Remplis les deux champs.';return}$('a-go').disabled=true;try{await auth.signInWithEmailAndPassword(e,p)}catch(x){$('a-er').textContent=em(x);$('a-go').disabled=false}};
$('a-new').onclick=signup;$('a-fg').onclick=reset}
function signup(){view(`<p>Crée ton compte : une adresse e-mail et un mot de passe.</p><input id="a-em" type="email" placeholder="Adresse e-mail" autocomplete="email"><input id="a-pw" type="password" placeholder="Mot de passe (6 caractères minimum)" autocomplete="new-password"><input id="a-p2" type="password" placeholder="Répète le mot de passe" autocomplete="new-password"><label><input type="checkbox" id="a-ok"><span>J'accepte que mon adresse e-mail soit enregistrée pour me connecter, recevoir les mises à jour et que le propriétaire de l'application puisse la voir. Elle n'est jamais vendue.</span></label><button class="btn" id="a-go">Créer mon compte</button><div class="er" id="a-er"></div><button class="lk" id="a-back">J'ai déjà un compte</button>`);
$('a-go').onclick=async()=>{const e=$('a-em').value.trim(),p=$('a-pw').value;if(!e||!p){$('a-er').textContent='Remplis tous les champs.';return}if(p!==$('a-p2').value){$('a-er').textContent='Les deux mots de passe ne sont pas identiques.';return}if(!$('a-ok').checked){$('a-er').textContent='Coche la case pour accepter.';return}
$('a-go').disabled=true;try{const r=await auth.createUserWithEmailAndPassword(e,p);try{await r.user.sendEmailVerification()}catch(x){}}catch(x){$('a-er').textContent=em(x);$('a-go').disabled=false}};
$('a-back').onclick=()=>login()}
function reset(){view(`<p>Entre ton adresse e-mail : tu recevras un lien pour choisir un nouveau mot de passe.</p><input id="a-em" type="email" placeholder="Adresse e-mail"><button class="btn" id="a-go">Envoyer le lien</button><div class="er" id="a-er"></div><button class="lk" id="a-back">Retour</button>`);
$('a-go').onclick=async()=>{const e=$('a-em').value.trim();if(!e){$('a-er').textContent='Entre ton adresse.';return}try{await auth.sendPasswordResetEmail(e);$('a-er').className='ok';$('a-er').textContent='Lien envoyé. Regarde aussi tes courriers indésirables.'}catch(x){$('a-er').textContent=em(x)}};$('a-back').onclick=()=>login()}
function update(need){view(`<p><b>Mise à jour obligatoire.</b><br>Une nouvelle version (${h(need)}) est disponible. Tu utilises la version ${h(VER)}.</p><button class="btn" id="a-up">Mettre à jour maintenant</button><div class="er" id="a-er">Si ce message revient, ferme complètement l'application, attends 2 minutes et rouvre-la.</div>`);
$('a-up').onclick=async()=>{try{if(window.caches){const k=await caches.keys();await Promise.all(k.map(x=>caches.delete(x)))}}catch(e){}location.replace(location.pathname+'?v='+Date.now())}}
const $=id=>document.getElementById(id);

/* ---------- après la connexion ---------- */
async function enter(u){user=u;
const last=localStorage.getItem('pronos_acct_uid');
if(last&&last!==u.uid){wipe();localStorage.setItem('pronos_acct_uid',u.uid);location.reload();return}
localStorage.setItem('pronos_acct_uid',u.uid);
try{const ref=db.collection('users').doc(u.uid),sn=await ref.get();
 if(!sn.exists)await ref.set({email:u.email,createdAt:ts(),lastSeen:ts(),version:VER,emailVerified:!!u.emailVerified});else await ref.update({lastSeen:ts(),version:VER,emailVerified:!!u.emailVerified});
 const cf=await db.collection('config').doc('app').get(),need=cf.exists?cf.data().requiredVersion:null;
 if(need&&cmp(VER,String(need))<0){update(need);return}}catch(e){console.warn('M-ADJ compte :',e)}
hide();window.PRONOS_USER={uid:u.uid,email:u.email,owner:isOwner()};profile()}

/* ---------- onglet Profil ---------- */
async function profile(){const v=document.getElementById('v-u');if(!v||!user)return;
const own=isOwner(),ver=!!user.emailVerified;
v.innerHTML=`<h1 class="pgt">Profil</h1>
<div class="mcard gl"><div class="st" style="margin-top:0">Mon compte</div><div class="ac-row"><span>${h(user.email)}</span><button class="acb gy" id="p-out">Se déconnecter</button></div>
<div class="note" style="margin:8px 0 0">Version de l'application : ${h(VER)}${ver?'':' · adresse non vérifiée'}${ver?'':' <button class="acb gy" id="p-ver" style="margin-left:6px">Renvoyer le lien</button>'}</div></div>
<div class="mcard gl"><div class="st" style="margin-top:0">Tes commentaires</div><div class="note" style="margin:0 0 8px">Dis-nous ce qui va bien, ce qui ne va pas, ou une idée. Le propriétaire reçoit ton message avec ton adresse e-mail.</div>
<textarea class="ac-ta" id="p-fb" rows="5" maxlength="1000" placeholder="Écris ici (1000 lettres maximum)…"></textarea><div class="ac-row"><span id="p-cnt">0 / 1000</span><button class="acb red" id="p-send">Envoyer</button></div><div class="note" id="p-msg" style="margin:6px 0 0"></div></div>
${own?'<div id="p-own"></div>':''}`;
$('p-out').onclick=async()=>{try{await auth.signOut()}catch(e){}wipe();localStorage.removeItem('pronos_acct_uid');location.reload()};
if($('p-ver'))$('p-ver').onclick=async()=>{try{await user.sendEmailVerification();$('p-ver').textContent='Lien envoyé'}catch(e){$('p-ver').textContent=em(e)}};
const fbx=$('p-fb');fbx.oninput=()=>{$('p-cnt').textContent=fbx.value.length+' / 1000'};
$('p-send').onclick=async()=>{const t=fbx.value.trim(),m=$('p-msg');if(!t){m.textContent='Écris d\'abord un message.';return}
const last=+localStorage.getItem('pronos_acct_fb')||0;if(Date.now()-last<30000){m.textContent='Attends quelques secondes avant d\'envoyer un autre message.';return}
$('p-send').disabled=true;try{await db.collection('feedback').add({uid:user.uid,email:user.email,text:t.slice(0,1000),createdAt:ts(),version:VER});localStorage.setItem('pronos_acct_fb',String(Date.now()));fbx.value='';$('p-cnt').textContent='0 / 1000';m.textContent='Merci ! Ton message a été envoyé.'}catch(e){m.textContent=em(e)}$('p-send').disabled=false};
if(own)owner(ver)}

/* ---------- espace propriétaire ---------- */
async function owner(ver){const box=$('p-own');if(!box)return;
if(!ver){box.innerHTML='<div class="mcard gl"><div class="st" style="margin-top:0">Espace propriétaire</div><div class="note" style="margin:0">Vérifie ton adresse e-mail pour ouvrir cet espace : appuie sur « Renvoyer le lien » ci-dessus, ouvre le lien reçu, puis reconnecte-toi.</div></div>';return}
box.innerHTML='<div class="mcard gl"><div class="st" style="margin-top:0">Espace propriétaire</div><div class="note" style="margin:0">Chargement…</div></div>';
try{const [us,fs,cf]=await Promise.all([db.collection('users').orderBy('createdAt','desc').limit(200).get(),db.collection('feedback').orderBy('createdAt','desc').limit(100).get(),db.collection('config').doc('app').get()]);
const U=[],Fb=[];us.forEach(d=>U.push(d.data()));fs.forEach(d=>Fb.push({id:d.id,...d.data()}));const need=cf.exists?cf.data().requiredVersion:'—';
box.innerHTML=`<div class="mcard gl"><div class="st" style="margin-top:0">Espace propriétaire · ${U.length} utilisateur${U.length>1?'s':''}</div>
${U.map(u=>`<div class="ac-it">${h(u.email)}<small>inscrit le ${date(u.createdAt)} · dernière connexion ${date(u.lastSeen)} · version ${h(u.version||'?')}</small></div>`).join('')||'<div class="note">Aucun utilisateur.</div>'}</div>
<div class="mcard gl"><div class="st" style="margin-top:0">Commentaires reçus (${Fb.length})</div>
${Fb.map(f=>`<div class="ac-it"><b>${h(f.email)}</b> · ${date(f.createdAt)}<small>version ${h(f.version||'?')}</small>${h(f.text).replace(/\n/g,'<br>')}<div><button class="acb gy" data-del="${h(f.id)}" style="margin-top:6px">Supprimer</button></div></div>`).join('')||'<div class="note">Aucun commentaire.</div>'}</div>
<div class="mcard gl"><div class="st" style="margin-top:0">Mise à jour obligatoire</div><div class="note" style="margin:0 0 8px">Version requise actuellement : <b>${h(need||'—')}</b>. Les utilisateurs qui ont une version plus ancienne devront mettre à jour à leur connexion.</div>
<div class="ac-row"><input class="ac-in" id="o-ver" value="${h(VER)}"><button class="acb red" id="o-go">Exiger cette version</button></div><div class="note" id="o-msg" style="margin:6px 0 0"></div></div>`;
box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{try{await db.collection('feedback').doc(b.dataset.del).delete();owner(true)}catch(e){b.textContent=em(e)}});
$('o-go').onclick=async()=>{const v=$('o-ver').value.trim();if(!/^\d+(\.\d+)*$/.test(v)){$('o-msg').textContent='Écris une version comme 1.1.0';return}try{await db.collection('config').doc('app').set({requiredVersion:v,updatedAt:ts()});$('o-msg').textContent='Version exigée : '+v;owner(true)}catch(e){$('o-msg').textContent=em(e)}}}
catch(e){box.innerHTML='<div class="mcard gl"><div class="st" style="margin-top:0">Espace propriétaire</div><div class="note" style="margin:0">'+h(em(e))+'</div></div>'}}

/* ---------- démarrage ---------- */
view('<p>Chargement…</p>');
(async()=>{try{if(!window.firebase)for(const u of SDK)await load(u);
firebase.apps&&firebase.apps.length?0:firebase.initializeApp(F);auth=firebase.auth();db=firebase.firestore();
const s0=window.show;if(typeof s0==='function')window.show=function(t){s0(t);if(t==='u'&&user)profile()};
auth.onAuthStateChanged(u=>{if(u)enter(u);else{user=null;login()}})}
catch(e){view('<p>Impossible de joindre le service des comptes.</p><div class="er">'+h(em(e))+'</div><button class="btn" onclick="location.reload()">Réessayer</button>')}})();
})();
