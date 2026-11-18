name: Correctif v6 - étoiles du jour
on:
  workflow_dispatch:
permissions:
  contents: write
jobs:
  patch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Appliquer le correctif
        run: python3 patch_v6.py
      - name: Enregistrer
        run: |
          git config user.name "pronos-bot"
          git config user.email "pronos-bot@users.noreply.github.com"
          git add smartpick.js
          git diff --staged --quiet || (git commit -m "Correctif v6" && git pull --rebase origin main && git push)
