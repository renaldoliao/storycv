/* Ceritain language switch: Bahasa Indonesia first, English optional.
   Mark text with  data-t="key"  (or data-t-ph for placeholders, data-t-aria for aria-labels).
   Pages add their own words with  I18N.add({ id:{...}, en:{...} }).  */
(function(){
  const KEY = "ceritain-lang";
  let lang = "id";
  try { const s = localStorage.getItem(KEY); if (s === "en" || s === "id") lang = s; } catch(e){}
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "en" || q === "id") lang = q;

  const PRICE_IDR = 19000;   // the CV price, shown everywhere as {price}
  // Who runs Ceritain (shown in the privacy policy and terms). FILL THESE IN before launch.
  const OPERATOR = "[Nama pemilik usaha atau PT]";
  const CONTACT = "[email kontak]";
  const GLOBAL = { price: "Rp " + PRICE_IDR.toLocaleString("id-ID"), operator: OPERATOR, contact: CONTACT };
  const DICT = { id:{}, en:{} };
  function add(d){ for (const l in d) Object.assign(DICT[l] || (DICT[l] = {}), d[l]); }
  // t("key", {name:"Kira"}) fills {name}
  function t(k, vars){
    let s = DICT[lang][k] ?? DICT.id[k] ?? k;
    vars = Object.assign({}, GLOBAL, vars || {});
    if (vars) for (const v in vars) s = s.split("{" + v + "}").join(vars[v]);
    return s;
  }
  function apply(root){
    root = root || document;
    root.querySelectorAll("[data-t]").forEach((el) => { el.innerHTML = t(el.dataset.t); });
    root.querySelectorAll("[data-t-ph]").forEach((el) => { el.placeholder = t(el.dataset.tPh); });
    root.querySelectorAll("[data-t-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.tAria)); });
    document.documentElement.lang = lang;
    const tt = document.querySelector("meta[name=t-title]"); if (tt) document.title = t(tt.content);
    root.querySelectorAll(".langToggle").forEach((b) => {
      b.innerHTML = lang === "id" ? '<b>ID</b><span>EN</span>' : '<span>ID</span><b>EN</b>';
      b.setAttribute("aria-label", lang === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia");
    });
  }
  function setLang(l){
    lang = l === "en" ? "en" : "id";
    try { localStorage.setItem(KEY, lang); } catch(e){}
    apply();
    document.dispatchEvent(new CustomEvent("langchange", { detail:lang }));
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".langToggle");
    if (b){ e.preventDefault(); setLang(lang === "id" ? "en" : "id"); }
  });

  // Words used on every page
  add({
    id: {
      "brand": "ceritain",
      "nav.home": "Beranda", "nav.why": "Kenapa CV ATS?", "nav.buddies": "Kenalan sama Buddy", "nav.pricing": "Harga & FAQ",
      "nav.login": "Masuk", "nav.start": "Mulai gratis",
      "footer.about": "<b style=\"color:var(--ink)\">Ceritain</b> bantu pencari kerja di Indonesia ubah pengalaman jadi CV yang dilirik HRD.",
      "price.free": "Gratis",
      "nav.privacy": "Kebijakan Privasi", "nav.terms": "Syarat & Ketentuan",
    },
    en: {
      "brand": "ceritain",
      "nav.home": "Home", "nav.why": "Why ATS-friendly?", "nav.buddies": "Meet the buddies", "nav.pricing": "Pricing & FAQ",
      "nav.login": "Log in", "nav.start": "Start free",
      "footer.about": "<b style=\"color:var(--ink)\">Ceritain</b> helps job seekers in Indonesia turn their experience into a CV that gets noticed.",
      "price.free": "Free",
      "nav.privacy": "Privacy Policy", "nav.terms": "Terms",
    },
  });

  window.I18N = { t, add, apply, setLang, PRICE_IDR, GLOBAL, get lang(){ return lang; } };
})();
