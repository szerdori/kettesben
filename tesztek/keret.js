// Kettesben – egyszerű tesztkeret.
// Minden teszt egy friss példányt kap az appból (../index.html?teszt), üres teszt-tárhellyel.
// Új tesztet a tesztek.js-be kell írni:  teszt("Mit ellenőrzünk", async app => { ... });
"use strict";

const TESZTEK = [];
function teszt(nev, fn) { TESZTEK.push({nev, fn}); }

class Hiba extends Error {}
function igaz(feltetel, uzenet) { if (!feltetel) throw new Hiba(uzenet || "a feltétel nem teljesült"); }
function egyenlo(kapott, vart, uzenet) {
  const k = JSON.stringify(kapott), v = JSON.stringify(vart);
  if (k !== v) throw new Hiba((uzenet ? uzenet + ": " : "") + "várt " + v + ", kapott " + k);
}
function kozel(kapott, vart, uzenet, eltérés = 1e-6) {
  if (Math.abs(kapott - vart) > eltérés) throw new Hiba((uzenet ? uzenet + ": " : "") + "várt " + vart + ", kapott " + kapott);
}
const varj = ms => new Promise(r => setTimeout(r, ms));

// teszt Firebase helyett: rögzíti az írásokat, és kézzel küldhetünk „távoli” változást
function hamisDB(kezdoAdat, hibaKod) {
  const db = {
    irasok: [], utvonal: null, kuld: null, leiratkozott: false,
    watch(utvonal, next, err) {
      db.utvonal = utvonal;
      db.kuld = adat => next(adat == null ? null : JSON.parse(JSON.stringify(adat)), false);
      setTimeout(() => hibaKod ? err({code: hibaKod}) : db.kuld(kezdoAdat), 0);
      return () => { db.leiratkozott = true; };
    },
    set(utvonal, adat) { db.irasok.push({utvonal, adat: JSON.parse(JSON.stringify(adat))}); return Promise.resolve(); },
  };
  return db;
}

function tarhelyTorles() {
  try { Object.keys(localStorage).filter(k => k.startsWith("kettesben.teszt")).forEach(k => localStorage.removeItem(k)); } catch (e) {}
}

function appBetoltes(keret) {
  return new Promise((ok, nem) => {
    const ido = setTimeout(() => nem(new Hiba("az app nem töltődött be 10 mp alatt")), 10000);
    keret.onload = () => {
      const w = keret.contentWindow;
      if (!w.KTest) { clearTimeout(ido); return nem(new Hiba("az app teszt módja (KTest) nem elérhető – szkripthiba az index.html-ben?")); }
      clearTimeout(ido); ok();
    };
    keret.src = "../index.html?teszt&t=" + Date.now();
  });
}

async function ujApp() {
  tarhelyTorles();
  const keret = document.createElement("iframe");
  keret.width = 390; keret.height = 780;
  document.getElementById("terep").appendChild(keret);
  const hibak = [];
  await appBetoltes(keret);
  const app = {
    keret, hibak,
    get w() { return keret.contentWindow; },
    get d() { return keret.contentDocument; },
    get K() { return keret.contentWindow.KTest; },
    $(s) { return keret.contentDocument.querySelector(s); },
    $$(s) { return [...keret.contentDocument.querySelectorAll(s)]; },
    async katt(cel, ms = 0) {
      const el = typeof cel === "string" ? app.$(cel) : cel;
      igaz(el, "nincs ilyen elem: " + cel);
      el.click(); if (ms) await varj(ms);
    },
    // jobbra/balra húzás a gombokkal (a kártya kirepülése után)
    async tetszik() { await app.katt("#btnLike", 300); },
    async nemTetszik() { await app.katt("#btnNope", 300); },
    felsoKartya() { const k = app.$(".card.top"); return k ? k.dataset.id : null; },
    async ful(nev) { await app.katt('.tab[data-view="' + nev + '"]', 20); },
    async ujratolt() { await appBetoltes(keret); figyel(); },
    belep(db, email = "teszt@example.com") { app.w.KApp.setAuth({status: "signedIn", email, db}); },
  };
  function figyel() { app.w.addEventListener("error", e => hibak.push(e.message)); }
  figyel();
  return app;
}

async function futtat() {
  const lista = document.getElementById("lista"), osszes = document.getElementById("osszesites");
  const sorok = []; let jo = 0, rossz = 0;
  const csak = new URLSearchParams(location.search).get("csak");
  for (const t of TESZTEK) {
    if (csak && !t.nev.toLowerCase().includes(csak.toLowerCase())) continue;
    const li = document.createElement("li"); li.textContent = t.nev + " …"; lista.appendChild(li);
    let app = null, hiba = null;
    try {
      app = await ujApp();
      await Promise.race([t.fn(app), varj(15000).then(() => { throw new Hiba("időtúllépés (15 mp)"); })]);
      if (app.hibak.length) throw new Hiba("szkripthiba az appban: " + app.hibak[0]);
    } catch (e) { hiba = e; }
    if (app) app.keret.remove();
    if (hiba) {
      rossz++; li.className = "rossz";
      li.textContent = "HIBA  " + t.nev + " — " + (hiba instanceof Hiba ? hiba.message : (hiba && hiba.stack || hiba));
    } else { jo++; li.className = "jo"; li.textContent = "OK    " + t.nev; }
    sorok.push(li.textContent);
  }
  tarhelyTorles();
  const vege = "EREDMÉNY: " + jo + " sikeres, " + rossz + " hibás";
  osszes.textContent = vege; osszes.className = rossz ? "rossz" : "jo";
  document.title = (rossz ? "✗ " : "✓ ") + vege;
  sorok.push(vege);
  // a teszt.ps1 ezt várja; kézzel megnyitva (más kiszolgálón) nem baj, ha nem sikerül
  try { await fetch("/eredmeny", {method: "POST", body: sorok.join("\n")}); } catch (e) {}
}
