"""Correctif v5 (peut être lancé plusieurs fois sans risque) :
 - smartpick.js : forme offensive / défensive avec 10 matchs à domicile (équipe 1), 10 à l'extérieur (équipe 2) et confrontations directes,
   prévisions en fourchettes de buts, cartons retirés de NIPER PRO, contrôle automatique ✔ / ✘ des pronostics sur les buts
 - predict4.py : les cartons comptent les jaunes ET les rouges (comme les sites)."""
import os
PRED_OLD = "def build4(league, hist, fx, out, now):\n    n0 = len(out)\n"
PRED_NEW = """# cartons = jaunes + rouges (comme sur les sites de résultats)
V.STATK = [(k, "HYR", "AYR") if k == "k" else (k, hc, ac) for k, hc, ac in V.STATK]


def _cartons(hist):
    for _, r in hist:
        for nouv, jaune, rouge in (("HYR", "HY", "HR"), ("AYR", "AY", "AR")):
            j = P.num(r.get(jaune))
            if j is not None:
                r[nouv] = str(j + (P.num(r.get(rouge)) or 0))


def build4(league, hist, fx, out, now):
    _cartons(hist)
    n0 = len(out)
"""
if os.path.exists("predict4.py"):
    p = open("predict4.py", encoding="utf-8").read()
    if "_cartons(hist)" in p:
        print("predict4.py : déjà en place")
    elif p.count(PRED_OLD) == 1:
        open("predict4.py", "w", encoding="utf-8").write(p.replace(PRED_OLD, PRED_NEW))
        print("predict4.py : cartons = jaunes + rouges appliqué")
    else:
        raise SystemExit("predict4.py : ligne attendue introuvable")
if not os.path.exists("smartpick.js"):
    raise SystemExit("smartpick.js introuvable")
s = open("smartpick.js", encoding="utf-8").read()
if "function verdict(" in s:
    print("smartpick.js : déjà en place")
    raise SystemExit(0)
def rep(o,n):
    global s
    assert s.count(o)==1,(s.count(o),o[:70]); s=s.replace(o,n)
i0=s.index("function dist(m,A,B){");i1=s.index("function team(name,P,la){")
s=s[:i0]+r'''function dist(m,tA,tB,tH){const N=9,mod=Array(N+1).fill(0);for(let a=0;a<=N;a++)for(let b=0;b<=N;b++){const t=Math.min(N,a+b);mod[t]+=pmfP(a,m.x)*pmfP(b,m.y)}
const emp=Array(N+1).fill(0);let tw=0;[[tA,1],[tB,1],[tH,1.5]].forEach(([arr,w])=>arr.forEach(v=>{emp[Math.min(N,v)]+=w;tw+=w}));emp.forEach((_,i)=>emp[i]/=tw||1);return mod.map((p,i)=>.5*p+.5*emp[i])}
'''+s[i1:]
i0=s.index("function formStats(m){");i1=s.index("function seg(c){")
s=s[:i0]+r'''function formStats(m){const z=m.z;if(!z)return null;const R=rec(m),GH=(z.gh&&z.gh.length>=5?z.gh:R.A).slice(-10),GA=(z.ga&&z.ga.length>=5?z.ga:R.B).slice(-10),HM=(z.hm||[]).slice(-10),la=(z.sx&&z.sx.la&&z.sx.la.gf)||1.35;
const A=team(m.h,GH,la),B=team(m.a,GA,la);if(!A||!B)return null;const tH=HM.map(x=>x[0]+x[1]);
const D=dist(m,A.tot,B.tot,tH),E=D.reduce((s,p,i)=>s+p*i,0),gt=k=>D.slice(Math.floor(k)+1).reduce((s,p)=>s+p,0);
let sc=0;const vote=(v,w)=>{sc+=v*w};
vote(E>=2.9?1:E<=2.3?-1:0,2);vote(gt(2.5)>=.5?1:gt(2.5)<=.33?-1:0,2);
const m10=av(A.tot.concat(B.tot));vote(m10>=3?1:m10<=2.2?-1:0,1);
const bt=av(A.btts.concat(B.btts).map(v=>v?1:0));vote(bt>=.6?1:bt<=.35?-1:0,1);
vote(A.att>=.1&&B.att>=.1&&A.def<=0&&B.def<=0?1:A.att<=-.1&&B.att<=-.1&&A.def>=.1&&B.def>=.1?-1:0,1);
const sx=z.sx&&z.sx.h&&z.sx.a?z.sx:null,xg=sx&&sx.h.xg&&sx.a.xg?(sx.h.xg[0]+sx.a.xg[1])/2+(sx.a.xg[0]+sx.h.xg[1])/2:null;if(xg!=null)vote(xg>=2.8?1:xg<=2.2?-1:0,1);
const sot=sx&&sx.h.st&&sx.a.st?(sx.h.st[0]+sx.a.st[1])/2+(sx.a.st[0]+sx.h.st[1])/2:null;if(sot!=null)vote(sot>=9.5?1:sot<=7?-1:0,1);
const low=av(A.tot.concat(B.tot).map(v=>v<=1?1:0));vote(low>=.5?-1:low<=.2?1:0,1);
if(tH.length>=4){const hm=av(tH);vote(hm>=3?1:hm<=2.2?-1:0,1)}
const kind=sc>=4?'open':sc<=-4?'closed':'bal',conf=Math.min(1,Math.abs(sc)/7);let txt;
if(kind==='open'){let k=1.5;for(const c of[4.5,3.5,2.5,1.5])if(gt(c)>=.62){k=c;break}txt='Match ouvert : plus de '+String(k).replace('.',',')+' buts ('+Math.round(gt(k)*100)+' %)'}
else if(kind==='closed'){let k=4.5;for(const c of[2.5,3.5,4.5])if(1-gt(c)>=.7){k=c;break}txt='Match fermé : moins de '+String(k).replace('.',',')+' buts ('+Math.round((1-gt(k))*100)+' %)'}
else{let best=null;[[0,2,'0 à 2 buts'],[1,3,'1 à 3 buts'],[2,4,'2 à 4 buts']].forEach(([a,b,l])=>{const c=D.slice(a,b+1).reduce((s,p)=>s+p,0);if(!best||c>best.c)best={l,c}});txt='Match équilibré : '+best.l+' ('+Math.round(best.c*100)+' %)'}
return{A,B,kind,conf,txt,E,sc}}
'''+s[i1:]
rep("_mo.rowsOf(m).forEach(r=>{const s=statChoice(m,r);if(!s||s.p<.64)return;","_mo.rowsOf(m).forEach(r=>{const s=statChoice(m,r);if(!s||s.p<.64||s.k==='k')return;")
rep('return `<div class="nip-r"><strong>${N.star===c?\'⭐ \':\'\'}${c.t}</strong>','return `<div class="nip-r" data-t="${c.t.replace(/"/g,\'&quot;\')}"><strong>${N.star===c?\'⭐ \':\'\'}${c.t}</strong>')
V=r'''function verdict(){document.querySelectorAll('.nip[data-cl=nip] .nip-r[data-t]:not([data-v])').forEach(r=>{const c=ctx(r);if(!c||!c.entry)return;const cur=M.find(x=>idOf(x)===c.entry.id);if(!cur)return;let o;try{o=stOf(cur)}catch(e){return}
 if(!o||o.s!=='fin'||o.est||!o.g||o.g[0]==null||o.g[1]==null)return;r.dataset.v='1';const h=hit(r.dataset.t,c.m,+o.g[0],+o.g[1]),b=r.querySelector('b');
 if(h===null){b.insertAdjacentHTML('afterend','<span class="nip-v" style="font-size:.7rem;opacity:.7">à vérifier</span>');return}
 b.insertAdjacentHTML('afterend','<span class="nip-v" style="font-weight:800;color:'+(h?'#4ade80':'#ff6b6b')+'">'+(h?'✔ réussi':'✘ perdu')+' · '+o.g[0]+'-'+o.g[1]+'</span>')})}
function clean(){'''
rep("function clean(){",V)
rep("function enh(){if(busy)return;busy=1;try{clean();","function enh(){if(busy)return;busy=1;try{clean();verdict();")
open('smartpick.js','w',encoding='utf-8').write(s)
print('smartpick.js : forme à domicile / extérieur, fourchettes de buts et contrôle automatique appliqués')
