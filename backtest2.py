"""Test n°2 (python backtest2.py) : le modèle complet de l'application fait-il mieux que le modèle de base ?
Compare, sur des matchs passés et avec les seules données connues avant chaque match :
  base   = forces d'attaque / défense seules
  hier   = base + forme + domicile/extérieur + confrontations (modèle d'hier)
  pro    = hier + modèle Elo + fatigue (modèle actuel de l'application)
Écrit rapport2.txt."""
from datetime import datetime, timedelta, timezone

import backtest as B
import predict as P
import predict2 as V
import predict3 as V3


def run():
    now = datetime.now(timezone.utc)
    V._previous = lambda: []
    hists = {}
    for league, (div, code) in P.LEAGUES.items():
        try:
            h = P.load_history(div)
            if len(h) > 600:
                hists[league] = h
        except Exception as e:
            print("  ! historique", league, e)
    names = ("base", "hier", "pro")
    loss = {(n, s): [0.0, 0] for n in names for s in (0.0, 0.3)}
    for league, hist in hists.items():
        for cd in range(420, 30, -30):
            cut = now - timedelta(days=cd)
            tr = [(d, r) for d, r in hist if d < cut]
            te = [(d, r) for d, r in hist if cut <= d < cut + timedelta(days=7)]
            if len(tr) < 500 or not te:
                continue
            fx = [{"d": d.strftime("%Y-%m-%dT%H:%M:%SZ"), "h": r["HomeTeam"], "a": r["AwayTeam"], "hs": r["HomeTeam"], "as": r["AwayTeam"]} for d, r in te]
            data = [(0.5 ** ((cut - d).days / P.HALF_LIFE), r["HomeTeam"], r["AwayTeam"], P.num(r["FTHG"]), P.num(r["FTAG"]))
                    for d, r in tr if P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
            mh, ma, att, dfn = P.fit(data)
            o2, o3 = [], []
            try:
                V.build2(league, tr, fx, o2, cut)
                V3.build3(league, tr, fx, o3, cut)
            except Exception as e:
                print("  ! calcul", league, cd, str(e)[:80])
                continue
            i2 = {(e["h"], e["a"], e["d"]): e for e in o2 if "f" in e}
            i3 = {(e["h"], e["a"], e["d"]): e for e in o3 if "f" in e}
            for (d, r), f in zip(te, fx):
                k = (f["hs"], f["as"], f["d"])
                h, a = r["HomeTeam"], r["AwayTeam"]
                hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
                if h not in att or a not in att or k not in i2 or k not in i3 or hg is None or ag is None:
                    continue
                ev = B.outcome(hg, ag)
                xy = {"base": (mh * att[h] * dfn[a], ma * att[a] * dfn[h]), "hier": (i2[k]["x"], i2[k]["y"]), "pro": (i3[k]["x"], i3[k]["y"])}
                for n in names:
                    for s in (0.0, 0.3):
                        pr = B.goal_events(xy[n][0], xy[n][1], s)
                        loss[(n, s)][0] += sum(B.ll(pr[e], ev[e]) for e in pr)
                        loss[(n, s)][1] += 1
    L = ["RAPPORT n°2 : MODÈLE COMPLET OU MODÈLE DE BASE ?", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), "",
         f"Matchs comparés : {loss[('base', 0.0)][1]} (perte moyenne, plus bas = mieux)", ""]
    res = {k: v[0] / v[1] for k, v in loss.items() if v[1]}
    for (n, s), v in sorted(res.items(), key=lambda kv: kv[1]):
        L.append(f"   {n:5s} incertitude {s} : {v:.4f}")
    if res:
        b = res[("base", 0.3)]
        L += ["", "Lecture :"]
        for n, lab in (("hier", "les ajustements d'hier (forme, domicile/extérieur, confrontations)"), ("pro", "le modèle actuel (hier + Elo + fatigue)")):
            d = res[(n, 0.3)] - b
            L.append(f"   {lab} : {'AMÉLIORENT' if d < -0.0015 else 'DÉGRADENT' if d > 0.0015 else 'ne changent presque rien'} le modèle de base ({d:+.4f})")
    open("rapport2.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
