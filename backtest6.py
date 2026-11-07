"""Test n°6 (python backtest6.py) : la ligne unique choisie pour chaque statistique et son pourcentage sont-ils justes ?
Refait, sur des matchs passés et avec les seules données connues avant chaque match, le choix de l'application :
  ligne = celle où le calcul ET les 10 et 30 derniers matchs de chaque équipe sont le mieux d'accord (maillon le plus faible),
  pourcentage affiché = mélange du calcul et des matchs récents des deux équipes (séparées),
  niveaux : Très sûr (80 % et plus), Sûr (60 à 79 %), Modéré (50 à 59 %), Faible (moins de 50 %).
Compare l'annoncé et le réel, et la règle précédente (ligne vers 66 %). Écrit rapport6.txt."""
import bisect
from datetime import datetime, timedelta, timezone

import backtest as B
import predict as P
import predict2 as V

PHI = {"k": 1.15, "r": 1.3, "c": 1.3, "s": 1.45, "f": 1.2}
NAMES = {"s": "tirs totaux", "c": "tirs cadrés", "f": "fautes", "k": "cartons", "r": "corners"}
RNG = {"c": (6.5, 11.5), "s": (20.5, 30.5), "f": (20.5, 30.5), "k": (2.5, 6.5), "r": (7.5, 12.5)}
HL, MAX_DAYS = 180, 365


def mean(x):
    return sum(x) / len(x)


def niveau(p):
    return "Très sûr" if p >= .8 else "Sûr" if p >= .6 else "Modéré" if p >= .5 else "Faible"


def run():
    now = datetime.now(timezone.utc)
    hists = {}
    for league, (div, code) in P.LEAGUES.items():
        try:
            h = P.load_history(div)
            if len(h) > 600:
                hists[league] = sorted(h, key=lambda z: z[0])
        except Exception as e:
            print("  ! historique", league, e)
    seuil = 0.5 ** (MAX_DAYS / HL)
    res = {k: {"new": [], "old": []} for k in NAMES}
    for league, hist in hists.items():
        for key, hc, ac in V.STATK:
            byteam, dates = {}, {}
            for d, r in hist:
                a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                if a_ is None or b_ is None:
                    continue
                for t in (r["HomeTeam"], r["AwayTeam"]):
                    byteam.setdefault(t, []).append((d, a_ + b_))
                    dates.setdefault(t, []).append(d)

            def last(t, d, n):
                i = bisect.bisect_left(dates.get(t, []), d)
                return [v for _, v in byteam.get(t, [])[max(0, i - n):i]]
            for cd in B.CUTS[::2]:
                cut = now - timedelta(days=cd)
                data = []
                for d, r in hist:
                    a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                    w = 0.5 ** ((cut - d).days / HL)
                    if d < cut and a_ is not None and b_ is not None and w >= seuil:
                        data.append((w, r["HomeTeam"], r["AwayTeam"], a_, b_))
                if len(data) < 150:
                    continue
                mh, ma, att, dfn = P.fit(data)
                for d, r in hist:
                    if not (cut <= d < cut + timedelta(days=120)):
                        continue
                    h, a = r["HomeTeam"], r["AwayTeam"]
                    a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                    if h not in att or a not in att or a_ is None or b_ is None:
                        continue
                    A30, B30 = last(h, d, 30), last(a, d, 30)
                    if len(A30) < 10 or len(B30) < 10:
                        continue
                    mu = mh * att[h] * dfn[a] + ma * att[a] * dfn[h]
                    tot = a_ + b_
                    cand = []
                    for l in range(max(0, int(mu) - 4), int(mu) + 5):
                        line = l + .5
                        if not RNG[key][0] <= line <= RNG[key][1]:
                            continue
                        u = B.nbcdf(mu, PHI[key], int(line))
                        for side, p, ok in (("Plus", 1 - u, tot > line), ("Moins", u, tot < line)):
                            f = (lambda v: v > line) if side == "Plus" else (lambda v: v < line)
                            fA = (mean([f(v) for v in A30[-10:]]) + mean([f(v) for v in A30])) / 2
                            fB = (mean([f(v) for v in B30[-10:]]) + mean([f(v) for v in B30])) / 2
                            cand.append((p, ok, fA, fB))
                    ok_ = [c for c in cand if .45 <= c[0] <= .82]
                    if not ok_:
                        continue
                    best = max(ok_, key=lambda c: (min(c[0], c[2], c[3]), c[0]))
                    res[key]["new"].append((best[0], (2 * best[0] + best[2] + best[3]) / 4, best[1]))
                    old = B.near([(None, None, c[0], c[1]) for c in cand], .66, .58, .76)
                    if old:
                        res[key]["old"].append((old[2], old[3]))
    L = ["RAPPORT n°6 : LIGNE UNIQUE ET POURCENTAGE DES STATISTIQUES", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), "",
         "'calcul' = pourcentage du calcul seul, 'affiché' = pourcentage mélangé calcul + matchs récents, 'réel' = part réellement validée.", ""]
    tous = []
    for key, v in res.items():
        n, o = v["new"], v["old"]
        if len(n) < 50:
            continue
        tous += n
        L.append(f"{NAMES[key].upper()} : {len(n)} pronostics | nouvelle règle : calcul {mean([p for p, _, _ in n]) * 100:.0f} %, affiché {mean([q for _, q, _ in n]) * 100:.0f} %, réel {mean([y for _, _, y in n]) * 100:.0f} %"
                 + (f" | ancienne règle (ligne vers 66 %) : annoncé {mean([p for p, _ in o]) * 100:.0f} %, réel {mean([y for _, y in o]) * 100:.0f} %" if len(o) >= 50 else ""))
    if tous:
        L += ["", "Niveaux affichés, toutes statistiques réunies (annoncé = pourcentage affiché) :"]
        bad = 0
        for nom in ("Très sûr", "Sûr", "Modéré", "Faible"):
            g = [(q, y) for _, q, y in tous if niveau(q) == nom]
            if len(g) >= 30:
                a_, r_ = mean([q for q, _ in g]), mean([y for _, y in g])
                bad += r_ < a_ - .03
                L.append(f"   {nom} : {len(g)} pronostics, annoncé {a_ * 100:.0f} %, réel {r_ * 100:.0f} %")
        L += ["", "Verdict : " + ("les pourcentages affichés sont trop optimistes sur au moins un niveau : à corriger" if bad else "les pourcentages affichés sont honnêtes (réel proche de l'annoncé ou meilleur)")]
    open("rapport6.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
