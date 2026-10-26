"""Test n°3 (python backtest3.py) : le ⭐ « très probable » est-il vraiment très sûr ?
Sur des matchs passés, avec les seules données connues avant chaque match, applique la règle de l'application :
UN SEUL ⭐ par match, le pronostic le mieux confirmé par les 20 derniers matchs de chaque équipe (et les confrontations
directes), parmi tous les marchés (résultat, buts, deux marquent, tirs, fautes, cartons, corners), avec une probabilité
du calcul entre 62 et 88 %. Compare sa réussite réelle à celle du simple « pronostic le plus probable » du match.
Teste trois niveaux de sévérité. Écrit rapport3.txt."""
import bisect
from datetime import datetime, timedelta, timezone

import backtest as B
import predict as P
import predict2 as V

PHI = {"s": 1.1, "c": 1.1, "f": 1.4, "k": 1.1, "r": 1.1}
NAMES = {"s": "tirs totaux", "c": "tirs cadrés", "f": "fautes", "k": "cartons", "r": "corners"}
EV = {"V1": lambda h, a: h > a, "X": lambda h, a: h == a, "V2": lambda h, a: h < a, "O1.5": lambda h, a: h + a > 1,
      "O2.5": lambda h, a: h + a > 2, "O3.5": lambda h, a: h + a > 3, "BTTS": lambda h, a: h > 0 and a > 0}
RULES = [("souple (règle de l'application)", .80, .85), ("stricte", .85, .90), ("très stricte", .90, .93)]  # chaque équipe, ensemble
PMIN, PMAX = .62, .88


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
    cands = {}  # match -> liste de (famille, p, réussi, part équipe 1, part équipe 2, part ensemble, part confrontations)
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
            te = [(d, r) for d, r in hist if cut <= d < cut + timedelta(days=120)]
            data = [(0.5 ** ((cut - d).days / 180), r["HomeTeam"], r["AwayTeam"], P.num(r["FTHG"]), P.num(r["FTAG"]))
                    for d, r in hist if d < cut and P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
            if len(data) < 300:
                continue
            mh, ma, att, dfn = P.fit(data)
            for d, r in te:
                h, a = r["HomeTeam"], r["AwayTeam"]
                hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
                if h not in att or a not in att or hg is None or ag is None:
                    continue
                k = (league, d, h, a)
                ph, pa = prs(last(h, d), h), prs(last(a, d), a)
                hm = meet(h, a, d)
                pr = B.goal_events(mh * att[h] * dfn[a], ma * att[a] * dfn[h], 0.0)
                for e, f in EV.items():
                    for pred, p in ((f, pr[e]), (lambda x, y, f=f: not f(x, y), 1 - pr[e])):
                        if PMIN <= p <= PMAX and len(ph) >= 8 and len(pa) >= 8:
                            A = [pred(x, y) for x, y in ph]
                            Bs = [pred(y, x) for x, y in pa]
                            H = mean([pred(x, y) for x, y in hm]) if len(hm) >= 4 else None
                            cands.setdefault(k, []).append(("buts et résultats", p, pred(hg, ag), mean(A), mean(Bs), mean(A + Bs), H))
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
                    if len(th) < 8 or len(ta) < 8:
                        continue
                    c = []
                    for l in range(max(0, int(mu) - 6), int(mu) + 7):
                        po = 1 - B.nbcdf(mu, PHI[key], int(l + .5))
                        c += [("Plus", l + .5, po, (a_ + b_) > l + .5), ("Moins", l + .5, 1 - po, (a_ + b_) < l + .5)]
                    for sel in (B.near(c, .66, .58, .76), B.near(c, .85, .78, .93)):
                        if sel and PMIN <= sel[2] <= PMAX:
                            side, line, p, ok = sel
                            f = (lambda v: v > line) if side == "Plus" else (lambda v: v < line)
                            fa, fb = [f(v) for v in th], [f(v) for v in ta]
                            cands.setdefault((league, d, h, a), []).append((NAMES[key], p, ok, mean(fa), mean(fb), mean(fa + fb), None))
    L = ["RAPPORT n°3 : LE ⭐ « TRÈS PROBABLE » EST-IL VRAIMENT TRÈS SÛR ?", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), "",
         f"Matchs avec au moins un pronostic candidat : {len(cands)}",
         "Un seul ⭐ par match (le mieux confirmé). 'annoncé' = probabilité du calcul, 'réel' = part réellement validée.",
         "'base' = simple pronostic le plus probable du même match (sans regarder les derniers matchs).", ""]
    for nom, tm, tp in RULES:
        st, bs, fam = [], [], {}
        for k, lst in cands.items():
            ok_ = [c for c in lst if c[3] >= tm and c[4] >= tm and c[5] >= tp and (c[6] is None or c[6] >= .7)]
            if not ok_:
                continue
            s = max(ok_, key=lambda c: (c[5], c[1]))
            b = max(lst, key=lambda c: c[1])
            st.append((s[1], s[2]))
            bs.append((b[1], b[2]))
            fam[s[0]] = fam.get(s[0], 0) + 1
        L.append(f"RÈGLE {nom.upper()} : chaque équipe >= {int(tm * 100)} %, ensemble >= {int(tp * 100)} %")
        if len(st) < 30:
            L += [f"   trop peu de matchs avec ⭐ ({len(st)})", ""]
            continue
        ps, rs = mean([p for p, _ in st]), mean([y for _, y in st])
        pb, rb = mean([p for p, _ in bs]), mean([y for _, y in bs])
        v = ("TRÈS SÛR : réel >= 85 %" if len(st) >= 100 and rs >= .85 else
             "meilleur que prévu, mais pas très sûr" if len(st) >= 100 and rs >= ps + .02 else
             "pas meilleur que la probabilité" if len(st) >= 100 else "trop peu de cas pour conclure")
        L.append(f"   matchs avec ⭐ : {len(st)} | ⭐ annoncé {ps * 100:.0f} %, réel {rs * 100:.0f} %  |  base annoncé {pb * 100:.0f} %, réel {rb * 100:.0f} %  ->  {v}")
        L.append("   familles des ⭐ : " + ", ".join(f"{a} {n}" for a, n in sorted(fam.items(), key=lambda x: -x[1])))
        L.append("")
    open("rapport3.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
