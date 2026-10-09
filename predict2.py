"""Moteur de calcul avancé, à lancer à la place de predict.py (python predict2.py).
Il reprend le modèle de predict.py (forces d'attaque et de défense, qualité de l'adversaire incluse)
et y ajoute : forme récente, résultats à domicile / à l'extérieur, confrontations directes pondérées par l'ancienneté."""
from datetime import timedelta

import predict as P


def _cl(v, a, b):
    return max(a, min(b, v))


def _factors(rows, team, models, k):
    """Buts marqués / encaissés réels, comparés aux buts attendus par le modèle (1 = conforme)."""
    mh, ma, att, dfn = models["x"]
    base = (mh + ma) / 2
    gf = ge = ef = ee = 0.0
    for d, r in rows:
        h, a = r["HomeTeam"], r["AwayTeam"]
        hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
        eh = mh * att.get(h, 1) * dfn.get(a, 1)
        ea = ma * att.get(a, 1) * dfn.get(h, 1)
        if h == team:
            gf += hg; ge += ag; ef += eh; ee += ea
        else:
            gf += ag; ge += hg; ef += ea; ee += eh
    return (gf + k * base) / (ef + k * base), (ge + k * base) / (ee + k * base)


def _letters(rows, team):
    s = ""
    for d, r in rows[-5:]:
        hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
        mine, opp = (hg, ag) if r["HomeTeam"] == team else (ag, hg)
        s += "V" if mine > opp else "N" if mine == opp else "D"
    return s


def build2(league, hist, fx, out, now):
    if not hist:
        print("  ! aucune donnée historique")
        return
    known = {P.norm(t): t for _, r in hist for t in (r["HomeTeam"], r["AwayTeam"])}
    models, missing = {}, []
    for key, hc, ac in [("x", "FTHG", "FTAG")] + P.STATS:
        data = []
        for d, r in hist:
            hv, av = P.num(r.get(hc)), P.num(r.get(ac))
            if hv is not None and av is not None:
                data.append((0.5 ** ((now - d).days / P.HALF_LIFE), r["HomeTeam"], r["AwayTeam"], hv, av))
        if len(data) > 50:
            models[key] = P.fit(data)
        else:
            missing.append(key)
    if missing:
        print("  - statistiques absentes :", ", ".join(missing))
    if "x" not in models:
        return
    hs = sorted(hist, key=lambda z: z[0])
    mh, ma, att, dfn = models["x"]
    for m in fx:
        dt = P.datetime.fromisoformat(m["d"].replace("Z", "+00:00"))
        lo = now - timedelta(hours=30) if m.get("st") else now
        if not (lo <= dt <= now + timedelta(days=7)):
            continue
        h, a = P.match_team(m["h"], known), P.match_team(m["a"], known)
        if not h or not a:
            print("  ? équipe inconnue :", m["h"], "/", m["a"])
            continue

        def pred(k):
            mh_, ma_, at_, df_ = models[k]
            return [mh_ * at_.get(h, 1) * df_.get(a, 1), ma_ * at_.get(a, 1) * df_.get(h, 1)]

        x, y = pred("x")
        rh = [z for z in hs if h in (z[1]["HomeTeam"], z[1]["AwayTeam"])]
        ra = [z for z in hs if a in (z[1]["HomeTeam"], z[1]["AwayTeam"])]
        fa_h, fd_h = _factors(rh[-6:], h, models, 3)        # forme récente (6 derniers matchs)
        fa_a, fd_a = _factors(ra[-6:], a, models, 3)
        vh = [z for z in rh if z[1]["HomeTeam"] == h][-15:]  # matchs joués à domicile
        va = [z for z in ra if z[1]["AwayTeam"] == a][-15:]  # matchs joués à l'extérieur
        va_h, vd_h = _factors(vh, h, models, 6)
        va_a, vd_a = _factors(va, a, models, 6)
        x *= _cl((fa_h ** .35) * (fd_a ** .35) * (va_h ** .4) * (vd_a ** .4), .75, 1.3)
        y *= _cl((fa_a ** .35) * (fd_h ** .35) * (va_a ** .4) * (vd_h ** .4), .75, 1.3)
        meet = [z for z in rh if a in (z[1]["HomeTeam"], z[1]["AwayTeam"])][-10:]  # confrontations directes
        h2 = [0, 0, 0, len(meet)]
        if len(meet) >= 2:
            ah = eh_ = aa = ea_ = 0.0
            for d, r in meet:
                w = 0.5 ** ((now - d).days / 365)  # un match de plus d'un an compte beaucoup moins
                hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
                if r["HomeTeam"] == h:
                    gh_, ga_ = hg, ag
                    e1, e2 = mh * att.get(h, 1) * dfn.get(a, 1), ma * att.get(a, 1) * dfn.get(h, 1)
                else:
                    gh_, ga_ = ag, hg
                    e1, e2 = ma * att.get(h, 1) * dfn.get(a, 1), mh * att.get(a, 1) * dfn.get(h, 1)
                ah += w * gh_; eh_ += w * e1; aa += w * ga_; ea_ += w * e2
                if (now - d).days <= 730:
                    h2[0 if gh_ > ga_ else 1 if gh_ == ga_ else 2] += 1
            kk = mh + ma
            x *= _cl(((ah + kk) / (eh_ + kk)) ** .3, .9, 1.12)
            y *= _cl(((aa + kk) / (ea_ + kk)) ** .3, .9, 1.12)
        f = {"fh": _letters(rh, h), "fa": _letters(ra, a), "h2": h2,
             "at": [round(att.get(h, 1), 2), round(att.get(a, 1), 2)], "df": [round(dfn.get(h, 1), 2), round(dfn.get(a, 1), 2)]}
        out.append({"l": league, "h": m["hs"], "a": m["as"], "d": m["d"], "x": round(x, 2), "y": round(y, 2), "f": f,
                    "hc": m.get("hc"), "ac": m.get("ac"), "i": m.get("i"), "st": m.get("st", "pre"), "sc": m.get("sc"),
                    "e": {k: [round(v, 2) for v in pred(k)] for k in models if k != "x"}})


P.build = build2

if __name__ == "__main__":
    P.main()
