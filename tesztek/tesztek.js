// Kettesben – regressziós tesztek.
// Futtatás: .\teszt.ps1 (a feltoltes.ps1 is lefuttatja feltöltés előtt).
// Új teszt:  teszt("Mit ellenőrzünk", async app => { ... });
//   app.K      – az app belseje (szűrés, pontozás, állapot, helyzet beállítása)
//   app.$(…)   – elem az app oldalán; app.katt(…) kattintás; app.tetszik()/nemTetszik() húzás
//   igaz(), egyenlo(), kozel() – ellenőrzések; varj(ms) – várakozás
// Az app teszt módban indul: üres profil, 1 óra · itthon · este · kellemes idő · közepes energia.

/* ================= ötletlista (otletek.js) ================= */

teszt("Ötletlista: minden azonosító egyedi", async app => {
  const ids = app.w.OTLETEK.map(r => r[0]);
  const dupla = ids.filter((id, i) => ids.indexOf(id) !== i);
  egyenlo(dupla, [], "ismétlődő azonosítók");
});

teszt("Ötletlista: minden sor mezői érvényesek", async app => {
  const {TAGS} = app.K, rossz = [];
  for (const r of app.w.OTLETEK) {
    const [id, t, d, min, loc, io, tod, e, cost, nov, tags, flags = "", mq = ""] = r;
    const p = [];
    if (r.length < 11 || r.length > 13) p.push("mezők száma " + r.length);
    if (!/^[a-z0-9]+$/.test(id)) p.push("azonosító");
    if (typeof t !== "string" || !t.trim()) p.push("cím");
    if (typeof d !== "string" || d.length < 10) p.push("leírás");
    if (!Number.isInteger(min) || min < 5 || min > 720) p.push("perc");
    if (![0, 1, 2, 3].includes(loc)) p.push("hely");
    if (!["in", "out", "both"].includes(io)) p.push("bent/kint");
    if (typeof tod !== "string" || !/^[mden]+$/.test(tod) || new Set(tod).size !== tod.length) p.push("napszak");
    if (![1, 2, 3].includes(e)) p.push("energia");
    if (![0, 1, 2, 3].includes(cost)) p.push("költség");
    if (![1, 2, 3].includes(nov)) p.push("újdonság");
    if (!Array.isArray(tags) || !tags.length || tags.length > 3 || tags.some(x => !TAGS[x]) || new Set(tags).size !== tags.length) p.push("jellegek");
    if (!/^[wrc]*$/.test(flags)) p.push("jelzők");
    if (typeof mq !== "string") p.push("térképes keresés");
    if (loc === 0 && mq) p.push("itthoni ötlethez nem kell térképes keresés");
    if (p.length) rossz.push((id || "?") + ": " + p.join(", "));
  }
  egyenlo(rossz, [], "hibás sorok");
});

teszt("Ötletlista: minden ötlet megjelenhet valamilyen helyzetben", async app => {
  const {IDEAS, fits} = app.K;
  const elerhetetlen = IDEAS.filter(i => !fits(i, {time: 720, loc: 3, io: "any", energy: 3, tod: i.tod[0], wx: "mild"})).map(i => i.id);
  egyenlo(elerhetetlen, [], "soha meg nem jelenő ötletek");
});

teszt("Ötletlista: minden jelleghez legalább 3 ötlet tartozik", async app => {
  const {IDEAS, TAGS} = app.K;
  const keves = Object.keys(TAGS).filter(t => IDEAS.filter(i => i.tags.includes(t)).length < 3);
  egyenlo(keves, [], "túl kevés ötletű jellegek");
});

teszt("Ötletlista: amíg a gyerekek alszanak, minden időkeretre jut legalább 2 ötlet", async app => {
  const {IDEAS, fits, GROUPS} = app.K;
  for (const [time] of GROUPS.find(g => g.k === "time").opts) {
    const c = {time, loc: 0, io: "any", energy: 1, tod: "n", wx: "cloud"};
    const n = IDEAS.filter(i => fits(i, c)).length;
    igaz(n >= 2, time + " percre itthon, késő este, fáradtan csak " + n + " ötlet van");
  }
});

/* ================= szűrés a helyzet alapján ================= */

const HELYZET = {time: 600, loc: 3, io: "any", energy: 3, tod: "d", wx: "mild", novel: false};

teszt("Szűrés: csak a rendelkezésre álló időbe beleférő ötletek jönnek", async app => {
  for (const time of [15, 30, 60, 120]) {
    app.K.setCtx({...HELYZET, time});
    const tul = app.K.deck().map(id => app.K.BY[id]).filter(i => i.min > time);
    egyenlo(tul.map(i => i.id), [], time + " percnél hosszabb ötletek");
    igaz(app.K.deck().length > 0, time + " percre nincs ötlet");
  }
});

teszt("Szűrés: a választott távolságnál messzebbre nem visz", async app => {
  for (const loc of [0, 1, 2]) {
    app.K.setCtx({...HELYZET, loc});
    egyenlo(app.K.deck().filter(id => app.K.BY[id].loc > loc), [], "hely " + loc + " felett");
  }
});

teszt("Szűrés: bent / kint választás", async app => {
  app.K.setCtx({...HELYZET, io: "in"});
  egyenlo(app.K.deck().filter(id => app.K.BY[id].io === "out"), [], "kinti ötlet bent kérésre");
  app.K.setCtx({...HELYZET, io: "out"});
  egyenlo(app.K.deck().filter(id => app.K.BY[id].io === "in"), [], "benti ötlet kint kérésre");
});

teszt("Szűrés: napszak", async app => {
  for (const tod of ["m", "d", "e", "n"]) {
    app.K.setCtx({...HELYZET, tod});
    egyenlo(app.K.deck().filter(id => !app.K.BY[id].tod.includes(tod)), [], "napszak " + tod);
  }
});

teszt("Szűrés: esőben csak az esőálló kinti programok maradnak", async app => {
  app.K.setCtx({...HELYZET, wx: "rain"});
  egyenlo(app.K.deck().filter(id => { const i = app.K.BY[id]; return i.io === "out" && !i.flags.includes("r"); }), [], "esőben kinti");
  igaz(app.K.deck().includes("rainwalk"), "az esős séta esőben is jöjjön");
});

teszt("Szűrés: hidegben és borúsban nincs meleg időt kívánó program", async app => {
  for (const wx of ["cold", "cloud"]) {
    app.K.setCtx({...HELYZET, wx});
    egyenlo(app.K.deck().filter(id => app.K.BY[id].flags.includes("w")), [], wx);
  }
  app.K.setCtx({...HELYZET, wx: "sun"});
  igaz(app.K.deck().includes("gelato"), "napos időben jöhet fagyi");
});

teszt("Szűrés: fáradtan nincs aktív program", async app => {
  app.K.setCtx({...HELYZET, energy: 1});
  egyenlo(app.K.deck().filter(id => app.K.BY[id].e > 1), [], "fáradtan aktív");
});

teszt("Szűrés: a kétszer elutasított ötlet eltűnik", async app => {
  app.K.setCtx({...HELYZET, loc: 0, tod: "e"});
  igaz(app.K.deck().includes("duel"), "kiinduláskor ott van");
  app.K.setState({tags: {}, ideas: {duel: {l: 0, d: 2}}, favs: []});
  igaz(!app.K.deck().includes("duel"), "kétszeri elutasítás után még mindig jön");
});

teszt("Szűrés: ha semmi nem illik, üres állapot jön, és újrakeverhető", async app => {
  app.K.setCtx({time: 15, loc: 0, io: "any", energy: 1, tod: "m", wx: "mild", novel: false});
  const n = app.K.deck().length;
  igaz(n > 0, "reggel 15 percre is kell ötlet");
  for (let k = 0; k < n; k++) await app.nemTetszik();
  igaz(app.$(".empty"), "nem jelent meg az üres állapot");
  egyenlo(app.$("#count").textContent, "", "számláló üres állapotban");
  igaz(app.$("#btnLike").disabled, "üres paklinál a tetszik gomb tiltott");
  await app.katt("#reshuffle", 20);
  egyenlo(app.K.deck().length, n, "újrakeverés után ugyanannyi ötlet");
});

/* ================= húzás és tanulás ================= */

teszt("Húzás: jobbra húzva kedvenc lesz, és a jellegei erősödnek", async app => {
  const id = app.felsoKartya(), i = app.K.BY[id];
  await app.tetszik();
  const s = app.K.state();
  egyenlo(s.favs, [id], "kedvencek");
  egyenlo(s.ideas[id], {l: 1, d: 0}, "számlálók");
  i.tags.forEach(t => kozel(s.tags[t], 1, "jelleg " + t));
  igaz(app.felsoKartya() !== id, "a kártya nem tűnt el");
  egyenlo(app.$("#favBadge").textContent, "1", "jelvény a Kedvencek fülön");
});

teszt("Húzás: balra húzva gyengül, és nem lesz kedvenc", async app => {
  const id = app.felsoKartya(), i = app.K.BY[id];
  await app.nemTetszik();
  const s = app.K.state();
  egyenlo(s.favs, [], "kedvencek");
  egyenlo(s.ideas[id], {l: 0, d: 1}, "számlálók");
  i.tags.forEach(t => kozel(s.tags[t], -0.5, "jelleg " + t));
});

teszt("Húzás: a nyílbillentyűk is működnek", async app => {
  const id = app.felsoKartya();
  app.d.body.dispatchEvent(new app.w.KeyboardEvent("keydown", {key: "ArrowRight", bubbles: true}));
  await varj(300);
  egyenlo(app.K.state().favs, [id], "jobbra nyíl után");
  const id2 = app.felsoKartya();
  app.d.body.dispatchEvent(new app.w.KeyboardEvent("keydown", {key: "ArrowLeft", bubbles: true}));
  await varj(300);
  egyenlo(app.K.state().ideas[id2], {l: 0, d: 1}, "balra nyíl után");
});

teszt("Húzás: a kártya húzása egérrel/ujjal is működik", async app => {
  const kartya = app.$(".card.top"), id = kartya.dataset.id, P = app.w.PointerEvent;
  const r = kartya.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  kartya.dispatchEvent(new P("pointerdown", {clientX: x, clientY: y, pointerId: 1, bubbles: true}));
  kartya.dispatchEvent(new P("pointermove", {clientX: x + 60, clientY: y, pointerId: 1, bubbles: true}));
  kartya.dispatchEvent(new P("pointermove", {clientX: x + 160, clientY: y, pointerId: 1, bubbles: true}));
  kartya.dispatchEvent(new P("pointerup", {clientX: x + 160, clientY: y, pointerId: 1, bubbles: true}));
  await varj(300);
  egyenlo(app.K.state().favs, [id], "jobbra húzás után");
  // kis mozdulat nem számít húzásnak
  const k2 = app.$(".card.top"), id2 = k2.dataset.id;
  k2.dispatchEvent(new P("pointerdown", {clientX: x, clientY: y, pointerId: 2, bubbles: true}));
  k2.dispatchEvent(new P("pointermove", {clientX: x - 40, clientY: y, pointerId: 2, bubbles: true}));
  k2.dispatchEvent(new P("pointerup", {clientX: x - 40, clientY: y, pointerId: 2, bubbles: true}));
  await varj(350);
  egyenlo(app.felsoKartya(), id2, "kis mozdulat után a kártya maradjon");
  egyenlo(app.K.state().ideas[id2], undefined, "kis mozdulat ne legyen húzás");
});

teszt("Húzás: a visszavonás mindent visszaállít", async app => {
  const id = app.felsoKartya();
  igaz(app.$("#btnUndo").disabled, "kezdetben nincs mit visszavonni");
  await app.tetszik();
  await app.katt("#btnUndo", 20);
  const s = app.K.state();
  egyenlo(s.favs, [], "kedvencek");
  egyenlo(s.ideas[id], {l: 0, d: 0}, "számlálók");
  Object.values(s.tags).forEach(w => kozel(w, 0, "jellegsúly"));
  egyenlo(app.felsoKartya(), id, "a kártya visszajött");
});

teszt("Tanulás: a szeretett jellegű ötletek kerülnek előre", async app => {
  app.K.setCtx({...HELYZET, time: 120, loc: 0, tod: "e"});
  app.K.setState({tags: {gasztro: 6}, ideas: {}, favs: []});
  const elso3 = app.K.deck().slice(0, 3);
  egyenlo(elso3.filter(id => !app.K.BY[id].tags.includes("gasztro")), [], "az első 3 között nem gasztro");
  igaz(app.$(".card.top .why").textContent.includes("Mert szeretitek: gasztro"), "a kártya mutassa, miért ajánljuk");
});

teszt("Tanulás: a nem szeretett jellegek hátrébb kerülnek", async app => {
  app.K.setCtx({...HELYZET, time: 120, loc: 0, tod: "e"});
  app.K.setState({tags: {jatek: -6}, ideas: {}, favs: []});
  const d = app.K.deck(), elso5 = d.slice(0, 5);
  egyenlo(elso5.filter(id => app.K.BY[id].tags.includes("jatek")), [], "játékos ötlet az első 5-ben");
});

teszt("Tanulás: a kipróbált és értékelt ötlet hatása", async app => {
  const {learned, BY} = app.K;
  app.K.setState({tags: {}, ideas: {duel: {l: 1, d: 0, done: {r: 3, at: "2026-01-01"}}, spa: {l: 1, d: 0, done: {r: 1, at: "2026-01-01"}}}, favs: []});
  igaz(learned(BY.duel) > 0, "a „szuper volt” ötlet pontja nőjön");
  igaz(learned(BY.spa) < 0, "a „nem jött be” ötlet pontja csökkenjen");
});

teszt("Valami új mód: ismeretlen terepről hoz ötletet", async app => {
  app.K.setCtx({...HELYZET, time: 120, loc: 0, tod: "e"});
  app.K.setState({tags: {gasztro: 6, beszelgetes: 4, romantika: 4}, ideas: {}, favs: []});
  await app.katt("#novel", 20);
  igaz(app.K.ctx().novel, "a kapcsoló nem kapcsolt be");
  const i = app.K.BY[app.felsoKartya()];
  egyenlo(i.tags.filter(t => (app.K.state().tags[t] || 0) >= 0.8), [], "a felső kártya ismert jellege");
  igaz(app.$(".card.top .pill.new"), "hiányzik az „Új terep” címke");
  igaz(app.$("#deck").classList.contains("novel-on"), "a pakli nincs kiemelve");
});

teszt("Valami új mód: a már látott ötletek hátrébb kerülnek, a jobbra húzás erősebben tanít", async app => {
  app.K.setCtx({...HELYZET, time: 120, loc: 0, tod: "e", novel: true});
  const elso = app.felsoKartya();
  app.K.setState({tags: {}, ideas: {[elso]: {l: 0, d: 1}}, favs: []});
  igaz(app.felsoKartya() !== elso, "a már látott ötlet maradt elöl");
  const id = app.felsoKartya();
  await app.tetszik();
  app.K.BY[id].tags.forEach(t => kozel(app.K.state().tags[t], 1.3, "jelleg " + t));
});

/* ================= helyzet beállítása ================= */

teszt("Helyzet: a beállító panel szűri a paklit és frissíti az összegzést", async app => {
  await app.katt("#ctxBtn", 20);
  igaz(!app.$("#sheetWrap").hidden, "a panel nem nyílt meg");
  await app.katt("#opt-time-15");
  egyenlo(app.$("#opt-time-15").getAttribute("aria-pressed"), "true", "kiválasztott gomb");
  await app.katt("#opt-energy-1");
  app.$("#city").value = "Szeged";
  await app.katt("#sheetGo", 20);
  igaz(app.$("#sheetWrap").hidden, "a panel nem zárult be");
  igaz(app.$("#ctxSum").textContent.startsWith("15 perc"), "összegzés: " + app.$("#ctxSum").textContent);
  egyenlo(app.K.deck().filter(id => app.K.BY[id].min > 15 || app.K.BY[id].e > 1), [], "nem illő ötletek");
  egyenlo(app.K.ctx().city, "Szeged", "város");
});

teszt("Helyzet: a kinti programoknál térképes keresés van a várossal", async app => {
  app.K.setCtx({...HELYZET, loc: 2, time: 180, io: "in", city: "Szeged"});
  const id = app.felsoKartya(), i = app.K.BY[id];
  igaz(i.loc > 0 && i.mq, "a felső kártya nem kimozdulós: " + id);
  const a = app.$(".card.top .why a");
  igaz(a, "nincs térkép link");
  igaz(a.href.startsWith("https://www.google.com/maps/search/") && a.href.includes(encodeURIComponent("Szeged")), a.href);
  app.K.setCtx({...HELYZET, loc: 0, tod: "e"});
  igaz(!app.$(".card.top .why a"), "itthoni ötletnél ne legyen térkép");
});

/* ================= kedvencek és ízlés ================= */

teszt("Kedvencek: kipróbálás és értékelés", async app => {
  const id = app.felsoKartya(), i = app.K.BY[id];
  await app.tetszik();
  await app.ful("favs");
  await app.katt('[data-did="' + id + '"]');
  await app.katt('[data-rate="3"][data-id="' + id + '"]');
  const s = app.K.state();
  egyenlo(s.ideas[id].done.r, 3, "értékelés");
  i.tags.forEach(t => kozel(s.tags[t], 2.5, "jelleg " + t));
  igaz(app.$(".done-tag") && app.$(".done-tag").textContent.startsWith("Szuper volt"), "nem került a kipróbáltak közé");
  igaz(app.$("#favBadge").hidden, "a jelvénynek el kell tűnnie");
});

teszt("Kedvencek: „nem jött be” értékelés gyengíti a jellegeket", async app => {
  const id = app.felsoKartya(), i = app.K.BY[id];
  await app.tetszik();
  await app.ful("favs");
  await app.katt('[data-did="' + id + '"]');
  await app.katt('[data-rate="1"][data-id="' + id + '"]');
  i.tags.forEach(t => kozel(app.K.state().tags[t], 0, "jelleg " + t));
});

teszt("Kedvencek: törlés a listából", async app => {
  const id = app.felsoKartya();
  await app.tetszik();
  await app.ful("favs");
  await app.katt('[data-rm="' + id + '"]');
  egyenlo(app.K.state().favs, [], "kedvencek");
  igaz(app.$("#view-favs .blank"), "üres lista üzenet");
});

teszt("Ízlésünk: statisztika és jellegsávok", async app => {
  await app.tetszik(); await app.nemTetszik(); await app.tetszik();
  await app.ful("taste");
  const st = app.$("#view-taste .stats").innerText.replace(/\s+/g, " ");
  igaz(st.includes("3 húzás") && st.includes("2 kedvenc"), st);
  egyenlo(app.$$("#view-taste .bar").length, Object.keys(app.K.TAGS).length, "sávok száma");
});

teszt("Ízlésünk: a kimásolt szöveg tartalmazza a tanultakat", async app => {
  const id = app.felsoKartya();
  await app.tetszik();
  const id2 = app.felsoKartya();
  await app.nemTetszik();
  const t = app.K.tasteText();
  igaz(t.includes("Húzások: 2"), t);
  igaz(t.includes("Tetszett (jobbra húzva): " + app.K.BY[id].t + " [" + id + "]"), t);
  igaz(t.includes("Nem tetszett (balra húzva): " + app.K.BY[id2].t), t);
  igaz(/Jellegek [^\n]*\+\d/.test(t), "jellegsúlyok: " + t);
});

teszt("Ízlésünk: a profil törlése megerősítés után", async app => {
  await app.tetszik();
  await app.ful("taste");
  await app.katt("#resetAsk");
  await app.katt("#resetNo");
  egyenlo(app.K.state().favs.length, 1, "Mégse után megmarad");
  await app.katt("#resetAsk");
  await app.katt("#resetYes", 20);
  egyenlo(app.K.state(), {tags: {}, ideas: {}, favs: []}, "törlés után");
});

/* ================= mentés és szinkron ================= */

teszt("Mentés: újratöltés után megmarad a profil", async app => {
  const id = app.felsoKartya();
  await app.tetszik();
  await app.ujratolt();
  egyenlo(app.K.state().favs, [id], "kedvencek újratöltés után");
});

teszt("Belépés: kijelentkezve a belépő képernyő látszik", async app => {
  igaz(app.$("#gate").hidden, "teszt módban induláskor nincs belépő képernyő");
  app.w.KApp.setAuth({status: "signedOut"});
  igaz(!app.$("#gate").hidden, "nem látszik");
  igaz(app.$('#gate [data-act="signIn"]'), "nincs belépés gomb");
});

teszt("Belépés: nem engedélyezett fiók üzenetet kap", async app => {
  app.belep(hamisDB(null, "permission-denied"), "idegen@example.com");
  await varj(20);
  igaz(!app.$("#gate").hidden && app.$("#gate").textContent.includes("nem fér hozzá"), app.$("#gate").textContent);
  igaz(app.$('#gate [data-act="signOut"]'), "nincs Másik fiókkal gomb");
});

teszt("Szinkron: belépéskor a közös profil töltődik be", async app => {
  const tavoli = {tags: {kaland: 3}, ideas: {duel: {l: 1, d: 0}}, favs: ["duel", "nincs-ilyen"]};
  const db = hamisDB(tavoli);
  app.belep(db);
  await varj(20);
  egyenlo(db.utvonal, "kettesben/profile", "Firestore útvonal");
  igaz(app.$("#gate").hidden, "a belépő képernyő nem tűnt el");
  egyenlo(app.K.state().favs, ["duel"], "kedvencek (az ismeretlen azonosító kiesik)");
  kozel(app.K.state().tags.kaland, 3, "jellegsúly");
  igaz(app.$("#sync").textContent.includes("szinkronban"), app.$("#sync").textContent);
});

teszt("Szinkron: a húzás feltöltődik a közös profilba", async app => {
  const db = hamisDB(null);
  app.belep(db);
  await varj(20);
  const id = app.felsoKartya();
  await app.tetszik();
  app.K.flush();
  await varj(20);
  igaz(db.irasok.length >= 1, "nem volt írás");
  const utolso = db.irasok[db.irasok.length - 1];
  egyenlo(utolso.utvonal, "kettesben/profile", "útvonal");
  egyenlo(utolso.adat.favs, [id], "feltöltött kedvencek");
});

teszt("Szinkron: üres felhő esetén a helyi profil feltöltődik", async app => {
  const id = app.felsoKartya();
  await app.tetszik();
  const db = hamisDB(null);
  app.belep(db);
  await varj(20);
  igaz(db.irasok.length === 1 && JSON.stringify(db.irasok[0].adat.favs) === JSON.stringify([id]), JSON.stringify(db.irasok));
});

teszt("Szinkron: a másik telefon változása élőben megjelenik", async app => {
  const db = hamisDB({tags: {}, ideas: {}, favs: []});
  app.belep(db);
  await varj(20);
  db.kuld({tags: {zene: 2}, ideas: {spa: {l: 1, d: 0}}, favs: ["spa"]});
  egyenlo(app.K.state().favs, ["spa"], "kedvencek");
  egyenlo(app.$("#favBadge").textContent, "1", "jelvény");
  await app.ful("favs");
  igaz(app.$("#view-favs").textContent.includes(app.K.BY.spa.t), "a kedvencek listában nem jelent meg");
});

/* ================= biztonság ================= */

teszt("Biztonság: a felhőből jövő kártékony adat nem fut le, és nem töri el az appot", async app => {
  const db = hamisDB({
    tags: {gasztro: 2, "<b>x</b>": 5, kaland: "<img src=x>", toString: 1},
    ideas: {
      duel: {l: 1, d: 0, done: {r: 3, at: '<img src=x onerror="parent.__tamadas=1">'}},
      spa: {l: 1, d: 0, done: {r: 2, at: "2026-10-01"}},
      candle: "nem objektum", "rossz id!": {l: 1, d: 0}, ujotlet99: {l: 2, d: 0},
    },
    favs: ["duel", "spa", "duel", 42, "<script>", "constructor"],
  });
  app.belep(db);
  await varj(20);
  const s = app.K.state();
  egyenlo(Object.keys(s.tags).sort(), ["gasztro", "kaland"], "csak ismert jellegek maradnak");
  egyenlo(s.tags.kaland, 0, "nem szám jellegsúly");
  egyenlo(s.ideas.duel, {l: 1, d: 0}, "hibás dátumú értékelés eldobva");
  egyenlo(s.ideas.spa.done, {r: 2, at: "2026-10-01"}, "érvényes értékelés megmarad");
  igaz(!("candle" in s.ideas) && !("rossz id!" in s.ideas), "hibás bejegyzések eldobva");
  egyenlo(s.ideas.ujotlet99, {l: 2, d: 0}, "egy újabb ötletlista előzményei megmaradnak");
  egyenlo(s.favs, ["duel", "spa"], "kedvencek");
  await app.ful("favs");
  await app.ful("taste");
  await varj(50);
  igaz(!app.$("#view-favs img") && !app.$("#view-taste img"), "kép-elem került az oldalba");
  igaz(window.__tamadas === undefined && app.w.__tamadas === undefined, "lefutott a beinjektált kód");
  igaz(app.$("#view-favs .done-tag").textContent.includes("2026. 10. 01."), "a kipróbált ötlet dátuma");
});

teszt("Biztonság: sérült helyi mentés esetén is elindul az app", async app => {
  app.w.localStorage.setItem("kettesben.teszt.state", JSON.stringify({tags: [1, 2], ideas: null, favs: "duel"}));
  await app.ujratolt();
  egyenlo(app.K.state(), {tags: {}, ideas: {}, favs: []}, "üres profil sérült mentésből");
  igaz(app.felsoKartya(), "nincs kártya");
  app.w.localStorage.setItem("kettesben.teszt.state", "{nem json");
  await app.ujratolt();
  igaz(app.felsoKartya(), "hibás JSON után nincs kártya");
});
