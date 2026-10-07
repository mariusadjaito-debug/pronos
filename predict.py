"""Pronos : télécharge les données gratuites, calcule les pronostics, écrit predictions.json.
Aucune installation nécessaire (bibliothèque standard Python uniquement)."""
import csv, io, json, os, re, unicodedata, urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from difflib import get_close_matches

# nom affiché : (code du fichier CSV football-data.co.uk, code football-data.org)
LEAGUES = {
    "Ligue 1": ("F1", "FL1"),
    "Premier League": ("E0", "PL"),
    "La Liga": ("SP1", "PD"),
    "Serie A": ("I1", "SA"),
    "Bundesliga": ("D1", "BL1"),"Championship": ("E1", "ELC"),
"Eredivisie": ("N1", "DED"),
"Primeira Liga": ("P1", "PPL"),
}
# clé, colonne domicile, colonne extérieur (tirs, cadrés, fautes, jaunes, hors-jeu)
STATS = [("s", "HS", "AS"), ("c", "HST", "AST"), ("f", "HF", "AF"), ("k", "HY", "AY"), ("o", "HO", "AO")]
STATS.append(("r", "HC", "AC"))ALIAS = {
    "paris saint germain": "paris sg", "manchester united": "man united", "manchester city": "man city",
    "wolverhampton wanderers": "wolves", "tottenham hotspur": "tottenham", "nottingham forest": "nott m forest",
    "atletico madrid": "ath madrid", "athletic club": "ath bilbao", "espanyol": "espanol",
    "internazionale milano": "inter", "borussia monchengladbach": "m gladbach",
    "eintracht frankfurt": "ein frankfurt", "bayern munchen": "bayern munich",
}
STOP = {"fc", "afc", "cf", "ac", "sc", "ssc", "as", "ss", "rc", "ogc", "sv", "vfl", "vfb", "tsg", "fsv", "de", "club", "calcio", "balompie"}
HALF_LIFE = 270  # jours : un match vieux de 270 jours compte moitié moins
KEY = os.environ.get("FOOTBALL_DATA_KEY", "")


def fetch(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8-sig", errors="replace")


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def seasons():  # les 3 dernières saisons, ex. 2425, 2526, 2627
    now = datetime.now(timezone.utc)
    y = now.year if now.month >= 7 else now.year - 1
    return [f"{(y - i) % 100:02d}{(y - i + 1) % 100:02d}" for i in (2, 1, 0)]


def parse_date(s):
    for f in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(s.strip(), f).replace(tzinfo=timezone.utc)
        except ValueError:
            pass


def load_history(div):
    rows = []
    for s in seasons():
        try:
            text = fetch(f"https://www.football-data.co.uk/mmz4281/{s}/{div}.csv")
        except Exception as e:
            print(f"  ! saison {s} indisponible : {e}")
            continue
        for r in csv.DictReader(io.StringIO(text)):
            d = parse_date(r.get("Date") or "")
            if d and r.get("HomeTeam") and num(r.get("FTHG")) is not None and num(r.get("FTAG")) is not None:
                rows.append((d, r))
    return rows


def fit(data, k=2.0, iters=15):
    """Force d'attaque / de défense de chaque équipe pour une statistique (rapprochée de 1 si peu de matchs)."""
    sw = sum(d[0] for d in data)
    mh = sum(w * hv for w, _, _, hv, _ in data) / sw
    ma = sum(w * av for w, _, _, _, av in data) / sw
    m = (mh + ma) / 2
    teams = {t for _, h, a, _, _ in data for t in (h, a)}
    att = {t: 1.0 for t in teams}
    dfn = dict(att)
    for _ in range(iters):
        nu, de = defaultdict(float), defaultdict(float)
        for w, h, a, hv, av in data:
            nu[h] += w * hv; de[h] += w * mh * dfn[a]
            nu[a] += w * av; de[a] += w * ma * dfn[h]
        att = {t: (nu[t] + k * m) / (de[t] + k * m) for t in teams}
        nu, de = defaultdict(float), defaultdict(float)
        for w, h, a, hv, av in data:
            nu[a] += w * hv; de[a] += w * mh * att[h]
            nu[h] += w * av; de[h] += w * ma * att[a]
        dfn = {t: (nu[t] + k * m) / (de[t] + k * m) for t in teams}
    return mh, ma, att, dfn


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return " ".join(t for t in re.sub(r"[^a-z0-9]+", " ", s).split() if t not in STOP and not t.isdigit())


def match_team(name, known):
    n = norm(name)
    n = ALIAS.get(n, n)
    if n in known:
        return known[n]
    for k, v in known.items():
        if len(k) >= 4 and (k in n or n in k):
            return v
    c = get_close_matches(n, list(known), n=1, cutoff=0.6)
    return known[c[0]] if c else None


def fixtures(code):
    if not KEY:
        print("  ! clé FOOTBALL_DATA_KEY absente : pas de calendrier")
        return []
    a = datetime.now(timezone.utc)
    url = (f"https://api.football-data.org/v4/competitions/{code}/matches"
           f"?dateFrom={a:%Y-%m-%d}&dateTo={a + timedelta(days=7):%Y-%m-%d}")
    try:
        data = json.loads(fetch(url, {"X-Auth-Token": KEY}))
    except Exception as e:
        print(f"  ! calendrier indisponible : {e}")
        return []
    return [m for m in data.get("matches", []) if m.get("status") in ("SCHEDULED", "TIMED")]


def main():
    out, now = [], datetime.now(timezone.utc)
    for league, (div, code) in LEAGUES.items():
        print(league)
        hist = load_history(div)
        if not hist:
            print("  ! aucune donnée historique")
            continue
        known = {norm(t): t for _, r in hist for t in (r["HomeTeam"], r["AwayTeam"])}
        models = {}
        for key, hc, ac in [("x", "FTHG", "FTAG")] + STATS:
            data = []
            for d, r in hist:
                hv, av = num(r.get(hc)), num(r.get(ac))
                if hv is not None and av is not None:
                    data.append((0.5 ** ((now - d).days / HALF_LIFE), r["HomeTeam"], r["AwayTeam"], hv, av))
            if len(data) > 50:
                models[key] = fit(data)
            else:
                print(f"  - statistique {key} ignorée (données absentes)")
        if "x" not in models:
            continue
        for m in fixtures(code):
            h = match_team(m["homeTeam"]["name"], known)
            a = match_team(m["awayTeam"]["name"], known)
            if not h or not a:
                print("  ? équipe inconnue :", m["homeTeam"]["name"], "/", m["awayTeam"]["name"])
                continue

            def pred(k):
                mh, ma, att, dfn = models[k]
                return [round(mh * att.get(h, 1) * dfn.get(a, 1), 2), round(ma * att.get(a, 1) * dfn.get(h, 1), 2)]

            x, y = pred("x")
            out.append({"l": league, "h": m["homeTeam"].get("shortName") or m["homeTeam"]["name"],
                        "a": m["awayTeam"].get("shortName") or m["awayTeam"]["name"], "d": m["utcDate"],
                        "x": x, "y": y, "e": {k: pred(k) for k in models if k != "x"}})
    out.sort(key=lambda m: m["d"])
    with open("predictions.json", "w", encoding="utf-8") as f:
        json.dump({"updated": now.strftime("%d/%m/%Y %H:%M UTC"), "matches": out}, f, ensure_ascii=False, indent=1)
    print(len(out), "matchs écrits dans predictions.json")


if __name__ == "__main__":
    main()
