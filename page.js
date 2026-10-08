/* =========================================================
   AG Production — script des pages secondaires
   (prestations, projets, mentions légales).
   Menu mobile, lecture des films, galeries photo.
   ========================================================= */
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const icoX = '<svg viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11"/></svg>';
  const icoL = '<svg viewBox="0 0 14 14"><path d="M9 2L4 7l5 5"/></svg>', icoR = '<svg viewBox="0 0 14 14"><path d="M5 2l5 5-5 5"/></svg>';
  const SITE = window.__SITE || {};

  /* Liens réseaux */
  document.querySelectorAll('#igTop, .m-only .ig, footer a[href*="instagram"]').forEach(a => { if (SITE.instagram) a.href = SITE.instagram; });
  document.querySelectorAll('#liTop, .m-only .li, #liFoot').forEach(a => { if (SITE.linkedin) a.href = SITE.linkedin; });
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* Menu mobile */
  const nav = $("#nav"), burger = $("#burger");
  if (burger) {
    burger.addEventListener("click", () => { const o = nav.classList.toggle("open"); burger.setAttribute("aria-expanded", o); document.body.style.overflow = o ? "hidden" : ""; });
    document.querySelectorAll("#links a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; }));
  }
  const onScroll = () => nav && nav.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, {passive:true}); onScroll();

  /* Photos : pas de clic droit « Enregistrer l'image » ni de glisser-déposer */
  document.addEventListener("contextmenu", e => { if (e.target.closest("img, .gallery, .pg-photos, .pg-gallery, .pg-cover")) e.preventDefault(); });
  document.addEventListener("dragstart", e => { if (e.target.tagName === "IMG") e.preventDefault(); });
  document.addEventListener("touchstart", () => {}, {passive:true});

  /* Fenêtre */
  const modal = $("#modal"), sheet = $("#sheet");
  let last = null, imgs = null, k = 0, title = "";
  function open(html, wide){
    last = document.activeElement;
    sheet.className = "sheet" + (wide ? " wide" : "");
    sheet.innerHTML = `<button class="x" type="button" aria-label="Fermer">${icoX}</button>` + html;
    modal.hidden = false; document.body.style.overflow = "hidden";
    sheet.querySelector(".x").onclick = close; sheet.querySelector(".x").focus();
  }
  function close(){ modal.hidden = true; sheet.innerHTML = ""; imgs = null; document.body.style.overflow = ""; last && last.focus(); }
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  function vimeoUrl(v){
    const s = String(v).trim();
    const id = (s.match(/(?:video\/|vimeo\.com\/|^)(\d{5,})/) || [])[1];
    const h = (s.match(/[?&]h=([0-9a-f]+)/i) || s.match(/vimeo\.com\/\d+\/([0-9a-f]{6,})/i) || [])[1];
    const p = new URLSearchParams({ autoplay:"1", dnt:"1", title:"0", byline:"0", portrait:"0" });
    if (h) p.set("h", h);
    return `https://player.vimeo.com/video/${id}?${p}`;
  }
  function play(list, t, r = 0){
    open(`<div class="sheet-head"><h3>${esc(t)}</h3></div>
      <div class="player"><iframe src="${vimeoUrl(list[r])}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(t)}"></iframe></div>
      ${list.length > 1 ? `<div class="reels">${list.map((_,j) => `<button type="button" data-r="${j}" aria-pressed="${j===r}">Film ${j+1}</button>`).join("")}</div>` : `<div style="height:8px"></div>`}`, true);
    sheet.querySelectorAll("[data-r]").forEach(b => b.onclick = () => play(list, t, +b.dataset.r));
  }
  function show(){
    const html = `<div class="sheet-head"><h3>${esc(title)}</h3></div>
      <div class="gallery"><img src="${esc(imgs[k])}" alt="${esc(title)}, image ${k+1} sur ${imgs.length}"></div>
      <div class="gnav"><span class="num">${k+1} sur ${imgs.length}</span><span class="btns"><button type="button" data-d="-1" aria-label="Image précédente">${icoL}</button><button type="button" data-d="1" aria-label="Image suivante">${icoR}</button></span></div>`;
    if (modal.hidden) open(html); else { sheet.innerHTML = `<button class="x" type="button" aria-label="Fermer">${icoX}</button>` + html; sheet.querySelector(".x").onclick = close; }
    sheet.querySelectorAll("[data-d]").forEach(b => b.onclick = () => step(+b.dataset.d));
    if (imgs.length > 1) new Image().src = imgs[(k + 1) % imgs.length];
  }
  function step(d){ if (!imgs) return; k = (k + d + imgs.length) % imgs.length; show(); }

  document.addEventListener("click", e => {
    const f = e.target.closest("[data-vimeo]");
    if (f) { const list = JSON.parse(f.dataset.vimeo || "[]"); if (list.length) play(list, f.dataset.title || ""); return; }
    const g = e.target.closest("[data-images]");
    if (g) { imgs = JSON.parse(g.dataset.images || "[]"); k = +(g.dataset.k || 0); title = g.dataset.title || ""; if (imgs.length) show(); }
  });
  document.addEventListener("keydown", e => {
    if (modal.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  let tx = null;
  sheet.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive:true});
  sheet.addEventListener("touchend", e => { if (tx === null || !imgs) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); tx = null; });
})();

/* Visionneuse de la page Particuliers : défilement automatique, vignettes, glisser */
(function(){
  document.querySelectorAll(".pt-viewer").forEach(v => {
    const st = v.querySelector(".pt-stage"), im = [...st.querySelectorAll(":scope > .pt-slide")], th = [...v.querySelectorAll(".pt-th")],
      cnt = st.querySelector(".pt-count"), strip = v.querySelector(".pt-strip"), bar = st.querySelector(".pt-prog i"), D = 5000;
    if (im.length < 2) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0, t, hover = false, seen = false;
    st.style.setProperty("--d", D + "ms");
    const run = () => { clearTimeout(t); st.classList.remove("run"); void bar.offsetWidth; if (hover || !seen || still) return; st.classList.add("run"); t = setTimeout(() => go(i + 1), D); };
    const go = n => {
      i = (n + im.length) % im.length;
      im.forEach((e, k) => { e.classList.toggle("on", k === i); if (k === i || k === (i + 1) % im.length) e.querySelectorAll("img").forEach(x => x.loading = "eager"); });
      th.forEach((e, k) => e.classList.toggle("on", k === i));
      st.dataset.k = i; cnt.textContent = String(i + 1).padStart(2, "0") + " / " + im.length;
      const a = th[i]; if (a) strip.scrollTo({ left: a.offsetLeft - strip.clientWidth / 2 + a.clientWidth / 2 });
      run();
    };
    st.querySelector(".n").addEventListener("click", e => { e.stopPropagation(); go(i + 1); });
    st.querySelector(".p").addEventListener("click", e => { e.stopPropagation(); go(i - 1); });
    th.forEach((e, k) => e.addEventListener("click", () => go(k)));
    st.addEventListener("mouseenter", () => { hover = true; run(); });
    st.addEventListener("mouseleave", () => { hover = false; run(); });
    let x0 = null, moved = false;
    st.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; moved = false; }, { passive: true });
    st.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { moved = true; go(i + (dx < 0 ? 1 : -1)); } x0 = null; });
    st.addEventListener("click", e => { if (moved) { e.stopPropagation(); moved = false; } }, true);
    new IntersectionObserver(es => es.forEach(e => { seen = e.isIntersecting; run(); }), { threshold: .4 }).observe(st);
    v.ptGo = go;
  });
  /* Onglets entre les histoires */
  document.querySelectorAll(".pt-tabs").forEach(tabs => {
    const sec = tabs.closest("section"), st = [...sec.querySelectorAll(".pt-story")];
    tabs.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      tabs.querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", x === b));
      st.forEach((s, k) => s.classList.toggle("on", k === +b.dataset.s));
      const v = st[+b.dataset.s].querySelector(".pt-viewer"); if (v && v.ptGo) v.ptGo(0);
    }));
  });
})();

/* Formulaire de contact des sous-pages (même envoi que l'accueil) */
(function(){
  const f = document.getElementById("form"); if (!f) return;
  const SITE = window.__SITE || {}, EMAIL = SITE.email || "", note = document.getElementById("note");
  const cp = document.getElementById("copy");
  if (cp) cp.addEventListener("click", async () => { try { await navigator.clipboard.writeText(EMAIL); cp.textContent = "Copié"; } catch {} });
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = f.querySelector("button[type=submit]");
    if (f.botcheck && f.botcheck.checked) return;
    if (!f.checkValidity()) { note.textContent = "Indiquez vos prénoms, un e-mail valide et quelques mots sur le projet."; f.reportValidity(); return; }
    const d = Object.fromEntries(new FormData(f));
    const subject = `Projet — ${d.type || "Particulier"} — ${d.name}`;
    const body = `${d.message}\n\nDate et lieu : ${d.when || "à préciser"}\n\n—\n${d.name}\n${d.email}`;
    if (!SITE.web3forms_cle) {
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      note.textContent = "Votre messagerie s'ouvre avec la demande pré-remplie. Sinon, écrivez à " + EMAIL + ".";
      return;
    }
    btn.disabled = true; note.textContent = "Envoi en cours…";
    try {
      const r = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ access_key: SITE.web3forms_cle, subject, from_name: "Site AG Production", name: d.name, email: d.email, projet: d.type || "Particulier", dates_et_lieu: d.when || "", message: d.message }) });
      const j = await r.json(); if (!j.success) throw new Error(j.message);
      f.reset(); note.textContent = "Merci, votre demande est envoyée. Je vous réponds rapidement.";
    } catch { note.textContent = "L'envoi n'a pas abouti. Écrivez-moi directement à " + EMAIL + "."; }
    finally { btn.disabled = false; }
  });
})();
