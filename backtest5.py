"""Test n°5 (python backtest5.py) : quelle durée de mémoire pour chaque marché ?
Les vieux matchs perturbent-ils les pronostics ? Pour les buts et chaque statistique (tirs, tirs cadrés, fautes, cartons, corners),
refait les pronostics de matchs passés avec plusieurs durées de mémoire (un match perd la moitié de son poids après N jours),
en n'utilisant que les données connues avant chaque match. Écrit rapport5.txt et calibration_stats.json."""
import json
from datetime import datetime, timedelta, timezone

import backtest as B
import predict as P
import predict2 as V

HLS = (45, 90, 135, 180, 270, 365, 730)
PHI = {"s": 1.1, "c": 1.1, "f": 1.4, "k": 1.1, "r": 1.1}
NAMES = {"x": "buts", "s": "tirs totaux", "c": "tirs cadrés", "f": "fautes", "k": "cartons", "r": "corners"}


def mean(x):
    return sum(x) / len(x)


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
    cols = [("x", "FTHG", "FTAG")] + list(V.STATK)
    loss = {(k, hl): [0.0, 0] for k, _, _ in cols for hl in HLS}
    main = {(k, hl): [] for k, _, _ in cols if k != "x" for hl in HLS}
    for league, hist in hists.items():
        for cd in B.CUTS[::2]:
            cut = now - timedelta(days=cd)
            te = [(d, r) for d, r in hist if cut <= d < cut + timedelta(days=120)]
            for key, hc, ac in cols:
                for hl in HLS:
                    data = []
                    for d, r in hist:
                        a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                        if d < cut and a_ is not None and b_ is not None:
                            data.append((0.5 ** ((cut - d).days / hl), r["HomeTeam"], r["AwayTeam"], a_, b_))
                    if len(data) < 300:
                        continue
                    mh, ma, att, dfn = P.fit(data)
                    for d, r in te:
                        h, a = r["HomeTeam"], r["AwayTeam"]
                        a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                        if h not in att or a not in att or a_ is None or b_ is None:
                            continue
                        x, y = mh * att[h] * dfn[a], ma * att[a] * dfn[h]
                        if key == "x":
                            pr = B.goal_events(x, y, 0.0)
                            ev = B.outcome(a_, b_)
                            loss[(key, hl)][0] += sum(B.ll(pr[e], ev[e]) for e in pr)
                            loss[(key, hl)][1] += 1
                        else:
                            mu = x + y
                            c = []
                            for l in range(max(0, int(mu) - 4), int(mu) + 5):
                                po = 1 - B.nbcdf(mu, PHI[key], int(l + .5))
                                loss[(key, hl)][0] += B.ll(po, a_ + b_ > l + .5) + B.ll(1 - po, a_ + b_ < l + .5)
                                loss[(key, hl)][1] += 2
                                c += [("Plus", l + .5, po, a_ + b_ > l + .5), ("Moins", l + .5, 1 - po, a_ + b_ < l + .5)]
                            sel = B.near(c, .66, .58, .76)
                            if sel:
                                main[(key, hl)].append((sel[2], sel[3]))
    L = ["RAPPORT n°5 : QUELLE DURÉE DE MÉMOIRE ? (les vieux matchs gênent-ils ?)", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), "",
         "Perte moyenne par durée de mémoire (plus bas = mieux). Pour les statistiques : ligne principale, annoncé / réel.", ""]
    best = {}
    for key, _, _ in cols:
        res = {hl: loss[(key, hl)][0] / loss[(key, hl)][1] for hl in HLS if loss[(key, hl)][1] > 200}
        if not res:
            continue
        b = min(res, key=res.get)
        best[key] = b
        L.append(NAMES[key].upper() + f" : meilleure mémoire = {b} jours")
        for hl in HLS:
            if hl in res:
                extra = ""
                if key != "x" and len(main[(key, hl)]) > 100:
                    m_ = main[(key, hl)]
                    extra = f"   ligne principale : annoncé {mean([p for p, _ in m_]) * 100:.0f} %, réel {mean([y for _, y in m_]) * 100:.0f} %"
                L.append(f"   {hl:4d} j : {res[hl]:.4f}" + ("  <= meilleur" if hl == b else "") + extra)
        L.append("")
    json.dump(best, open("calibration_stats.json", "w"))
    open("rapport5.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
