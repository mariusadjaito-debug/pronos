"""Calcul « pro » (python predict3.py) : modèle d'hier + second modèle indépendant (Elo) + fatigue + accord des modèles.
  1. modèle d'hier : forces d'attaque / défense sur 3 saisons, forme, domicile / extérieur, confrontations (predict2.py)
  2. modèle Elo : classement de force qui s'adapte match après match (mémoire longue, marge de victoire)
  3. les deux écarts de buts sont mélangés (75 % / 25 %), le total de buts reste celui du modèle principal
  4. fatigue : une équipe qui rejoue après 3 jours ou moins perd un peu d'efficacité
  5. indice d'accord : si les deux modèles ne voient pas le match de la même façon, la confiance baisse"""
import predict as P
import predict2 as V

HA = 65  # avantage du terrain, en points Elo


def _elo(hist):
    R = {}
    for d, r in sorted(hist, key=lambda z: z[0]):
        h, a = r["HomeTeam"], r["AwayTeam"]
        hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
        if hg is None or ag is None:
            continue
        rh, ra = R.get(h, 1500.0), R.get(a, 1500.0)
        exp = 1 / (1 + 10 ** (-(rh + HA - ra) / 400))
        res = 1.0 if hg > ag else .5 if hg == ag else 0.0
        gd = abs(hg - ag)
        k = 20 * (1 if gd <= 1 else 1.5 if gd == 2 else (11 + gd) / 8)
        R[h] = rh + k * (res - exp)
        R[a] = ra - k * (res - exp)
    return R


def build3(league, hist, fx, out, now):
    n0 = len(out)
    V.build2(league, hist, fx, out, now)
    new = {(e["h"], e["a"], e["d"]): e for e in out[n0:] if "f" in e}
    if not new:
        return
    known = {P.norm(t): t for _, r in hist for t in (r["HomeTeam"], r["AwayTeam"])}
    R = _elo(hist)
    dates = {}
    for d, r in hist:
        for t in (r["HomeTeam"], r["AwayTeam"]):
            dates.setdefault(t, []).append(d)
    for m in fx:
        e = new.get((m["hs"], m["as"], m["d"]))
        if not e:
            continue
        h, a = P.match_team(m["h"], known), P.match_team(m["a"], known)
        if not h or not a:
            continue
        dt = P.datetime.fromisoformat(m["d"].replace("Z", "+00:00"))
        t = e["x"] + e["y"]
        gm = e["x"] - e["y"]
        ge = (R.get(h, 1500.0) + HA - R.get(a, 1500.0)) / 260
        gb = .75 * gm + .25 * ge
        fh = fa = 1.0
        for team, who in ((h, "h"), (a, "a")):
            prev = [d for d in dates.get(team, []) if d < dt]
            if prev and 0 <= (dt - max(prev)).days <= 3:
                if who == "h":
                    fh = .97
                else:
                    fa = .97
        e["x"] = round(max(.2, (t + gb) / 2 * fh), 2)
        e["y"] = round(max(.2, (t - gb) / 2 * fa), 2)
        e["ag"] = round(1 - min(1, abs(gm - ge) / (abs(gm) + .5)), 2)
        e["f"]["elo"] = [round(R.get(h, 1500.0)), round(R.get(a, 1500.0))]


P.build = build3

if __name__ == "__main__":
    P.main()
