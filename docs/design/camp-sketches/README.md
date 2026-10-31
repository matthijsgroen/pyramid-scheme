# Camp sketches

The approved screen designs for the camp, exported from the "Kamp schetsen" design canvas
(https://claude.ai/artifact/TJWJCGKWWPbmQUPgT6BwVp, 2026-10-23). Each file is one artboard as HTML: open it in
a browser to see it (the `support.js` line is the canvas's own runtime and is missing here; the markup renders
without it). They are sketches of layout and flow, not art: the camp itself is `CampScene` with painted art.

| File                        | Screen                                                                                                                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Main.dc.html`              | Mobile · camp (home): HUD with coins and hearts, the scene with chest (Verzameling, badge) and mosaic window (Mozaïek n/252), the "Verder met" card with **Op pad**, **Alle reizen**, a hint row ("2 oude reizen hebben iets nieuws te ontdekken") |
| `MobielReizen.dc.html`      | Mobile · Alle reizen: a popup over the camp; one flat list, tiers as headers newest first, the current journey marked NU, completed tiers collapsed with a dot when something new waits, locked journeys dashed with what they need                |
| `MobielUitpakken.dc.html`   | Mobile · coming home: "Terug in het kamp", the fire, hearts refilled ("Uitgerust bij het vuur"), "Je buit van deze tocht" list (camp find marked NIEUW, mosaic pieces, coins), **Uitpakken**                                                       |
| `MobielHoofdstuk.dc.html`   | Mobile · new chapter: sunrise, a new pyramid lights up on the horizon, the new camp piece, the first journey of the tier, **Op pad**                                                                                                               |
| `MobielVerzameling.dc.html` | Mobile · Verzameling, opened from the chest: tabs (Hiërogliefen, Schatten), grid with NIEUW badges and partial counts; camp things are not listed, they are seen in the camp                                                                       |
| `MobielMozaiek.dc.html`     | Mobile · Mozaïekraam from the camp window: "n van 252 stukjes", new pieces outlined                                                                                                                                                                |
| `DesktopKamp.dc.html`       | Desktop · camp with the journeys panel beside it instead of a popup                                                                                                                                                                                |
| `DesktopUitpakken.dc.html`  | Desktop · coming home, with an arrow to the spot where the new find lands                                                                                                                                                                          |
| `MobielIndeling.dc.html`    | Mobile · the camp layout at its end state                                                                                                                                                                                                          |
| `Kampspullen.dc.html`       | The 12 camp spots and their 74 finds per tier (8/10/15/19/22)                                                                                                                                                                                      |

Notes on the canvas:

- One fixed camp. It never moves, so travelling back is always one tap. A new chapter = a new pyramid on the
  horizon plus a new camp piece. The horizon IS the progress per tier.
- No tier step: **Op pad** is the big button (90% of visits). Alle reizen is one flat list, tiers only as
  headers. Every journey is always one tap away. Everything opens as a popup over the camp (journeys,
  collection, later the shop): nothing hidden behind swiping; the camp stays home.
- No dashed boxes: a spot stays bare ground until something stands there. The camp grows visibly by itself; the
  early sketches still show boxes, those are dropped.
