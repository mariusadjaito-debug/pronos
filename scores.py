"""Met à jour rapidement les scores et l'état des matchs (écrit scores.json).
Aucune installation nécessaire. Utilise la même clé FOOTBALL_DATA_KEY."""
import json, os, time, urllib.request
from datetime import datetime, timedelta, timezone

CODES = ["FL1", "PL", "PD", "SA", "BL1", "ELC", "DED", "PPL", "CL", "EL"]  # championnats et coupes d'Europe de football-data.org
OPTIONNELS = {"CL", "EL"}  # si la clé n'y a pas accès, on les ignore sans bloquer le reste
KEY = os.environ.get("FOOTBALL_DATA_KEY", "")
STATE = {"IN_PLAY": "live", "PAUSED": "live", "FINISHED": "fin"}


def main():
    if not KEY:
        print("clé FOOTBALL_DATA_KEY absente")
        return
    now = datetime.now(timezone.utc)
    out, complet = {}, True
    for code in CODES:
        url = (f"https://api.football-data.org/v4/competitions/{code}/matches"
               f"?dateFrom={now - timedelta(days=1):%Y-%m-%d}&dateTo={now + timedelta(days=1):%Y-%m-%d}")
        try:
            req = urllib.request.Request(url, headers={"X-Auth-Token": KEY, "User-Agent": "Mozilla/5.0"})
            data = json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8"))
        except Exception as e:
            print(code, "indisponible :", e)
            if code not in OPTIONNELS:
                complet = False
            continue
        for m in data.get("matches", []):
            st = STATE.get(m.get("status"))
            if st:
                ft = (m.get("score") or {}).get("fullTime") or {}
                out[str(m["id"])] = [st, ft.get("home"), ft.get("away"), m.get("minute"), m.get("status")]
        time.sleep(1.5)
    if not complet:
        print("données incomplètes : scores.json inchangé")
        return
    try:
        with open("scores.json", encoding="utf-8") as f:
            ancien = json.load(f).get("m")
    except Exception:
        ancien = None
    if ancien == out:
        print("aucun changement")
        return
    with open("scores.json", "w", encoding="utf-8") as f:
        json.dump({"u": now.strftime("%H:%M UTC"), "t": int(now.timestamp()), "m": out}, f, ensure_ascii=False)
    print(len(out), "matchs mis à jour")


if __name__ == "__main__":
    main()
