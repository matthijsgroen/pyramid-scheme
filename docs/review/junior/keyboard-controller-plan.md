# Toetsenbord- en controllerplan

Aanleiding: twee playtesters willen de ontdekkingsreiziger met de pijltjestoetsen over de kaart bewegen. Dit plan
dekt toetsenbord en game controller (Gamepad API) voor drie gebieden: de kaart, menu's en schermen, puzzels.
Touch blijft leidend en verandert nergens: elke toets doet wat een tik al doet, via dezelfde code.

Status: slice 1, 2 en 4 gebouwd, slice 5 gebouwd (puzzelcontract, `useGridCursor`, cursor C; sumplete, eclipse, star battle, sudoku, futoshiki, shrine beam, crocodile, tableau-piramide; `erase` = Delete en Backspace; Backspace is `back` waar niets wist; LB/RB lopen sudoku/futoshiki langs het pad incl. gum); slice 6 gebouwd (balance, canisters, reflex-vallen: focus is de cursor via `useFocusBoard`, look C op de gefocuste knop, cijfers kiezen gewicht/antwoord, reflex start zonder focus; hendel, fakkel, leeswand via de encounterlaag, leeswand-bakje met look C, hun knoppenring wacht op slice 3), de rest is plan. Pad-repeat: eerste herhaling na 24 polls, daarna elke 8. Visuele stappen hebben eerst een spike + goedgekeurd plaatje nodig (gemarkeerd met **spike**).

---

## 1. Wat er nu is

Geen design-doc gaat over toetsenbord, controller of input-toegankelijkheid (`docs/game-design/`, `docs/instructions/`
doorzocht). Eén zin raakt het: `docs/game-design/puzzles/star-battle.md:417` (een tik blijft een echte `click`, zodat
toetsenbord en screenreader blijven werken). `onboarding.md` zegt niets over input.

**Bestaand toetsenbordwerk (los, per component, geen gedeeld model):**

| Waar                                                                              | Wat                                                                                                                                                |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/atoms/dialogFocus.ts:8,18,25`                                             | `focusOnMount` (focus erin, terug naar opener), `closeOnEscape` (alleen de binnenste dialog), `trapTab`                                            |
| gebruikt door                                                                     | `ConfirmModal.tsx:39`, `CampPopup.tsx:18-31`, `NewChapterScreen.tsx:29-42`, `ComingHomeScreen.tsx:34` (alleen trapTab), `SettingsModal.tsx:89-109` |
| `src/app/PyramidLevel/usePyramidNavigation.ts:14-47` + `PyramidDisplay.tsx:90-91` | pijltjes over de tableau-piramide, Enter, cijfers direct invullen — het enige echte bord-cursormodel                                               |
| `src/ui/molecules/InputBlock.tsx:66-76`                                           | Esc/Enter blur, pijltjes niet doorlaten                                                                                                            |
| `src/ui/atoms/NumberLock.tsx:38`                                                  | Enter bevestigt                                                                                                                                    |
| `src/ui/molecules/CollectionTabs.tsx:37-92`                                       | roving tabindex, pijltjes/Home/End — het juiste patroon voor tabs                                                                                  |
| `src/mods/puzzle/app/hidato/HidatoBoard.tsx:235-241`                              | elke hex `tabIndex=0`, Enter/Spatie = tik                                                                                                          |
| `src/app/dev/LockEditor.tsx:41`                                                   | dev-only Esc                                                                                                                                       |

**Gaten:**

- **Kaart: niets.** De kaart is `role="img"` (`SiteMapView.tsx:2221`); markers zijn `<div onClick>` met
  `pointerEvents` alleen als ze iets doen (`SiteMapView.tsx:1550-1597`). Alleen de actieprompt is een echte `<button>`
  (`src/ui/atoms/MapActionPrompt.tsx`, getekend op `SiteMapView.tsx:2704`).
- **Gamepad: niets.** Geen `getGamepads`/`gamepadconnected` in `src/`.
- **Focus zien: bijna niets.** `focus-visible:` staat alleen op `CampScene.tsx:155` en `LanguageChip.tsx:14`.
- **Klikbare niet-knoppen:** gesprek doorklikken `src/app/fez/Fez.tsx:138` (`<div onClick>`), level-afsluiting
  `src/app/PyramidLevel/LevelCompletionHandler.tsx:29`, backdrops (`ShopPanel.tsx:31` e.a., die mogen blijven).
- **EncounterModal en ShopPanel:** geen Escape.
- **Geen router:** schermen zijn state in `src/app/Base.tsx`; browser-terug / Android-terugveeg doet niets bijzonders.
- **Puzzelborden:** cellen zijn meestal `<button>` (sumplete, eclipse, sudoku, futoshiki, star battle, pair puzzle,
  shrine beam, balance, canisters, crocodile) — tabbaar, maar één tabstop per cel, geen pijltjes. Rush hour,
  procession, constellation en hidato zijn sleep-gebaren op pointer events zonder toetsenbord-equivalent
  (hidato: alleen Enter per hex).

**Waar de kaart al bijna klaar voor is.** Het aanbod rond de speler is al richting-gebaseerd:

- `src/app/SiteMap/clickTargets.ts:138` `markerAt` geeft per cel `{kind:"arrow", dir}`; pijlen staan **alleen rond
  de speler** (`nearCells`, `corridorRuns.ts:86` `cellsAroundExplorer`: één stap per open richting).
- In een ontworpen kamer groepeert `roomChoices.ts:102-142` de keuzes **per richting** — één pijl per kompasrichting.
- `clickTargets.ts:199` `buildOfferContext` en `useSiteNavigation.ts:205` `onCellClick` zijn de enige regel voor
  "waar leidt een tik". Een gang-pijl leidt al naar het eind van de run (één tik = hele gang).
- Trap, uitgang, obstakel, plaat, hendel, fakkel, kamer-binnengaan: allemaal via de ene prompt (`ArrivalPromptKind`,
  `useSiteNavigation.ts:56`).

Dus: **pijltje in richting d = tik op de ring-pijl die in richting d wijst; Enter = tik op de prompt.** Geen nieuwe
looplogica, geen focus op markers nodig.

---

## 2. Gedeeld inputmodel

### 2.1 Acties

Core kent acties, geen toetsen. Toetsen en padknoppen worden op acties gemapt; consumenten zien alleen acties.

| Actie                                                     | Toetsenbord                                           | Pad (standard mapping, positioneel)           |
| --------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| `move(n/e/s/w)`                                           | pijltjes, WASD (via `event.code`, dus ZQSD op AZERTY) | D-pad, linkerstick (drempel 0.5)              |
| `confirm`                                                 | Enter, Spatie                                         | onderste knop (0: A / ✕)                      |
| `back`                                                    | Escape; Backspace waar niets wist                     | rechter knop (1: B / ◯)                       |
| `undo`                                                    | Z, Ctrl/Cmd+Z                                         | linker knop (2: X / ▢)                        |
| `alt` (familie-eigen: notities, uitsluiten, slepen-modus) | N / Shift                                             | bovenste knop (3: Y / △)                      |
| `prev` / `next` (tabs, waarde wisselen)                   | `[` `]`, PageUp/PageDown                              | LB / RB (4/5)                                 |
| `hint`                                                    | H                                                     | Select/View (8)                               |
| `menu` (instellingen)                                     | — (Escape op topniveau valt onder `back`)             | Start/Menu (9)                                |
| `erase`                                                   | Delete, Backspace (niet in een invoerveld)            | — (gum op de pad-rij)                         |
| `value(n)`                                                | cijfers 1–9                                           | — (pad gebruikt de pad-knoppen op het scherm) |

Herhaling bij vasthouden: toetsenbord gebruikt de OS-repeat (`event.repeat`), pad telt polls (eerste herhaling na
N polls, daarna elke M) — getest door polls te tellen, nooit met een klok.

### 2.2 Lagen (één regel voor wie de acties krijgt)

Een stapel input-lagen in core (`src/app/input/`): **de bovenste laag krijgt alle acties, de rest niets.**
Dialog > encounterscherm (puzzel/val/winkel) > kaart > kamp. Een laag wordt geopend door te mounten en gesloten door
te unmounten (zoals `focusOnMount` nu). Geen per-scherm uitzonderingen; een scherm dat iets anders wil, opent een laag.

Eén bewaker: **een bewerkbaar veld (input/textarea/contenteditable) houdt zijn eigen toetsen** — de laag ziet de
toetsaanslag dan niet. Dat dekt `NumberLock`, `InputBlock`, tableau-invoer zonder carve-out per component.

### 2.3 Twee soorten focus

1. **DOM-focus (menu's, dialogs, pads, knoppenrijen).** Tab/Shift+Tab blijft native. `move` doet ruimtelijke
   navigatie: naar de dichtstbijzijnde focusbare in die richting binnen de bovenste laag (bounding-rect, puur en
   testbaar op rechthoeken). `confirm` = `click()` op het gefocuste element. Tabs blijven roving tabindex
   (`CollectionTabs` als voorbeeld).
2. **Spelfocus (kaart, borden).** De laag beheert zelf een cursor/positie en vertaalt `move`/`confirm` naar de
   bestaande tik-handler. De kaart heeft geen cursor nodig (de speler ís de cursor); borden hebben er een.

### 2.4 Hoe focus zichtbaar is

- Een `data-input="touch|keys|pad"` op `<html>`, gezet door de laatst gebruikte bron (pointerdown → touch).
  **Focusringen en cursors tekenen alleen bij keys/pad.** Touch ziet dus niets nieuws — dat is de garantie dat touch
  ongewijzigd blijft.
- **Besloten (spike `spike/board-cursor`, story Mods/Spikes/Board cursor):** knoppen krijgen een zachte amber gloed
  met hoekhaken (variant B); de bordcursor is een opgetilde cel: iets groter, lichter, met schaduw en dunne rand
  (variant C). Kleur uit de `ember`-ramp (`--color-ember-400`, "glow, focus" in `docs/design/camp-palette.md`).
- Toetsglyphs op knoppen (⏎ / Ⓐ naast de prompt, Z / Ⓧ op undo) alleen bij keys/pad. **spike** + designerkeuze (V6).
- **Besloten: blok "Bediening" bij de spelregels.** Elke puzzel krijgt onder "How to play" een kort blok
  "Bediening" met de toetsen of padknoppen van die familie, in glyphs (`[A] pakken · [D-pad] schuiven · [A]
loslaten`). Het blok volgt `data-input`: bij keys toetsen, bij pad padknoppen, bij touch geen blok. Een
  aangesloten maar ongebruikte pad toont dus niets. Padglyphs volgen het merk van de pad (Xbox A/B, PlayStation ✕/◯,
  uit `Gamepad.id`; onbekend = Xbox). De spelregels zelf blijven over het spel; "Tap" daarin wordt neutraal ("Kies").
  Claude schrijft de regels; ze gaan mee in de vertaalronde.

### 2.5 Waar het woont (core blijft mod-agnostisch)

- `src/app/input/`: actiemodel, toets→actie-map, pad-poller, lagenstapel, `useInputLayer(handler)`, modality,
  ruimtelijke navigatie, `useGridCursor` (helper voor rasterborden). Pure functies als plain `.ts`, hooks met eigen spec
  (hooks.md).
- Een puzzelfamilie roept zelf `useInputLayer`/`useGridCursor` aan in haar eigen bord-component in haar eigen mod.
  Core noemt geen enkele familie. Mod uit = handler weg; niets in core verwijst ernaar.
- `PuzzleFamilyShell` (`src/mods/core/app/PuzzleFamilyShell.tsx:11`) mapt de gedeelde knoppen: `undo`→undo-control,
  `hint`→hint, `back`→`onCancel`. Families krijgen alleen bordacties.

### 2.6 Bewakers en tests

- **Eén pijl per richting rond de speler.** Pure functie `ringArrows(grid, claims, ctx): Map<Direction, tapCell>`;
  de renderer gebruikt dezelfde functie voor de ring (één regel, niet twee). Guard-spec op de bestaande
  fixture-vloeren (`floorFixtures.testing.ts`, `movementInvariant.spec.ts`): nooit twee ring-pijlen in één richting.
  Faalt die ooit, dan is dat een bug in de offerlaag, geen reden voor een uitzondering.
- **Elke klikbare is bereikbaar.** Betterer-guard per bestand: `onClick` op een niet-knop element zonder `role` +
  `tabIndex` (backdrops uitgezonderd via `aria-hidden`, niet via een naamlijst). Ratchet omlaag.
- Tests met nep-`KeyboardEvent` en een nep-`navigator.getGamepads`; pad-repeat getest op aantal polls.
- Geen tests op auteurscontent: kaarttests gebruiken fixture-vloeren, puzzeltests verzonnen borden.

---

## 3. De kaart

**Regel:** `move(d)` = de tik die de ring-pijl in richting `d` doet (`tapCellAt` in `ringArrows.ts`, dezelfde
functie waarmee de renderer de tik op een pijl doorgeeft), doorgegeven aan `onCellClick`. `confirm` = `prompt.onTake`.
`back` = vraagt eerst of de speler de site verlaat (`ConfirmModal`, V4); pas daarna `onCancel`.

Wat er daardoor gratis meekomt:

- Gangen: één pijl = naar het eind van de run (zelfde als tik).
- Kamerkeuzes en waypoints: `roomChoices` geeft al per richting één keuze.
- Deuren, trappen, valluiken (drop launch/landing), smalle doorgangen: zijn al ring-pijlen of prompts.
- Trap op/af, uitgang, kamer binnengaan, plaat, hendel, fakkel, obstakel, zipline: allemaal `confirm` op de prompt.
- Richting zonder pijl: niets gebeurt (V3).
- Tijdens een loop / traversal: zelfde als een tik nu (`traversing`-bewaker `useSiteNavigation.ts:207`); vasthouden
  herhaalt pas na aankomst, getriggerd door het aankomst-event, niet door een timer (V2).
- Camera: de bestaande explorer-centrering (`useMapZoom.ts`) volgt al; pijltjes en Spatie krijgen
  `preventDefault` zodat de scrollcontainer niet meescrollt.
- Zoom: `+`/`-` toetsen en rechterstick zijn een latere slice; niet nodig om te spelen.
- Verre stippen (doelen verder weg dan de ring) zijn met toetsen alleen bereikbaar door ernaartoe te lopen. Dat is
  gelijk aan hoe de pijlen voor touch bedoeld zijn (`docs/instructions/room-choice-arrows.md:3`).

Pad: D-pad/stick = `move`, A = prompt, B = terug. Geen extra werk naast de pad-adapter.

---

## 4. Menu's en schermen

Allemaal via DOM-focus + ruimtelijke navigatie (2.3), binnen de bovenste laag.

| Scherm                                                        | Voorstel                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Kamp (`CampScene.tsx:471` knoppen)                            | al `<button>` met focusring; `move` springt naar de dichtstbijzijnde hotspot. Openen = confirm |
| Kamp-popups, nieuw hoofdstuk, thuiskomst                      | hebben al focusOnMount/trapTab; `back` = sluiten (via laag i.p.v. losse `closeOnEscape`)       |
| Reiskaarten (`JourneyRow.tsx:114-123`, `JourneyStops.tsx:44`) | knoppen; `move` op/neer door rijen, links/rechts binnen een rij                                |
| Collectie (`CollectionTabs`)                                  | `prev`/`next` (LB/RB) = tab wisselen; binnen de tab ruimtelijk                                 |
| Winkel (`ShopPanel`, `FezShop`)                               | knoppen; Escape/B sluit (ontbreekt nu)                                                         |
| Welkom/taal (`WelcomeLanguageChip.tsx`)                       | knop; confirm opent keuze                                                                      |
| Gesprekken (`Fez.tsx:138`)                                    | `confirm` = volgende regel; div wordt knop of laag. `back` = niet overslaan (V10)              |
| Level afgerond (`LevelCompletionHandler.tsx:29`)              | `confirm` = verder                                                                             |
| Leeswand / muur (`src/mods/story/app/reading/plugin.tsx:31`)  | knoppen; ruimtelijk                                                                            |
| Instellingen (`SettingsModal.tsx`)                            | al trapTab/Escape; pad Start opent hem vanuit elke laag zonder open dialog                     |
| Encounter-modal (`EncounterModal.tsx`)                        | `back` sluit (ontbreekt nu), zelfde als de terugknop                                           |
| Mozaïek (`MosaicWindow.tsx`, `StainedGlassMosaic.tsx:140`)    | stukken worden knoppen; ruimtelijk                                                             |

Back-regel, uniform: **`back` = de zichtbare terug/sluit-knop van de bovenste laag.** Heeft een laag er geen, dan doet
`back` niets. Geen nieuwe bevestigingen.

---

## 5. Puzzels

Gedeeld voor elk bord: shell mapt `undo`/`hint`/`back`; cursor start op de eerste open cel (of op `openFocus` waar een
familie die al heeft); `confirm` = de tik op de cursorcel, via dezelfde handler als de pointer.

### Makkelijk — rastercursor + tik (`useGridCursor`)

| Familie                                                   | Toetsen                                                                | Pad                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| sumplete                                                  | pijltjes cursor, Enter = tikcyclus (weg/houden/leeg)                   | D-pad, A                                                                    |
| eclipse                                                   | idem (zon/maan/leeg)                                                   | idem                                                                        |
| star battle                                               | idem (uitsluiten/ster/leeg)                                            | idem                                                                        |
| sudoku                                                    | cursor + cijfers direct; N = potlood; Delete/Backspace = gum           | D-pad cursor; A opent/focust de pad-rij, LB/RB kiest waarde, A plaatst (V8) |
| futoshiki                                                 | idem sudoku                                                            | idem                                                                        |
| shrine beam / lightbeamSwitch (`ShrineBeamBoard.tsx:114`) | cursor op spiegels, Enter = draaien                                    | D-pad, A                                                                    |
| crocodile (val, `CrocodilePit.tsx:209`)                   | cursor per kolom/steen, Enter = stap                                   | D-pad, A                                                                    |
| tableau-piramide (`usePyramidNavigation.ts`)              | bestaat al; omzetten naar de gedeelde laag zonder gedrag te veranderen | D-pad, A, waarde via LB/RB                                                  |

### Middel — knoppenlijst, ruimtelijke navigatie volstaat

| Familie                                       | Opmerking                                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| balance scale (`BalanceBoard.tsx:87,155,283`) | glyph kiezen, rij tikken, stuk wegnemen: allemaal knoppen; rijen moeten knoppen worden (nu `onClick` op rij-element)              |
| canisters (`CanistersBoard.tsx:112,199`)      | tik bron, tik doel = twee confirms; geselecteerde bron moet zichtbaar zijn in keys-modus (al zo bij touch?)                       |
| arithmeticReflex / clockReflex                | 2×2 keuzeknoppen; cijfers 1–4 kiezen direct; **getimed**: focus start op geen enkele knop, zodat een losse Enter niets kiest (V9) |
| hendel (`HandleComponent.tsx`), fakkel        | twee/één knop                                                                                                                     |
| processionDoor                                | alleen hint/reset-knoppen; het bord is procession                                                                                 |

### Moeilijk — sleepgebaren, eigen ontwerp per familie (**spike** per familie voor de "vastgepakt"-look)

| Familie                         | Nu                                             | Voorstel                                                                                                                                                         |
| ------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rush hour                       | blok slepen langs baan                         | cursor springt tussen blokken (ruimtelijk), confirm = pakken, pijltjes langs de baan = één vak per druk, confirm/back = loslaten. Pakken→loslaten = één zet (V7) |
| procession                      | balk slepen in eigen rij; rode dag-lijn tikken | op/neer = rij, links/rechts = balk één dag schuiven (één zet per druk), `prev`/`next` = focus naar de dag-markeringen                                            |
| constellation                   | slepen van ster naar buur (lijn 0→1→2)         | cursor op ster (springt naar dichtstbijzijnde ster in richting), `alt`+richting / Y+D-pad = lijn in die richting cyclen                                          |
| hidato                          | hex, tik-tik of slepen door cellen             | cursor op hex; zes buren met vier pijlen is dubbelzinnig (V11). Zolang er een pen ligt, verlengt een richting de run naar die buur                               |
| pair puzzle / star battle sweep | tik-cyclus + sleep = run uitsluiten            | tik = makkelijk (boven); sweep = `alt` vasthouden + pijltjes, loslaten = één zet. Optioneel, tik alleen is speelbaar                                             |

---

## 6. Slice-volgorde

Elke slice landt los, heeft een consument en een CHANGELOG `## Unreleased`-regel.

| #    | Slice                                                                                                                                                                                                                                                                 | Consument              | Grootte                         | Spike?                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------- | ------------------------------------------------ |
| 1    | **Pijltjes/WASD lopen op de kaart, Enter/Spatie neemt de prompt, Escape = terug.** `ringArrows` puur + renderer gebruikt hem; `keydown` op `SiteMapScreen` (alleen als er geen dialog/encounter open is, en niet in een invoerveld); guard-spec één pijl per richting | playtesters            | S (~1 dag, ~150 regels + specs) | nee — geen nieuw beeld                           |
| 2    | Inputkern: acties, lagenstapel, `data-input`-modality, kaart en bestaande dialogs (`dialogFocus`) erop overzetten; Escape op EncounterModal/winkel; gesprek doorklikken met confirm                                                                                   | slice-1-code + dialogs | M                               | nee                                              |
| 3    | Focusring-token + ruimtelijke navigatie in menu's (kamp, reiskaarten, collectie, instellingen, winkel, mozaïek); klikbare divs → knoppen; betterer-guard                                                                                                              | menu's                 | M                               | **ja** (ringlook)                                |
| 4    | Pad-adapter: poller → acties, repeat op polls, connect/disconnect. Kaart en menu's werken direct                                                                                                                                                                      | kaart + menu's         | S–M                             | nee                                              |
| 5    | Puzzelcontract in shell (undo/hint/back) + `useGridCursor` + makkelijke families (sumplete, eclipse, star battle tik, sudoku, futoshiki, shrine beam, crocodile); tableau-piramide erop                                                                               | die families           | M–L                             | **ja** (bordcursor)                              |
| 6    | Middel-families (balance, canisters, reflex-vallen, hendel, leeswand)                                                                                                                                                                                                 | die families           | M                               | nee, tenzij geselecteerde bron niet zichtbaar is |
| 7a–e | Moeilijke families, elk een eigen slice: rush hour, procession, constellation, hidato, sweep                                                                                                                                                                          | per familie            | S–M elk                         | **ja** (vastgepakt-staat)                        |
| 8    | Toetsglyphs op prompt en pillen in keys/pad-modus; blok "Bediening" bij de spelregels per familie (§2.4), "Tap" in de spelregels neutraal                                                                                                                             | iedereen met toetsen   | S                               | **ja**                                           |

Slice 1 heeft bewust nog geen inputkern: een `keydown`-listener op de kaart, gebouwd op de pure `ringArrows`. Slice 2
verplaatst die listener naar een laag zonder gedrag te veranderen (specs van slice 1 blijven groen).

---

## 7. Open vragen voor de designer

| #   | Vraag                                                                                     | Aanbeveling                                                                            |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| V1  | WASD naast pijltjes?                                                                      | **Besloten:** ja, op fysieke positie (`event.code`), dus ZQSD op AZERTY                |
| V2  | Pijl vasthouden: doorlopen naar de volgende stop na aankomst, of één stop per druk?       | **Besloten:** doorlopen na aankomst, nooit halverwege bijsturen                        |
| V3  | Richting zonder pijl: niets, of een kleine "kan niet"-reactie?                            | **Besloten:** niets                                                                    |
| V4  | Escape op de kaart = de Terug-knop (site verlaten), zonder extra bevestiging?             | **Besloten:** Escape vraagt eerst bevestiging (`ConfirmModal`); de Terug-knop niet     |
| V5  | Padknoppen positioneel (onder = bevestigen) of op label (Nintendo A rechts)?              | Positioneel; standard mapping kent alleen posities                                     |
| V6  | Toetsglyphs (⏎, Ⓐ) tonen bij toetsen/pad?                                                 | Ja, alleen in keys/pad-modus, na spike (slice 8)                                       |
| V7  | Rush hour: één zet per vak of per pakken→loslaten?                                        | Pakken→loslaten = één zet, net als een sleep                                           |
| V8  | Sudoku/futoshiki op pad: waarde kiezen met LB/RB op de cel, of focus naar de pad-knoppen? | LB/RB wisselt waarde op de cel; geen focussprong                                       |
| V9  | Getimede vallen: zelfde tijd met toetsen, cijfers 1–4 direct, start zonder focus?         | Ja op alle drie                                                                        |
| V10 | Gesprekken: mag `back` een gesprek overslaan?                                             | Nee; alleen confirm = volgende regel                                                   |
| V11 | Hidato hex met vier pijlen: welke buur is "omhoog"?                                       | Op/neer = de buur links-boven/links-onder, met `alt` de rechter; **spike** met plaatje |
| V12 | Browser-terug / Android-terugveeg koppelen aan `back`?                                    | Buiten dit plan; aparte vraag (geen router nu)                                         |
| V13 | Instelling om toetsen/pad uit te zetten?                                                  | Nee; input is altijd aan, modality verbergt ringen bij touch                           |
