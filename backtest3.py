"""Test n°3 (python backtest3.py) : les signes ⭐ servent-ils vraiment ?
Sur des matchs passés, avec les seules données connues avant chaque match, compare la réussite réelle des pronostics
marqués ⭐ (confirmés par les 20 derniers matchs de chaque équipe et les confrontations directes, cote utilisable)
et des autres pronostics de la même zone de probabilité (45 à 74 %). Écrit rapport3.txt."""
import bisect
from datetime import datetime, timedelta, timezone

import backtest as B
import predict as P
import predict2 as V

PHI = {"s": 1.1, "c": 1.1, "f": 1.4, "k": 1.1, "r": 1.1}
NAMES = {"s": "tirs totaux", "c": "tirs cadrés", "f": "fautes", "k": "cartons", "r": "corners"}
EV = {"V1": lambda h, a: h > a, "X": lambda h, a: h == a, "V2": lambda h, a: h < a, "O1.5": lambda h, a: h + a > 1,
      "O2.5": lambda h, a: h + a > 2, "O3.5": lambda h, a: h + a > 3, "BTTS": lambda h, a: h > 0 and a > 0}


def star(p, A, Bs, H=None):
    if p < .45 or p > .74 or len(A) < 8 or len(Bs) < 8:
        return False
    q = lambda x: sum(x) / len(x)
    return q(A) >= .6 and q(Bs) >= .6 and q(A + Bs) >= p - .03 and (H is None or q(H) >= .5)


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
    groups = {}
    for league, hist in hists.items():
        byteam, dates = {}, {}
        for d, r in hist:
            if P.num(r.get("FTHG")) is None or P.num(r.get("FTAG")) is None:
                continue
            for t in (r["HomeTeam"], r["AwayTeam"]):
                byteam.setdefault(t, []).append((d, r))
                dates.setdefault(t, []).append(d)

        def last(t, d, n=20):
            i = bisect.bisect_left(dates.get(t, []), d)
            return byteam.get(t, [])[max(0, i - n):i]

        def prs(rows, t):
            return [(P.num(r["FTHG"]), P.num(r["FTAG"])) if r["HomeTeam"] == t else (P.num(r["FTAG"]), P.num(r["FTHG"])) for _, r in rows]

        def meet(h, a, d):
            return [(P.num(r["FTHG"]), P.num(r["FTAG"])) if r["HomeTeam"] == h else (P.num(r["FTAG"]), P.num(r["FTHG"]))
                    for _, r in last(h, d, 60) if a in (r["HomeTeam"], r["AwayTeam"])][-10:]

        for cd in B.CUTS[::2]:
            cut = now - timedelta(days=cd)
            tr = [(d, r) for d, r in hist if d < cut]
            te = [(d, r) for d, r in hist if cut <= d < cut + timedelta(days=120)]
            data = [(0.5 ** ((cut - d).days / 180), r["HomeTeam"], r["AwayTeam"], P.num(r["FTHG"]), P.num(r["FTAG"]))
                    for d, r in tr if P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
            if len(data) < 300:
                continue
            mh, ma, att, dfn = P.fit(data)
            for d, r in te:
                h, a = r["HomeTeam"], r["AwayTeam"]
                hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
                if h not in att or a not in att or hg is None or ag is None:
                    continue
                ph, pa = prs(last(h, d), h), prs(last(a, d), a)
                hm = meet(h, a, d)
                pr = B.goal_events(mh * att[h] * dfn[a], ma * att[a] * dfn[h], 0.0)
                for e, f in EV.items():
                    for pred, p in ((f, pr[e]), (lambda x, y, f=f: not f(x, y), 1 - pr[e])):
                        if p < .5:
                            continue
                        A = [pred(x, y) for x, y in ph]
                        Bs = [pred(y, x) for x, y in pa]
                        H = [pred(x, y) for x, y in hm] if len(hm) >= 4 else None
                        groups.setdefault("buts et résultats", []).append((p, pred(hg, ag), star(p, A, Bs, H)))
        for key, hc, ac in V.STATK:
            for cd in B.CUTS[::2]:
                cut = now - timedelta(days=cd)
                data = []
                for d, r in hist:
                    a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                    if d < cut and a_ is not None and b_ is not None:
                        data.append((0.5 ** ((cut - d).days / 180), r["HomeTeam"], r["AwayTeam"], a_, b_))
                if len(data) < 300:
                    continue
                mh, ma, att, dfn = P.fit(data)

                def tot(rows):
                    out = []
                    for _, r in rows:
                        a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                        if a_ is not None and b_ is not None:
                            out.append(a_ + b_)
                    return out
                for d, r in hist:
                    if not (cut <= d < cut + timedelta(days=120)):
                        continue
                    h, a = r["HomeTeam"], r["AwayTeam"]
                    a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                    if h not in att or a not in att or a_ is None or b_ is None:
                        continue
                    mu = mh * att[h] * dfn[a] + ma * att[a] * dfn[h]
                    th, ta = tot(last(h, d)), tot(last(a, d))
                    c = []
                    for l in range(max(0, int(mu) - 6), int(mu) + 7):
                        po = 1 - B.nbcdf(mu, PHI[key], int(l + .5))
                        c += [("Plus", l + .5, po, (a_ + b_) > l + .5), ("Moins", l + .5, 1 - po, (a_ + b_) < l + .5)]
                    for sel in (B.near(c, .66, .58, .76), B.near(c, .85, .78, .93)):
                        if sel:
                            side, line, p, ok = sel
                            f = (lambda v: v > line) if side == "Plus" else (lambda v: v < line)
                            groups.setdefault(NAMES[key], []).append((p, ok, star(p, [f(v) for v in th], [f(v) for v in ta])))
    L = ["RAPPORT n°3 : LES SIGNES ⭐ SERVENT-ILS ?", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), "",
         "Pour chaque famille : pronostics ⭐ et autres pronostics de la même zone (45 à 74 %). 'annoncé' = probabilité moyenne,",
         "'réel' = part réellement validée. Un ⭐ est utile si son réel dépasse son annoncé.", ""]
    for g, lst in groups.items():
        s = [(p, y) for p, y, st in lst if st]
        o = [(p, y) for p, y, st in lst if not st and .45 <= p <= .74]
        if not s or not o:
            continue
        ps, rs = sum(p for p, _ in s) / len(s), sum(y for _, y in s) / len(s)
        po, ro = sum(p for p, _ in o) / len(o), sum(y for _, y in o) / len(o)
        v = "UTILE" if len(s) >= 150 and rs >= ps + .02 else "aucun avantage mesuré" if len(s) >= 150 else "trop peu de cas pour conclure"
        L.append(f"{g} : ⭐ {len(s)} pronostics, annoncé {ps * 100:.0f} %, réel {rs * 100:.0f} %  |  autres {len(o)}, annoncé {po * 100:.0f} %, réel {ro * 100:.0f} %  ->  {v}")
    open("rapport3.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
