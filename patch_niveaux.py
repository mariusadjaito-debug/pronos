"""Nouveaux niveaux de couleur (peut être lancé plusieurs fois sans risque) :
 Très sûr : 80 % et plus (vert) · Sûr : 60 à 79 % (bleu) · Modéré : moins de 60 % (jaune).
Met à jour moteur.js, live.js, plus.js et index.html."""
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
        raise SystemExit(fichier + " : changement impossible, lignes introuvables : " + " | ".join(manque))
    open(fichier, "w", encoding="utf-8").write(s)
    print(f"{fichier} : {fait} modification(s) appliquée(s), {deja} déjà en place")


appliquer("moteur.js", [
    ("const lv2=p=>{p=Math.round(p*100)/100;return p>=.75?['ok','Très sûr']:p>=.65?['lm','Sûr']:p>=.55?['mid','Modéré']:['bad','Faible']};",
     "const lv2=p=>{p=Math.round(p*100)/100;return p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:['mid','Modéré']};"),
    ("'<span class=\"ok\">Très sûr · 75 % et +</span><span class=\"lm\">Sûr · 65 à 74 %</span><span class=\"mid\">Modéré · 55 à 64 %</span><span class=\"bad\">Faible · moins de 55 %</span>'",
     "'<span class=\"ok\">Très sûr · 80 % et +</span><span class=\"lm\">Sûr · 60 à 79 %</span><span class=\"mid\">Modéré · moins de 60 %</span>'"),
])
appliquer("live.js", [
    ("const lvl=p=>p>=.75?['ok','Très sûr']:p>=.65?['lm','Sûr']:p>=.55?['mid','Modéré']:['bad','Faible']",
     "const lvl=p=>p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:['mid','Modéré']"),
])
appliquer("plus.js", [
    ("const lvl=p=>p>=.75?['Très sûr','ok']:p>=.65?['Sûr','lm']:p>=.55?['Modéré','mid']:['Faible','bad']",
     "const lvl=p=>p>=.8?['Très sûr','ok']:p>=.6?['Sûr','lm']:['Modéré','mid']"),
])
appliquer("index.html", [
    ("const lv=p=>{p=Math.round(p*100)/100;return p>=.7?['ok','Très sûr']:p>=.6?['ok','Sûr']:p>=.52?['mid','Moyen']:['bad','Faible']};",
     "const lv=p=>{p=Math.round(p*100)/100;return p>=.8?['ok','Très sûr']:p>=.6?['lm','Sûr']:['mid','Modéré']};"),
])
