/* Version d'essai de l'accueil : animations. Rien ne s'anime si l'appareil demande moins d'animations. */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement; root.classList.add("v2mo");

  /* 1. Le titre apparaît mot par mot, par un masque qui monte */
  const big = document.getElementById("heroBig");
  const split = () => {
    if (!big || big.querySelector(".w")) return;
    const words = big.textContent.trim().split(/\s+/);
    big.setAttribute("aria-label", words.join(" "));
    big.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</span></span>`).join(" ");
  };
  if (big) { split(); new MutationObserver(split).observe(big, { childList: true }); }

  /* 2. En descendant, la vidéo plein écran se resserre en carte aux coins arrondis et le titre s'efface */
  const reel = document.querySelector(".reel");
  if (reel) {
    let q = false;
    const upd = () => { q = false; const p = Math.max(0, Math.min(1, scrollY / (innerHeight * .55))); reel.style.setProperty("--p", p.toFixed(3)); };
    const soon = () => { if (!q) { q = true; requestAnimationFrame(upd); } };
    upd(); addEventListener("scroll", soon, { passive: true }); addEventListener("resize", soon);
  }

  /* 6. Léger relief sur les cartes de films : la vignette s'incline en suivant la souris */
  const rail = document.getElementById("rail");
  if (rail && matchMedia("(hover:hover) and (pointer:fine)").matches) {
    let cur = null;
    const reset = () => { if (cur) { cur.style.transform = ""; cur = null; } };
    rail.addEventListener("pointermove", e => {
      const shot = e.target.closest(".film") && e.target.closest(".film").querySelector(".shot");
      if (shot !== cur) reset();
      if (!shot) return;
      cur = shot; const r = shot.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      shot.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) scale(1.015)`;
    });
    rail.addEventListener("pointerleave", reset);
  }

  /* Pourquoi travailler avec moi : un fil qui se remplit au défilement, l'argument à l'écran s'allume */
  const why = document.querySelector(".why");
  if (why) {
    const arts = [...why.querySelectorAll("article")]; let q2 = false, last = -1;
    const upd2 = () => {
      q2 = false; const mid = innerHeight * .52, r = why.getBoundingClientRect();
      why.style.setProperty("--wp", Math.max(0, Math.min(1, (mid - r.top) / r.height)).toFixed(3));
      let best = -1, d = 1e9;
      arts.forEach((a, i) => { const b = a.getBoundingClientRect(), x = Math.abs((b.top + b.bottom) / 2 - mid); if (x < d) { d = x; best = i; } });
      if (r.top > innerHeight * .85) best = -1; else if (r.bottom < innerHeight * .2) best = arts.length - 1;
      if (best !== last) { last = best; arts.forEach((a, i) => { a.classList.toggle("on", i === best); a.classList.toggle("vu", i < best); }); }
    };
    const soon2 = () => { if (!q2) { q2 = true; requestAnimationFrame(upd2); } };
    upd2(); addEventListener("scroll", soon2, { passive: true }); addEventListener("resize", soon2);
  }
})();
