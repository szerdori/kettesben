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

## Frissítés
```
.\feltoltes.ps1 "Mit változtattunk"
```
vagy dupla kattintás a `feltoltes.cmd` fájlra. A GitHub Pages egy-két percen belül kiteszi az új verziót.
