"""Calcul « pro » (python predict3.py) : modèle d'hier + second modèle indépendant (Elo) + fatigue + accord des modèles.
  1. modèle d'hier : forces d'attaque / défense sur 3 saisons, forme, domicile / extérieur, confrontations (predict2.py)
  2. modèle Elo : classement de force qui s'adapte match après match (mémoire longue, marge de victoire)
  3. les deux écarts de buts sont mélangés (75 % / 25 %), le total de buts reste celui du modèle principal
  4. fatigue : une équipe qui rejoue après 3 jours ou moins perd un peu d'efficacité
  5. indice d'accord : si les deux modèles ne voient pas le match de la même façon, la confiance baisse"""
import json
import urllib.error
from datetime import datetime, timedelta, timezone

import predict as P
import predict2 as V

HA = 65  # avantage du terrain, en points Elo
# force relative des championnats (points Elo, estimation d'après les classements UEFA) : sert à comparer des clubs de pays différents
OFFSET = {"Premier League": 110, "La Liga": 90, "Serie A": 70, "Bundesliga": 70, "Ligue 1": 30, "Primeira Liga": 0, "Eredivisie": -10,
          "Belgique": -20, "Autriche": -30, "Turquie": -40, "Danemark": -40, "Suisse": -50, "Championship": -30, "Écosse": -60,
          "Grèce": -60, "Norvège": -60, "Suède": -60, "Pologne": -70, "Russie": -60, "Roumanie": -80, "Irlande": -100, "Finlande": -100}
EUROPE = [("Ligue des champions", "CL"), ("Ligue Europa", "EL")]
KNOWN_ALL, SEEN = {}, set()
DIAG = []  # rapport lisible dans predictions.json (champ « __europe » de « crests »)


def _diag(name, code):
    """Dit si la clé a accès à la compétition et quand est le prochain match (30 jours)."""
    a = datetime.now(timezone.utc)
    url = (f"https://api.football-data.org/v4/competitions/{code}/matches"
           f"?dateFrom={a:%Y-%m-%d}&dateTo={a + timedelta(days=30):%Y-%m-%d}")
    try:
        ms = json.loads(P.fetch(url, {"X-Auth-Token": P.KEY})).get("matches", [])
        nxt = min((m["utcDate"] for m in ms), default=None)
        proches = sum(1 for m in ms if m["utcDate"] < (a + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ"))
        return f"{code} ({name}) : accès OK · {proches} match(s) dans les 7 jours · prochain match : {nxt or 'aucun dans les 30 jours'}"
    except urllib.error.HTTPError as e:
        return f"{code} ({name}) : REFUSÉ par la clé (erreur HTTP {e.code})"
    except Exception as e:
        return f"{code} ({name}) : erreur {str(e)[:70]}"


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


def _register(league, hist):
    """Mémorise la force Elo de chaque club (et son nombre moyen de buts par match) pour les compétitions européennes."""
    R = _elo(hist)
    off = OFFSET.get(league, -70)
    tots = {}
    for d, r in sorted(hist, key=lambda z: z[0]):
        hg, ag = P.num(r["FTHG"]), P.num(r["FTAG"])
        if hg is not None and ag is not None:
            for t in (r["HomeTeam"], r["AwayTeam"]):
                tots.setdefault(t, []).append(hg + ag)
    for t, v in R.items():
        last = tots.get(t, [])[-30:]
        KNOWN_ALL[P.norm(t)] = (v + off, sum(last) / len(last) if last else 2.7)
    SEEN.add(league)


def _lookup(name):
    n = P.norm(name)
    n = P.ALIAS.get(n, n)
    if n in KNOWN_ALL:
        return KNOWN_ALL[n]
    k = P.match_team(name, {k: k for k in KNOWN_ALL}) if KNOWN_ALL else None
    return KNOWN_ALL.get(k)


def _loaders():
    for league, (div, code) in P.LEAGUES.items():
        yield league, (lambda div=div: P.load_history(div))
    for league, div in P.EXTRA.items():
        yield league, (lambda div=div: P.load_history(div))
    for league, (code, country) in P.WORLD.items():
        yield league, (lambda code=code: P.load_world(code))


def _europe(out, now):
    DIAG.clear()
    DIAG.extend(_diag(n, c) for n, c in EUROPE)
    for line in DIAG:
        print(line)
    fxs = [(n, P.fixtures(c)) for n, c in EUROPE]
    fxs = [(n, f) for n, f in fxs if f]
    if not fxs:
        print("compétitions européennes : aucun match (ou accès refusé par la clé)")
        return
    names = {t for _, f in fxs for m in f for t in (m["h"], m["a"])}
    if any(_lookup(t) is None for t in names):
        for league, load in _loaders():
            if league in SEEN:
                continue
            try:
                _register(league, load())
            except Exception as e:
                print("  ! historique", league, ":", e)
            if all(_lookup(t) is not None for t in names):
                break
    for name, f in fxs:
        print(name, "-", len(f), "matchs")
        for m in f:
            rh, th = _lookup(m["h"]) or (1380.0, 2.7)
            ra, ta = _lookup(m["a"]) or (1380.0, 2.7)
            t = max(2.2, min(3.4, .5 * 2.75 + .5 * (th + ta) / 2))
            gd = (rh + HA - ra) / 260
            out.append({"l": name, "h": m["hs"], "a": m["as"], "d": m["d"], "x": round(max(.2, (t + gd) / 2), 2), "y": round(max(.2, (t - gd) / 2), 2),
                        "f": {"fh": "", "fa": "", "h2": [0, 0, 0, 0], "at": [1, 1], "df": [1, 1], "elo": [round(rh), round(ra)]},
                        "hc": m.get("hc"), "ac": m.get("ac"), "i": m.get("i"), "st": m.get("st", "pre"), "sc": m.get("sc"), "e": {}})


_orig_crests = P.add_crests


def _crests_with_europe(out):
    try:
        _europe(out, datetime.now(timezone.utc))
    except Exception as e:
        print("  ! compétitions européennes :", e)
    out.sort(key=lambda m: m["d"])
    crests = _orig_crests(out)
    crests["__europe"] = " | ".join(DIAG) if DIAG else "compétitions européennes : non exécuté"
    return crests


def build3(league, hist, fx, out, now):
    n0 = len(out)
    V.build2(league, hist, fx, out, now)
    _register(league, hist)
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
P.add_crests = _crests_with_europe

if __name__ == "__main__":
    P.main()
