"""Test sur le passé (python backtest.py) : refait les pronostics de matchs déjà joués en n'utilisant que les données
connues AVANT chaque match, puis compare avec ce qui s'est réellement passé. Écrit rapport.txt (lisible) et calibration.json."""
import json
import math
from datetime import datetime, timedelta, timezone

import predict as P
import predict2 as V

HLS = (180, 365, 730)            # durées de mémoire testées (jours : un match de cet âge compte moitié moins)
CUTS = list(range(480, 40, -60))  # dates de coupure, en jours avant aujourd'hui
SIGS = (0.0, 0.1, 0.2, 0.3)      # incertitude sur les buts attendus
PHIS = (1.1, 1.4, 1.8, 2.4, 3.2)  # dispersion des statistiques (corners, cartons…)
MAXG = 8


def pois(k, l):
    return math.exp(-l) * l ** k / math.factorial(k)


def nbcdf(mu, phi, k):
    r = mu / (phi - 1)
    pr = r / (r + mu)
    pm = pr ** r
    c = pm
    for i in range(k):
        pm *= (i + r) / (i + 1) * (1 - pr)
        c += pm
    return min(1.0, c)


def goal_events(x, y, sig):
    """Probabilités des marchés de buts, avec incertitude sur les buts attendus (mélange de 5 scénarios)."""
    a = math.exp(sig)
    mix = [(1, 1, 1.0)] if not sig else [(1, 1, .4), (a, a, .15), (1 / a, 1 / a, .15), (a, 1 / a, .15), (1 / a, a, .15)]
    h = d = aw = o15 = o25 = o35 = b = 0.0
    for fx, fy, w in mix:
        X, Y = x * fx, y * fy
        for i in range(MAXG + 1):
            for j in range(MAXG + 1):
                p = w * pois(i, X) * pois(j, Y)
                if i > j: h += p
                elif i == j: d += p
                else: aw += p
                if i + j > 1: o15 += p
                if i + j > 2: o25 += p
                if i + j > 3: o35 += p
                if i > 0 and j > 0: b += p
    s = h + d + aw
    return {"V1": h / s, "X": d / s, "V2": aw / s, "O1.5": o15 / s, "O2.5": o25 / s, "O3.5": o35 / s, "BTTS": b / s}


def outcome(hg, ag):
    return {"V1": hg > ag, "X": hg == ag, "V2": hg < ag, "O1.5": hg + ag > 1, "O2.5": hg + ag > 2, "O3.5": hg + ag > 3, "BTTS": hg > 0 and ag > 0}


def ll(p, y):
    p = min(1 - 1e-6, max(1e-6, p))
    return -(math.log(p) if y else math.log(1 - p))


def bins(pairs):
    out = []
    for lo in (.5, .55, .6, .65, .7, .75, .8, .85, .9):
        s = [(p, y) for p, y in pairs if lo <= p < lo + .05 or (lo == .9 and p >= .9)]
        if len(s) >= 15:
            out.append((lo, len(s), sum(p for p, _ in s) / len(s), sum(y for _, y in s) / len(s)))
    return out


def near(c, t, lo, hi):
    ok = [x for x in c if lo <= x[2] <= hi]
    return min(ok, key=lambda x: abs(x[2] - t)) if ok else None


def run():
    now = datetime.now(timezone.utc)
    hists = {}
    for league, (div, code) in P.LEAGUES.items():
        try:
            h = P.load_history(div)
            if len(h) > 400:
                hists[league] = h
        except Exception as e:
            print("  ! historique", league, e)
    if not hists:
        print("aucune donnée")
        return
    # 1) durée de mémoire et incertitude : meilleur choix = plus petite perte sur les marchés de buts
    score = {(hl, sg): [0.0, 0] for hl in HLS for sg in SIGS}
    best_pairs = {}
    for league, hist in hists.items():
        for cd in CUTS:
            cut = now - timedelta(days=cd)
            test = [(d, r) for d, r in hist if cut <= d < cut + timedelta(days=60)]
            for hl in HLS:
                data = [(0.5 ** ((cut - d).days / hl), r["HomeTeam"], r["AwayTeam"], P.num(r["FTHG"]), P.num(r["FTAG"]))
                        for d, r in hist if d < cut and P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
                if len(data) < 300:
                    continue
                mh, ma, att, dfn = P.fit(data)
                for d, r in test:
                    h, a = r["HomeTeam"], r["AwayTeam"]
                    hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
                    if h not in att or a not in att or hg is None or ag is None:
                        continue
                    x, y = mh * att[h] * dfn[a], ma * att[a] * dfn[h]
                    ev = outcome(hg, ag)
                    for sg in SIGS:
                        pr = goal_events(x, y, sg)
                        sc = score[(hl, sg)]
                        sc[0] += sum(ll(pr[k], ev[k]) for k in pr)
                        sc[1] += 1
                        best_pairs.setdefault((hl, sg), []).extend((pr[k], ev[k]) for k in pr)
    ok = {k: v[0] / v[1] for k, v in score.items() if v[1] > 200}
    if not ok:
        print("pas assez de matchs pour tester")
        return
    (hl, sg) = min(ok, key=ok.get)
    L = ["RAPPORT DE TEST SUR LE PASSÉ", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), "",
         f"Matchs testés : {score[(hl, sg)][1]} (championnats : {', '.join(hists)})", "",
         "1) Mémoire et incertitude (perte moyenne, plus bas = mieux) :"]
    for (h_, s_), v in sorted(ok.items(), key=lambda kv: kv[1]):
        L.append(f"   mémoire {h_} j, incertitude {s_} : {v:.4f}" + ("   <= meilleur choix" if (h_, s_) == (hl, sg) else ""))
    pairs = []
    for p, y in best_pairs[(hl, sg)]:
        pairs += [(p, y), (1 - p, not y)]
    L += ["", "2) Pourcentage annoncé / réussite réelle des marchés de buts (réglage retenu) :"]
    for lo, n, pm, ob in bins(pairs):
        L.append(f"   annoncé {pm * 100:4.0f} %  ->  réel {ob * 100:4.0f} %   ({n} pronostics)")
    # 2) statistiques : meilleure dispersion, puis réussite réelle des lignes choisies comme dans l'application
    names = {"s": "tirs totaux", "c": "tirs cadrés", "f": "fautes", "k": "cartons", "r": "corners"}
    phi_best, app = {}, {}
    for key, hc, ac in V.STATK:
        samples = []
        for league, hist in hists.items():
            for cd in CUTS[::2]:
                cut = now - timedelta(days=cd)
                data = []
                for d, r in hist:
                    a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                    if d < cut and a_ is not None and b_ is not None:
                        data.append((0.5 ** ((cut - d).days / hl), r["HomeTeam"], r["AwayTeam"], a_, b_))
                if len(data) < 300:
                    continue
                mh, ma, att, dfn = P.fit(data)
                for d, r in hist:
                    if not (cut <= d < cut + timedelta(days=120)):
                        continue
                    h, a = r["HomeTeam"], r["AwayTeam"]
                    a_, b_ = P.num(r.get(hc)), P.num(r.get(ac))
                    if h in att and a in att and a_ is not None and b_ is not None:
                        samples.append((mh * att[h] * dfn[a] + ma * att[a] * dfn[h], a_ + b_))
        if len(samples) < 300:
            continue
        loss = {}
        for ph in PHIS:
            t = n = 0
            for mu, tot in samples:
                for l in range(max(0, int(mu) - 4), int(mu) + 5):
                    po = 1 - nbcdf(mu, ph, int(l + .5))
                    t += ll(po, tot > l + .5) + ll(1 - po, tot < l + .5)
                    n += 2
            loss[ph] = t / n
        phi_best[key] = min(loss, key=loss.get)
        main, sure = [], []
        for mu, tot in samples:
            c = []
            for l in range(max(0, int(mu) - 6), int(mu) + 7):
                po = 1 - nbcdf(mu, phi_best[key], int(l + .5))
                c += [("Plus", l + .5, po, tot > l + .5), ("Moins", l + .5, 1 - po, tot < l + .5)]
            m1, m2 = near(c, .66, .58, .76), near(c, .85, .78, .93)
            if m1: main.append((m1[2], m1[3]))
            if m2: sure.append((m2[2], m2[3]))
        app[key] = (main, sure)
    L += ["", "3) Statistiques : dispersion qui colle le mieux aux matchs réels :"]
    for k, ph in phi_best.items():
        L.append(f"   {names[k]} : {ph}")
    L += ["", "4) Lignes choisies comme dans l'application : annoncé et réel"]
    for k, (main, sure) in app.items():
        for lab, lst in (("ligne principale", main), ("ligne « plus sûre »", sure)):
            if lst:
                L.append(f"   {names[k]}, {lab} : annoncé {100 * sum(p for p, _ in lst) / len(lst):.0f} %  ->  réel {100 * sum(y for _, y in lst) / len(lst):.0f} %  ({len(lst)} pronostics)")
    json.dump({"half_life": hl, "sigma": sg, "phi": phi_best, "generated": now.strftime("%Y-%m-%d")}, open("calibration.json", "w"))
    L += ["", "Réglage retenu : mémoire %d jours, incertitude %s." % (hl, sg)]
    open("rapport.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
