"""Correctif de moteur.js et live.js (peut être lancé plusieurs fois sans risque) :
 - pronostics IA et coupons plafonnés à 80 % (cote juste d'au moins 1,25) ; cote juste affichée partout, statistiques comprises
 - ⭐ sur les pronostics « à combiner » de TOUS les marchés (résultat, double chance, handicap, buts, fautes, tirs, cartons, corners) :
   confirmés par les 20 derniers matchs de chaque équipe (et les confrontations directes), avec une cote utilisable ;
   le pourcentage élevé seul ne suffit pas
 - coupons : les pronostics ⭐ passent en premier
 - championnats sans statistiques réelles : « Statistiques attendues indisponibles » à la place du tableau rouge."""
import os


def appliquer(fichier, changes):
    if not os.path.exists(fichier):
        print(fichier, ": absent, ignoré")
        return
    s = open(fichier, encoding="utf-8").read()
    fait, deja, manque = 0, 0, []
    for old, new in changes:
        if new in s:
            deja += 1
        elif s.count(old) == 1:
            s = s.replace(old, new)
            fait += 1
        else:
            manque.append(old[:70])
    if manque:
        raise SystemExit(fichier + " : correctif impossible, lignes introuvables : " + " | ".join(manque))
    open(fichier, "w", encoding="utf-8").write(s)
    print(f"{fichier} : {fait} modification(s) appliquée(s), {deja} déjà en place")


STAR = r"""const fl=s=>parseFloat(String(s).replace(',','.'));
function hit(t,m,a,b){let r;
if(t==='Victoire '+m.h+' (V1)')return a>b;if(t==='Victoire '+m.a+' (V2)')return b>a;if(t==='Match nul (X)')return a===b;
if(r=t.match(/^(Plus|Moins) de ([\d,]+) buts$/))return r[1]==='Plus'?a+b>fl(r[2]):a+b<fl(r[2]);
if(t==='Les deux marquent : oui')return a>0&&b>0;if(t==='Les deux marquent : non')return!(a>0&&b>0);
if(t==='Double chance : '+m.h+' ou nul')return a>=b;if(t==='Double chance : nul ou '+m.a)return b>=a;if(t==='Double chance : '+m.h+' ou '+m.a)return a!==b;
if(r=t.match(/^Handicap (.+) ([+-])([\d,]+)$/)){const k=fl(r[3])*(r[2]==='-'?-1:1),d=r[1]===m.h?a-b:b-a;return d+k>0}
if(r=t.match(/^(.+) : (plus|moins) de ([\d,]+) buts?$/)){const g=r[1]===m.h?a:r[1]===m.a?b:null;if(g==null)return null;return r[2]==='plus'?g>fl(r[3]):g<fl(r[3])}
return null}
const STN={'Cart.':'k','Corn.':'r','Tirs cadrés':'c','Tirs totaux':'s','Fautes':'f'};
/* ⭐ pronostic à combiner : confirmé par les 20 derniers matchs de CHAQUE équipe (domicile et extérieur confondus) et par les
   confrontations directes quand elles existent, avec une cote utilisable (1,35 à 2,20). Le pourcentage élevé seul ne suffit pas. */
function starOf(m,t,p){if(!m.z||p<.45||p>.74)return false;let A,B,H=null;
const sm=t.match(/^(Cart\.|Corn\.|Tirs cadrés|Tirs totaux|Fautes) : (plus|moins) de ([\d,]+)$/);
if(sm){const k=STN[sm[1]],z=(m.z.ts&&m.z.ts[k])||m.z[k];if(!z)return false;const l=fl(sm[3]),f=v=>sm[2]==='plus'?v>l:v<l;A=z[0].map(f);B=z[1].map(f)}
else{const th=m.z.th||m.z.gh,ta=m.z.ta||m.z.ga;if(!th||!ta)return false;A=th.map(x=>hit(t,m,x[0],x[1]));B=ta.map(x=>hit(t,m,x[1],x[0]));if(A.includes(null))return false;
const hm=m.z.hm;if(hm&&hm.length>=4)H=hm.map(x=>hit(t,m,x[0],x[1]))}
if(A.length<8||B.length<8)return false;const q=a=>a.filter(Boolean).length/a.length;
return q(A)>=.6&&q(B)>=.6&&q(A.concat(B))>=p-.03&&(H===null||q(H)>=.5)}
"""

MOTEUR = [
    ("const chip2=p=>{const [c,t]=lv2(p);return `<span class=\"b ${c}\">${P(p)} · ${t}</span>`};",
     "const fo=p=>(1/p).toFixed(2).replace('.',',');\nconst chip2=p=>{const [c,t]=lv2(p);return `<span class=\"b ${c}\">${P(p)} · ${t} · cote ${fo(p)}</span>`};"),
    ("Fn.h,1,.97,'r')", "Fn.h,1,.80,'r')"), ("Fn.d,1,.97,'r')", "Fn.d,1,.80,'r')"), ("Fn.a,1,.97,'r')", "Fn.a,1,.80,'r')"),
    ("g.main.p,.95,.93,'g')", "g.main.p,.95,.80,'g')"), ("g.safe.p,.75,.86,'g')", "g.safe.p,.75,.80,'g')"),
    ("Math.max(bp,1-bp),.92,.93,'b')", "Math.max(bp,1-bp),.92,.80,'b')"),
    ("Math.max(Fn.h+Fn.d,Fn.d+Fn.a,Fn.h+Fn.a),.6,.85,'d')", "Math.max(Fn.h+Fn.d,Fn.d+Fn.a,Fn.h+Fn.a),.6,.80,'d')"),
    ("hcap(m,Fn).forEach(x=>add(x.t,x.p,.7,.88,'h'));teamG(m,Fn,R.live).forEach(x=>add(x.t,x.p,.88,.9,'t'));",
     "hcap(m,Fn).forEach(x=>add(x.t,x.p,.7,.80,'h'));teamG(m,Fn,R.live).forEach(x=>{if(!/plus de 0,5 but/.test(x.t))add(x.t,x.p,.88,.80,'t')});"),
    ("r.mn.p,.72,.93,'s')", "r.mn.p,.72,.80,'s')"), ("r.sf.p,.55,.86,'s')", "r.sf.p,.55,.80,'s')"),
    ("<div class=\"as\">Choisi parmi ${A.n} marchés selon leur fiabilité",
     "<div class=\"as\">Cote juste ${fo(b.p)} : ne parie que si ton bookmaker offre plus · choisi parmi ${A.n} marchés selon leur fiabilité"),
    ("modèle : forces d\\'attaque et de défense, forme (6 derniers matchs), domicile / extérieur (15 derniers), confrontations directes",
     "modèle de base : tous les matchs récents des deux équipes (domicile et extérieur ensemble), les plus récents comptant davantage'+(f&&f.nm?' ('+f.nm[0]+' et '+f.nm[1]+' matchs analysés)':'')+'"),
    ("Forme (5 derniers) : <b>", "Forme (5 derniers, indicatif) : <b>"),
    ("Confrontations directes${HIER?'':' depuis 2021'} : ", "Confrontations directes (indicatif)${HIER?'':' depuis 2021'} : "),
    ("const nearT=(c,t,lo,hi)=>", STAR + "const nearT=(c,t,lo,hi)=>"),
    ("L.push({t,p,s:.5+(p-.5)*w,k})", "L.push({t,p,s:.5+(p-.5)*w,k,star:!R.live&&starOf(m,t,p)})"),
    ("g.main.p],['Plus sûr : '", "g.main.p,g.main.side+' de '+fm(g.main.line)+' buts'],['Plus sûr : '"),
    ("+' buts',g.safe.p],[(o25", "+' buts',g.safe.p,g.safe.side+' de '+fm(g.safe.line)+' buts'],[(o25"),
    ("Math.max(o25,1-o25)],['Les deux marquent", "Math.max(o25,1-o25),(o25>=.5?'Plus':'Moins')+' de 2,5 buts'],['Les deux marquent"),
    ("Math.max(bp,1-bp)],['Double chance : '+dc[0],dc[1]],...hc.map(x=>[x.t,x.p]),...tg.map(x=>[x.t,x.p])]",
     "Math.max(bp,1-bp),'Les deux marquent : '+(bp>=.5?'oui':'non')],['Double chance : '+dc[0],dc[1],'Double chance : '+dc[0].replace(/^Nul/,'nul')],...hc.map(x=>[x.t,x.p,x.t]),...tg.map(x=>[x.t,x.p,x.t])]"),
    ("const mk=([n,p])=>", "const mk=([n,p,t])=>"),
    ("<span>${n}</span><span>${chip2(p)}</span></div>`;", "<span>${t&&starOf(m,t,p)?'⭐ ':''}${n}</span><span>${chip2(p)}</span></div>`;"),
    ("${r.mn.side} de ${fm(r.mn.line)}${r.es?", "${starOf(m,r.d.n+' : '+r.mn.side.toLowerCase()+' de '+fm(r.mn.line),r.mn.p)?'⭐ ':''}${r.mn.side} de ${fm(r.mn.line)}${r.es?"),
    ("<small>${Math.round(r.mn.p*100)} % · ${lv2(r.mn.p)[1]}</small>", "<small>${Math.round(r.mn.p*100)} % · ${lv2(r.mn.p)[1]} · cote ${fo(r.mn.p)}</small>"),
    ("\">Plus sûr : ${r.sf.side.toLowerCase()} de ${fm(r.sf.line)} · ${Math.round(r.sf.p*100)} %</span>",
     "\">${starOf(m,r.d.n+' : '+r.sf.side.toLowerCase()+' de '+fm(r.sf.line),r.sf.p)?'⭐ ':''}Plus sûr : ${r.sf.side.toLowerCase()} de ${fm(r.sf.line)} · ${Math.round(r.sf.p*100)} % · cote ${fo(r.sf.p)}</span>"),
    ("c:allPicks(m).all.slice(0,8)", "c:(A=>A.all.filter(x=>x.star).concat(A.all.filter(x=>!x.star)).slice(0,8))(allPicks(m))"),
    ("return h+`<div class=\"stx\"><div class=\"st\">Statistiques attendues · du plus sûr au plus faible</div>",
     "if(rr.every(r=>r.es))return h+'<div class=\"note\" style=\"margin:14px 0 0;text-align:center\">📊 Statistiques attendues indisponibles pour ce championnat : aucune donnée réelle.</div>';return h+`<div class=\"stx\"><div class=\"st\">Statistiques attendues · du plus sûr au plus faible</div>"),
    ("<div class=\"st\">Marchés · du plus sûr au plus faible</div><div class=\"mkt\">",
     "<div class=\"st\">Marchés · du plus sûr au plus faible</div><div class=\"note\" style=\"margin:0 0 8px\">⭐ = pronostic à combiner : confirmé par les 20 derniers matchs de chaque équipe (et les confrontations directes), avec une cote utilisable (1,35 à 2,20). Un pourcentage élevé seul ne suffit pas.</div><div class=\"mkt\">"),
]
LIVE = [
    ("return `<div class=\"st\">${any?", "if(!any&&rows.every(x=>x.r.es&&m.se!=='nat'))return '<div class=\"note\" style=\"margin:10px 0 0;text-align:center\">📊 Statistiques en direct indisponibles pour ce championnat : aucune donnée réelle.</div>';return `<div class=\"st\">${any?"),
]
appliquer("moteur.js", MOTEUR)
appliquer("live.js", LIVE)
