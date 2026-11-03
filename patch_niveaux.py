"""Niveaux de couleur (peut être lancé plusieurs fois sans risque) :
 Très sûr : 80 % et plus (vert) · Sûr : 60 à 79 % (bleu) · Modéré : 50 à 59 % (jaune) · Faible : moins de 50 % (rouge).
Met à jour moteur.js, live.js, plus.js et index.html, quelle que soit leur version actuelle."""
import os


def appliquer(fichier, changes):
    if not os.path.exists(fichier):
        print(fichier, ": absent, ignoré")
        return
    s = open(fichier, encoding="utf-8").read()
    fait, deja, manque = 0, 0, []
    for olds, new in changes:
        if new in s:
            deja += 1
            continue
        for old in olds:
            if s.count(old) == 1:
                s = s.replace(old, new)
                fait += 1
                break
        else:
            manque.append(olds[0][:70])
    if manque:
        raise SystemExit(fichier + " : changement impossible, lignes introuvables : " + " | ".join(manque))
    open(fichier, "w", encoding="utf-8").write(s)
    print(f"{fichier} : {fait} modification(s) appliquée(s), {deja} déjà en place")


L2 = "const lv2=p=>{p=Math.round(p*100)/100;return "
appliquer("moteur.js", [
    ([L2 + "p>=.75?['ok','Très sûr']:p>=.65?['lm','Sûr']:p>=.55?['mid','Modéré']:['bad','Faible']};",
      L2 + "p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:['mid','Modéré']};"],
     L2 + "p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:p>=.5?['mid','Modéré']:['bad','Faible']};"),
    (["'<span class=\"ok\">Très sûr · 75 % et +</span><span class=\"lm\">Sûr · 65 à 74 %</span><span class=\"mid\">Modéré · 55 à 64 %</span><span class=\"bad\">Faible · moins de 55 %</span>'",
      "'<span class=\"ok\">Très sûr · 80 % et +</span><span class=\"lm\">Sûr · 60 à 79 %</span><span class=\"mid\">Modéré · moins de 60 %</span>'"],
     "'<span class=\"ok\">Très sûr · 80 % et +</span><span class=\"lm\">Sûr · 60 à 79 %</span><span class=\"mid\">Modéré · 50 à 59 %</span><span class=\"bad\">Faible · moins de 50 %</span>'"),
])
appliquer("live.js", [
    (["const lvl=p=>p>=.75?['ok','Très sûr']:p>=.65?['lm','Sûr']:p>=.55?['mid','Modéré']:['bad','Faible']",
      "const lvl=p=>p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:['mid','Modéré']"],
     "const lvl=p=>p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:p>=.5?['mid','Modéré']:['bad','Faible']"),
])
appliquer("plus.js", [
    (["const lvl=p=>p>=.75?['Très sûr','ok']:p>=.65?['Sûr','lm']:p>=.55?['Modéré','mid']:['Faible','bad']",
      "const lvl=p=>p>=.8?['Très sûr','ok']:p>=.6?['Sûr','lm']:['Modéré','mid']"],
     "const lvl=p=>p>=.8?['Très sûr','ok']:p>=.6?['Sûr','lm']:p>=.5?['Modéré','mid']:['Faible','bad']"),
])
appliquer("index.html", [
    (["const lv=p=>{p=Math.round(p*100)/100;return p>=.7?['ok','Très sûr']:p>=.6?['ok','Sûr']:p>=.52?['mid','Moyen']:['bad','Faible']};",
      "const lv=p=>{p=Math.round(p*100)/100;return p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:['mid','Modéré']};"],
     "const lv=p=>{p=Math.round(p*100)/100;return p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:p>=.5?['mid','Modéré']:['bad','Faible']};"),
])
