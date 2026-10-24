"""Calcul « base » (python predict4.py) : le modèle que le test sur le passé a validé.
Buts attendus = forces d'attaque et de défense calculées sur TOUS les matchs récents (domicile et extérieur ensemble),
les plus récents comptant davantage (un match perd la moitié de son poids tous les 180 jours).
Pas de forme, de domicile / extérieur à part, de confrontations, d'Elo ni de fatigue : le test montre qu'ils dégradent le calcul.
Les 20 derniers matchs de chaque équipe sont envoyés à l'application pour les signes ⭐ (ils ne servent pas au calcul)."""
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
    cnt, byteam = {}, {}
    for d, r in sorted(hist, key=lambda z: z[0]):
        if P.num(r.get("FTHG")) is None or P.num(r.get("FTAG")) is None:
            continue
        for t in (r["HomeTeam"], r["AwayTeam"]):
            cnt[t] = cnt.get(t, 0) + 1
            byteam.setdefault(t, []).append((d, r))
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
        z = e.setdefault("z", {})  # 20 derniers matchs de chaque équipe, domicile et extérieur confondus (signes ⭐)
        for i, t in enumerate((h, a)):
            last = byteam.get(t, [])[-20:]
            z["th" if i == 0 else "ta"] = [[int(P.num(r["FTHG"])), int(P.num(r["FTAG"]))] if r["HomeTeam"] == t
                                           else [int(P.num(r["FTAG"])), int(P.num(r["FTHG"]))] for _, r in last]
            for k, hc, ac in V.STATK:
                z.setdefault("ts", {}).setdefault(k, [[], []])[i] = V._totals(last, hc, ac)


P.build = build4

if __name__ == "__main__":
    P.main()
