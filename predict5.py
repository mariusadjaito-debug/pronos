"""Calcul complet : clubs (predict4) + matchs de sélections nationales (intl). Lancé par update.yml."""
from datetime import datetime, timezone

import predict as P
import predict4  # noqa: F401  (règle le calcul des clubs)
import intl

_prev = P.add_crests


def _avec_selections(out):
    try:
        diag = intl.add(out, datetime.now(timezone.utc))
    except Exception as e:  # une panne des sélections ne doit jamais bloquer les clubs
        diag = f"sélections : erreur {e}"
    print(diag)
    out.sort(key=lambda m: m["d"])
    crests = _prev(out)
    crests["__intl"] = diag
    return crests


P.add_crests = _avec_selections

if __name__ == "__main__":
    P.main()
