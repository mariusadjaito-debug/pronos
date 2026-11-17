"""Test n°7 (python backtest7.py) : NIPER PRO réussit-il vraiment ?
Rejoue, sur des matchs passés et avec les seules données connues AVANT chaque match, les règles de NIPER PRO :
 - qualité des données suffisante (10 matchs récents par équipe, statistiques réelles) ;
 - marchés de buts et lignes de statistiques (tirs, tirs cadrés, fautes, corners ; les cartons n'y sont plus) dont le calcul donne 64 à 82 % ;
 - confirmation par chaque équipe séparément (10 et 30 derniers matchs, avec correction des petits échantillons),
   matchs à domicile / à l'extérieur, confrontations directes, moyennes du bon côté de la ligne, pas de série anormale,
   cohérence avec la fiche « match ouvert / fermé » ;
 - jusqu'à 3 pronostics de familles différentes sans contradiction, et le ⭐ au mieux confirmé (marge claire).
Mesure la réussite réelle, pronostic par pronostic ET fiche entière, et compare avec les mêmes marchés sans les filtres
(pour savoir si les filtres apportent quelque chose). Écrit rapport7.txt."""
import bisect
import math
from datetime import datetime, timedelta, timezone

import backtest as B
import predict as P
import predict2 as V

HL, MAX_DAYS = 180, 365
PHI = {"s": 1.45, "c": 1.3, "f": 1.2, "r": 1.3}
RNG = {"c": (6.5, 11.5), "s": (20.5, 30.5), "f": (20.5, 30.5), "r": (7.5, 12.5)}
STATS = {"s": ("HS", "AS"), "c": ("HST", "AST"), "f": ("HF", "AF"), "r": ("HC", "AC")}
NAME = {"s": "tirs totaux", "c": "tirs cadrés", "f": "fautes", "r": "corners"}
CELLS = [(a, b) for a in range(10) for b in range(10)]


def mean(x):
    return sum(x) / len(x)


def sd(x):
    m = mean(x)
    return math.sqrt(mean([(v - m) ** 2 for v in x]))


def shr(k, n, p, s=4):
    return (k + s * p) / (n + s)


def pm(i, l):
    return math.exp(-l) * l ** i / math.factorial(i)


def markets(x, y):
    """Marchés de buts proposés par l'application : (famille, nom, fonction du score, probabilité du calcul)."""
    grid = {(a, b): pm(a, x) * pm(b, y) for a, b in CELLS}
    s = sum(grid.values())
    L = [("r", "V1", lambda a, b: a > b), ("r", "X", lambda a, b: a == b), ("r", "V2", lambda a, b: a < b),
         ("d", "1X", lambda a, b: a >= b), ("d", "X2", lambda a, b: b >= a), ("d", "12", lambda a, b: a != b),
         ("b", "BTTS oui", lambda a, b: a > 0 and b > 0), ("b", "BTTS non", lambda a, b: not (a > 0 and b > 0))]
    for k in (.5, 1.5):
        L += [("h", f"H -{k}", lambda a, b, k=k: a - b - k > 0), ("h", f"H +{k}", lambda a, b, k=k: a - b + k > 0),
              ("h", f"A -{k}", lambda a, b, k=k: b - a - k > 0), ("h", f"A +{k}", lambda a, b, k=k: b - a + k > 0)]
    for l in (1.5, 2.5, 3.5, 4.5):
        L += [("g", f"Plus {l}", lambda a, b, l=l: a + b > l), ("g", f"Moins {l}", lambda a, b, l=l: a + b < l)]
    for l in (1.5, 2.5):
        L += [("t", f"H plus {l}", lambda a, b, l=l: a > l), ("t", f"H moins {l}", lambda a, b, l=l: a < l),
              ("t", f"A plus {l}", lambda a, b, l=l: b > l), ("t", f"A moins {l}", lambda a, b, l=l: b < l)]
    return [(fam, nom, f, sum(p for (a, b), p in grid.items() if f(a, b)) / s) for fam, nom, f in L], grid, s


def joint(grid, s, f1, f2):
    p1 = sum(p for (a, b), p in grid.items() if f1(a, b)) / s
    p2 = sum(p for (a, b), p in grid.items() if f2(a, b)) / s
    p12 = sum(p for (a, b), p in grid.items() if f1(a, b) and f2(a, b)) / s
    return p12 / (p1 * p2) if p1 > 0 and p2 > 0 else None


def form_kind(x, y, GH, GA, HM, la, xg, sot):
    """Fiche « match ouvert / fermé » : mêmes indicateurs que l'application."""
    def team(P_):
        L = P_[-10:]
        gf, ga = [g[0] for g in L], [g[1] for g in L]
        return {"att": mean(gf) / la - 1, "def": la / max(.2, mean(ga)) - 1, "tot": [g[0] + g[1] for g in L],
                "bt": [1 if g[0] > 0 and g[1] > 0 else 0 for g in L]}
    A, Bt = team(GH), team(GA)
    tH = [g[0] + g[1] for g in HM[-10:]]
    N = 9
    mod = [0.0] * (N + 1)
    for a in range(N + 1):
        for b in range(N + 1):
            mod[min(N, a + b)] += pm(a, x) * pm(b, y)
    emp, tw = [0.0] * (N + 1), 0.0
    for arr, w in ((A["tot"], 1), (Bt["tot"], 1), (tH, 1.5)):
        for v in arr:
            emp[min(N, int(v))] += w
            tw += w
    D = [.5 * mod[i] + .5 * emp[i] / (tw or 1) for i in range(N + 1)]
    E = sum(i * p for i, p in enumerate(D))
    gt = lambda k: sum(D[int(k) + 1:])
    sc = 0
    sc += 2 * (1 if E >= 2.9 else -1 if E <= 2.3 else 0)
    sc += 2 * (1 if gt(2.5) >= .5 else -1 if gt(2.5) <= .33 else 0)
    m10 = mean(A["tot"] + Bt["tot"])
    sc += 1 if m10 >= 3 else -1 if m10 <= 2.2 else 0
    bt = mean(A["bt"] + Bt["bt"])
    sc += 1 if bt >= .6 else -1 if bt <= .35 else 0
    sc += 1 if (A["att"] >= .1 and Bt["att"] >= .1 and A["def"] <= 0 and Bt["def"] <= 0) else -1 if (A["att"] <= -.1 and Bt["att"] <= -.1 and A["def"] >= .1 and Bt["def"] >= .1) else 0
    if xg is not None:
        sc += 1 if xg >= 2.8 else -1 if xg <= 2.2 else 0
    if sot is not None:
        sc += 1 if sot >= 9.5 else -1 if sot <= 7 else 0
    low = mean([1 if v <= 1 else 0 for v in A["tot"] + Bt["tot"]])
    sc += -1 if low >= .5 else 1 if low <= .2 else 0
    if len(tH) >= 4:
        hm = mean(tH)
        sc += 1 if hm >= 3 else -1 if hm <= 2.2 else 0
    kind = "open" if sc >= 4 else "closed" if sc <= -4 else "bal"
    return kind, min(1, abs(sc) / 7)


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
    picks, base, cartes, n_match, n_card = [], [], [], 0, 0
    for league, hist in hists.items():
        # fiches d'équipe : une ligne par match joué, du point de vue de l'équipe
        recs, dates = {}, {}
        h2h = {}
        for d, r in hist:
            hg, ag = P.num(r.get("FTHG")), P.num(r.get("FTAG"))
            if hg is None or ag is None:
                continue
            tot, sh, st = {}, {}, {}
            for k, (hc, ac) in STATS.items():
                a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                tot[k] = (a_ + b_) if a_ is not None and b_ is not None else None
            hs_, as_, hst, ast = P.num(r.get("HS")), P.num(r.get("AS")), P.num(r.get("HST")), P.num(r.get("AST"))
            H, A = r["HomeTeam"], r["AwayTeam"]
            for t, home, gf, ga, sf, sa, tf, ta_ in ((H, True, hg, ag, hs_, as_, hst, ast), (A, False, ag, hg, as_, hs_, ast, hst)):
                recs.setdefault(t, []).append({"d": d, "home": home, "gf": gf, "ga": ga, "tot": tot, "sf": sf, "sa": sa, "tf": tf, "ta": ta_})
                dates.setdefault(t, []).append(d)
            h2h.setdefault(frozenset((H, A)), []).append((d, H, hg, ag))
        if not recs:
            continue
        if sum(1 for rs in recs.values() for x in rs if x["tot"]["s"] is not None) < 500:
            continue  # championnat sans statistiques : NIPER PRO ne s'y affiche pas
        for cd in B.CUTS[::2]:
            cut = now - timedelta(days=cd)
            data = [(0.5 ** ((cut - d).days / HL), r["HomeTeam"], r["AwayTeam"], P.num(r.get("FTHG")), P.num(r.get("FTAG")))
                    for d, r in hist if d < cut and P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
            data = [x for x in data if x[0] >= seuil]
            if len(data) < 150:
                continue
            mh, ma, att, dfn = P.fit(data)
            fits = {}
            for k, (hc, ac) in STATS.items():
                dk = [(0.5 ** ((cut - d).days / HL), r["HomeTeam"], r["AwayTeam"], P.num(r.get(hc)), P.num(r.get(ac)))
                      for d, r in hist if d < cut and P.num(r.get(hc)) is not None and P.num(r.get(ac)) is not None]
                dk = [x for x in dk if x[0] >= seuil]
                if len(dk) >= 150:
                    fits[k] = P.fit(dk)
            recent = [(r["FTHG"], r["FTAG"]) for d, r in hist if 0 <= (cut - d).days <= 400 and P.num(r.get("FTHG")) is not None]
            la = mean([P.num(a) + P.num(b) for a, b in recent]) / 2 if len(recent) > 100 else 1.35
            for d, r in hist:
                if not (cut <= d < cut + timedelta(days=120)):
                    continue
                H, A = r["HomeTeam"], r["AwayTeam"]
                hg, ag = P.num(r.get("FTHG")), P.num(r.get("FTAG"))
                if H not in att or A not in att or hg is None or ag is None or len(fits) < 4:
                    continue
                iH, iA = bisect.bisect_left(dates[H], d), bisect.bisect_left(dates[A], d)
                RH, RA = recs[H][max(0, iH - 30):iH], recs[A][max(0, iA - 30):iA]
                if len(RH) < 10 or len(RA) < 10:
                    continue
                tots = {k: ([x["tot"][k] for x in RH if x["tot"][k] is not None], [x["tot"][k] for x in RA if x["tot"][k] is not None]) for k in STATS}
                stats_ok = all(len(v[0]) >= 8 and len(v[1]) >= 8 for v in tots.values())
                HM = [(gh if hh == H else ga_, ga_ if hh == H else gh) for dd, hh, gh, ga_ in h2h.get(frozenset((H, A)), []) if dd < d][-10:]
                prof = lambda R_: {"xg": mean([.31 * x["tf"] + .05 * (x["sf"] - x["tf"]) for x in R_ if x["sf"] is not None and x["tf"] is not None]) if sum(1 for x in R_ if x["sf"] is not None and x["tf"] is not None) >= 8 else None,
                                   "xa": mean([.31 * x["ta"] + .05 * (x["sa"] - x["ta"]) for x in R_ if x["sa"] is not None and x["ta"] is not None]) if sum(1 for x in R_ if x["sa"] is not None and x["ta"] is not None) >= 8 else None,
                                   "tf": mean([x["tf"] for x in R_ if x["tf"] is not None]) if sum(1 for x in R_ if x["tf"] is not None) >= 8 else None,
                                   "ta": mean([x["ta"] for x in R_ if x["ta"] is not None]) if sum(1 for x in R_ if x["ta"] is not None) >= 8 else None}
                pH, pA = prof(RH), prof(RA)
                sx = pH["xg"] is not None and pA["xg"] is not None
                nm = min(1, (iH + iA) / 100)
                Q = .30 * min(1, min(len(RH), len(RA)) / 30) + .25 * (1 if stats_ok else 0) + .15 * min(1, len(HM) / 3) + .15 * (1 if sx else 0) + .15 * nm
                if not (Q >= .75 and stats_ok):
                    continue
                n_match += 1
                x, y = mh * att[H] * dfn[A], ma * att[A] * dfn[H]
                A30 = [[g["gf"], g["ga"]] for g in RH]
                B30 = [[g["gf"], g["ga"]] for g in RA]
                GH = [[g["gf"], g["ga"]] for g in RH if g["home"]][-10:]
                GA = [[g["gf"], g["ga"]] for g in RA if not g["home"]][-10:]
                xgt = ((pH["xg"] + pA["xa"]) / 2 + (pA["xg"] + pH["xa"]) / 2) if sx and pH["xa"] is not None and pA["xa"] is not None else None
                sott = ((pH["tf"] + pA["ta"]) / 2 + (pA["tf"] + pH["ta"]) / 2) if pH["tf"] is not None and pA["ta"] is not None and pA["tf"] is not None and pH["ta"] is not None else None
                kind, conf = form_kind(x, y, GH if len(GH) >= 5 else A30[-10:], GA if len(GA) >= 5 else B30[-10:], HM, la, xgt, sott)
                closed, opened = kind == "closed" and conf >= .5, kind == "open" and conf >= .5
                tA10, tB10 = [g[0] + g[1] for g in A30[-10:]], [g[0] + g[1] for g in B30[-10:]]
                tall = [g[0] + g[1] for g in A30 + B30]
                cand = []
                L, grid, s = markets(x, y)
                for fam, nom, f, p in L:
                    if not (.64 <= p <= .82):
                        continue
                    hA = [f(g[0], g[1]) for g in A30]
                    hB = [f(g[1], g[0]) for g in B30]
                    cnt = lambda a: sum(1 for v in a if v)
                    e10A, e10B = shr(cnt(hA[-10:]), len(hA[-10:]), p), shr(cnt(hB[-10:]), len(hB[-10:]), p)
                    e30A, e30B = shr(cnt(hA), len(hA), p), shr(cnt(hB), len(hB), p)
                    outcome = f(hg, ag)
                    base.append((p, outcome))
                    if e10A < .68 or e10B < .68 or e30A < .6 or e30B < .6:
                        continue
                    if len(HM) >= 4 and cnt([f(g[0], g[1]) for g in HM]) / len(HM) < .5:
                        continue
                    if len(GH) >= 6 and len(GA) >= 6:
                        vh, va = [f(g[0], g[1]) for g in GH], [f(g[1], g[0]) for g in GA]
                        if (cnt(vh) + cnt(va)) / (len(vh) + len(va)) < .6:
                            continue
                    over = nom.startswith("Plus") or nom == "BTTS oui"
                    under = nom.startswith("Moins") or nom == "BTTS non"
                    if (closed and over and fam != "t") or (opened and under and fam != "t"):
                        continue
                    margin = max(0, min(1, (min(e10A, e10B) - .5) * 2))
                    stab = 1 - abs(e10A - e10B)
                    if fam == "g":
                        l = float(nom.split()[1])
                        ov = nom.startswith("Plus")
                        mA, mB, sdv = mean(tA10), mean(tB10), (sd(tall) or 1)
                        if not ((mA > l and mB > l) if ov else (mA < l and mB < l)):
                            continue
                        if abs(mean(tA10 + tB10) - mean(tall)) > 1.2 * sdv:
                            continue
                        dd = (min(mA, mB) - l) if ov else (l - max(mA, mB))
                        margin = max(0, min(2, dd / sdv)) / 2
                        stab = 1 - min(1, sdv / (mean(tall) or 1))
                    cand.append({"fam": fam, "nom": nom, "f": f, "p": p, "pb": (2 * p + e10A + e10B + e30A + e30B) / 6,
                                 "f10A": e10A, "f10B": e10B, "margin": margin, "stab": stab, "out": outcome})
                for k in STATS:
                    A_, B_ = tots[k]
                    if len(A_) < 8 or len(B_) < 8:
                        continue
                    m_h, m_a, a_k, d_k = fits[k]
                    if H not in a_k or A not in a_k:
                        continue
                    mu = m_h * a_k[H] * d_k[A] + m_a * a_k[A] * d_k[H]
                    real = tot_real = None
                    hc, ac = STATS[k]
                    ra, rb = P.num(r.get(hc)), P.num(r.get(ac))
                    if ra is None or rb is None:
                        continue
                    real = ra + rb
                    best = None
                    for l in range(max(0, int(mu) - 4), int(mu) + 5):
                        line = l + .5
                        if not RNG[k][0] <= line <= RNG[k][1]:
                            continue
                        u = B.nbcdf(mu, PHI[k], int(line))
                        for side, pp in (("Plus", 1 - u), ("Moins", u)):
                            if not .45 <= pp <= .82:
                                continue
                            fq = (lambda v, line=line: v > line) if side == "Plus" else (lambda v, line=line: v < line)
                            f10A, f10B = mean([fq(v) for v in A_[-10:]]), mean([fq(v) for v in B_[-10:]])
                            fA, fB = (f10A + mean([fq(v) for v in A_])) / 2, (f10B + mean([fq(v) for v in B_])) / 2
                            sc_ = min(pp, fA, fB)
                            if best is None or sc_ > best[0] + 1e-9 or (abs(sc_ - best[0]) < 1e-9 and pp > best[1]):
                                best = (sc_, pp, side, line, fq)
                    if not best:
                        continue
                    _, pp, side, line, fq = best
                    if pp < .64:
                        continue
                    ov = side == "Plus"
                    cn = lambda a: sum(1 for v in a if fq(v))
                    e10A, e10B = shr(cn(A_[-10:]), 10, pp), shr(cn(B_[-10:]), 10, pp)
                    e30A, e30B = shr(cn(A_), len(A_), pp), shr(cn(B_), len(B_), pp)
                    outcome = (real > line) if ov else (real < line)
                    base.append((pp, outcome))
                    if e10A < .68 or e10B < .68 or e30A < .6 or e30B < .6:
                        continue
                    mA, mB, allv = mean(A_[-10:]), mean(B_[-10:]), A_ + B_
                    sdv = sd(allv) or 1
                    dd = (min(mA, mB) - line) if ov else (line - max(mA, mB))
                    if dd <= 0 or abs(mean(A_[-10:] + B_[-10:]) - mean(allv)) > 1.2 * sdv:
                        continue
                    cand.append({"fam": "s" + k, "nom": f"{NAME[k]} {side} {line}", "f": None, "p": pp, "pb": (2 * pp + e10A + e10B + e30A + e30B) / 6,
                                 "f10A": e10A, "f10B": e10B, "margin": max(0, min(2, dd / sdv)) / 2, "stab": 1 - min(1, sdv / (mean(allv) or 1)), "out": outcome})
                ok = [c for c in cand if c["pb"] >= .7]
                for c in ok:
                    c["ev"] = .4 * (c["f10A"] + c["f10B"]) / 2 + .3 * c["margin"] + .2 * c["stab"] + .1 * Q
                ok.sort(key=lambda c: -c["ev"])
                sel = []
                for c in ok:
                    if len(sel) >= 3 or any(z["fam"] == c["fam"] for z in sel):
                        continue
                    bad = False
                    for z in sel:
                        if z["f"] and c["f"]:
                            j = joint(grid, s, z["f"], c["f"])
                            if j is not None and (j < .8 or j > 1.35):
                                bad = True
                    if not bad:
                        sel.append(c)
                if not sel:
                    continue
                star = sel[0] if sel[0]["ev"] >= .75 and sel[0]["margin"] >= .35 else None
                n_card += 1
                for c in sel:
                    picks.append({"pb": c["pb"], "p": c["p"], "fam": c["fam"], "star": c is star, "hit": bool(c["out"])})
                cartes.append([bool(c["out"]) for c in sel])
    L = ["RAPPORT n°7 : NIPER PRO RÉUSSIT-IL VRAIMENT ?", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), ""]
    if not picks:
        L.append("Aucun pronostic NIPER PRO sur la période testée (données insuffisantes).")
    else:
        L.append(f"Matchs avec données suffisantes : {n_match} ; matchs où NIPER PRO s'affiche : {n_card} ({100 * n_card / max(1, n_match):.0f} %)")
        L.append(f"Pronostics NIPER PRO : {len(picks)} | annoncé {100 * mean([q['pb'] for q in picks]):.0f} % | RÉEL {100 * mean([q['hit'] for q in picks]):.0f} %")
        L.append(f"Calcul seul (sans les filtres NIPER PRO), mêmes marchés, mêmes matchs : {len(base)} | annoncé {100 * mean([p for p, _ in base]):.0f} % | réel {100 * mean([o for _, o in base]):.0f} %")
        pa = mean([q['pb'] for q in picks])
        near = [o for p, o in base if abs(p - pa) <= .05]
        if len(near) >= 100:
            L.append(f"Mêmes marchés sans filtres, avec une probabilité proche ({100 * pa:.0f} % ± 5) : réel {100 * mean(near):.0f} % (si NIPER PRO fait mieux, ses filtres servent à quelque chose)")
        L += ["", "Par niveau annoncé :"]
        for nom, lo, hi in (("Très sûr (80 % et +)", .8, 2), ("Sûr (60 à 79 %)", .6, .8), ("Modéré (moins de 60 %)", 0, .6)):
            g = [q for q in picks if lo <= q["pb"] < hi]
            if len(g) >= 20:
                L.append(f"   {nom} : {len(g)} pronostics, annoncé {100 * mean([q['pb'] for q in g]):.0f} %, réel {100 * mean([q['hit'] for q in g]):.0f} %")
        st = [q for q in picks if q["star"]]
        ns = [q for q in picks if not q["star"]]
        L += ["", f"⭐ : {len(st)} pronostics, réel {100 * mean([q['hit'] for q in st]):.0f} % | sans ⭐ : {len(ns)}, réel {100 * mean([q['hit'] for q in ns]):.0f} %" if st and ns else ""]
        L += ["", "Par famille de marché :"]
        for fam in sorted({q["fam"] for q in picks}):
            g = [q for q in picks if q["fam"] == fam]
            if len(g) >= 20:
                L.append(f"   {fam} : {len(g)} pronostics, annoncé {100 * mean([q['pb'] for q in g]):.0f} %, réel {100 * mean([q['hit'] for q in g]):.0f} %")
        tous = [c for c in cartes if all(c)]
        prem = [c for c in cartes if c[0]]
        L += ["", f"Fiche entière gagnante (tous les pronostics réussis) : {100 * len(tous) / len(cartes):.0f} % des fiches ({len(cartes)} fiches)",
              f"Premier pronostic de la fiche réussi : {100 * len(prem) / len(cartes):.0f} %"]
        r = mean([q['hit'] for q in picks])
        L += ["", "Verdict : " + ("les pourcentages de NIPER PRO sont honnêtes (réel proche de l'annoncé ou meilleur)" if r >= pa - .03 else "NIPER PRO est trop optimiste : le réel est plus bas que l'annoncé, il faut corriger")]
    open("rapport7.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
