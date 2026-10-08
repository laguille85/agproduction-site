"""Télécharge les images listées dans outils/images-a-rapatrier.txt vers images/externes/.
Lancé automatiquement par GitHub Actions (le conteneur de travail n'a pas accès à ces serveurs)."""
import os, re, sys, time, urllib.request, urllib.parse

DEST = "images/externes"
os.makedirs(DEST, exist_ok=True)
ok = fail = 0
for url in open("outils/images-a-rapatrier.txt", encoding="utf-8").read().split():
    p = urllib.parse.urlparse(url)
    host = p.netloc.split(".")[-2]          # myportfolio, wikimedia, vimeocdn
    name = os.path.basename(p.path) or "image"
    if host == "vimeocdn" and "." not in name:
        name += ".jpg"
    if "ccvproxy" in p.path:                 # vidéos Adobe : une version par largeur
        q = urllib.parse.parse_qs(p.query)
        name = f"video-{name}-{q.get('width', ['x'])[0]}.mp4"
    name = re.sub(r"[^A-Za-z0-9._-]", "_", f"{host}-{name}")
    out = os.path.join(DEST, name)
    if os.path.exists(out) and os.path.getsize(out) > 0:
        ok += 1; continue
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (rapatriement AG Production)"})
            with urllib.request.urlopen(req, timeout=60) as r, open(out, "wb") as f:
                f.write(r.read())
            ok += 1; break
        except Exception as e:
            if attempt == 2:
                fail += 1; print("ÉCHEC", url, e, file=sys.stderr)
            time.sleep(5)
print(f"{ok} images OK, {fail} échecs")
