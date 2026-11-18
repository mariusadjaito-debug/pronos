"""Correctif v6 (peut être lancé plusieurs fois) : les ⭐ de NIPER PRO deviennent « les meilleurs pronostics de la journée ».
Au lieu d'un seuil fixe trop sévère, on classe les pronostics NIPER PRO de tous les matchs à venir du jour (probabilité confirmée),
et les meilleurs (environ 15 % des matchs, au moins 1, au plus 6) reçoivent le ⭐."""
import os

if not os.path.exists("smartpick.js"):
    raise SystemExit("smartpick.js introuvable")
s = open("smartpick.js", encoding="utf-8").read()
if "function dayStar(" in s:
    print("smartpick.js : déjà en place")
    raise SystemExit(0)


def rep(o, n):
    global s
    if s.count(o) != 1:
        raise SystemExit("ligne attendue introuvable (" + str(s.count(o)) + ") : " + o[:70])
    s = s.replace(o, n)


rep("if(!sel.length)return null;return{sel,star:sel[0].ev>=.75&&sel[0].margin>=.35?sel[0]:null,q:Q.q}}",
    "if(!sel.length)return null;return{sel,best:sel.reduce((a,b)=>b.pb>a.pb?b:a),star:null,q:Q.q}}")
rep("const CACHE=new Map(),PEND=new Map();",
    """const CACHE=new Map(),PEND=new Map(),DAYC=new Map();
/* ⭐ = les meilleurs pronostics de la journée (classés par probabilité confirmée), pas un seuil fixe */
function dayStar(m,N){let dk;try{dk=String(dOf(m.d))}catch(e){return false}
const ck=dk+'|'+M.length;let L=DAYC.get(ck);
if(!L){L=[];M.forEach(x=>{try{if(String(dOf(x.d))!==dk||stOf(x).s!=='pre')return;const n=niper(x,formStats(x));if(n)L.push({id:x.h+'|'+x.a+'|'+x.d,pb:n.best.pb,ev:n.best.ev})}catch(e){}});
 L.sort((a,b)=>b.pb-a.pb||b.ev-a.ev);DAYC.set(ck,L)}
const k=Math.min(6,Math.max(1,Math.round(L.length*.15))),i=L.findIndex(z=>z.id===m.h+'|'+m.a+'|'+m.d);
return i>=0&&i<k&&N.best.pb>=.78}""")
rep("const ck=key+'|'+m.x+'|'+m.y+'|'+((m.z&&m.z.th&&m.z.th.length)||0);if(CACHE.has(ck))return CACHE.get(ck);",
    "const ck=key+'|'+m.x+'|'+m.y+'|'+M.length+'|'+((m.z&&m.z.th&&m.z.th.length)||0);if(CACHE.has(ck))return CACHE.get(ck);")
rep("const F=formStats(m),N=niper(m,F),o={n:N?nipHTML(N):'',f:F?formHTML(F):''};",
    "const F=formStats(m),N=niper(m,F);if(N&&dayStar(m,N))N.star=N.best;const o={n:N?nipHTML(N):'',f:F?formHTML(F):''};")
rep("const VER=5;", "const VER=6;")
open("smartpick.js", "w", encoding="utf-8").write(s)
print("smartpick.js : ⭐ de la journée appliqués")
