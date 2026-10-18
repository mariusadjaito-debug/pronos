"""Calcul « base » (python predict4.py) : le modèle que le test sur le passé a validé.
Buts attendus = forces d'attaque et de défense calculées sur TOUS les matchs récents (domicile et extérieur ensemble),
les plus récents comptant davantage (un match perd la moitié de son poids tous les 180 jours).
Pas de forme, de domicile / extérieur à part, de confrontations, d'Elo ni de fatigue : le test montre qu'ils dégradent le calcul."""
import predict as P
import predict2 as V
import predict3 as V3

P.HALF_LIFE = 180


def build4(league, hist, fx, out, now):
    n0 = len(out)
    V.build2(league, hist, fx, out, now)
    V3._register(league, hist)
    new = {(e["h"], e["a"], e["d"]): e for e in out[n0:] if "f" in e}
    data = [(0.5 ** ((now - d).days / P.HALF_LIFE), r["HomeTeam"], r["AwayTeam"], P.num(r["FTHG"]), P.num(r["FTAG"]))
            for d, r in hist if P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
    if not new or len(data) < 50:
        return
    mh, ma, att, dfn = P.fit(data)
    known = {P.norm(t): t for _, r in hist for t in (r["HomeTeam"], r["AwayTeam"])}
    cnt = {}
    for d, r in hist:
        for t in (r["HomeTeam"], r["AwayTeam"]):
            cnt[t] = cnt.get(t, 0) + 1
    for m in fx:
        e = new.get((m["hs"], m["as"], m["d"]))
        if not e:
            continue
        h, a = P.match_team(m["h"], known), P.match_team(m["a"], known)
        if not h or not a or h not in att or a not in att:
            continue
        e["x"] = round(mh * att[h] * dfn[a], 2)
        e["y"] = round(ma * att[a] * dfn[h], 2)
        e["f"]["nm"] = [cnt.get(h, 0), cnt.get(a, 0)]
        e.pop("ag", None)


P.build = build4

if __name__ == "__main__":
    P.main()
