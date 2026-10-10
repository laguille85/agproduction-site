/* Animations au défilement : apparition en fondu, apparition en cascade, rideau sur les couvertures, compteurs.
   Aucun calcul pendant le défilement : un seul IntersectionObserver. Le zoom des photos est en CSS pur (style.css).
   Rien ne s'anime si l'utilisateur a demandé moins d'animations dans les réglages de son appareil. */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const SOLO = ".head,.case,.why,.about,.contact,.pp-head,.pp-quote,.pp-ask,.pg-faq,.pg-links,.pg-block,.pg-text,.pg-cta,.pt-viewer,.pt-h2";
  const CASCADE = ".bento,.rail,.pgrid,.skills,.refs,.steps,.fa-grid,.pp-steps,.pp-figs,.pp-masonry,.pg-films";
  const ALL = SOLO + "," + CASCADE;
  const els = [...document.querySelectorAll(ALL)].filter(el => !el.parentElement.closest(ALL));
  if (!els.length) return;
  document.documentElement.classList.add("mo");

  const count = root => root.querySelectorAll("[data-count]").forEach(el => {
    if (el.closest("#bento") || el.dataset.done) return;   // les chiffres de l'accueil ont déjà leur propre animation
    el.dataset.done = 1;
    const end = parseInt(el.dataset.count, 10) || 0, t0 = performance.now(), dur = 1300;
    const tick = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(tick); };
    el.textContent = "0"; requestAnimationFrame(tick);
  });
  const show = (el, now) => {
    if (now) el.classList.add("rv-now");
    el.classList.add("rv-in"); count(el);
    if (now) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("rv-now")));
    setTimeout(() => el.classList.add("rv-done"), now ? 0 : 2200);   // libère les transitions propres aux éléments (survol, etc.)
  };

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }),
    { rootMargin: "0px 0px -8% 0px" });
  const vh = innerHeight;
  els.forEach(el => {
    el.classList.add("rv");
    if (el.matches(CASCADE)) { el.classList.add("rv-st"); [...el.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 10))); }
    if (el.getBoundingClientRect().top < vh * .92) show(el, true);   // déjà à l'écran au chargement : affiché tout de suite, sans retard
    else io.observe(el);
  });
})();
