"""Correctif du fichier moteur.js (peut être lancé plusieurs fois sans risque) :
 - pronostics IA et coupons plafonnés à 80 % (cote juste d'au moins 1,25), plus de « plus de 0,5 but » comme pronostic IA
 - cote juste affichée à côté de chaque pourcentage
 - texte « éléments pris en compte » fidèle au modèle de base (tous les matchs récents, domicile et extérieur ensemble)."""
s = open("moteur.js", encoding="utf-8").read()
CHANGES = [
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
]
fait, deja, manque = 0, 0, []
for old, new in CHANGES:
    if s.count(old) == 1:
        s = s.replace(old, new)
        fait += 1
    elif s.count(new) == 1:
        deja += 1
    else:
        manque.append(old[:60])
if manque:
    raise SystemExit("Correctif impossible, lignes introuvables : " + " | ".join(manque))
open("moteur.js", "w", encoding="utf-8").write(s)
print(f"Correctif : {fait} modification(s) appliquée(s), {deja} déjà en place")
