"""Boucle rapide des scores en direct (lancée toutes les 5 minutes par live.yml, tourne environ 4 min 30).
Interroge football-data.org toutes les 15 secondes avec UNE seule requête, et publie scores.json sur la branche « live »
dès qu'un score ou une minute change (cette branche ne redéploie pas le site : l'application la lit directement)."""
import json
import os
import subprocess
import time
import urllib.request
from datetime import datetime, timedelta, timezone

KEY = os.environ.get("FOOTBALL_DATA_KEY", "")
STATE = {"IN_PLAY": "live", "PAUSED": "live", "FINISHED": "fin"}
DUREE, PAUSE = 270, 15  # secondes


def lire():
    now = datetime.now(timezone.utc)
    url = (f"https://api.football-data.org/v4/matches?dateFrom={now - timedelta(days=1):%Y-%m-%d}"
           f"&dateTo={now + timedelta(days=1):%Y-%m-%d}")
    req = urllib.request.Request(url, headers={"X-Auth-Token": KEY, "User-Agent": "Mozilla/5.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=20).read().decode("utf-8"))
    out = {}
    for m in data.get("matches", []):
        st = STATE.get(m.get("status"))
        if st:
            ft = (m.get("score") or {}).get("fullTime") or {}
            out[str(m["id"])] = [st, ft.get("home"), ft.get("away"), m.get("minute"), m.get("status")]
    return out


STATS = {"s": "shots", "c": "shots_on_goal", "f": "fouls", "k": "yellow_cards", "r": "corner_kicks"}
LS = {}  # statistiques en direct déjà reçues (identifiant du match -> {clé: [domicile, extérieur]})


def detail(mid):
    """Statistiques en direct d'un match, si le plan de la clé les fournit (sinon rien, sans erreur)."""
    req = urllib.request.Request(f"https://api.football-data.org/v4/matches/{mid}",
                                 headers={"X-Auth-Token": KEY, "User-Agent": "Mozilla/5.0"})
    d = json.loads(urllib.request.urlopen(req, timeout=20).read().decode("utf-8"))
    h, a = (d.get("homeTeam") or {}).get("statistics") or {}, (d.get("awayTeam") or {}).get("statistics") or {}
    ls = {k: [h[n], a[n]] for k, n in STATS.items() if h.get(n) is not None and a.get(n) is not None}
    if ls:
        LS[mid] = ls


def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)


def publier(out):
    now = datetime.now(timezone.utc)
    with open("scores.json", "w", encoding="utf-8") as f:
        json.dump({"u": now.strftime("%H:%M:%S UTC"), "t": int(now.timestamp()), "m": out}, f, ensure_ascii=False)
    sh("git add -f scores.json")
    sh('git -c user.name=pronos-bot -c user.email=pronos-bot@users.noreply.github.com commit -q -m "scores"')
    r = sh("git push -f -q origin HEAD:refs/heads/live")
    print(now.strftime("%H:%M:%S"), len(out), "matchs", "publié" if r.returncode == 0 else "ERREUR " + r.stderr[:120])


def main():
    if not KEY:
        print("clé FOOTBALL_DATA_KEY absente")
        return
    fin, dernier, t_pub, t_det = time.time() + DUREE, None, 0, 0
    while time.time() < fin:
        try:
            out = lire()
            direct = any(v[0] == "live" for v in out.values())
            if direct and time.time() - t_det >= 60:  # statistiques détaillées : 4 matchs en direct par minute au maximum
                t_det = time.time()
                for mid in [k for k, v in out.items() if v[0] == "live"][:4]:
                    try:
                        detail(mid)
                    except Exception:
                        pass
            for mid, ls in LS.items():
                if mid in out and out[mid][0] == "live":
                    out[mid] = out[mid][:5] + [ls]
            if out != dernier or (direct and time.time() - t_pub >= 45):
                publier(out)
                dernier, t_pub = out, time.time()
        except Exception as e:
            print("lecture impossible :", str(e)[:100])
        time.sleep(PAUSE)


if __name__ == "__main__":
    main()
