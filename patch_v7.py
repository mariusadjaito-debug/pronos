"""Correctif v7 (peut être lancé plusieurs fois) :
 - predict4.py : le calcul des buts utilise une mémoire d'environ 2 ans (770 jours, oubli lent de 240 jours), comme le test n°9 le recommande
 - smartpick.js : l'analyse affiche la « fourchette de buts » sous les 3 scores probables (la correction des petits scores existait déjà)."""
import os


def remplacer(texte, ancien, nouveau, nom):
    if texte.count(ancien) != 1:
        raise SystemExit(nom + " : ligne attendue introuvable (" + str(texte.count(ancien)) + ") : " + ancien[:70])
    return texte.replace(ancien, nouveau)


if os.path.exists("predict4.py"):
    p = open("predict4.py", encoding="utf-8").read()
    if "GOAL_DAYS" in p:
        print("predict4.py : déjà en place")
    else:
        p = remplacer(p, "_fit = P.fit\n", "_fit = P.fit\nGOAL_DAYS, GOAL_HL = 770, 240  # buts : environ 80 matchs par équipe, oubli lent (test n°9)\n", "predict4.py")
        p = remplacer(p, '''    data = [(0.5 ** ((now - d).days / P.HALF_LIFE), r["HomeTeam"], r["AwayTeam"], P.num(r["FTHG"]), P.num(r["FTAG"]))
            for d, r in hist if P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
    if not new or len(data) < 50:
        return
    mh, ma, att, dfn = P.fit(data)
''', '''    data = [(0.5 ** ((now - d).days / GOAL_HL), r["HomeTeam"], r["AwayTeam"], P.num(r["FTHG"]), P.num(r["FTAG"]))
            for d, r in hist if P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None and (now - d).days <= GOAL_DAYS]
    if not new or len(data) < 50:
        return
    mh, ma, att, dfn = _fit(data)
''', "predict4.py")
        open("predict4.py", "w", encoding="utf-8").write(p)
        print("predict4.py : mémoire de 770 jours pour les buts appliquée")
else:
    print("predict4.py absent : ignoré")
if not os.path.exists("smartpick.js"):
    raise SystemExit("smartpick.js introuvable")
s = open("smartpick.js", encoding="utf-8").read()
if "function fourchette(" in s:
    print("smartpick.js : déjà en place")
    raise SystemExit(0)
s = remplacer(s, "function joint(m,t1,t2){", r'''/* grille de scores avec la même correction des petits scores (Dixon-Coles) que l'analyse */
const RHOS=-.06;
function gridDC(x,y,N){const G=[];let s=0;for(let i=0;i<=N;i++){G[i]=[];for(let j=0;j<=N;j++){let p=pmf(i,x)*pmf(j,y);if(i<2&&j<2)p*=i===0&&j===0?1-x*y*RHOS:i===0&&j===1?1+x*RHOS:i===1&&j===0?1+y*RHOS:1-RHOS;G[i][j]=p;s+=p}}for(let i=0;i<=N;i++)for(let j=0;j<=N;j++)G[i][j]/=s;return G}
/* fourchette de buts : le plus petit intervalle de buts totaux qui couvre au moins 70 % des cas */
function fourchette(m){if(!(m.x>0&&m.y>0))return null;const G=gridDC(m.x,m.y,9),T=Array(10).fill(0);for(let i=0;i<=9;i++)for(let j=0;j<=9;j++)if(i+j<=9)T[i+j]+=G[i][j];
let best=null;for(let a=0;a<=7;a++)for(let b=a;b<=8;b++){const c=T.slice(a,b+1).reduce((u,v)=>u+v,0);if(c>=.7&&(!best||b-a<best.b-best.a||(b-a===best.b-best.a&&c>best.c)))best={a,b,c}}
return best?(best.a===best.b?best.a+' but'+(best.a>1?'s':''):best.a+' à '+best.b+' buts')+' · '+Math.round(best.c*100)+' %':null}
function joint(m,t1,t2){''', "smartpick.js")
s = remplacer(s, "root.dataset.nipd='1';const m=c.m,mk=c.key;", r'''root.dataset.nipd='1';const m=c.m,mk=c.key;
 const sr=[...root.querySelectorAll('.mr')].find(e=>/3 scores probables/.test(e.textContent));
 if(sr&&!(sr.nextElementSibling&&sr.nextElementSibling.dataset.fch)){const f=fourchette(m);if(f){const d0=document.createElement('div');d0.className='mr';d0.dataset.fch='1';d0.innerHTML='<span>Fourchette de buts</span><span>'+f+'</span>';sr.after(d0)}}''', "smartpick.js")
open("smartpick.js", "w", encoding="utf-8").write(s)
print("smartpick.js : fourchette de buts appliquée")
