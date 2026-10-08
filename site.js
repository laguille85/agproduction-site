/* =========================================================
   AG Production — fonctionnement du site
   Le contenu (films, photos, références, textes) se modifie dans le dossier « contenu »,
   via l'interface Pages CMS. Ce fichier n'a pas besoin d'être modifié.
   ========================================================= */

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const icoX = '<svg viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11"/></svg>';
const icoL = '<svg viewBox="0 0 14 14"><path d="M9 2L4 7l5 5"/></svg>', icoR = '<svg viewBox="0 0 14 14"><path d="M5 2l5 5-5 5"/></svg>';
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Chemin d'image : lien complet (https://…) ou fichier du site (/images/… ou images/…) */
const slugify = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const src = p => !p ? "" : /^(https?:|data:)/.test(p) ? p : p.replace(/^\/+/, "");

/* Lien Vimeo → identifiant + clé privée éventuelle.
   Accepte : https://vimeo.com/123456789 · https://vimeo.com/123456789/abcdef1234 · https://player.vimeo.com/video/123?h=abc · 123?h=abc · 123 */
function vimeoParts(v){
  const s = String(v).trim();
  const id = (s.match(/(?:video\/|vimeo\.com\/|^)(\d{5,})/) || [])[1];
  const h = (s.match(/[?&]h=([0-9a-f]+)/i) || s.match(/vimeo\.com\/\d+\/([0-9a-f]{6,})/i) || [])[1];
  return { id, h };
}
function vimeoUrl(v){
  const { id, h } = vimeoParts(v);
  const p = new URLSearchParams({ autoplay:"1", dnt:"1", title:"0", byline:"0", portrait:"0" });
  if (h) p.set("h", h);
  return `https://player.vimeo.com/video/${id}?${p}`;
}

async function load(name){
  const r = await fetch(`contenu/${name}.json`, { cache: "no-cache" });
  if (!r.ok) throw new Error(name);
  return r.json();
}

(async function init(){
  let SITE, FILMS, PHOTOS, REFS, SKILLS, CASES, PRINTS, PAGES, PCASES;
  try {
    [SITE, FILMS, PHOTOS, REFS, SKILLS, CASES, PRINTS, PAGES, PCASES] = await Promise.all(["site","films","photos","references","savoir-faire","projets","tirages","pages","projets-photo"].map(n => load(n).catch(() => (n === "projets" || n === "tirages" || n === "pages" || n === "projets-photo") ? [] : Promise.reject(n))));
  } catch (e) {
    document.body.insertAdjacentHTML("afterbegin",
      `<p style="margin:0;padding:14px 20px;background:#fff4ce;font:15px/1.4 sans-serif">Le contenu du site ne s'est pas chargé. En local, ouvre le site via un serveur ou son adresse en ligne : un double-clic sur index.html ne suffit pas.</p>`);
    return;
  }
  const EMAIL = SITE.email;

  /* ---------- Textes généraux ---------- */
  if (SITE.accroche_titre) $("#heroTitle").textContent = SITE.accroche_titre;
  if (SITE.accroche_texte) $("#heroSub").textContent = SITE.accroche_texte;
  if (SITE.video_accueil && !SITE.video_accueil_vimeo) {
    /* Ordre de préférence : version mobile (petits écrans) → HEVC (Safari, Chrome récents) → H.264 (tous) */
    const v = $("#reel"), sources = [];
    if (SITE.video_accueil_mobile) sources.push(`<source src="${esc(src(SITE.video_accueil_mobile))}" type="video/mp4" media="(max-width: 760px)">`);
    if (SITE.video_accueil_hevc) sources.push(`<source src="${esc(src(SITE.video_accueil_hevc))}" type='video/mp4; codecs="hvc1"'>`);
    sources.push(`<source src="${esc(src(SITE.video_accueil))}" type="video/mp4">`);
    if (SITE.video_accueil_image) v.poster = src(SITE.video_accueil_image);
    v.innerHTML = sources.join("");
    v.load(); if (!reduce) v.play().catch(()=>{});
  }
  if (SITE.portrait) $(".about .pic img").src = src(SITE.portrait);

  /* Vidéo d'accueil depuis Vimeo (mode « background ») : prioritaire sur les fichiers MP4 si renseignée */
  let vimeoHero = null;
  if (SITE.video_accueil_vimeo) {
    const { id, h } = vimeoParts(SITE.video_accueil_vimeo);
    if (id) {
      const reelBox = $("#reel").parentNode;
      const p = new URLSearchParams({ background:"1", dnt:"1", autopause:"0" });
      if (h) p.set("h", h);
      /* Qualité de départ selon la définition réelle de l'écran (Vimeo dispose de la 4K) */
      const px = innerWidth * (window.devicePixelRatio || 1);
      if (innerWidth > 760) p.set("quality", px > 2600 ? "2160p" : px > 1700 ? "1440p" : "1080p");
      if (SITE.video_accueil_image) reelBox.style.background = `#0e2230 url("${src(SITE.video_accueil_image)}") center/cover`;
      $("#reel").remove();
      reelBox.insertAdjacentHTML("afterbegin", `<iframe id="reelVimeo" src="https://player.vimeo.com/video/${id}?${p}" title="Vidéo d'accueil AG Production" allow="autoplay; fullscreen; picture-in-picture" style="position:absolute;top:50%;left:50%;border:0;pointer-events:none;transform:translate(-50%,-50%)"></iframe>`);
      vimeoHero = $("#reelVimeo");
      const cover = () => {                 // recadre la vidéo 16:9 pour remplir toute la tuile
        const w = reelBox.clientWidth, hh = reelBox.clientHeight;
        const r = 16 / 9;
        vimeoHero.style.width = Math.max(w, hh * r) + "px";
        vimeoHero.style.height = Math.max(hh, w / r) + "px";
      };
      cover(); addEventListener("resize", cover); addEventListener("scroll", cover, {passive:true});
      /* Boucle sans à-coup : Vimeo marque un temps de chargement en revenant au début.
         On masque ce passage par un fondu au noir volontaire, puis on fait réapparaître l'image. */
      const mask = document.createElement("div"); mask.className = "reel-mask"; vimeoHero.after(mask);
      const vSend = (method, value) => vimeoHero.contentWindow && vimeoHero.contentWindow.postMessage(JSON.stringify(value === undefined ? { method } : { method, value }), "https://player.vimeo.com");
      let dur = 0, looping = false;
      addEventListener("message", e => {
        if (e.origin !== "https://player.vimeo.com" || e.source !== vimeoHero.contentWindow) return;
        let d; try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
        if (!d) return;
        if (d.event === "ready") { vSend("addEventListener", "timeupdate"); vSend("getDuration"); }
        if (d.method === "getDuration") dur = d.value || 0;
        if (d.event === "timeupdate" && d.data) {
          const t = d.data.seconds; if (!dur && d.data.duration) dur = d.data.duration;
          if (dur && t > dur - 0.5 && !looping) { looping = true; mask.style.opacity = "1"; }
          else if (looping && t > 0.15 && t < dur - 1) { looping = false; mask.style.opacity = "0"; }
        }
      });
    }
  }
  [["phAnnees","photo_chiffres_annees"],["phDrone","photo_chiffres_drone"],["phInterlocuteur","photo_chiffres_interlocuteur"],["phPort","photo_chiffres_port"]]
    .forEach(([id,k]) => { if (SITE[k]) $("#"+id).src = src(SITE[k]); });
  $("#numProjets").textContent = SITE.chiffre_projets;
  $("#numClients").textContent = SITE.chiffre_clients;
  if (SITE.chiffre_annees) $("#years").textContent = SITE.chiffre_annees;
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Liens ---------- */
  document.querySelectorAll('#igTop, .m-only .ig, footer a[href*="instagram"], .direct a[href*="instagram"]').forEach(a => a.href = SITE.instagram);
  document.querySelectorAll('#liTop, .m-only .li, #liFoot, #liContact').forEach(a => a.href = SITE.linkedin);
  const mail = $("#mail"); mail.textContent = EMAIL; mail.href = "mailto:" + EMAIL;

  /* ---------- Chiffres : comptage animé à l'arrivée dans l'écran ---------- */
  const counters = [...document.querySelectorAll("#bento [data-count]")];
  if (!reduce && "IntersectionObserver" in window) {
    const run = el => {
      const end = parseInt(el.textContent, 10); if (!end) return;
      const t0 = performance.now(), dur = 1400;
      const tick = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(end * e);
        if (k < 1) requestAnimationFrame(tick);
        else { const box = el.closest(".k"); box.style.display = "none"; box.offsetHeight; box.style.display = ""; } };  // Safari : force le rafraîchissement du dégradé sur le dernier chiffre
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: .6 });
    counters.forEach(c => io.observe(c));
  }

  /* ---------- À propos ---------- */
  $("#aboutCopy").innerHTML = `<h3>${esc(SITE.a_propos_titre)}</h3>
    <p><b>${esc(SITE.a_propos_intro)}</b></p>
    ${(SITE.a_propos_paragraphes || []).map(p => `<p>${esc(p)}</p>`).join("")}
    <ul class="chips" aria-label="Domaines d'activité">${(SITE.domaines || []).map(d => `<li>${esc(d)}</li>`).join("")}</ul>`;

  /* ---------- Films : filtres + carrousel ---------- */
  const rail = $("#rail");
  const cats = ["Tous", ...new Set(FILMS.map(f => f.categorie).filter(Boolean))];
  $("#segIn").innerHTML = cats.map((c,i) => `<button type="button" data-cat="${esc(c)}" aria-pressed="${i===0}">${esc(c)}</button>`).join("");
  function renderRail(cat){
    rail.innerHTML = FILMS.map((f,i) => (cat === "Tous" || f.categorie === cat) ? `<button class="film" type="button" data-v="${i}" aria-label="Lire ${esc(f.titre)}">
        <span class="shot"><img src="${esc(src(f.vignette))}" alt="${esc(f.titre)} — film ${esc(f.categorie)}" loading="lazy" decoding="async"><span class="play"><svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg></span></span>
        <span class="meta"><span class="cat">${esc(f.categorie)}</span><strong>${esc(f.titre)}</strong>${(f.vimeo||[]).length > 1 ? `<small>${f.vimeo.length} films</small>` : ""}</span>
      </button>` : "").join("");
    rail.scrollLeft = 0; updateArrows();
  }
  function updateArrows(){
    $("#prev").disabled = rail.scrollLeft < 8;
    $("#next").disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
  }
  $("#segIn").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    $("#segIn").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    renderRail(b.dataset.cat);
  });
  const stepRail = d => { const card = rail.querySelector(".film"); rail.scrollBy({left: d * ((card ? card.offsetWidth : 400) + 20) * (innerWidth > 760 ? 2 : 1), behavior:"smooth"}); };
  $("#prev").addEventListener("click", () => stepRail(-1));
  $("#next").addEventListener("click", () => stepRail(1));
  rail.addEventListener("scroll", updateArrows, {passive:true});
  renderRail("Tous");

  /* ---------- Projets racontés (films, puis photo) ---------- */
  const playIco = '<svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z"/></svg>';
  const galIco = '<svg viewBox="0 0 14 14"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/><rect x="8" y="8" width="4.5" height="4.5" rx="1"/></svg>';
  function setupCases(LIST, el, seg, sec, kind){
    if (!el || !seg) return;
    if (!LIST.length) { if (sec) sec.hidden = true; return; }
    function render(n){
      const c = LIST[n]; if (!c) return;
      const vids = c.vimeo || [], imgs = c.images || [];
      const serie = c.serie_photo ? PHOTOS.findIndex(p => p.titre === c.serie_photo) : -1;
      const cells = imgs.map((u,i) => `<button type="button" data-ci="${i}" data-kind="${kind}" aria-label="Agrandir l'image ${i+1}"><img src="${esc(src(u))}" alt="" loading="lazy" decoding="async"></button>`);
      if (serie >= 0) cells.push(`<button type="button" class="more" data-p="${serie}"><small>${kind === "photo" ? "La série complète" : "Reportage photo"}</small><span>Voir la série <svg viewBox="0 0 14 14"><path d="M5 2l5 5-5 5"/></svg></span></button>`);
      seg.querySelectorAll("button").forEach((b,i) => b.setAttribute("aria-pressed", i === n));
      place();
      const photo = kind === "photo";
      const coverAttr = photo ? (serie >= 0 ? `data-p="${serie}"` : `data-ci="-1" data-kind="photo"`) : `data-cv="${n}"`;
      const go = photo ? `<span class="go">${galIco}Voir la série</span>` : (vids.length ? `<span class="go">${playIco}${vids.length > 1 ? `Voir les ${vids.length} films` : "Voir le film"}</span>` : "");
      el.innerHTML = `
        <button class="case-cover${c.texte_en_haut ? " top" : ""}" type="button" ${coverAttr} aria-label="${photo ? "Voir la série" : "Voir le film"} ${esc(c.titre)}">
          <img src="${esc(src(c.couverture))}" alt="${esc(c.titre)} — ${esc(c.client)}" loading="lazy" decoding="async"${c.cadrage ? ` style="object-position:${esc(c.cadrage)}"` : ""}>
          <span class="cin"><span><small>${esc(c.client)}</small><strong>${esc(c.titre)}</strong></span>${go}</span>
        </button>
        <div class="case-body">
          <div class="case-lead"><p>${esc(c.accroche)}</p>
            ${c.citation ? `<blockquote><p>« ${esc(c.citation)} »</p>${c.citation_auteur ? `<cite>${esc(c.citation_auteur)}</cite>` : ""}</blockquote>` : ""}
            <p class="case-more"><a class="more-link" href="/projets/${slugify((c.onglet || c.client || "") + " " + (c.titre || ""))}/">Voir la page du projet ${icoR}</a></p></div>
          <dl>${[["Contexte",c.contexte],["Dispositif",c.dispositif],["Résultat",c.resultat]].filter(x => x[1]).map(([t,d]) => `<div class="k-${t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}"><dt>${t}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl>
        </div>
        ${photo ? (() => {
          const pool = imgs.filter(u => u !== c.couverture), tot = serie >= 0 ? (PHOTOS[serie].images || []).filter(u => u !== c.couverture).length : imgs.length;
          const vid = c.animation ? `<video poster="${esc(src(c.animation_affiche || c.couverture))}" autoplay muted loop playsinline preload="metadata" aria-label="Animation ${esc(c.titre)}"><source src="${esc(src(c.animation))}" type="video/mp4">${/\.mp4$/.test(c.animation) ? `<source src="${esc(src(c.animation.replace(/\.mp4$/, ".webm")))}" type="video/webm">` : ""}</video>` : "";
          const big = vid || (pool[0] ? `<img src="${esc(src(pool[0]))}" alt="" loading="lazy" decoding="async">` : "");
          const rest = (vid ? pool : pool.slice(1)).slice(0, 2);
          const at = serie >= 0 ? `data-p="${serie}"` : `data-ci="0" data-kind="photo"`;
          return `<div class="case-mosaic"><button type="button" class="m-big" ${at} aria-label="Voir la série">${big}</button>${rest.map((u,i) => `<button type="button" ${at} aria-label="Voir la série"><img src="${esc(src(u))}" alt="" loading="lazy" decoding="async">${i === rest.length - 1 ? `<span class="m-all"><strong>${tot} photos</strong>Voir la série ${icoR}</span>` : ""}</button>`).join("")}</div>`;
        })() : ""}
        ${!photo && c.animation ? `<div class="case-anim"><video poster="${esc(src(c.animation_affiche || c.couverture))}" autoplay muted loop playsinline preload="metadata" aria-label="Animation ${esc(c.titre)}"><source src="${esc(src(c.animation))}" type="video/mp4">${/\.mp4$/.test(c.animation) ? `<source src="${esc(src(c.animation.replace(/\.mp4$/, ".webm")))}" type="video/webm">` : ""}</video></div>` : ""}
        ${!photo && cells.length ? `<div class="case-strip" style="--n:${cells.length}">${cells.join("")}</div>` : ""}`;
      el.style.animation = "none"; el.offsetHeight; el.style.animation = "";
      el.dataset.n = n;
    }
    seg.classList.add("cs");
    seg.innerHTML = LIST.map((c,i) => `<button type="button" role="tab" data-case="${i}">${esc(c.onglet || c.client)}</button>`).join("") + '<span class="seg-ind" aria-hidden="true"></span>';
    function place(){ const b = seg.querySelector('[aria-pressed="true"]'), ind = seg.querySelector(".seg-ind"); if (b && ind) { ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft}px)`; } }
    addEventListener("resize", place); if (document.fonts) document.fonts.ready.then(place);
    seg.addEventListener("click", e => { const b = e.target.closest("[data-case]"); if (b) render(+b.dataset.case); });
    render(0);
  }
  const caseEl = $("#case"), pcaseEl = $("#pcase");
  setupCases(CASES, caseEl, $("#caseSeg"), $("#projets"), "film");
  setupCases(PCASES, pcaseEl, $("#pcaseSeg"), $("#photographie"), "photo");

  /* ---------- Tirages d'art : photo, et photo encadrée en situation au survol ---------- */
  if (!PRINTS.length) $("#tirages").hidden = true;
  if (SITE.tirages_texte) $("#faText").textContent = SITE.tirages_texte;
  $("#faGrid").innerHTML = PRINTS.map((p,i) => `<button class="fa-card" type="button" data-fa="${i}" aria-label="${esc(p.titre)} — voir la série">
    <span class="img"><img class="photo" src="${esc(src(p.couverture || (p.images||[])[0]))}" alt="Tirage d'art ${esc(p.titre)}" loading="lazy" decoding="async">${p.encadre ? `<img class="frame" src="${esc(src(p.encadre))}" alt="" loading="lazy" decoding="async">` : ""}</span>
    <strong>${esc(p.titre)}<small>${(p.images||[]).length} photos</small></strong></button>`).join("");
  $("#faAsk").addEventListener("click", () => { const sel = $("#f-type"); if (sel) { const o = [...sel.options].find(o => /tirage/i.test(o.text)); if (o) sel.value = o.value; } });

  /* ---------- Savoir-faire ---------- */
  $("#skills").innerHTML = SKILLS.map((s,i) => `<button class="skill" type="button" data-s="${i}" aria-label="${esc(s.titre)} — en savoir plus">
    <img src="${esc(src(s.image))}" alt="${esc(s.titre)}" loading="lazy">
    <span class="txt"><small>${esc(s.surtitre)}</small><strong>${esc(s.titre)}</strong></span>
    <span class="plus"><svg viewBox="0 0 14 14"><path d="M7 1v12M1 7h12"/></svg></span>
  </button>`).join("");

  { const sk = $("#skills");
    const sArrows = () => { $("#sprev").disabled = sk.scrollLeft < 8; $("#snext").disabled = sk.scrollLeft + sk.clientWidth > sk.scrollWidth - 8; };
    const sStep = d => { const c = sk.querySelector(".skill"); sk.scrollBy({left: d * ((c ? c.offsetWidth : 340) + 20) * 2, behavior:"smooth"}); };
    $("#sprev").addEventListener("click", () => sStep(-1)); $("#snext").addEventListener("click", () => sStep(1));
    sk.addEventListener("scroll", sArrows, {passive:true}); window.addEventListener("resize", sArrows); sArrows(); }

  /* ---------- Photographie ---------- */
  const INITIAL = SITE.series_affichees || 12;
  const TOLD = new Set((PCASES || []).map(c => c.serie_photo).filter(Boolean));   /* séries déjà racontées plus haut */
  const GRID = PHOTOS.map((p,i) => [p,i]).filter(([p]) => !TOLD.has(p.titre));
  $("#pgrid").innerHTML = GRID.map(([p,i],n) => `<button class="pcard" type="button" data-p="${i}" ${n >= INITIAL ? "hidden" : ""} aria-label="${esc(p.titre)} — voir la série">
    <span class="img"><img src="${esc(src(p.couverture))}" alt="${esc(p.titre)} — série photo d’Antoine Guillou, photographe en Vendée" loading="lazy" decoding="async"></span><span class="t">${esc(p.titre)}</span></button>`).join("");
  const more = $("#morePhotos");
  if (more && GRID.length <= INITIAL) more.hidden = true;
  if (more) more.addEventListener("click", () => {
    const open = more.dataset.open === "1";
    [...$("#pgrid").children].forEach((el,i) => { if (i >= INITIAL) el.hidden = open; });
    more.dataset.open = open ? "0" : "1";
    more.textContent = open ? "Voir toutes les séries" : "Réduire";
    if (open) $("#series-photo").scrollIntoView({block:"start"});
  });

  /* Rails horizontaux sur mobile (savoir-faire, méthode, tirages) : barre de progression */
  [".why", "#skills", ".steps", "#pgrid", "#faGrid"].forEach(sel => { const rail = document.querySelector(sel); if (!rail) return;
    const bar = rail.nextElementSibling && rail.nextElementSibling.classList.contains("sk-bar") ? rail.nextElementSibling.firstElementChild : null; if (!bar) return;
    const upd = () => { const m = rail.scrollWidth - rail.clientWidth; bar.style.transform = `scaleX(${m > 0 ? (rail.scrollLeft + rail.clientWidth) / rail.scrollWidth : 1})`; };
    rail.addEventListener("scroll", upd, {passive:true}); window.addEventListener("resize", upd); upd(); });

  /* ---------- Références ---------- */
  $("#refs").innerHTML = REFS.map(r => `<li title="${esc(r.nom)}"><img src="${esc(src(r.logo))}" alt="${esc(r.nom)}" loading="lazy" style="max-height:calc(var(--lh) * ${Number(r.taille) || 1})" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="word" hidden>${esc(r.nom)}</span></li>`).join("");

  /* =========================================================
     Fenêtre : films, séries, détails, mentions légales
     ========================================================= */
  const modal = $("#modal"), sheet = $("#sheet"), reel = $("#reel");
  let lastFocus = null, series = null, k = 0, mode = "photo", view = "bande";
  function openSheet(html, wide){
    lastFocus = document.activeElement;
    sheet.className = "sheet" + (wide ? " wide" : "");
    sheet.innerHTML = `<button class="x" type="button" aria-label="Fermer">${icoX}</button>` + html;
    modal.hidden = false; document.body.style.overflow = "hidden";
    sheet.querySelector(".x").onclick = closeSheet; sheet.querySelector(".x").focus();
    sheet.scrollTop = 0;
  }
  function closeSheet(){ modal.hidden = true; sheet.innerHTML = ""; series = null; document.body.style.overflow = ""; lastFocus && lastFocus.focus(); }
  modal.addEventListener("click", e => { if (e.target === modal) closeSheet(); });

  function playFilm(i, r = 0){
    const f = typeof i === "object" ? i : FILMS[i], list = f.vimeo || [];
    openSheet(`<div class="sheet-head"><h3>${esc(f.titre)}</h3><small>${esc(f.categorie)}</small></div>
      <div class="player"><iframe src="${vimeoUrl(list[r])}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(f.titre)}"></iframe></div>
      ${list.length > 1 ? `<div class="reels">${list.map((_,j) => `<button type="button" data-r="${j}" aria-pressed="${j===r}">Film ${j+1}</button>`).join("")}</div>` : `<div style="height:8px"></div>`}`, true);
    sheet.querySelectorAll("[data-r]").forEach(b => b.onclick = () => playFilm(f, +b.dataset.r));
  }
  function showSeries(){
    const p = series, imgs = p.images || [];
    mode = "photo";
    const back = p._g ? `<button type="button" class="g-back" data-back>${icoL}<span>Toutes les photos</span></button>` : "";
    const html = `<div class="sheet-head">${back}<h3>${esc(p.titre)}</h3></div>
      <div class="gallery"><img src="${esc(src(imgs[k]))}" alt="${esc(p.titre)}, image ${k+1} sur ${imgs.length}"></div>
      <div class="gnav"><span class="num">${k+1} sur ${imgs.length}</span><span class="btns"><button type="button" data-d="-1" aria-label="Image précédente">${icoL}</button><button type="button" data-d="1" aria-label="Image suivante">${icoR}</button></span></div>`;
    if (modal.hidden) openSheet(html); else { sheet.innerHTML = `<button class="x" type="button" aria-label="Fermer">${icoX}</button>` + html; sheet.querySelector(".x").onclick = closeSheet; }
    sheet.className = "sheet" + (p._g ? " wide g-sheet g-photo" : "");
    sheet.querySelectorAll("[data-d]").forEach(b => b.onclick = () => step(+b.dataset.d));
    const bk = sheet.querySelector("[data-back]"); if (bk) bk.onclick = () => showStrip(view, k);
    if (imgs.length > 1) new Image().src = src(imgs[(k+1) % imgs.length]);
  }
  /* Grandes séries : bande qui défile (plusieurs photos à la fois) ou mosaïque */
  function showStrip(v = "bande", focus = 0){
    const p = series, imgs = p.images || [];
    mode = "strip"; view = v;
    const pics = imgs.map((u,i) => `<button type="button" class="g-pic" data-gi="${i}" style="--i:${Math.min(i,12)}" aria-label="Agrandir la photo ${i+1} sur ${imgs.length}"><img src="${esc(src(u))}" alt="" loading="${i < 6 ? "eager" : "lazy"}" decoding="async" onload="this.parentNode.style.aspectRatio=this.naturalWidth+'/'+this.naturalHeight"></button>`).join("");
    const html = `<div class="sheet-head g-head"><div><h3>${esc(p.titre)}</h3><small>${imgs.length} photos</small></div>
        <div class="g-views" role="group" aria-label="Affichage"><button type="button" data-view="bande" aria-pressed="${v==="bande"}">Défilement</button><button type="button" data-view="mosaique" aria-pressed="${v==="mosaique"}">Mosaïque</button></div></div>
      ${v === "bande"
        ? `<div class="g-strip" tabindex="0" aria-label="Photos de la série, faites défiler">${pics}</div>
           <div class="gnav g-ctl"><span class="g-bar"><i></i></span><span class="btns"><button type="button" data-sd="-1" aria-label="Photos précédentes">${icoL}</button><button type="button" data-sd="1" aria-label="Photos suivantes">${icoR}</button></span></div>`
        : `<div class="g-mosaic">${pics}</div>`}`;
    if (modal.hidden) openSheet(html, true); else { sheet.innerHTML = `<button class="x" type="button" aria-label="Fermer">${icoX}</button>` + html; sheet.querySelector(".x").onclick = closeSheet; }
    sheet.className = "sheet wide g-sheet";
    sheet.querySelectorAll("[data-view]").forEach(b => b.onclick = () => showStrip(b.dataset.view));
    sheet.querySelectorAll("[data-gi]").forEach(b => b.onclick = () => { k = +b.dataset.gi; showSeries(); sheet.scrollTop = 0; });
    const strip = sheet.querySelector(".g-strip");
    if (strip) {
      const bar = sheet.querySelector(".g-bar i");
      const upd = () => { const m = strip.scrollWidth - strip.clientWidth; bar.style.transform = `scaleX(${m > 0 ? Math.max(.06, strip.scrollLeft / m) : 1})`; };
      strip.addEventListener("scroll", upd, {passive:true}); upd();
      sheet.querySelectorAll("[data-sd]").forEach(b => b.onclick = () => strip.scrollBy({left: +b.dataset.sd * strip.clientWidth * .8, behavior: "smooth"}));
      /* glisser à la souris */
      strip.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse" || e.button) return; drag = { el: strip, x0: e.clientX, s0: strip.scrollLeft, moved: false }; });
      strip.addEventListener("click", e => { if (strip.dataset.moved === "1") { e.stopPropagation(); e.preventDefault(); strip.dataset.moved = ""; } }, true);
      if (focus) { const el = strip.children[focus]; if (el) strip.scrollLeft = el.offsetLeft - 24; }
    } else if (focus) { const el = sheet.querySelector(`[data-gi="${focus}"]`); if (el) el.scrollIntoView({block:"center"}); }
  }
  let drag = null;
  window.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x0; if (Math.abs(dx) > 5) { drag.moved = true; drag.el.classList.add("drag"); } if (drag.moved) drag.el.scrollLeft = drag.s0 - dx; });
  window.addEventListener("pointerup", () => { if (!drag) return; drag.el.classList.remove("drag"); drag.el.dataset.moved = drag.moved ? "1" : ""; drag = null; });
  function openSeries(p, grande){ series = p; k = 0; p._g = grande && p.galerie !== "classique"; if (p._g) showStrip("bande"); else showSeries(); }
  function step(d){ if (!series || !(series.images||[]).length) return; k = (k + d + series.images.length) % series.images.length; showSeries(); }
  function showSkill(i){
    const s = SKILLS[i];
    openSheet(`<div class="detail"><img src="${esc(src(s.image))}" alt=""><div class="in"><small>${esc(s.surtitre)}</small><h3>${esc(s.titre)}</h3><p>${esc(s.texte)}</p>
      <ul>${(s.livrables||[]).map(x => `<li>${esc(x)}</li>`).join("")}</ul><p style="margin-top:28px;display:flex;flex-wrap:wrap;gap:14px 24px;align-items:center"><a class="pill" href="#contact" data-close>Parler de votre projet</a>${(() => { const pg = (PAGES || []).find(x => x.savoir_faire === s.surtitre); return pg ? `<a class="more-link" href="/${esc(pg.slug)}/">En savoir plus ${icoR}</a>` : ""; })()}</p></div></div>`);
    sheet.querySelector("[data-close]").addEventListener("click", closeSheet);
  }
  function showLegal(){
    const m = SITE.mentions || {};
    openSheet(`<div class="legal"><h3>Mentions légales</h3>
      <h4>Éditeur</h4><p>AG Production, ${esc(m.forme || "SARL")} au capital de ${esc(m.capital)} €<br>${m.adresse ? `Siège social : ${esc(m.adresse)}<br>` : ""}${m.telephone ? `Téléphone : ${esc(m.telephone)} — ` : ""}E-mail : ${esc(EMAIL)}<br>RCS ${esc(m.rcs)} — SIRET ${esc(m.siret)}<br>N° de TVA intracommunautaire : ${esc(m.tva)}<br>Directeur de la publication : Antoine Guillou, gérant</p>
      ${m.hebergeur ? `<h4>Hébergement</h4><p>${esc(m.hebergeur)}</p>` : ""}
      <h4>Propriété intellectuelle</h4><p>Les films et photographies présentés sur ce site appartiennent à AG Production ou à ses clients. Toute reproduction, même partielle, est interdite sans autorisation écrite.</p>
      <h4>Données personnelles</h4><p>Les informations envoyées depuis le formulaire (nom, e-mail, message) servent uniquement à répondre à votre demande et ne sont jamais cédées à des tiers.${SITE.web3forms_cle ? " Elles transitent par le service d'envoi Web3Forms, qui les transmet par e-mail." : ""} Elles sont conservées le temps nécessaire au traitement de la demande. Conformément au RGPD, vous pouvez y accéder, les faire rectifier ou supprimer en écrivant à ${esc(EMAIL)}. Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).</p>
      <h4>Cookies</h4><p>Ce site ne dépose aucun cookie publicitaire ni de mesure d'audience. Les vidéos sont lues avec le lecteur Vimeo en mode « ne pas suivre ».</p></div>`);
  }
  document.addEventListener("click", e => {
    const v = e.target.closest("[data-v]"); if (v) { playFilm(+v.dataset.v); return; }
    const cv = e.target.closest("[data-cv]"); if (cv) { const c = CASES[+cv.dataset.cv]; if ((c.vimeo||[]).length) playFilm({ titre: c.titre, categorie: c.client, vimeo: c.vimeo }); return; }
    const ci = e.target.closest("[data-ci]"); if (ci) { const ph = ci.dataset.kind === "photo", c = ph ? PCASES[+pcaseEl.dataset.n] : CASES[+caseEl.dataset.n]; series = { titre: c.titre, images: [c.couverture, ...(c.images||[])] }; k = +ci.dataset.ci + 1; showSeries(); return; }
    const p = e.target.closest("[data-p]"); if (p) { openSeries(PHOTOS[+p.dataset.p], true); return; }
    const fa = e.target.closest("[data-fa]"); if (fa) { openSeries(PRINTS[+fa.dataset.fa]); return; }
    const s = e.target.closest("[data-s]"); if (s) { showSkill(+s.dataset.s); return; }
    if (e.target.closest(".legalBtn")) showLegal();
  });
  document.addEventListener("keydown", e => {
    if (modal.hidden) return;
    if (e.key === "Escape") closeSheet();
    if (mode === "strip") { const st = sheet.querySelector(".g-strip"); if (st && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); st.scrollBy({left:(e.key === "ArrowLeft" ? -1 : 1) * st.clientWidth * .8, behavior:"smooth"}); } return; }
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  let tx = null;
  sheet.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive:true});
  sheet.addEventListener("touchend", e => { if (tx === null || !series || mode !== "photo") return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); tx = null; });

  /* ---------- Vidéo d'ouverture ---------- */
  const wrapR = $("#reelWrap");
  function grow(){
    const r = wrapR.getBoundingClientRect();
    const p = reduce ? 0 : Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (innerHeight * 0.6)));
    wrapR.style.setProperty("--p", p.toFixed(3));
  }
  grow(); addEventListener("scroll", grow, {passive:true}); addEventListener("resize", grow);
  if (reduce && !vimeoHero) { reel.removeAttribute("autoplay"); reel.pause(); }
  if (vimeoHero) {
    let vPaused = false;
    const post = m => vimeoHero.contentWindow && vimeoHero.contentWindow.postMessage(JSON.stringify({ method: m }), "https://player.vimeo.com");
    const setV = () => { $("#toggleIcon").innerHTML = vPaused ? '<path d="M2 1l9 5-9 5z"/>' : '<path d="M2 1h3v10H2zM7 1h3v10H7z"/>'; $("#toggle").setAttribute("aria-label", vPaused ? "Lire la vidéo" : "Mettre la vidéo en pause"); };
    $("#toggle").addEventListener("click", () => { vPaused = !vPaused; post(vPaused ? "pause" : "play"); setV(); });
    if (reduce) vimeoHero.addEventListener("load", () => { vPaused = true; post("pause"); setV(); });
    setV();
  } else {
    const setIcon = () => { $("#toggleIcon").innerHTML = reel.paused ? '<path d="M2 1l9 5-9 5z"/>' : '<path d="M2 1h3v10H2zM7 1h3v10H7z"/>'; $("#toggle").setAttribute("aria-label", reel.paused ? "Lire la vidéo" : "Mettre la vidéo en pause"); };
    $("#toggle").addEventListener("click", () => { reel.paused ? reel.play().catch(()=>{}) : reel.pause(); setIcon(); });
    reel.addEventListener("play", setIcon); reel.addEventListener("pause", setIcon); setIcon();
  }

  /* ---------- Menu mobile ---------- */
  const nav = $("#nav");
  /* Photos : pas de clic droit « Enregistrer l'image », pas de glisser-déposer */
  document.addEventListener("contextmenu", e => { if (e.target.closest("img, picture, .g-pic, .gallery, .pcard .img, .fa-card .img, .skill, .case-cover, .case-strip, .tile")) e.preventDefault(); });
  document.addEventListener("dragstart", e => { if (e.target.tagName === "IMG") e.preventDefault(); });
  document.addEventListener("touchstart", () => {}, {passive:true}); // active l'état :active sur iOS
  $("#burger").addEventListener("click", () => { const o = nav.classList.toggle("open"); $("#burger").setAttribute("aria-expanded", o); document.body.style.overflow = o ? "hidden" : ""; });
  document.querySelectorAll("#links a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); $("#burger").setAttribute("aria-expanded","false"); document.body.style.overflow = ""; }));

  /* ---------- Contact ---------- */
  $("#copy").addEventListener("click", async e => {
    try { await navigator.clipboard.writeText(EMAIL); e.target.textContent = "Copié"; }
    catch { const r = document.createRange(); r.selectNodeContents(mail); getSelection().removeAllRanges(); getSelection().addRange(r); }
  });
  /* Arrivée depuis la page Particuliers : type de projet présélectionné */
  if (new URLSearchParams(location.search).get("type") === "particulier") { const sel = $("#f-type"); if (sel) sel.value = "Particulier"; }
  $("#form").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, note = $("#note"), btn = f.querySelector("button[type=submit]");
    if (f.botcheck && f.botcheck.checked) return;
    if (!f.checkValidity()) { note.textContent = "Indiquez votre nom, un e-mail valide et quelques mots sur le projet."; f.reportValidity(); return; }
    const d = Object.fromEntries(new FormData(f));
    const subject = `Projet — ${d.type}${d.company ? " — " + d.company : ""}`;
    const body = `${d.message}\n\nDates et lieu : ${d.when || "à préciser"}\n\n—\n${d.name}${d.company ? "\n" + d.company : ""}\n${d.email}`;
    if (!SITE.web3forms_cle) {           // pas encore de clé : ouverture de la messagerie
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      note.textContent = "Votre messagerie s'ouvre avec la demande pré-remplie. Sinon, écrivez à " + EMAIL + ".";
      return;
    }
    btn.disabled = true; note.textContent = "Envoi en cours…";
    try {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ access_key: SITE.web3forms_cle, subject, from_name: "Site AG Production", name: d.name, email: d.email, societe: d.company || "", projet: d.type, dates_et_lieu: d.when || "", message: d.message })
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      f.reset(); note.textContent = "Merci, votre demande est envoyée. Je vous réponds rapidement.";
    } catch {
      note.textContent = "L'envoi n'a pas abouti. Écrivez-moi directement à " + EMAIL + ".";
    } finally { btn.disabled = false; }
  });
})();
