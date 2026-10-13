# Kettesben

Randiötletek kettőnknek, Tinder-szerűen: jobbra húzva tetszik, balra nem. Az app azt ajánlja, ami belefér a mostani időtökbe, helyzetetekbe, napszakba és időjárásba, és a húzásokból meg az értékelésekből megtanulja, mit szerettek. A „Ma kipróbálnánk valami újat” kapcsolóval szándékosan ismeretlen irányokból hoz ötletet.

**Megnyitás:** https://szerdori.github.io/kettesben/

- **Felület:** egyetlen statikus oldal (`index.html`), GitHub Pages-en fut.
- **Adatok és belépés:** ugyanaz a Firebase-projekt (`hazi-naplo`), mint a MomAssistanté, külön dokumentumban: `kettesben/profile`. Google-belépés kell hozzá, és ugyanazok a fiókok férnek hozzá, akik a MomAssistanthoz.
- **Ötletek:** az `otletek.js` fájlban vannak, a fejlécében le van írva, melyik szám mit jelent.

## Fájlok

| Fájl | Mire való |
|---|---|
| `index.html` | maga az app |
| `otletek.js` | a randiötletek listája |
| `firebase-config.js` | a Firebase-projekt webes beállításai (ugyanazok, mint a MomAssistantban) |
| `manifest.webmanifest`, `icon*`, `apple-touch-icon.png` | kezdőképernyőre tehető app ikonja és neve |

## Első beállítás

1. **GitHub-tároló:** https://github.com/new, név: `kettesben`, láthatóság: **Public**, ne pipálj be semmit, majd **Create repository**.
2. **Első feltöltés:** a projektmappában `.\feltoltes.ps1 "Kettesben: első változat"` (vagy dupla kattintás a `feltoltes.cmd`-re).
3. **GitHub Pages:** a tárolóban **Settings → Pages → Source: Deploy from a branch → Branch: `main`, mappa: `/ (root)` → Save.** Egy-két perc múlva él a fenti címen.

Firebase-ben nincs teendő: a `szerdori.github.io` már engedélyezett domain, és a Firestore szabályai a két fiókotoknak mindenhez hozzáférést adnak.

## Telefonra
Nyisd meg a címet, lépj be Google-fiókkal, majd:
- **Android (Chrome):** menü → *Hozzáadás a kezdőképernyőhöz*
- **iPhone (Safari):** Megosztás → *Főképernyőhöz adás*

## Új ötletek
Az app **Ízlésünk** fülén az **Ízlésünk másolása** gomb kimásolja, mit tanult rólatok. Ezt illeszd be Claude-nak azzal, hogy bővítse a listát. Claude az `otletek.js`-be írja az új ötleteket, és feltöltés után megjelennek. A meglévő ötletek azonosítóját nem szabad megváltoztatni, mert a tanult ízlés azokhoz kötődik.

## Tesztek
A `tesztek/tesztek.js` regressziós tesztjei az app minden fő funkcióját ellenőrzik: az ötletlista épségét, a szűrést (idő, hely, bent/kint, napszak, időjárás, energia), a húzást és a visszavonást, a tanulást, a „valami új” módot, a helyzetbeállítást, a kedvenceket és értékelést, az ízlésprofilt, a mentést, a belépést és a két telefon közti szinkront (ál-Firebase-szel, a valódi adatokat nem érinti).

```
.\teszt.ps1
```
vagy dupla kattintás a `teszt.cmd` fájlra. Egy láthatatlan Edge-ablakban fut, körülbelül fél perc. Hasznos kapcsolók:
- `.\teszt.ps1 -Csak szinkron` – csak azok a tesztek, amelyek nevében szerepel a szó
- `.\teszt.ps1 -Lathato` – látható böngészőablakban fut

Új teszt a `tesztek/tesztek.js` végére kerül, a fájl elején le van írva, hogyan. Az app teszt módban (`index.html?teszt`) külön böngészőtárhelyet használ, és nem kapcsolódik a Firebase-hez.

## Frissítés
```
.\feltoltes.ps1 "Mit változtattunk"
```
vagy dupla kattintás a `feltoltes.cmd` fájlra. Feltöltés előtt a szkript lefuttatja a teszteket, és ha valamelyik hibás, nem tölt fel. Sürgős esetben a `-TesztNelkul` kapcsolóval kihagyhatók. A GitHub Pages egy-két percen belül kiteszi az új verziót.
