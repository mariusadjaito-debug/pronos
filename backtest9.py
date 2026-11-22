"""Test n°9 (python backtest9.py) : étude du moteur de buts.
A) Combien de matchs de mémoire ? Compare des fenêtres de 30 à 80 matchs par équipe (en jours) et plusieurs vitesses d'oubli.
B) Les confrontations directes aident-elles ?
C) La forme des scores : buts indépendants, correction des petits scores (Dixon-Coles), dispersion (matchs très ouverts).
Mesures : perte logarithmique (plus bas = meilleur) du 1X2, de plus/moins 2,5 buts, des deux équipes marquent et du score exact,
et pour le score exact : réussite du score le plus probable et des 3 plus probables. Écrit rapport9.txt."""
import math
from datetime import datetime, timedelta, timezone

import backtest as B
import predict as P

CELLS = [(a, b) for a in range(10) for b in range(10)]
FENETRES = [290, 365, 480, 575, 770]   # jours : environ 30, 38, 50, 60 et 80 matchs par équipe
OUBLIS = [120, 240, None]              # demi-vie en jours (None = tous les matchs comptent pareil)
mean = lambda x: sum(x) / len(x)


def pm(k, l):
    return math.exp(-l) * l ** k / math.factorial(k)


def nb(k, mu, r):
    if r is None:
        return pm(k, mu)
    return math.exp(math.lgamma(k + r) - math.lgamma(k + 1) - math.lgamma(r) + r * math.log(r / (r + mu)) + k * math.log(mu / (r + mu)))


def grille(x, y, rho=0.0, r=None):
    g = {(a, b): nb(a, x, r) * nb(b, y, r) for a, b in CELLS}
    if rho:
        g[(0, 0)] *= max(0.01, 1 - x * y * rho)
        g[(0, 1)] *= max(0.01, 1 + x * rho)
        g[(1, 0)] *= max(0.01, 1 + y * rho)
        g[(1, 1)] *= max(0.01, 1 - rho)
    s = sum(g.values())
    return {k: v / s for k, v in g.items()}


def pertes(g, hg, ag):
    p1 = sum(v for (a, b), v in g.items() if a > b)
    px = sum(v for (a, b), v in g.items() if a == b)
    p2 = 1 - p1 - px
    ou = sum(v for (a, b), v in g.items() if a + b > 2.5)
    bt = sum(v for (a, b), v in g.items() if a > 0 and b > 0)
    L = lambda p: -math.log(max(p, 1e-9))
    r = 1 if hg > ag else 0 if hg == ag else 2
    lx = L((p1, px, p2)[0 if r == 1 else 1 if r == 0 else 2])
    lo = L(ou if hg + ag > 2.5 else 1 - ou)
    lb = L(bt if hg > 0 and ag > 0 else 1 - bt)
    return lx, lo, lb, L(g.get((int(hg), int(ag)), 1e-9))


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
    VAR = [(w, hl) for w in FENETRES for hl in OUBLIS]
    res = {v: {} for v in VAR}             # variante -> clé du match -> pertes
    h2h_res = {0: {}, .5: {}, 1.0: {}}
    scores = {}                            # modèle de score -> clé -> (pertes, top1, top3, total, xg)
    MOD = [("indépendants", 0.0, None), ("Dixon-Coles -0,10", -0.10, None), ("Dixon-Coles -0,05", -0.05, None), ("dispersion 15", 0.0, 15), ("dispersion 8", 0.0, 8), ("Dixon-Coles -0,05 + dispersion 15", -0.05, 15)]
    for nom, rho, r in MOD:
        scores[nom] = {}
    for league, hist in hists.items():
        rows = [(d, r) for d, r in hist if P.num(r.get("FTHG")) is not None and P.num(r.get("FTAG")) is not None]
        h2h = {}
        for d, r in rows:
            h2h.setdefault(frozenset((r["HomeTeam"], r["AwayTeam"])), []).append((d, r["HomeTeam"], P.num(r["FTHG"]), P.num(r["FTAG"])))
        for cd in B.CUTS[::2]:
            cut = now - timedelta(days=cd)
            fits = {}
            for w, hl in VAR:
                data = [((0.5 ** ((cut - d).days / hl)) if hl else 1.0, r["HomeTeam"], r["AwayTeam"], P.num(r["FTHG"]), P.num(r["FTAG"]))
                        for d, r in rows if d < cut and (cut - d).days <= w]
                if len(data) >= 150:
                    fits[(w, hl)] = P.fit(data)
            if (365, 240) not in fits:
                continue
            for d, r in rows:
                if not (cut <= d < cut + timedelta(days=120)):
                    continue
                H, A = r["HomeTeam"], r["AwayTeam"]
                hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
                key = (league, d, H, A)
                xy = {}
                for v, (mh, ma, att, dfn) in fits.items():
                    if H in att and A in att:
                        xy[v] = (mh * att[H] * dfn[A], ma * att[A] * dfn[H])
                        res[v][key] = pertes(grille(*xy[v]), hg, ag)
                base = (365, 240)
                if base not in xy:
                    continue
                x, y = xy[base]
                pri = [(hh, gh, ga_) for dd, hh, gh, ga_ in h2h.get(frozenset((H, A)), []) if dd < d and (d - dd).days <= 1500]
                if len(pri) >= 3:
                    n_ = len(pri)
                    sh = sum((gh if hh == H else ga_) for hh, gh, ga_ in pri)
                    sa = sum((ga_ if hh == H else gh) for hh, gh, ga_ in pri)
                    ghs, gas = (sh + 6 * x) / (n_ + 6), (sa + 6 * y) / (n_ + 6)
                    for w in h2h_res:
                        h2h_res[w][key] = pertes(grille(x + w * (ghs - x), y + w * (gas - y)), hg, ag)
                for nom, rho, rr in MOD:
                    g = grille(x, y, rho, rr)
                    top = sorted(g.items(), key=lambda kv: -kv[1])
                    real = (int(hg), int(ag))
                    scores[nom][key] = (pertes(g, hg, ag), top[0][0] == real, real in [t[0] for t in top[:3]], hg + ag, x + y, top[0][0], sum(v for (a, b), v in g.items() if a + b >= 4))
    L = ["RAPPORT n°9 : ÉTUDE DU MOTEUR DE BUTS", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"), ""]
    cles = set.intersection(*[set(res[v]) for v in VAR]) if all(res[v] for v in VAR) else set()
    if not cles:
        L.append("Pas assez de matchs pour comparer.")
    else:
        L.append(f"Matchs comparés : {len(cles)} (les mêmes pour toutes les variantes). Perte logarithmique moyenne : plus c'est bas, meilleur est le moteur.")
        L += ["", "A) Mémoire : fenêtre (jours ≈ matchs par équipe) et oubli (demi-vie)", "   fenêtre    oubli   |  1X2    plus/moins 2,5   deux équipes marquent   score exact"]
        tab = []
        for (w, hl) in VAR:
            m = [mean([res[(w, hl)][k][i] for k in cles]) for i in range(4)]
            tab.append(((w, hl), m))
            L.append(f"   {w:>4} j (~{round(w / 365 * 38):>2}) {str(hl) + ' j' if hl else 'aucun':>7} | {m[0]:.4f}   {m[1]:.4f}          {m[2]:.4f}               {m[3]:.4f}")
        meilleur = min(tab, key=lambda t: t[1][0] + t[1][1] + t[1][2])
        L.append(f"   Meilleure variante (somme des pertes) : fenêtre {meilleur[0][0]} jours (~{round(meilleur[0][0] / 365 * 38)} matchs par équipe), oubli {meilleur[0][1] or 'aucun'}")
        kh = set.intersection(*[set(h2h_res[w]) for w in h2h_res]) if all(h2h_res[w] for w in h2h_res) else set()
        L += ["", "B) Confrontations directes (matchs ayant au moins 3 confrontations récentes) :"]
        if len(kh) >= 100:
            for w, nom in ((0, "sans confrontations"), (.5, "confrontations à moitié"), (1.0, "confrontations en plein")):
                m = [mean([h2h_res[w][k][i] for k in kh]) for i in range(4)]
                L.append(f"   {nom:<26}: {len(kh)} matchs | 1X2 {m[0]:.4f} | 2,5 {m[1]:.4f} | deux marquent {m[2]:.4f} | score exact {m[3]:.4f}")
        else:
            L.append("   pas assez de matchs avec confrontations")
        L += ["", "C) Forme des scores avec la mémoire de 365 jours et demi-vie 240 jours :", "   modèle de score                         | 1X2     2,5     deux marquent  score exact | score n°1 | dans les 3 premiers"]
        ks = set.intersection(*[set(scores[n]) for n, _, _ in MOD])
        for nom, _, _ in MOD:
            m = [mean([scores[nom][k][0][i] for k in ks]) for i in range(4)]
            L.append(f"   {nom:<40}| {m[0]:.4f}  {m[1]:.4f}  {m[2]:.4f}        {m[3]:.4f}      | {100 * mean([scores[nom][k][1] for k in ks]):.1f} %   | {100 * mean([scores[nom][k][2] for k in ks]):.1f} %")
        L += ["", "   Matchs très ouverts (buts attendus 3,2 ou plus) : le moteur propose-t-il toujours 2-1, 1-1 ou 0-0 ?"]
        ou = [k for k in ks if scores["indépendants"][k][4] >= 3.2]
        if len(ou) >= 50:
            for nom in ("indépendants", "Dixon-Coles -0,05 + dispersion 15"):
                tops = [scores[nom][k][5] for k in ou]
                petits = sum(1 for t in tops if t in ((1, 1), (0, 0), (2, 1), (1, 0), (0, 1), (1, 2)))
                L.append(f"   {nom} : {len(ou)} matchs ; score n°1 parmi 0-0, 1-1, 1-0, 0-1, 2-1, 1-2 : {100 * petits / len(ou):.0f} % ; réel avec 3 buts ou plus : {100 * mean([scores[nom][k][3] >= 3 for k in ou]):.0f} % ; réussite du score n°1 : {100 * mean([scores[nom][k][1] for k in ou]):.1f} %")
        L += ["", "   4 buts ou plus : annoncé / réel (indépendants) : " + f"{100 * mean([scores['indépendants'][k][6] for k in ks]):.1f} % / {100 * mean([scores['indépendants'][k][3] >= 4 for k in ks]):.1f} %",
              "   4 buts ou plus : annoncé / réel (Dixon-Coles -0,05 + dispersion 15) : " + f"{100 * mean([scores['Dixon-Coles -0,05 + dispersion 15'][k][6] for k in ks]):.1f} % / {100 * mean([scores['Dixon-Coles -0,05 + dispersion 15'][k][3] >= 4 for k in ks]):.1f} %"]
    open("rapport9.txt", "w", encoding="utf-8").write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    run()
