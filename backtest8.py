"""Test n°8 (python backtest8.py) : et pour les cotes 1,4 à 2,0 (probabilité 50 à 71 %) ?
Sur des matchs passés, avec les seules données connues avant chaque match, mesure la réussite réelle des pronostics
(marchés de buts et lignes de tirs, tirs cadrés, fautes, corners) dont la probabilité calculée est de 50 à 71 %, par tranche de cote,
et teste si l'accord des deux équipes sur leurs 10 et 30 derniers matchs permet de mieux choisir. Écrit rapport8.txt.
Utilise les fonctions de backtest7.py (même dossier)."""
import bisect
from datetime import datetime, timedelta, timezone

import backtest as B
import backtest7 as T
import predict as P

BINS = [("1,40-1,50", .6667, .7143), ("1,50-1,60", .625, .6667), ("1,60-1,70", .5882, .625), ("1,70-1,85", .5405, .5882), ("1,85-2,00", .50, .5405)]
mean, shr = T.mean, T.shr


def binof(p):
    for nom, lo, hi in BINS:
        if lo < p <= hi or (nom == "1,85-2,00" and p == lo):
            return nom
    return None


def pct(L):
    return f"{100 * mean(L):.0f} %" if L else "-"


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
    seuil = 0.5 ** (T.MAX_DAYS / T.HL)
    C, par_match = [], []
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
            hs_, as_, hst, ast = P.num(r.get("HS")), P.num(r.get("AS")), P.num(r.get("HST")), P.num(r.get("AST"))
            H, A = r["HomeTeam"], r["AwayTeam"]
            for t, home, gf, ga, sf, sa, tf, ta_ in ((H, True, hg, ag, hs_, as_, hst, ast), (A, False, ag, hg, as_, hs_, ast, hst)):
                recs.setdefault(t, []).append({"d": d, "home": home, "gf": gf, "ga": ga, "tot": tot, "sf": sf, "sa": sa, "tf": tf, "ta": ta_})
                dates.setdefault(t, []).append(d)
            h2h.setdefault(frozenset((H, A)), []).append((d, H, hg, ag))
        if not recs or sum(1 for rs in recs.values() for x in rs if x["tot"]["s"] is not None) < 500:
            continue
        for cd in B.CUTS[::2]:
            cut = now - timedelta(days=cd)
            data = [(0.5 ** ((cut - d).days / T.HL), r["HomeTeam"], r["AwayTeam"], P.num(r.get("FTHG")), P.num(r.get("FTAG")))
                    for d, r in hist if d < cut and P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
            data = [x for x in data if x[0] >= seuil]
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
                kind, conf = T.form_kind(x, y, GH if len(GH) >= 5 else A30[-10:], GA if len(GA) >= 5 else B30[-10:], HM, la, None, None)
                closed, opened = kind == "closed" and conf >= .5, kind == "open" and conf >= .5
                mc = []
                L, grid, s = T.markets(x, y)
                cnt = lambda a: sum(1 for v in a if v)
                for fam, nom, f, p in L:
                    if not (.50 <= p <= .7143):
                        continue
                    hA, hB = [f(g[0], g[1]) for g in A30], [f(g[1], g[0]) for g in B30]
                    e = (shr(cnt(hA[-10:]), len(hA[-10:]), p), shr(cnt(hB[-10:]), len(hB[-10:]), p), shr(cnt(hA), len(hA), p), shr(cnt(hB), len(hB), p))
                    h2s = cnt([f(g[0], g[1]) for g in HM]) / len(HM) if len(HM) >= 4 else None
                    vs = (cnt([f(g[0], g[1]) for g in GH]) + cnt([f(g[1], g[0]) for g in GA])) / (len(GH) + len(GA)) if len(GH) >= 6 and len(GA) >= 6 else None
                    over, under = nom.startswith("Plus") or nom == "BTTS oui", nom.startswith("Moins") or nom == "BTTS non"
                    ok = True
                    if fam == "g":
                        l = float(nom.split()[1]); ov = nom.startswith("Plus")
                        mA, mB, sdv = mean(tA10), mean(tB10), (T.sd(tall) or 1)
                        ok = ((mA > l and mB > l) if ov else (mA < l and mB < l)) and abs(mean(tA10 + tB10) - mean(tall)) <= 1.2 * sdv
                    mc.append({"fam": fam, "p": p, "e": e, "h2": h2s, "vs": vs, "conf": (closed and over and fam != "t") or (opened and under and fam != "t"), "ok": ok, "out": bool(f(hg, ag))})
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
                            if not .50 <= p <= .7143:
                                continue
                            fq = (lambda v, line=line: v > line) if side == "Plus" else (lambda v, line=line: v < line)
                            cn = lambda a: sum(1 for v in a if fq(v))
                            e = (shr(cn(A_[-10:]), 10, p), shr(cn(B_[-10:]), 10, p), shr(cn(A_), len(A_), p), shr(cn(B_), len(B_), p))
                            mA, mB, allv = mean(A_[-10:]), mean(B_[-10:]), A_ + B_
                            sdv = T.sd(allv) or 1
                            dd = (min(mA, mB) - line) if side == "Plus" else (line - max(mA, mB))
                            ok = dd > 0 and abs(mean(A_[-10:] + B_[-10:]) - mean(allv)) <= 1.2 * sdv
                            mc.append({"fam": "s" + k, "p": p, "e": e, "h2": None, "vs": None, "conf": False, "ok": ok, "out": bool((real > line) if side == "Plus" else (real < line))})
                for c in mc:
                    c["delta"] = mean(c["e"]) - c["p"]
                    p, e = c["p"], c["e"]
                    c["A"] = e[0] >= p and e[1] >= p and e[2] >= p - .02 and e[3] >= p - .02
                    c["B"] = e[0] >= p + .05 and e[1] >= p + .05 and e[2] >= p and e[3] >= p
                    c["C"] = c["B"] and (c["h2"] is None or c["h2"] >= p - .05) and (c["vs"] is None or c["vs"] >= p) and not c["conf"] and c["ok"]
                C += mc
                bonne = [c for c in mc if c["C"] and .58 <= c["p"] <= .7143]
                if bonne:
                    par_match.append(max(bonne, key=lambda c: c["delta"]))
    L = ["RAPPORT n°8 : COTES 1,40 À 2,00 (PROBABILITÉ 50 À 71 %)", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), ""]
    if not C:
        L.append("Aucun pronostic testé (données insuffisantes).")
    else:
        L.append(f"Pronostics testés : {len(C)} (marchés de buts et lignes de statistiques, probabilité 50 à 71 %)")
        L += ["", "1) Le calcul seul, par tranche de cote (annoncé = probabilité du calcul, réel = réussi) :"]
        for nom, lo, hi in BINS:
            g = [c for c in C if binof(c["p"]) == nom]
            if g:
                L.append(f"   cote {nom} : {len(g)} pronostics | annoncé {pct([c['p'] for c in g])} | réel {pct([c['out'] for c in g])}")
        L += ["", "2) Les règles d'accord des deux équipes (réel / nombre), comparées aux pronostics sans règle de la même tranche :"]
        L.append("   A = chaque équipe confirme le pronostic sur ses 10 et 30 derniers matchs ; B = confirmation nette (+5 points) ;")
        L.append("   C = B + confrontations directes + domicile/extérieur + moyennes + cohérence ouvert/fermé")
        for nom, lo, hi in BINS:
            g = [c for c in C if binof(c["p"]) == nom]
            if not g:
                continue
            ligne = f"   cote {nom} : sans règle {pct([c['out'] for c in g])}"
            for r_ in "ABC":
                s_ = [c for c in g if c[r_]]
                ligne += f" | {r_} {pct([c['out'] for c in s_])} ({len(s_)})" if len(s_) >= 30 else f" | {r_} - ({len(s_)})"
            L.append(ligne)
        tot = {r_: [c for c in C if c[r_]] for r_ in "ABC"}
        L += ["", "   Gain global de la règle (réel de la règle moins réel des pronostics sans règle de même probabilité) :"]
        for r_ in "ABC":
            s_ = tot[r_]
            if len(s_) >= 100:
                base = mean([mean([x["out"] for x in C if binof(x["p"]) == binof(c["p"])]) for c in s_])
                L.append(f"   {r_} : {len(s_)} pronostics, réel {pct([c['out'] for c in s_])}, gain {100 * (mean([c['out'] for c in s_]) - base):+.1f} points")
        L += ["", "3) Plus les équipes confirment le pronostic, mieux il réussit ? (accord moyen moins la probabilité du calcul) :"]
        for nom, lo, hi in (("moins de -5 points", -9, -.05), ("de -5 à 0", -.05, 0), ("de 0 à +5", 0, .05), ("+5 et plus", .05, 9)):
            g = [c for c in C if lo <= c["delta"] < hi]
            if len(g) >= 30:
                L.append(f"   accord {nom} : {len(g)} pronostics | annoncé {pct([c['p'] for c in g])} | réel {pct([c['out'] for c in g])}")
        L += ["", "4) Par famille de marché (règle C) :"]
        for fam in sorted({c["fam"] for c in C}):
            g = [c for c in C if c["fam"] == fam and c["C"]]
            if len(g) >= 30:
                L.append(f"   {fam} : {len(g)} pronostics | annoncé {pct([c['p'] for c in g])} | réel {pct([c['out'] for c in g])}")
        L += ["", "5) Un seul pronostic par match (le mieux confirmé, règle C, cote environ 1,4 à 1,7) :"]
        if par_match:
            L.append(f"   {len(par_match)} pronostics | annoncé {pct([c['p'] for c in par_match])} | réel {pct([c['out'] for c in par_match])} | cote juste moyenne {1 / mean([c['p'] for c in par_match]):.2f}")
        L += ["", "Lecture : si « réel » est proche de « annoncé », le calcul est juste dans cette zone ; si les règles A, B, C font mieux que « sans règle », elles aident vraiment à choisir."]
    open("rapport8.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
