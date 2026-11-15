"""Matchs de sélections nationales (Ligue des Nations, amicaux) : buts probables seulement, sans statistiques (aucune donnée gratuite).
Historique : résultats internationaux publics (martj42/international_results). Matchs du jour : ESPN (flux public gratuit, sans clé).
Chaque pays est ramené à un nom unique ; le nom affiché est en français ; le drapeau sert de logo."""
import csv
import difflib
import io
import json
import re
import unicodedata
from datetime import datetime, timedelta, timezone

import predict as P
import predict4 as V4

RESULTS = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard?dates={day}"
ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/summary?event={id}"
COMPETITIONS = {"uefa.nations": "Ligue des Nations", "fifa.friendly": "Matchs amicaux"}
HALF_LIFE, WINDOW = 365, 1460  # jours
STATE = {"pre": "pre", "in": "live", "post": "fin"}
# nom du fichier de résultats : (nom affiché en français, code du drapeau)
TEAMS = {
    "Albania": ("Albanie", "al"), "Andorra": ("Andorre", "ad"), "Armenia": ("Arménie", "am"), "Austria": ("Autriche", "at"),
    "Azerbaijan": ("Azerbaïdjan", "az"), "Belarus": ("Biélorussie", "by"), "Belgium": ("Belgique", "be"),
    "Bosnia and Herzegovina": ("Bosnie-Herzégovine", "ba"), "Bulgaria": ("Bulgarie", "bg"), "Croatia": ("Croatie", "hr"),
    "Cyprus": ("Chypre", "cy"), "Czech Republic": ("République tchèque", "cz"), "Denmark": ("Danemark", "dk"),
    "England": ("Angleterre", "gb-eng"), "Estonia": ("Estonie", "ee"), "Faroe Islands": ("Îles Féroé", "fo"),
    "Finland": ("Finlande", "fi"), "France": ("France", "fr"), "Georgia": ("Géorgie", "ge"), "Germany": ("Allemagne", "de"),
    "Gibraltar": ("Gibraltar", "gi"), "Greece": ("Grèce", "gr"), "Hungary": ("Hongrie", "hu"), "Iceland": ("Islande", "is"),
    "Israel": ("Israël", "il"), "Italy": ("Italie", "it"), "Kazakhstan": ("Kazakhstan", "kz"), "Kosovo": ("Kosovo", "xk"),
    "Latvia": ("Lettonie", "lv"), "Liechtenstein": ("Liechtenstein", "li"), "Lithuania": ("Lituanie", "lt"),
    "Luxembourg": ("Luxembourg", "lu"), "Malta": ("Malte", "mt"), "Moldova": ("Moldavie", "md"), "Montenegro": ("Monténégro", "me"),
    "Netherlands": ("Pays-Bas", "nl"), "North Macedonia": ("Macédoine du Nord", "mk"), "Northern Ireland": ("Irlande du Nord", "gb-nir"),
    "Norway": ("Norvège", "no"), "Poland": ("Pologne", "pl"), "Portugal": ("Portugal", "pt"), "Republic of Ireland": ("Irlande", "ie"),
    "Romania": ("Roumanie", "ro"), "Russia": ("Russie", "ru"), "San Marino": ("Saint-Marin", "sm"), "Scotland": ("Écosse", "gb-sct"),
    "Serbia": ("Serbie", "rs"), "Slovakia": ("Slovaquie", "sk"), "Slovenia": ("Slovénie", "si"), "Spain": ("Espagne", "es"),
    "Sweden": ("Suède", "se"), "Switzerland": ("Suisse", "ch"), "Turkey": ("Turquie", "tr"), "Ukraine": ("Ukraine", "ua"),
    "Wales": ("Pays de Galles", "gb-wls"), "Brazil": ("Brésil", "br"), "Argentina": ("Argentine", "ar"),
    "United States": ("États-Unis", "us"), "Mexico": ("Mexique", "mx"), "Japan": ("Japon", "jp"), "South Korea": ("Corée du Sud", "kr"),
    "Morocco": ("Maroc", "ma"), "Senegal": ("Sénégal", "sn"), "Colombia": ("Colombie", "co"), "Uruguay": ("Uruguay", "uy"),
    "Canada": ("Canada", "ca"), "Australia": ("Australie", "au"), "Egypt": ("Égypte", "eg"), "Nigeria": ("Nigeria", "ng"),
    "Ghana": ("Ghana", "gh"), "Iran": ("Iran", "ir"), "Saudi Arabia": ("Arabie saoudite", "sa"), "Qatar": ("Qatar", "qa"),
    "Algeria": ("Algérie", "dz"), "Tunisia": ("Tunisie", "tn"), "Cameroon": ("Cameroun", "cm"), "Ivory Coast": ("Côte d'Ivoire", "ci"),
    "Chile": ("Chili", "cl"), "Peru": ("Pérou", "pe"), "Ecuador": ("Équateur", "ec"), "Paraguay": ("Paraguay", "py"),
    "Venezuela": ("Venezuela", "ve"), "Bolivia": ("Bolivie", "bo"), "Costa Rica": ("Costa Rica", "cr"), "Panama": ("Panama", "pa"),
    "Jamaica": ("Jamaïque", "jm"), "Honduras": ("Honduras", "hn"),
}
ALIAS = {"czechia": "Czech Republic", "turkiye": "Turkey", "ireland": "Republic of Ireland", "eire": "Republic of Ireland",
         "bosnia herzegovina": "Bosnia and Herzegovina", "bosnia": "Bosnia and Herzegovina", "macedonia": "North Macedonia",
         "usa": "United States", "united states of america": "United States", "korea republic": "South Korea",
         "cote d ivoire": "Ivory Coast", "russia federation": "Russia", "faroe": "Faroe Islands"}


def key(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def make_canon(names):
    keys = {key(n): n for n in names}
    keys.update({key(n): n for n in TEAMS})

    def canon(name):
        k = key(name)
        if k in ALIAS:
            return ALIAS[k]
        if k in keys:
            return keys[k]
        m = difflib.get_close_matches(k, list(keys), n=1, cutoff=0.88)
        return keys[m[0]] if m else None
    return canon


def history(now):
    rows = list(csv.DictReader(io.StringIO(P.fetch(RESULTS))))
    recs = []
    for r in rows:
        try:
            d = datetime.strptime(r["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            hs, as_ = int(float(r["home_score"])), int(float(r["away_score"]))
        except (ValueError, KeyError):
            continue
        if (now - d).days > WINDOW:
            continue
        recs.append((d, r["home_team"], r["away_team"], hs, as_, str(r.get("neutral", "")).upper() == "TRUE", r.get("tournament", "")))
    recs.sort(key=lambda z: z[0])
    return recs


def probe(slug, now):
    """Diagnostic : ESPN donne-t-il des statistiques (tirs, corners, fautes) pour un match terminé récent ?"""
    for off in range(-1, -6, -1):
        try:
            data = json.loads(P.fetch(ESPN.format(slug=slug, day=f"{now + timedelta(days=off):%Y%m%d}")))
        except Exception as e:
            return f"{slug} stats : erreur {str(e)[:40]}"
        for ev in data.get("events", []):
            if ev.get("status", {}).get("type", {}).get("state") == "post":
                try:
                    d = json.loads(P.fetch(ESPN_SUMMARY.format(slug=slug, id=ev["id"])))
                    st = d["boxscore"]["teams"][0]["statistics"]
                    return f"{slug} stats : {len(st)} (" + ", ".join(str(x.get("name", "?")) for x in st[:10]) + ")"
                except Exception as e:
                    return f"{slug} stats : aucune ({str(e)[:40]})"
    return f"{slug} stats : aucun match terminé trouvé"


def fx_list(now):
    """Matchs d'hier aux 7 prochains jours, un jour à la fois (la forme la plus sûre pour ESPN) : liste + diagnostic."""
    res, diag, seen = [], [], set()
    for slug, league in COMPETITIONS.items():
        n, err = 0, ""
        for off in range(-1, 8):
            day = f"{now + timedelta(days=off):%Y%m%d}"
            try:
                data = json.loads(P.fetch(ESPN.format(slug=slug, day=day)))
            except Exception as e:
                err = err or str(e)[:60]
                continue
            for ev in data.get("events", []):
                try:
                    if (slug, ev["id"]) in seen:
                        continue
                    comp = ev["competitions"][0]
                    cs = {c["homeAway"]: c for c in comp["competitors"]}
                    st = STATE.get(ev["status"]["type"]["state"])
                    if not st:
                        continue
                    d = ev["date"] if len(ev["date"]) > 17 else ev["date"].replace("Z", ":00Z")
                    sc = None if st == "pre" else [int(float(cs["home"].get("score") or 0)), int(float(cs["away"].get("score") or 0))]
                    res.append({"league": league, "d": d, "h": cs["home"]["team"]["displayName"], "a": cs["away"]["team"]["displayName"],
                                "st": st, "sc": sc, "neutral": bool(comp.get("neutralSite"))})
                    seen.add((slug, ev["id"]))
                    n += 1
                except (KeyError, IndexError, ValueError):
                    continue
        diag.append(f"{slug}: {n} matchs" + (f" (erreur : {err})" if err else ""))
    for slug in ("uefa.nations", "bra.1", "mex.1"):
        try:
            diag.append(probe(slug, now))
        except Exception as e:
            diag.append(f"{slug} stats : erreur {str(e)[:40]}")
    return res, diag


def flag(c):
    t = TEAMS.get(c)
    return f"https://flagcdn.com/w80/{t[1]}.png" if t else None


def add(out, now):
    fx, diag = fx_list(now)
    fx = [m for m in fx if datetime.fromisoformat(m["d"].replace("Z", "+00:00")) >= now - timedelta(hours=30)]
    if not fx:
        return "sélections : aucun match (" + " ; ".join(diag) + ")"
    recs = history(now)
    if len(recs) < 500:
        return f"sélections : historique insuffisant ({len(recs)} matchs)"
    canon = make_canon({n for r in recs for n in (r[1], r[2])})
    data = [(0.5 ** ((now - d).days / HALF_LIFE) * (0.6 if t == "Friendly" else 1.0), h, a, hs, as_)
            for d, h, a, hs, as_, neutral, t in recs if not neutral]
    mh, ma, att, dfn = V4._fit(data, k=1.0)
    mid = (mh + ma) / 2
    by = {}
    for d, h, a, hs, as_, neutral, t in recs:
        by.setdefault(h, []).append((d, hs, as_, neutral, True))
        by.setdefault(a, []).append((d, as_, hs, neutral, False))
    added, unknown = 0, []
    for m in fx:
        h, a = canon(m["h"]), canon(m["a"])
        if not h or not a or h not in att or a not in att:
            unknown.append(m["h"] if not h or h not in att else m["a"])
            continue
        if m["neutral"]:
            x, y = mid * att[h] * dfn[a], mid * att[a] * dfn[h]
        else:
            x, y = mh * att[h] * dfn[a], ma * att[a] * dfn[h]
        th = [[g[1], g[2]] for g in by[h][-30:]]
        ta = [[g[1], g[2]] for g in by[a][-30:]]
        gh = [[g[1], g[2]] for g in by[h] if g[4] and not g[3]][-10:]
        ga = [[g[1], g[2]] for g in by[a] if not g[4] and not g[3]][-10:]
        hm = []
        for d, hh, aa, hs, as_, neutral, t in recs:
            if (hh, aa) == (h, a):
                hm.append([hs, as_])
            elif (hh, aa) == (a, h):
                hm.append([as_, hs])
        hm = hm[-10:]
        letters = lambda L: "".join("V" if g[0] > g[1] else "N" if g[0] == g[1] else "D" for g in L[-5:])
        out.append({"l": m["league"], "h": TEAMS.get(h, (m["h"],))[0], "a": TEAMS.get(a, (m["a"],))[0], "d": m["d"],
                    "x": round(max(.2, min(4.5, x)), 2), "y": round(max(.2, min(4.5, y)), 2),
                    "hc": flag(h), "ac": flag(a), "i": None, "st": m["st"], "sc": m["sc"], "e": {},
                    "f": {"fh": letters(th), "fa": letters(ta), "h2": [sum(g[0] > g[1] for g in hm), sum(g[0] == g[1] for g in hm), sum(g[0] < g[1] for g in hm), len(hm)],
                          "at": [round(att[h], 2), round(att[a], 2)], "df": [round(dfn[h], 2), round(dfn[a], 2)], "nm": [len(by[h]), len(by[a])]},
                    "z": {"th": th, "ta": ta, "gh": gh if len(gh) >= 5 else th[-10:], "ga": ga if len(ga) >= 5 else ta[-10:], "hm": hm}})
        added += 1
    msg = f"sélections : {added} matchs ajoutés (" + " ; ".join(diag) + ")"
    if unknown:
        msg += " ; équipes inconnues : " + ", ".join(sorted(set(unknown)))
    return msg
