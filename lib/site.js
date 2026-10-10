/* StoryCV shared page helpers: navigation, footer, buddy theme, scroll reveal.
   Each page includes:  <div id="siteNav"></div> … <div id="siteFooter"></div>  */
(function(){
  const { BUDDIES, mascot } = window.StoryBuddies;
  const PRICE_IDR = 19000;
  const PAGES = [
    ["/", "Home"], ["/why-ats", "Why ATS-friendly?"], ["/buddies", "Meet the buddies"], ["/pricing", "Pricing & FAQ"],
  ];
  const path = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
  const here = (href) => href === path || (href !== "/" && path.startsWith(href));

  let current = "kira";
  try { const s = localStorage.getItem("storycv-landing-buddy"); if (BUDDIES[s]) current = s; } catch(e){}

  function applyTheme(id){
    current = id;
    try { localStorage.setItem("storycv-landing-buddy", id); } catch(e){}
    const t = BUDDIES[id].theme, r = document.documentElement.style;
    const map = { "--accent":t.accent, "--accent-dark":t.dark, "--soft":t.soft, "--bg":t.bg, "--pop":t.pop, "--pop-ink":t.popInk,
      "--head":t.head, "--bub":t.bub, "--me":t.me, "--bd":t.bd, "--sh":t.sh, "--btn":t.btn, "--btn-bd":t.btnBd, "--btn-sh":t.btnSh };
    for (const k in map) r.setProperty(k, map[k]);
    document.querySelectorAll(".startLink").forEach((a) => a.href = "/app?buddy=" + id);
    const nm = document.getElementById("navMascot"); if (nm) nm.innerHTML = mascot(id, "happy", 34);
    document.dispatchEvent(new CustomEvent("buddychange", { detail:id }));
  }

  const links = PAGES.map(([h, l]) => `<a href="${h}"${here(h) ? ' aria-current="page"' : ""}>${l}</a>`).join("");
  const nav = document.getElementById("siteNav");
  if (nav) nav.outerHTML = `<nav class="site" aria-label="Main">
    <div class="wrap">
      <a class="logo" href="/"><span id="navMascot"></span>storycv</a>
      <div class="navlinks">${links}</div>
      <div class="navcta"><a class="login" href="/app?mode=login">Log in</a><a class="btn small startLink" href="/app">Start free</a></div>
    </div>
    <div class="mobilelinks">${links}</div>
  </nav>`;
  const foot = document.getElementById("siteFooter");
  if (foot) foot.outerHTML = `<footer class="site"><div class="wrap">
    <div><b style="color:var(--ink)">StoryCV</b> helps job seekers in Indonesia turn their experience into a CV that gets noticed. © ${new Date().getFullYear()}</div>
    <div>${PAGES.slice(1).map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}<a href="/app?mode=login">Log in</a></div>
  </div></footer>`;

  document.querySelectorAll(".priceText").forEach((el) => el.textContent = "Rp " + PRICE_IDR.toLocaleString("id-ID"));
  // <span data-m="kopi think 80"></span>  →  draws that character
  document.querySelectorAll("[data-m]").forEach((el) => { const [id, mood, size] = el.dataset.m.split(" "); el.innerHTML = mascot(id, mood || "happy", +size || 60); });
  const wave = document.getElementById("wave");
  if (wave) wave.innerHTML = Object.keys(BUDDIES).map((id, i) => `<span class="bob" style="animation-delay:-${i * .6}s;display:inline-block">${mascot(id, "yay", 76)}</span>`).join("");

  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold:.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  window.StorySite = { applyTheme, get current(){ return current; }, PRICE_IDR };
  applyTheme(current);
})();
