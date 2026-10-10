"""Versions allégées des photos pour les téléphones et les grilles.

Pour chaque JPEG de images/{photos,projets,particuliers,externes,films,savoir-faire}, crée à côté
une copie « -w800.jpg » de 800 px de large (ou moins si l'original est plus petit).
Le site sert cette copie aux petits écrans et dans les grilles, et l'original aux grands écrans.
Si Pillow n'est pas installé, ne fait rien : le site garde alors simplement les originaux.
"""
import os

DIRS = ("photos", "projets", "particuliers", "externes", "films", "savoir-faire")
SUFFIX = "-w800.jpg"
WIDTH = 800


def variant_path(path):
    return path[:-4] + SUFFIX


def ensure(root):
    try:
        from PIL import Image, ImageOps
    except Exception:
        return 0
    made = 0
    for d in DIRS:
        base = os.path.join(root, "images", d)
        for dirpath, _, files in os.walk(base):
            for f in files:
                if not f.lower().endswith(".jpg") or f.endswith(SUFFIX):
                    continue
                src = os.path.join(dirpath, f)
                dst = variant_path(src)
                if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
                    continue
                try:
                    with Image.open(src) as im:
                        im = ImageOps.exif_transpose(im).convert("RGB")
                        if im.width > WIDTH:
                            im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
                        im.save(dst, "JPEG", quality=80, optimize=True, progressive=True)
                    made += 1
                except Exception:
                    pass
    return made


if __name__ == "__main__":
    print(ensure(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "variantes créées")
