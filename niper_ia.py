"""Test n°10 (python niper_ia.py) : une IA de sélection des pronostics apprend-elle mieux que les règles écrites à la main ?
Pour chaque match passé (données connues AVANT le match seulement), on fabrique tous les pronostics possibles (buts, tirs, tirs cadrés, fautes, corners)
dont la probabilité calculée est de 50 à 82 %, avec ~40 informations (probabilité, accord des deux équipes sur 10 et 30 matchs, confrontations,
domicile/extérieur, style du match, type de marché...). L'IA apprend sur la première partie du temps et est jugée sur la dernière partie,
des matchs qu'elle n'a jamais vus. On compare : probabilité seule, régression, forêt d'arbres (gradient boosting) et la règle C du test n°8.
Écrit rapport10.txt."""
import bisect
import math
from datetime import datetime, timedelta, timezone

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.preprocessing import StandardScaler

import backtest as B
import backtest7 as T
import predict as P

mean = T.mean
FAMS = ["r", "d", "h", "g", "b", "t", "ss", "sc", "sf", "sr"]
NOMS = ["p", "logit p", "cote", "e10 A", "e10 B", "e30 A", "e30 B", "min e10", "accord moyen - p", "min accord - p", "confrontations", "a des confrontations",
        "domicile/extérieur", "a dom/ext", "contredit ouvert/fermé", "moyennes ok", "sens (plus/moins)", "ligne relative", "buts attendus", "écart de force",
        "match ouvert", "match fermé", "force du signal ouvert/fermé"] + ["famille " + f for f in FAMS]


def form_score(x, y, GH, GA, HM, la):
    """Comme T.form_kind mais renvoie aussi le total des votes (sans xG ni tirs cadrés)."""
    def team(P_):
        L = P_[-10:]
        gf, ga = [g[0] for g in L], [g[1] for g in L]
        return {"att": mean(gf) / la - 1, "def": la / max(.2, mean(ga)) - 1, "tot": [g[0] + g[1] for g in L], "bt": [1 if g[0] > 0 and g[1] > 0 else 0 for g in L]}
    A, Bt = team(GH), team(GA)
    tH = [g[0] + g[1] for g in HM[-10:]]
    N = 9
    mod = [0.0] * (N + 1)
    for a in range(N + 1):
        for b in range(N + 1):
            mod[min(N, a + b)] += T.pm(a, x) * T.pm(b, y)
    emp, tw = [0.0] * (N + 1), 0.0
    for arr, w in ((A["tot"], 1), (Bt["tot"], 1), (tH, 1.5)):
        for v in arr:
            emp[min(N, int(v))] += w
            tw += w
    D = [.5 * mod[i] + .5 * emp[i] / (tw or 1) for i in range(N + 1)]
    E = sum(i * p for i, p in enumerate(D))
    gt = lambda k: sum(D[int(k) + 1:])
    sc = 2 * (1 if E >= 2.9 else -1 if E <= 2.3 else 0) + 2 * (1 if gt(2.5) >= .5 else -1 if gt(2.5) <= .33 else 0)
    m10 = mean(A["tot"] + Bt["tot"])
    sc += 1 if m10 >= 3 else -1 if m10 <= 2.2 else 0
    bt = mean(A["bt"] + Bt["bt"])
    sc += 1 if bt >= .6 else -1 if bt <= .35 else 0
    sc += 1 if (A["att"] >= .1 and Bt["att"] >= .1 and A["def"] <= 0 and Bt["def"] <= 0) else -1 if (A["att"] <= -.1 and Bt["att"] <= -.1 and A["def"] >= .1 and Bt["def"] >= .1) else 0
    low = mean([1 if v <= 1 else 0 for v in A["tot"] + Bt["tot"]])
    sc += -1 if low >= .5 else 1 if low <= .2 else 0
    if len(tH) >= 4:
        hm = mean(tH)
        sc += 1 if hm >= 3 else -1 if hm <= 2.2 else 0
    return sc


def feat(c):
    p, e = c["p"], c["e"]
    f = [p, math.log(p / (1 - p)), 1 / p, e[0], e[1], e[2], e[3], min(e[0], e[1]), mean(e) - p, min(e) - p,
         c["h2"] if c["h2"] is not None else p, 1 if c["h2"] is not None else 0, c["vs"] if c["vs"] is not None else p, 1 if c["vs"] is not None else 0,
         1 if c["conf"] else 0, 1 if c["ok"] else 0, c["dir"], c["line_rel"], c["xt"], abs(c["xd"]),
         1 if c["sc"] >= 4 else 0, 1 if c["sc"] <= -4 else 0, c["sc"] / 7]
    return f + [1 if c["fam"] == F else 0 for F in FAMS]


def candidats(now):
    hists = {}
    for league, (div, code) in P.LEAGUES.items():
        try:
            h = P.load_history(div)
            if len(h) > 600:
                hists[league] = sorted(h, key=lambda z: z[0])
        except Exception as e:
            print("  ! historique", league, e)
    seuil = 0.5 ** (T.MAX_DAYS / T.HL)
    C = []
    for league, hist in hists.items():
        recs, dates, h2h = {}, {}, {}
        for d, r in hist:
            hg, ag = P.num(r.get("FTHG")), P.num(r.get("FTAG"))
            if hg is None or ag is None:
                continue
            tot = {}
            for k, (hc, ac) in T.STATS.items():
                a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                tot[k] = (a_ + b_) if a_ is not None and b_ is not None else None
            H, A = r["HomeTeam"], r["AwayTeam"]
            for t, home, gf, ga in ((H, True, hg, ag), (A, False, ag, hg)):
                recs.setdefault(t, []).append({"d": d, "home": home, "gf": gf, "ga": ga, "tot": tot})
                dates.setdefault(t, []).append(d)
            h2h.setdefault(frozenset((H, A)), []).append((d, H, hg, ag))
        if not recs or sum(1 for rs in recs.values() for x in rs if x["tot"]["s"] is not None) < 500:
            continue
        for cd in B.CUTS[::2]:
            cut = now - timedelta(days=cd)
            data = [(0.5 ** ((cut - d).days / 240), r["HomeTeam"], r["AwayTeam"], P.num(r.get("FTHG")), P.num(r.get("FTAG")))
                    for d, r in hist if d < cut and (cut - d).days <= 770 and P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
            if len(data) < 150:
                continue
            mh, ma, att, dfn = P.fit(data)
            fits = {}
            for k, (hc, ac) in T.STATS.items():
                dk = [(0.5 ** ((cut - d).days / T.HL), r["HomeTeam"], r["AwayTeam"], P.num(r.get(hc)), P.num(r.get(ac)))
                      for d, r in hist if d < cut and P.num(r.get(hc)) is not None and P.num(r.get(ac)) is not None]
                dk = [x for x in dk if x[0] >= seuil]
                if len(dk) >= 150:
                    fits[k] = P.fit(dk)
            recent = [(P.num(r2["FTHG"]) or 0) + (P.num(r2["FTAG"]) or 0) for d2, r2 in hist if 0 <= (cut - d2).days <= 400 and P.num(r2.get("FTHG")) is not None]
            la = mean(recent) / 2 if len(recent) > 100 else 1.35
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
                tots = {k: ([x["tot"][k] for x in RH if x["tot"][k] is not None], [x["tot"][k] for x in RA if x["tot"][k] is not None]) for k in T.STATS}
                if not all(len(v[0]) >= 8 and len(v[1]) >= 8 for v in tots.values()):
                    continue
                HM = [(gh if hh == H else ga_, ga_ if hh == H else gh) for dd, hh, gh, ga_ in h2h.get(frozenset((H, A)), []) if dd < d][-10:]
                x, y = mh * att[H] * dfn[A], ma * att[A] * dfn[H]
                A30, B30 = [[g["gf"], g["ga"]] for g in RH], [[g["gf"], g["ga"]] for g in RA]
                GH, GA = [[g["gf"], g["ga"]] for g in RH if g["home"]][-10:], [[g["gf"], g["ga"]] for g in RA if not g["home"]][-10:]
                tA10, tB10, tall = [g[0] + g[1] for g in A30[-10:]], [g[0] + g[1] for g in B30[-10:]], [g[0] + g[1] for g in A30 + B30]
                GHx, GAx = (GH if len(GH) >= 5 else A30[-10:]), (GA if len(GA) >= 5 else B30[-10:])
                kind, conf = T.form_kind(x, y, GHx, GAx, HM, la, None, None)
                vot = form_score(x, y, GHx, GAx, HM, la)
                closed, opened = kind == "closed" and conf >= .5, kind == "open" and conf >= .5
                key = f"{league}|{d:%Y-%m-%d}|{H}|{A}"
                mc = []
                Lm, grid, s = T.markets(x, y)
                cnt = lambda a: sum(1 for v in a if v)
                for fam, nom, f, p in Lm:
                    if not (.50 <= p <= .82):
                        continue
                    hA, hB = [f(g[0], g[1]) for g in A30], [f(g[1], g[0]) for g in B30]
                    e = (T.shr(cnt(hA[-10:]), len(hA[-10:]), p), T.shr(cnt(hB[-10:]), len(hB[-10:]), p), T.shr(cnt(hA), len(hA), p), T.shr(cnt(hB), len(hB), p))
                    h2s = cnt([f(g[0], g[1]) for g in HM]) / len(HM) if len(HM) >= 4 else None
                    vs = (cnt([f(g[0], g[1]) for g in GH]) + cnt([f(g[1], g[0]) for g in GA])) / (len(GH) + len(GA)) if len(GH) >= 6 and len(GA) >= 6 else None
                    over = nom.startswith("Plus") or nom == "BTTS oui" or " plus " in nom
                    under = nom.startswith("Moins") or nom == "BTTS non" or " moins " in nom
                    ok, lrel = True, 0.0
                    if fam == "g":
                        l = float(nom.split()[1]); ov = nom.startswith("Plus")
                        mA, mB, sdv = mean(tA10), mean(tB10), (T.sd(tall) or 1)
                        ok = ((mA > l and mB > l) if ov else (mA < l and mB < l)) and abs(mean(tA10 + tB10) - mean(tall)) <= 1.2 * sdv
                        lrel = l - (x + y)
                    elif fam == "t":
                        lrel = float(nom.split()[-1]) - (x if nom.startswith("H") else y)
                    mc.append({"fam": fam, "p": p, "e": e, "h2": h2s, "vs": vs, "conf": (closed and over and fam != "t") or (opened and under and fam != "t"), "ok": ok,
                               "dir": 1 if over else -1 if under else 0, "line_rel": lrel, "xt": x + y, "xd": x - y, "sc": vot, "out": bool(f(hg, ag)), "key": key, "date": d.toordinal()})
                for k in T.STATS:
                    A_, B_ = tots[k]
                    m_h, m_a, a_k, d_k = fits[k]
                    hc, ac = T.STATS[k]
                    ra, rb = P.num(r.get(hc)), P.num(r.get(ac))
                    if H not in a_k or A not in a_k or ra is None or rb is None:
                        continue
                    mu, real = m_h * a_k[H] * d_k[A] + m_a * a_k[A] * d_k[H], ra + rb
                    for l in range(max(0, int(mu) - 5), int(mu) + 6):
                        line = l + .5
                        if not T.RNG[k][0] <= line <= T.RNG[k][1]:
                            continue
                        u = B.nbcdf(mu, T.PHI[k], int(line))
                        for side, p in (("Plus", 1 - u), ("Moins", u)):
                            if not .50 <= p <= .82:
                                continue
                            fq = (lambda v, line=line: v > line) if side == "Plus" else (lambda v, line=line: v < line)
                            cn = lambda a: sum(1 for v in a if fq(v))
                            e = (T.shr(cn(A_[-10:]), 10, p), T.shr(cn(B_[-10:]), 10, p), T.shr(cn(A_), len(A_), p), T.shr(cn(B_), len(B_), p))
                            mA, mB, allv = mean(A_[-10:]), mean(B_[-10:]), A_ + B_
                            sdv = T.sd(allv) or 1
                            dd = (min(mA, mB) - line) if side == "Plus" else (line - max(mA, mB))
                            ok = dd > 0 and abs(mean(A_[-10:] + B_[-10:]) - mean(allv)) <= 1.2 * sdv
                            mc.append({"fam": "s" + k, "p": p, "e": e, "h2": None, "vs": None, "conf": False, "ok": ok, "dir": 1 if side == "Plus" else -1,
                                       "line_rel": (line - mu) / sdv, "xt": x + y, "xd": x - y, "sc": vot, "out": bool((real > line) if side == "Plus" else (real < line)), "key": key, "date": d.toordinal()})
                for c in mc:
                    p, e = c["p"], c["e"]
                    c["C"] = (e[0] >= p + .05 and e[1] >= p + .05 and e[2] >= p and e[3] >= p and (c["h2"] is None or c["h2"] >= p - .05)
                              and (c["vs"] is None or c["vs"] >= p) and not c["conf"] and c["ok"])
                C += mc
    return C


def pct(v):
    return f"{100 * v:.1f} %"


def run():
    now = datetime.now(timezone.utc)
    C = candidats(now)
    L = ["RAPPORT n°10 : UNE IA DE SÉLECTION BAT-ELLE LES RÈGLES ?", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), ""]
    if len(C) < 5000:
        L.append("Pas assez de pronostics pour apprendre.")
    else:
        C.sort(key=lambda c: c["date"])
        coupe = C[int(len(C) * .6)]["date"]
        tr = [c for c in C if c["date"] < coupe]
        te = [c for c in C if c["date"] >= coupe]
        Xtr, Xte = np.array([feat(c) for c in tr]), np.array([feat(c) for c in te])
        ytr, yte = np.array([c["out"] for c in tr], dtype=int), np.array([c["out"] for c in te], dtype=int)
        L.append(f"Pronostics : {len(C)} (apprentissage {len(tr)}, test sur des matchs plus récents jamais vus {len(te)}).")
        sc_ = StandardScaler().fit(Xtr)
        m0 = LogisticRegression(max_iter=300).fit(Xtr[:, [1]], ytr)
        m1 = LogisticRegression(max_iter=600, C=0.5).fit(sc_.transform(Xtr), ytr)
        m2 = HistGradientBoostingClassifier(max_depth=4, learning_rate=0.06, max_iter=250, l2_regularization=1.0, min_samples_leaf=200, random_state=1).fit(Xtr, ytr)
        pr = {"probabilité seule (calibrée)": m0.predict_proba(Xte[:, [1]])[:, 1], "régression avec tous les signaux": m1.predict_proba(sc_.transform(Xte))[:, 1], "IA (arbres) avec tous les signaux": m2.predict_proba(Xte)[:, 1]}
        L += ["", "1) Qualité des prévisions sur le test (plus la perte et l'erreur sont basses, mieux c'est ; AUC : 0,5 = hasard, 1 = parfait) :"]
        for nom, pp in pr.items():
            L.append(f"   {nom:<36}: perte {log_loss(yte, pp):.4f} | erreur {brier_score_loss(yte, pp):.4f} | AUC {roc_auc_score(yte, pp):.4f}")
        pia = pr["IA (arbres) avec tous les signaux"]
        L += ["", "2) L'IA dit-elle vrai ? (probabilité annoncée par l'IA / réussite réelle) :"]
        for nom, lo, hi in (("moins de 50 %", 0, .5), ("50 à 60 %", .5, .6), ("60 à 70 %", .6, .7), ("70 à 80 %", .7, .8), ("80 % et plus", .8, 1.01)):
            idx = (pia >= lo) & (pia < hi)
            if idx.sum() >= 30:
                L.append(f"   {nom:<14}: {int(idx.sum())} pronostics | annoncé {pct(pia[idx].mean())} | réel {pct(yte[idx].mean())}")
        L += ["", "3) Un seul pronostic par match, cote juste 1,4 à 1,7 (probabilité du calcul de 58 à 71 %) : réussite réelle selon la méthode de choix :"]
        par = {}
        for i, c in enumerate(te):
            if .58 <= c["p"] <= .7143:
                par.setdefault(c["key"], []).append(i)
        choix = {
            "au hasard (moyenne des candidats)": lambda ix: None,
            "le plus probable selon le calcul": lambda ix: max(ix, key=lambda i: te[i]["p"]),
            "règle C du test n°8 (meilleur accord)": lambda ix: max([i for i in ix if te[i]["C"]] or [None], key=lambda i: -1 if i is None else mean(te[i]["e"]) - te[i]["p"]) if any(te[i]["C"] for i in ix) else "aucun",
            "régression": lambda ix: max(ix, key=lambda i: pr["régression avec tous les signaux"][i]),
            "IA (arbres)": lambda ix: max(ix, key=lambda i: pia[i]),
        }
        for nom, fn in choix.items():
            sel = []
            for key, ix in par.items():
                if nom.startswith("au hasard"):
                    sel.append((mean([te[i]["p"] for i in ix]), mean([yte[i] for i in ix])))
                    continue
                j = fn(ix)
                if j is None or j == "aucun":
                    continue
                sel.append((te[j]["p"], yte[j]))
            if sel:
                L.append(f"   {nom:<40}: {len(sel)} matchs | cote juste moyenne {1 / mean([p for p, _ in sel]):.2f} | annoncé par le calcul {pct(mean([p for p, _ in sel]))} | RÉEL {pct(mean([o for _, o in sel]))}")
        L += ["", "4) Les meilleurs pronostics de la journée selon l'IA (15 % des matchs de chaque jour, un pronostic par match, cote juste 1,4 à 1,7) :"]
        jours = {}
        for key, ix in par.items():
            j = max(ix, key=lambda i: pia[i])
            jours.setdefault(te[j]["date"], []).append((pia[j], te[j]["p"], yte[j]))
        top = []
        for d_, lst in jours.items():
            lst.sort(reverse=True)
            top += lst[:max(1, round(len(lst) * .15))]
        if top:
            L.append(f"   {len(top)} pronostics | cote juste moyenne {1 / mean([p for _, p, _ in top]):.2f} | annoncé par l'IA {pct(mean([a for a, _, _ in top]))} | RÉEL {pct(mean([o for _, _, o in top]))}")
        L += ["", "5) Ce que la régression juge le plus important (poids après mise à l'échelle) :"]
        co = sorted(zip(NOMS, m1.coef_[0]), key=lambda t: -abs(t[1]))[:8]
        for n_, w_ in co:
            L.append(f"   {n_:<28}: {w_:+.3f}")
        L += ["", "Lecture : si la perte et l'erreur de l'IA sont plus basses que celles de « probabilité seule », l'IA ajoute de l'information. Si le RÉEL du point 3 ou 4 est plus haut pour l'IA que pour le calcul ou la règle C, elle choisit mieux."]
    open("rapport10.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
