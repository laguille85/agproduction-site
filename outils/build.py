#!/usr/bin/env python3
"""
AG Production — génération des pages du site.

Lancé automatiquement par GitHub Actions à chaque modification du contenu
(dossier « contenu », via Pages CMS). Il :
  1. écrit le contenu (films, projets, références, savoir-faire, photos, tirages)
     directement dans index.html, pour que Google le lise sans exécuter de JavaScript ;
  2. génère une page par prestation (contenu/pages.json) et une page par projet
     (contenu/projets.json), plus la page des mentions légales ;
  3. met à jour sitemap.xml.
Aucune dépendance : Python 3 standard.
"""
import datetime, html, json, os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://antoineguillou.com"
TODAY = datetime.date.today().isoformat()


def load(name, default=None):
    p = os.path.join(ROOT, "contenu", name + ".json")
    if not os.path.exists(p):
        return default
    with open(p, encoding="utf-8") as f:
        return json.load(f)


NBSP = "\u00a0"


def e(s):
    """Échappe le texte et pose les espaces insécables de la typographie française."""
    t = str(s if s is not None else "")
    if not re.match(r"^(https?:|/|mailto:)", t):
        t = re.sub(r" ([:;?!»])", NBSP + r"\1", t)
        t = t.replace("« ", "«" + NBSP)
    return html.escape(t, quote=True)


def slugify(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def img(p):
    """Chemin d'image absolu depuis la racine du site (fonctionne dans les sous-pages)."""
    if not p:
        return ""
    return p if re.match(r"^(https?:|data:)", p) else "/" + p.lstrip("/")


def absurl(p):
    p = img(p)
    return p if p.startswith("http") else BASE + p


def vimeo_id(v):
    m = re.search(r"(?:video/|vimeo\.com/|^)(\d{5,})", str(v).strip())
    return m.group(1) if m else ""


SITE = load("site", {})
FILMS = load("films", [])
PHOTOS = load("photos", [])
REFS = load("references", [])
SKILLS = load("savoir-faire", [])
CASES = load("projets", [])
PCASES = load("projets-photo", [])
PRINTS = load("tirages", [])
PAGES = load("pages", [])

PLAY = '<svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg>'
ARROW = '<svg viewBox="0 0 14 14"><path d="M5 2l5 5-5 5"/></svg>'


def case_slug(c):
    return slugify((c.get("onglet") or c.get("client") or "") + " " + (c.get("titre") or ""))


def page_for_skill(surtitre):
    for p in PAGES:
        if p.get("savoir_faire") == surtitre:
            return p
    return None


# ---------------------------------------------------------------------------
# 1. Contenu écrit dans index.html (même balisage que site.js)
# ---------------------------------------------------------------------------

def film_card(f, i):
    n = len(f.get("vimeo") or [])
    return (f'<button class="film" type="button" data-v="{i}" aria-label="Lire {e(f.get("titre"))}">'
            f'<span class="shot"><img src="{e(img(f.get("vignette")))}" alt="{e(f.get("titre"))} — film {e(f.get("categorie"))}" loading="lazy" decoding="async"><span class="play">{PLAY}</span></span>'
            f'<span class="meta"><span class="cat">{e(f.get("categorie"))}</span><strong>{e(f.get("titre"))}</strong>'
            + (f'<small>{n} films</small>' if n > 1 else "") + '</span></button>')


def render_index_blocks():
    cats = ["Tous"]
    for f in FILMS:
        if f.get("categorie") and f["categorie"] not in cats:
            cats.append(f["categorie"])
    b = {}
    b["segIn"] = "".join(f'<button type="button" data-cat="{e(c)}" aria-pressed="{"true" if i == 0 else "false"}">{e(c)}</button>' for i, c in enumerate(cats))
    b["rail"] = "".join(film_card(f, i) for i, f in enumerate(FILMS))
    def case_blocks(lst, seg, art, label):
        b[seg] = "".join(f'<button type="button" role="tab" data-case="{i}" aria-pressed="{"true" if i == 0 else "false"}">{e(c.get("onglet") or c.get("client"))}</button>' for i, c in enumerate(lst))
        if lst:
            c = lst[0]
            dl = "".join(f'<div class="k-{slugify(t)}"><dt>{t}</dt><dd>{e(d)}</dd></div>' for t, d in (("Contexte", c.get("contexte")), ("Dispositif", c.get("dispositif")), ("Résultat", c.get("resultat"))) if d)
            quote = ""
            if c.get("citation"):
                quote = f'<blockquote><p>« {e(c["citation"])} »</p>' + (f'<cite>{e(c.get("citation_auteur"))}</cite>' if c.get("citation_auteur") else "") + "</blockquote>"
            pos = f' style="object-position:{e(c["cadrage"])}"' if c.get("cadrage") else ""
            b[art] = (f'<a class="case-cover{" top" if c.get("texte_en_haut") else ""}" href="/projets/{case_slug(c)}/"><img src="{e(img(c.get("couverture")))}" alt="{e(c.get("titre"))} — {e(c.get("client"))}" loading="lazy" decoding="async"{pos}>'
                      f'<span class="cin"><span><small>{e(c.get("client"))}</small><strong>{e(c.get("titre"))}</strong></span></span></a>'
                      f'<div class="case-body"><div class="case-lead"><p>{e(c.get("accroche"))}</p>{quote}</div><dl>{dl}</dl></div>')
    case_blocks(CASES, "caseSeg", "case", "film")
    case_blocks(PCASES, "pcaseSeg", "pcase", "photo")
    b["refs"] = "".join(f'<li title="{e(r.get("nom"))}"><img src="{e(img(r.get("logo")))}" alt="{e(r.get("nom"))}" loading="lazy" style="max-height:calc(var(--lh) * {e(r.get("taille") or 1)})"></li>' for r in REFS)
    b["skills"] = "".join(
        f'<button class="skill" type="button" data-s="{i}" aria-label="{e(s.get("titre"))} — en savoir plus"><img src="{e(img(s.get("image")))}" alt="{e(s.get("titre"))}" loading="lazy">'
        f'<span class="txt"><small>{e(s.get("surtitre"))}</small><strong>{e(s.get("titre"))}</strong></span>'
        '<span class="plus"><svg viewBox="0 0 14 14"><path d="M7 1v12M1 7h12"/></svg></span></button>' for i, s in enumerate(SKILLS))
    initial = SITE.get("series_affichees") or 12
    told = {c.get("serie_photo") for c in PCASES if c.get("serie_photo")}
    grid = [(i, p) for i, p in enumerate(PHOTOS) if p.get("titre") not in told]
    b["pgrid"] = "".join(
        f'<button class="pcard" type="button" data-p="{i}" {"hidden " if n >= initial else ""}aria-label="{e(p.get("titre"))} — voir la série">'
        f'<span class="img"><img src="{e(img(p.get("couverture")))}" alt="Série photo {e(p.get("titre"))}" loading="lazy" decoding="async"></span><span class="t">{e(p.get("titre"))}</span></button>' for n, (i, p) in enumerate(grid))
    b["aboutCopy"] = (f'<h3>{e(SITE.get("a_propos_titre"))}</h3><p><b>{e(SITE.get("a_propos_intro"))}</b></p>'
                      + "".join(f"<p>{e(p)}</p>" for p in SITE.get("a_propos_paragraphes") or [])
                      + '<ul class="chips" aria-label="Domaines d\'activité">' + "".join(f"<li>{e(d)}</li>" for d in SITE.get("domaines") or []) + "</ul>")
    b["faGrid"] = "".join(
        f'<button class="fa-card" type="button" data-fa="{i}" aria-label="{e(p.get("titre"))} — voir la série"><span class="img"><img class="photo" src="{e(img(p.get("couverture") or (p.get("images") or [""])[0]))}" alt="Tirage d\'art {e(p.get("titre"))}" loading="lazy" decoding="async">'
        + (f'<img class="frame" src="{e(img(p["encadre"]))}" alt="" loading="lazy" decoding="async">' if p.get("encadre") else "")
        + f'</span><strong>{e(p.get("titre"))}<small>{len(p.get("images") or [])} photos</small></strong></button>' for i, p in enumerate(PRINTS))
    b["prestations"] = "".join(f'<li><a href="/{e(p["slug"])}/">{e(p.get("menu"))}</a></li>' for p in PAGES)
    return b


def inject(htmltext, blocks):
    for k, v in blocks.items():
        pat = re.compile(r"(<!--b:%s-->)(.*?)(<!--/b:%s-->)" % (re.escape(k), re.escape(k)), re.S)
        if not pat.search(htmltext):
            print("  (repère absent dans index.html :", k, ")")
            continue
        htmltext = pat.sub(lambda m: m.group(1) + v + m.group(3), htmltext)
    return htmltext


# ---------------------------------------------------------------------------
# 2. Gabarit des sous-pages
# ---------------------------------------------------------------------------

def chrome_from_index(idx):
    """Récupère l'en-tête et le pied de page de l'accueil, liens rendus absolus."""
    header = re.search(r'<header class="nav".*?</header>', idx, re.S).group(0)
    footer = re.search(r"<footer>.*?</footer>", idx, re.S).group(0)

    def fix(s):
        s = re.sub(r'href="#top"', 'href="/"', s)
        s = re.sub(r'href="#([a-z-]+)"', r'href="/#\1"', s)
        s = re.sub(r'src="(?!https?:|/)([^"]+)"', r'src="/\1"', s)
        s = s.replace('<button type="button" class="legalBtn" style="background:none;border:0;padding:0;cursor:pointer;font-size:12px;color:inherit">Mentions légales</button>',
                      '<a href="/mentions-legales/">Mentions légales</a>')
        return s
    return fix(header), fix(footer)


def page_shell(idx, title, description, path, body, ld=None, image=None):
    header, footer = chrome_from_index(idx)
    css_v = re.search(r'style\.css\?v=([\w-]+)', idx)
    v = css_v.group(1) if css_v else "1"
    canon = BASE + path
    og_img = absurl(image) if image else absurl(SITE.get("photo_chiffres_port") or "")
    lds = "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>\n' for x in (ld or []))
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canon)}">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="AG Production">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{e(canon)}">
<meta property="og:image" content="{e(og_img)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/images/favicon-ag.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
<link rel="stylesheet" href="/style.css?v={v}">
{lds}</head>
<body class="sub">
{header}
<main id="top">
{body}
</main>
{footer}
<div class="modal" id="modal" role="dialog" aria-modal="true" aria-label="Contenu" hidden><div class="sheet" id="sheet"></div></div>
<script>window.__SITE={json.dumps({"instagram": SITE.get("instagram"), "linkedin": SITE.get("linkedin"), "email": SITE.get("email"), "web3forms_cle": SITE.get("web3forms_cle")}, ensure_ascii=False)};</script>
<script src="/page.js?v={v}" defer></script>
</body>
</html>
"""


def films_by_title(titles):
    out = []
    for t in titles or []:
        for f in FILMS:
            if f.get("titre") == t:
                out.append(f)
                break
    return out


def series_by_title(titles):
    out = []
    for t in titles or []:
        for p in PHOTOS:
            if p.get("titre") == t:
                out.append(p)
                break
    return out


def films_block(films, heading="Quelques films"):
    if not films:
        return ""
    cards = []
    for f in films:
        vids = [vimeo_id(v) and str(v) for v in f.get("vimeo") or []]
        cards.append(f'<button class="film pg-film" type="button" data-vimeo="{e(json.dumps(vids))}" data-title="{e(f.get("titre"))}" aria-label="Lire {e(f.get("titre"))}">'
                     f'<span class="shot"><img src="{e(img(f.get("vignette")))}" alt="{e(f.get("titre"))} — film {e(f.get("categorie"))}" loading="lazy" decoding="async"><span class="play">{PLAY}</span></span>'
                     f'<span class="meta"><span class="cat">{e(f.get("categorie"))}</span><strong>{e(f.get("titre"))}</strong></span></button>')
    return f'<section class="pg-sec wrap"><h2>{e(heading)}</h2><div class="pg-films">{"".join(cards)}</div></section>'


def series_block(series, heading="Séries photo"):
    if not series:
        return ""
    cards = []
    for p in series:
        imgs = [img(u) for u in p.get("images") or []]
        cards.append(f'<button class="pcard pg-serie" type="button" data-images="{e(json.dumps(imgs))}" data-title="{e(p.get("titre"))}" aria-label="{e(p.get("titre"))} — voir la série">'
                     f'<span class="img"><img src="{e(img(p.get("couverture")))}" alt="Série photo {e(p.get("titre"))}" loading="lazy" decoding="async"></span><span class="t">{e(p.get("titre"))}</span></button>')
    return f'<section class="pg-sec wrap"><h2>{e(heading)}</h2><div class="pg-photos">{"".join(cards)}</div></section>'


TYPE_OPTIONS = "<option>Film de marque / corporate</option><option>Sport</option><option>Voile / course au large</option>\n              <option>Événement / salon</option><option>Prises de vue aériennes</option><option>Photographie</option><option>Tirage d'art</option><option value=\"Particulier\">Particulier : mariage, couple, famille</option><option>Autre</option>"


def cta_block(default_type=None):
    """Bloc « Parlons de votre projet » : le même formulaire que sur l'accueil."""
    email = SITE.get("email") or ""
    opts = TYPE_OPTIONS
    if default_type:
        opts = re.sub(r'<option( value="[^"]*")?>' + re.escape(default_type) + '</option>', lambda m: m.group(0).replace("<option", "<option selected", 1), opts, 1)
    return (f'<section class="sec wrap" id="contact" aria-labelledby="h-contact"><div class="contact"><div>'
            f'<h2 id="h-contact">Parlons de votre projet.</h2><p class="lede">Décrivez le projet, les dates et le lieu. Je vous réponds rapidement avec une première proposition.</p>'
            f'<div class="direct"><div><small>E-mail</small><a id="mail" href="mailto:{e(email)}">{e(email)}</a><button class="copybtn" id="copy" type="button">Copier</button></div>'
            f'<div><small>LinkedIn</small><a href="{e(SITE.get("linkedin") or "")}" target="_blank" rel="noopener">Antoine Guillou</a></div>'
            f'<div><small>Basé à</small><span>Les Sables-d\'Olonne, France</span></div></div></div>'
            '<form id="form" novalidate>'
            '<div class="row"><div class="fl"><input id="f-name" name="name" placeholder=" " autocomplete="name" required><label for="f-name">Nom</label></div>'
            '<div class="fl"><input id="f-org" name="company" placeholder=" " autocomplete="organization"><label for="f-org">Société</label></div></div>'
            '<div class="row"><div class="fl"><input id="f-mail" name="email" type="email" placeholder=" " autocomplete="email" required><label for="f-mail">E-mail</label></div>'
            f'<div class="fl"><select id="f-type" name="type">{opts}</select><label for="f-type">Type de projet</label><svg class="chev" viewBox="0 0 10 10"><path d="M1 3l4 4 4-4"/></svg></div></div>'
            '<div class="fl"><input id="f-when" name="when" placeholder=" "><label for="f-when">Dates et lieu</label></div>'
            '<div class="fl"><textarea id="f-msg" name="message" placeholder=" " required></textarea><label for="f-msg">Votre projet</label></div>'
            '<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" hidden aria-hidden="true">'
            '<button class="pill" type="submit">Envoyer la demande</button><p class="note" id="note" role="status"></p></form></div></section>')


def links_block(current_slug):
    items = "".join(f'<li><a href="/{e(p["slug"])}/">{e(p.get("menu"))}{ARROW}</a></li>' for p in PAGES if p["slug"] != current_slug)
    return f'<section class="pg-sec wrap"><h2 class="pg-h-sm">Toutes mes prestations</h2><ul class="pg-links">{items}</ul></section>'


def crumbs(items):
    parts = ['<a href="/">Accueil</a>'] + [f'<span>{e(t)}</span>' for t in items]
    return '<nav class="crumbs" aria-label="Fil d\'Ariane">' + '<span class="sep">›</span>'.join(parts) + "</nav>"


def breadcrumb_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u} for i, (n, u) in enumerate([("Accueil", "/")] + items)]}


def service_image(p):
    if p.get("image"):
        return p["image"]
    for s in SKILLS:
        if s.get("surtitre") == p.get("savoir_faire"):
            return s.get("image")
    return SITE.get("photo_chiffres_port")


def build_service(idx, p):
    path = f'/{p["slug"]}/'
    cover = service_image(p)
    secs = "".join(f'<div class="pg-block"><h2>{e(s.get("titre"))}</h2><p>{e(s.get("texte"))}</p></div>' for s in p.get("sections") or [])
    faq = ""
    if p.get("faq"):
        faq = '<section class="pg-sec wrap"><h2>Questions fréquentes</h2><div class="pg-faq">' + "".join(
            f'<details><summary>{e(q.get("question"))}</summary><p>{e(q.get("reponse"))}</p></details>' for q in p["faq"]) + "</div></section>"
    body = (f'<section class="pg-hero wrap">{crumbs([p.get("menu")])}<p class="eyebrow">{e(p.get("surtitre"))}</p><h1>{e(p.get("h1"))}</h1>'
            f'<p class="lede">{e(p.get("intro"))}</p><p class="pg-cta-btns"><a class="pill" href="/#contact">Demander un devis</a><a class="more-link" href="/#films">Voir tous les films {ARROW}</a></p></section>'
            + (f'<figure class="pg-cover wrap"><img src="{e(img(cover))}" alt="{e(p.get("h1"))}" fetchpriority="high"></figure>' if cover else "")
            + f'<section class="pg-sec wrap pg-text">{secs}</section>'
            + films_block(films_by_title(p.get("films")))
            + series_block(series_by_title(p.get("series")))
            + faq + cta_block() + links_block(p["slug"]))
    ld = [{"@context": "https://schema.org", "@type": "Service", "name": p.get("h1", "").rstrip("."), "description": p.get("description"),
           "url": BASE + path, "provider": {"@type": "ProfessionalService", "name": "AG Production", "url": BASE + "/"},
           "areaServed": [{"@type": "City", "name": "Les Sables-d'Olonne"}, {"@type": "AdministrativeArea", "name": "Vendée"},
                          {"@type": "AdministrativeArea", "name": "Pays de la Loire"}, {"@type": "Country", "name": "France"}]},
          breadcrumb_ld([(p.get("menu"), path)])]
    write(path, page_shell(idx, p.get("titre_seo") or p.get("h1"), p.get("description"), path, body, ld, cover))
    return path


def build_case(idx, c, others, anchor="/#projets"):
    slug = case_slug(c)
    path = f"/projets/{slug}/"
    dl = "".join(f'<div class="k-{slugify(t)}"><dt>{t}</dt><dd>{e(d)}</dd></div>' for t, d in (("Contexte", c.get("contexte")), ("Dispositif", c.get("dispositif")), ("Résultat", c.get("resultat"))) if d)
    quote = ""
    if c.get("citation"):
        quote = f'<blockquote><p>« {e(c["citation"])} »</p>' + (f'<cite>{e(c.get("citation_auteur"))}</cite>' if c.get("citation_auteur") else "") + "</blockquote>"
    films = [{"titre": c.get("titre"), "categorie": c.get("client"), "vignette": c.get("couverture"), "vimeo": c.get("vimeo") or []}] if c.get("vimeo") else []
    imgs = [img(u) for u in c.get("images") or []]
    gallery = ""
    if imgs:
        gallery = '<section class="pg-sec wrap"><div class="pg-gallery">' + "".join(
            f'<button type="button" class="pg-shot" data-images="{e(json.dumps(imgs))}" data-k="{k}" data-title="{e(c.get("titre"))}"><img src="{e(u)}" alt="{e(c.get("titre"))} — image {k + 1}" loading="lazy" decoding="async"></button>' for k, u in enumerate(imgs)) + "</div></section>"
    serie = series_by_title([c.get("serie_photo")]) if c.get("serie_photo") else []
    more = "".join(f'<li><a href="/projets/{case_slug(o)}/">{e(o.get("onglet") or o.get("client"))} — {e(o.get("titre"))}{ARROW}</a></li>' for o in others)
    body = (f'<section class="pg-hero wrap">{crumbs(["Projets", c.get("titre")])}<p class="eyebrow">{e(c.get("client"))}</p><h1>{e(c.get("titre"))}</h1>'
            f'<p class="lede">{e(c.get("accroche"))}</p></section>'
            f'<figure class="pg-cover wrap"><img src="{e(img(c.get("couverture")))}" alt="{e(c.get("titre"))} — {e(c.get("client"))}" fetchpriority="high"></figure>'
            + (f'<section class="pg-sec wrap"><div class="case-anim"><video poster="{e(img(c.get("animation_affiche") or c.get("couverture")))}" autoplay muted loop playsinline preload="metadata" aria-label="Animation {e(c.get("titre"))}"><source src="{e(img(c["animation"]))}" type="video/mp4">' + (f'<source src="{e(img(c["animation"][:-4] + ".webm"))}" type="video/webm">' if c["animation"].endswith(".mp4") else "") + '</video></div></section>' if c.get("animation") else "")
            + f'<section class="pg-sec wrap case"><div class="case-body"><div class="case-lead">{quote}</div><dl>{dl}</dl></div></section>'
            + films_block(films, "Le film" if len(c.get("vimeo") or []) < 2 else "Les films") + gallery
            + series_block(serie, "Le reportage photo")
            + cta_block()
            + (f'<section class="pg-sec wrap"><h2 class="pg-h-sm">Autres projets</h2><ul class="pg-links">{more}</ul></section>' if more else ""))
    desc = f'{c.get("client")} : {c.get("accroche")}'[:300]
    ld = [{"@context": "https://schema.org", "@type": "CreativeWork", "name": c.get("titre"), "description": c.get("accroche"),
           "url": BASE + path, "image": absurl(c.get("couverture")), "creator": {"@type": "Person", "name": "Antoine Guillou"},
           "sourceOrganization": {"@type": "Organization", "name": "AG Production"}},
          breadcrumb_ld([("Projets", anchor), (c.get("titre"), path)])]
    write(path, page_shell(idx, f'{c.get("titre")} — {c.get("onglet") or c.get("client")} | AG Production', desc, path, body, ld, c.get("couverture")))
    return path


def build_photo_case(idx, c, others, kind="photo"):
    """Page projet (films ou photo) : en-tête, couverture, fiche en trois temps, médias, formulaire."""
    slug = case_slug(c)
    path = f"/projets/{slug}/"
    serie = next((p for p in PHOTOS if p.get("titre") == c.get("serie_photo")), None)
    cover = img(c.get("couverture"))
    pool = ((serie or {}).get("images") or []) if kind == "photo" else list(c.get("images") or []) + list((serie or {}).get("images") or [])
    if kind == "photo" and not pool:
        pool = c.get("images") or []
    imgs, seen = [], {cover}
    for u in pool:
        u = img(u)
        if u not in seen:
            seen.add(u); imgs.append(u)
    pos = f' style="object-position:{e(c["cadrage"])}"' if c.get("cadrage") else ""
    steps = "".join(f'<div class="pp-step"><span class="n">0{i}</span><h2>{t}</h2><p>{e(d)}</p></div>'
                    for i, (t, d) in enumerate((("Contexte", c.get("contexte")), ("Dispositif", c.get("dispositif")), ("Résultat", c.get("resultat"))), 1) if d)
    anim = ""
    if c.get("animation"):
        a = c["animation"]
        anim = (f'<section class="pg-sec wrap"><div class="case-anim pp-anim"><video poster="{e(img(c.get("animation_affiche") or c.get("couverture")))}" autoplay muted loop playsinline preload="metadata" aria-label="Animation {e(c.get("titre"))}">'
                f'<source src="{e(img(a))}" type="video/mp4">' + (f'<source src="{e(img(a[:-4] + ".webm"))}" type="video/webm">' if a.endswith(".mp4") else "") + '</video></div></section>')
    films = ""
    if kind == "film" and c.get("vimeo"):
        films = films_block([{"titre": c.get("titre"), "categorie": c.get("client"), "vignette": c.get("couverture"), "vimeo": c.get("vimeo")}],
                            "Le film" if len(c.get("vimeo") or []) < 2 else "Les films")

    def dims(u):
        try:
            from PIL import Image
            with Image.open(os.path.join(ROOT, u.lstrip("/"))) as im:
                return f' width="{im.width}" height="{im.height}"'
        except Exception:
            return ""
    shots = "".join(f'<button type="button" class="pp-shot" data-images="{e(json.dumps(imgs))}" data-k="{k}" data-title="{e(c.get("titre"))}"><img src="{e(u)}" alt="{e(c.get("titre"))} — photo {k + 1} sur {len(imgs)}"{dims(u)} loading="lazy" decoding="async"></button>' for k, u in enumerate(imgs))
    gal_title = "La série" if kind == "photo" else ("Le reportage photo" if serie else "En images")
    more = "".join(f'<li><a href="/projets/{case_slug(o)}/">{e(o.get("onglet") or o.get("client"))} — {e(o.get("titre"))}{ARROW}</a></li>' for o in others)
    quote = (f'<section class="pg-sec wrap"><div class="pp-quote"><p>« {e(c["citation"])} »</p>' + (f'<cite>{e(c.get("citation_auteur"))}</cite>' if c.get("citation_auteur") else "") + "</div></section>") if c.get("citation") else ""
    section, anchor = ("Photographie", "/#photographie") if kind == "photo" else ("Projets", "/#projets")
    body = (f'<section class="pg-hero wrap">{crumbs([section, c.get("titre")])}<p class="eyebrow">{e(c.get("client"))}</p><h1>{e(c.get("titre"))}</h1>'
            f'<p class="lede">{e(c.get("accroche"))}</p></section>'
            f'<figure class="pp-cover"><img src="{e(cover)}" alt="{e(c.get("titre"))} — {e(c.get("client"))}" fetchpriority="high"{pos}></figure>'
            f'<section class="pg-sec wrap"><div class="pp-steps">{steps}</div></section>'
            + quote + films + anim
            + (f'<section class="pg-sec wrap"><div class="pp-head"><h2>{gal_title}</h2><span>{len(imgs)} photo{"s" if len(imgs) > 1 else ""}</span></div><div class="pp-masonry">{shots}</div></section>' if imgs else "")
            + cta_block("Photographie" if kind == "photo" else None)
            + (f'<section class="pg-sec wrap"><h2 class="pg-h-sm">Autres projets{" photo" if kind == "photo" else ""}</h2><ul class="pg-links">{more}</ul></section>' if more else ""))
    desc = f'{c.get("client")} : {c.get("accroche")}'[:300]
    ld = [{"@context": "https://schema.org", "@type": "CreativeWork", "name": c.get("titre"), "description": c.get("accroche"),
           "url": BASE + path, "image": absurl(c.get("couverture")), "creator": {"@type": "Person", "name": "Antoine Guillou"},
           "sourceOrganization": {"@type": "Organization", "name": "AG Production"}},
          breadcrumb_ld([(section, anchor), (c.get("titre"), path)])]
    write(path, page_shell(idx, f'{c.get("titre")} — {c.get("onglet") or c.get("client")} | AG Production', desc, path, body, ld, c.get("couverture")))
    return path


def build_legal(idx):
    m = SITE.get("mentions") or {}
    email = SITE.get("email") or ""
    host = f"<h2>Hébergement</h2><p>{e(m['hebergeur'])}</p>" if m.get("hebergeur") else ""
    body = (f'<section class="pg-hero wrap">{crumbs(["Mentions légales"])}<h1>Mentions légales.</h1></section>'
            f'<section class="pg-sec wrap pg-legal">'
            f'<h2>Éditeur</h2><p>AG Production, {e(m.get("forme") or "SARL")} au capital de {e(m.get("capital"))} €<br>'
            + (f'Siège social : {e(m["adresse"])}<br>' if m.get("adresse") else "")
            + (f'Téléphone : {e(m["telephone"])}<br>' if m.get("telephone") else "")
            + f'E-mail : {e(email)}<br>RCS {e(m.get("rcs"))} — SIRET {e(m.get("siret"))}<br>N° de TVA intracommunautaire : {e(m.get("tva"))}<br>Directeur de la publication : Antoine Guillou, gérant</p>'
            + host
            + '<h2>Propriété intellectuelle</h2><p>Les films et photographies présentés sur ce site appartiennent à AG Production ou à ses clients. Toute reproduction, même partielle, est interdite sans autorisation écrite.</p>'
            + f'<h2>Données personnelles</h2><p>Les informations envoyées depuis le formulaire (nom, e-mail, message) servent uniquement à répondre à votre demande et ne sont jamais cédées à des tiers.'
            + (" Elles transitent par le service d'envoi Web3Forms, qui les transmet par e-mail." if SITE.get("web3forms_cle") else "")
            + f' Elles sont conservées le temps nécessaire au traitement de la demande. Conformément au RGPD, vous pouvez y accéder, les faire rectifier ou supprimer en écrivant à {e(email)}. Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).</p>'
            + '<h2>Cookies</h2><p>Ce site ne dépose aucun cookie publicitaire ni de mesure d\'audience. Les vidéos sont lues avec le lecteur Vimeo en mode « ne pas suivre ».</p></section>')
    path = "/mentions-legales/"
    write(path, page_shell(idx, "Mentions légales | AG Production", "Mentions légales du site AG Production, Antoine Guillou, vidéaste et photographe aux Sables-d'Olonne.", path, body))
    return path


# ---------------------------------------------------------------------------
# 3. Page Particuliers (mariages, couples, familles)
# ---------------------------------------------------------------------------
PART = load("particuliers", {})
PART_CTA = "/?type=particulier#contact"


def thumb(path):
    d, f = os.path.split(path)
    t = f"{d}/vignettes/{f}"
    return t if os.path.exists(os.path.join(ROOT, t.lstrip("/"))) else path


def viewer(h, k=0):
    photos = [x for x in h.get("photos") or [] if x.get("image")]
    if not photos:
        return ""
    t, n = h.get("titre") or "", len(photos)
    full = json.dumps([img(x["image"]) for x in photos], ensure_ascii=False)

    def slide(i, x):
        src, pos = e(img(x["image"])), e(x.get("cadrage") or "50% 50%")
        lazy = "" if i == 0 else ' loading="lazy"'
        cls = "pt-slide" + (" por" if x.get("portrait") else "") + (" on" if i == 0 else "")
        return (f'<div class="{cls}" data-n="{i}"><img src="{src}" alt="{e(t)}{", " + e(h["lieu"]) if h.get("lieu") else ""}, photo {i + 1} sur {n}" '
                f'style="object-position:{pos}"{lazy} decoding="async"></div>')
    stage = "".join(slide(i, x) for i, x in enumerate(photos))
    ths = "".join(
        f'<button class="pt-th{" on" if i == 0 else ""}" type="button" data-n="{i}" aria-label="Photo {i + 1}"><img src="{e(img(thumb(x["image"])))}" alt="" loading="lazy"></button>'
        for i, x in enumerate(photos))
    return (f'<div class="pt-story{" on" if k == 0 else ""}" id="histoire-{k + 1}">' + (f'<p class="pt-lede">{e(h.get("lieu"))}</p>' if h.get("lieu") else '<div style="height:8px"></div>') + f'<div class="pt-viewer">'
            f'<figure class="pt-stage" data-images="{e(full)}" data-title="{e(t)}" data-k="0">{stage}'
            f'<button class="pt-nav p" type="button" aria-label="Photo précédente"><svg viewBox="0 0 14 14"><path d="M9 2L4 7l5 5"/></svg></button>'
            f'<button class="pt-nav n" type="button" aria-label="Photo suivante">{ARROW}</button>'
            f'<span class="pt-count">01 / {n}</span><span class="pt-prog"><i></i></span></figure>'
            f'<div class="pt-strip">{ths}</div></div></div>')


EYEBROW = '<p class="pt-eyebrow">Une histoire</p>'


def stories(hs):
    hs = [h for h in hs if h.get("photos") and not h.get("brouillon")]
    if not hs:
        return ""
    head = (f'<h2 class="pt-h2">{e(hs[0].get("titre"))}.</h2>' if len(hs) == 1 else
            '<h2 class="pt-h2">Quelques histoires.</h2><div class="pt-tabs" role="tablist" aria-label="Choisir un mariage">' + "".join(
                f'<button type="button" role="tab" aria-selected="{"true" if i == 0 else "false"}" data-s="{i}">'
                f'{e(h.get("titre"))}</button>'
                for i, h in enumerate(hs)) + '<span class="pt-ind" aria-hidden="true"></span></div>')
    return (f'<section class="pt-sec"><div class="wrap">{EYEBROW if len(hs) == 1 else ""}{head}'
            + "".join(viewer(h, i) for i, h in enumerate(hs)) + "</div></section>")


def build_particuliers(idx):
    path = "/particuliers/"
    cover = PART.get("couverture")
    hist = stories(PART.get("histoires") or [])
    email = SITE.get("email") or ""
    body = (f'<section class="pt-hero"><div class="wrap in"><h1>Vos moments, avec le même regard.</h1></div>'
            + (f'<figure><img src="{e(img(cover))}" alt="Mariés sur la plage au coucher du soleil, en Vendée" fetchpriority="high" style="object-position:{e(PART.get("couverture_cadrage") or "50% 40%")}"></figure>' if cover else "")
            + "</section>" + hist
            + '<section class="pg-sec wrap"><h2>Questions fréquentes</h2><div class="pg-faq">'
              '<details><summary>Vous déplacez-vous en dehors de la Vendée ?</summary><p>Je suis basé aux Sables-d\'Olonne et je me déplace partout en France et à l\'étranger.</p></details>'
              '<details><summary>Photo, vidéo ou les deux ?</summary><p>Comme vous préférez. On en parle ensemble selon le déroulé de la journée, avec le drone si le lieu s\'y prête.</p></details>'
              '<details><summary>Quels sont vos tarifs ?</summary><p>Chaque projet fait l\'objet d\'une proposition sur mesure, selon la durée, le lieu et les prestations choisies.</p></details>'
              '<details><summary>Quand vais-je recevoir mes images ?</summary><p>Je vous indique le délai de livraison dans ma proposition.</p></details></div></section>'
            + f'<section class="sec wrap" id="contact" aria-labelledby="h-contact"><div class="contact"><div>'
              f'<h2 id="h-contact">Parlons de votre projet.</h2><p class="lede">Dites-moi la date, le lieu et ce que vous imaginez. Je vous réponds rapidement.</p>'
              f'<div class="direct"><div><small>E-mail</small><a id="mail" href="mailto:{e(email)}">{e(email)}</a><button class="copybtn" id="copy" type="button">Copier</button></div>'
              f'<div><small>Instagram</small><a href="{e(SITE.get("instagram") or "https://www.instagram.com/aguillouphotography/")}" target="_blank" rel="noopener">@aguillouphotography</a></div>'
              f'<div><small>Basé à</small><span>Les Sables-d\'Olonne, France</span></div></div></div>'
              '<form id="form" novalidate><input type="hidden" name="type" value="Particulier">'
              '<div class="row"><div class="fl"><input id="f-name" name="name" placeholder=" " autocomplete="name" required><label for="f-name">Prénoms</label></div>'
              '<div class="fl"><input id="f-mail" name="email" type="email" placeholder=" " autocomplete="email" required><label for="f-mail">E-mail</label></div></div>'
              '<div class="fl"><input id="f-when" name="when" placeholder=" "><label for="f-when">Date et lieu</label></div>'
              '<div class="fl"><textarea id="f-msg" name="message" placeholder=" " required></textarea><label for="f-msg">Votre projet</label></div>'
              '<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" hidden aria-hidden="true">'
              '<button class="pill" type="submit">Envoyer la demande</button><p class="note" id="note" role="status"></p></form></div></section>')
    body = re.sub(r" ([:;?!])", NBSP + r"\1", body)
    desc = "Mariages, couples, familles : photo, vidéo et drone par Antoine Guillou, aux Sables-d'Olonne, en Vendée et partout en France. Des images vraies, prises sur le vif."
    ld = [{"@context": "https://schema.org", "@type": "Service", "name": "Photographe et vidéaste de mariage", "serviceType": "Photographie et vidéo de mariage",
           "description": desc, "url": BASE + path, "provider": {"@type": "ProfessionalService", "name": "AG Production", "url": BASE + "/"},
           "areaServed": [{"@type": "City", "name": "Les Sables-d'Olonne"}, {"@type": "AdministrativeArea", "name": "Vendée"},
                          {"@type": "AdministrativeArea", "name": "Pays de la Loire"}, {"@type": "Country", "name": "France"}]},
          breadcrumb_ld([("Particuliers", path)])]
    write(path, page_shell(idx, "Photographe et vidéaste de mariage en Vendée | AG Production", desc, path, body, ld, cover))
    return path


def write(path, content):
    d = os.path.join(ROOT, path.strip("/"))
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
        f.write(content)


def main():
    ip = os.path.join(ROOT, "index.html")
    with open(ip, encoding="utf-8") as f:
        idx = f.read()
    idx = inject(idx, render_index_blocks())
    with open(ip, "w", encoding="utf-8") as f:
        f.write(idx)

    urls = [("/", "1.0")]
    for p in PAGES:
        urls.append((build_service(idx, p), "0.9"))
    for c in CASES:
        urls.append((build_photo_case(idx, c, [o for o in CASES if o is not c], "film"), "0.7"))
    for c in PCASES:
        urls.append((build_photo_case(idx, c, [o for o in PCASES if o is not c]), "0.7"))
    if PART.get("histoires"):
        urls.append((build_particuliers(idx), "0.8"))
    urls.append((build_legal(idx), "0.2"))

    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u, pr in urls:
        sm.append(f"  <url><loc>{BASE}{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr}</priority></url>")
    sm.append("</urlset>")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(sm) + "\n")
    print(f"{len(urls)} pages générées")


if __name__ == "__main__":
    main()
