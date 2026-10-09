"""Moteur de calcul avancé, à lancer à la place de predict.py (python predict2.py).
Plusieurs modèles travaillent ensemble pour les buts attendus de chaque équipe :
  A. forces d'attaque / de défense sur plusieurs saisons (qualité de l'adversaire incluse) + forme récente
  B. 10 derniers matchs de l'équipe à domicile, joués à domicile  /  10 derniers matchs de l'équipe visiteuse, joués à l'extérieur
  C. confrontations directes depuis 2021 (10 maximum, jamais complétées avec des zéros)
Le programme envoie aussi les matchs récents utilisés (pour choisir les lignes de marchés) et conserve les matchs terminés du jour."""
import csv
import io
import json
from datetime import datetime, timedelta, timezone

import predict as P

SINCE = datetime(2021, 1, 1, tzinfo=timezone.utc)
STATK = [("s", "HS", "AS"), ("c", "HST", "AST"), ("f", "HF", "AF"), ("k", "HY", "AY"), ("r", "HC", "AC")]


def _cl(v, a, b):
    return max(a, min(b, v))


def _avg(xs):
    return sum(xs) / len(xs) if xs else None


def _seasons():  # 6 saisons : de 2021/22 à la saison en cours
    now = datetime.now(timezone.utc)
    y = now.year if now.month >= 7 else now.year - 1
    return [f"{(y - i) % 100:02d}{(y - i + 1) % 100:02d}" for i in range(5, -1, -1)]


def _world(code):
    try:
        text = P.fetch(f"https://www.football-data.co.uk/new/{code}.csv")
    except Exception as e:
        print(f"  ! fichier {code} indisponible : {e}")
        return []
    rows = []
    for r in csv.DictReader(io.StringIO(text)):
        d = P.parse_date(r.get("Date") or "")
        if d and d >= SINCE and r.get("Home") and P.num(r.get("HG")) is not None and P.num(r.get("AG")) is not None:
            rows.append((d, {"HomeTeam": r["Home"], "AwayTeam": r["Away"], "FTHG": r["HG"], "FTAG": r["AG"]}))
    return rows


def _factors(rows, team, models, k):
    """Buts marqués / encaissés réels comparés aux buts attendus par le modèle (1 = conforme)."""
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


def _totals(rows, hc, ac):
    out = []
    for d, r in rows:
        a, b = P.num(r.get(hc)), P.num(r.get(ac))
        if a is not None and b is not None:
            out.append(int(a + b) if (a + b) == int(a + b) else round(a + b, 1))
    return out


def _previous():
    try:
        with open("predictions.json", encoding="utf-8") as f:
            return json.load(f).get("matches", [])
    except Exception:
        return []


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
    done = set()
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

        xa, ya = pred("x")
        rh = [z for z in hs if h in (z[1]["HomeTeam"], z[1]["AwayTeam"])]
        ra = [z for z in hs if a in (z[1]["HomeTeam"], z[1]["AwayTeam"])]
        fa_h, fd_h = _factors(rh[-6:], h, models, 3)  # modèle A : forme récente
        fa_a, fd_a = _factors(ra[-6:], a, models, 3)
        xa *= _cl((fa_h ** .4) * (fd_a ** .4), .8, 1.25)
        ya *= _cl((fa_a ** .4) * (fd_h ** .4), .8, 1.25)
        hh = [z for z in hs if z[1]["HomeTeam"] == h][-10:]  # modèle B : 10 derniers matchs à domicile
        aa = [z for z in hs if z[1]["AwayTeam"] == a][-10:]  # 10 derniers matchs à l'extérieur
        nb = min(len(hh), len(aa))
        gfh = [P.num(r["FTHG"]) for _, r in hh]; geh = [P.num(r["FTAG"]) for _, r in hh]
        gfa = [P.num(r["FTAG"]) for _, r in aa]; gea = [P.num(r["FTHG"]) for _, r in aa]
        meet = [z for z in hs if z[0] >= SINCE and {z[1]["HomeTeam"], z[1]["AwayTeam"]} == {h, a}][-10:]  # modèle C : H2H
        hm = [[P.num(r["FTHG"]), P.num(r["FTAG"])] if r["HomeTeam"] == h else [P.num(r["FTAG"]), P.num(r["FTHG"])] for _, r in meet]
        w, tx, ty = [.55], [xa], [ya]
        if nb >= 4:
            w.append(.3 * min(1, nb / 10)); tx.append((_avg(gfh) + _avg(gea)) / 2); ty.append((_avg(gfa) + _avg(geh)) / 2)
        if len(hm) >= 3:
            w.append(.15 * min(1, len(hm) / 10)); tx.append(_avg([g[0] for g in hm])); ty.append(_avg([g[1] for g in hm]))
        x = _cl(sum(a_ * b_ for a_, b_ in zip(w, tx)) / sum(w), .2, 4.5)
        y = _cl(sum(a_ * b_ for a_, b_ in zip(w, ty)) / sum(w), .2, 4.5)
        f = {"fh": _letters(rh, h), "fa": _letters(ra, a),
             "h2": [sum(1 for g in hm if g[0] > g[1]), sum(1 for g in hm if g[0] == g[1]), sum(1 for g in hm if g[0] < g[1]), len(hm)],
             "at": [round(att.get(h, 1), 2), round(att.get(a, 1), 2)], "df": [round(dfn.get(h, 1), 2), round(dfn.get(a, 1), 2)],
             "n": [len(hh), len(aa)]}
        z = {"gh": [[int(P.num(r["FTHG"])), int(P.num(r["FTAG"]))] for _, r in hh],
             "ga": [[int(P.num(r["FTAG"])), int(P.num(r["FTHG"]))] for _, r in aa],
             "hm": [[int(g[0]), int(g[1])] for g in hm]}
        for k, hc, ac in STATK:
            if k in models:
                z[k] = [_totals(hh, hc, ac), _totals(aa, hc, ac)]
        done.add((m["hs"], m["as"], m["d"]))
        out.append({"l": league, "h": m["hs"], "a": m["as"], "d": m["d"], "x": round(x, 2), "y": round(y, 2), "f": f, "z": z,
                    "hc": m.get("hc"), "ac": m.get("ac"), "i": m.get("i"), "st": m.get("st", "pre"), "sc": m.get("sc"),
                    "e": {k: [round(v, 2) for v in pred(k)] for k in models if k != "x"}})
    # matchs déjà joués (48 h) qui ne figurent plus dans les calendriers : on les garde, avec le score dès qu'il est publié
    for pm in _previous():
        if pm.get("l") != league or (pm["h"], pm["a"], pm["d"]) in done:
            continue
        dt = P.datetime.fromisoformat(pm["d"].replace("Z", "+00:00"))
        if not (now - timedelta(hours=48) <= dt < now):
            continue
        if not pm.get("sc"):
            h, a = P.match_team(pm["h"], known), P.match_team(pm["a"], known)
            for d, r in hist:
                if abs((d - dt).days) <= 1 and r["HomeTeam"] == h and r["AwayTeam"] == a:
                    pm["sc"] = [int(P.num(r["FTHG"])), int(P.num(r["FTAG"]))]
                    pm["st"] = "fin"
                    break
        out.append(pm)


P.seasons = _seasons
P.load_world = _world
P.MAX_LOOKUPS = 300
P.build = build2

if __name__ == "__main__":
    P.main()
