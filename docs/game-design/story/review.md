# Story review — what plays, against what was meant

A tuning pass over the whole story line as it ships: every beat played or read in place, compared with the
script and the cast, and turned into tasks. One section per stretch of the game, reviewed in playing order.

Sizes as in [IMPLEMENTATION.md](IMPLEMENTATION.md): **S** an afternoon, **M** a few days, **L** its own
project.

| Stretch                             | Reviewed   |
| ----------------------------------- | ---------- |
| The opening — first ten minutes     | 2026-10-16 |
| Act I — starter arrivals            | 2026-10-16 |
| The tomb scenes (eight)             | —          |
| Acts II–V — arrivals                | —          |
| The reaction rail                   | —          |
| Reading walls and the Sphinx ending | —          |
| Fez's tutorial and mosaic lines     | —          |
| The story log                       | —          |

## The art budget

The game plays offline: the service worker precaches every image, font and sound at first start, in the
background (`vite.config.ts`, `workbox.globPatterns`). So every drawing the review asks for is downloaded
by every player before they need it, and the total is the budget — not the drawings one screen shows.

Measured on 2026-10-16 (`yarn vite build`): **187 entries, 5.4 MB**. Images are 3.6 MB of it; the
stained-glass mosaic alone is 0.9 MB; a 250 px portrait is 15–50 kB PNG.

| Art the review asks for                   | Count | Estimate                                                      |
| ----------------------------------------- | ----- | ------------------------------------------------------------- |
| Landmark silhouettes on the horizon       | 20    | flat silhouettes — SVG or small webp, ~10–20 kB each, ~0.3 MB |
| Story poses, where a line needs a new one | ?     | ~40 kB each as PNG, about half as webp                        |
| The Sphinx inscription, two states        | 2     | ~50–100 kB each                                               |
| The meeting room on the map               | 0–1   | one prop                                                      |

Each stretch adds its rows here, so the total is visible before anything is drawn. Two levers if it grows:
portraits to webp (they ship as PNG today), and the mosaic panels, which are the one large item.

---

# The opening — first ten minutes

Everything between the first screen and the first pyramid's interior. From a fresh-save playthrough at
phone width (414×860).

## Decided

**They meet on the floor** — `cast.md` setup 3, "explorer alone; Fez found in the first pyramid". The
explorer travels and opens the first site alone; Fez is met on floor 0 of `starter_1` pyramid 1, **in the
last room of the main corridor, before the way out** — unmissable, so no later beat needs a version where
the meeting has not happened. He speaks as _a voice before a face_.

**The explorer speaks only where it helps the player.** Every board shows its own rules on screen; the
pyramid exterior is the one board that does not. So the exterior is where the explorer gives the hint, and
the rest of the quiet before the meeting stays quiet.

**Fez teaches the interior once he is there.** He knows these places better than the explorer does, so
first-encounter mechanics (hearts, coins, gates, traps) are his lines, not a banner.

## What the playthrough shows today

1. `welcome` — the explorer alone on the travel screen. Fits the decision. Says _"Choose a journey"_ over a
   card titled _Plan Expedition_ with no visible tap target.
2. `chooseExpedition` — _"A short one first."_ over a list holding one journey.
3. `arrival.starter_1` — fires on the travel list, not at the Sphinx it describes. The explorer asks
   _"Where did you come from?"_ and Fez introduces himself: they meet here, before the first board.
4. `pyramidIntro` — straight after _"Come on."_, Fez in the pre-explorer voice: _"Look at these walls — so
   many numbers are missing! … Good luck!"_ This is the seam between story and tutorial.
5. `levelCompleted` — _"Well done!"_, then the interior with no word about hearts, coins, the moon icon,
   arrows or the barred door.
6. Vocabulary — _Travel_, _Plan Expedition_, _Choose your Journey_, _Expedition Level 1/2_ for overlapping
   things; _"Click anywhere to continue"_ on a phone.

## Tasks

### A. Placement

| Task                                     | Size | Notes                                                                                                                                                                                                                |
| ---------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Place the room on `starter_1` p1 floor 0 | M    | `starter.ts` authors this floor `pathPuzzles: 0`, so the room is **added**: `pathPuzzles: 1` with `nodes: [{ where: "last", encounter: "conversation" }]` — Pile B, re-carves the floor, re-bake `generatedWorld.ts` |
| A conversation room outside a tomb       | S    | `sceneFor.ts` derives a scene only from a `*_treasure_tomb` id. `NodeSelector` carries no args, so `starter_1` → the meeting scene goes in `sceneFor` too — fine while it is that journey's only conversation        |

### B. The meeting on floor 0

| Task                                      | Size | Notes                                                                                                                                                           |
| ----------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Write the meeting scene                   | M    | a voice before a face; he complains rather than looms. Fez's half of today's `arrival.starter_1` (who he is, _"somebody told me"_, the trade motive) moves here |
| A line with no portrait                   | S    | the first line(s) are a voice in the dark: `Fez.tsx` draws a portrait for every speaker today                                                                   |
| Rewrite `arrival.starter_1` explorer-only | S    | the hook (writing at the base nobody can read) stays; the meeting leaves it. `script-act-1.md` still has Fez present                                            |
| `mapPiece*` becomes Fez's                 | S    | the map piece is this floor's main-end reward, so it is the first thing found after the meeting — the merchant who overpaid for a map gets the line             |

### C. The exterior board — the explorer's hint

| Task                                    | Size | Notes                                                                                                                        |
| --------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| `pyramidIntro` becomes the explorer's   | S    | the one rule the exterior never shows: each block is the two below it, added. Dry, short, no _"Good luck!"_                  |
| `pyramidBlockedBlocks` the same way     | S    | an exterior rule too (a sealed block is worked out, never revealed), so the explorer's — or Fez's, if it can only fire later |
| `levelCompleted` recharacterised or cut | S    | Fez is not there yet on the first board, and _"Well done!"_ does not help the player                                         |

### D. The interior before and after Fez

| Task                                      | Size | Notes                                                                                                                             |
| ----------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| What the explorer sees before the meeting | M    | hearts, coins, arrows, the barred door — wordless; the explorer only speaks where a board hides its rules                         |
| What Fez explains after the meeting       | M    | the first-encounter list in `onboarding.md`, as Fez lines in the expert's voice — each fired by the thing itself, not by a screen |

### E. Copy around the opening

| Task                                 | Size | Notes                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `welcome*` against the decided setup | S    | `IMPLEMENTATION.md` holds `welcome*` waiting on exactly this decision. The tap hint below carries _where_; the line need not                                                                                                                                                                      |
| `chooseExpedition` with one journey  | XS   | cut: it does not help while there is one journey to choose                                                                                                                                                                                                                                        |
| A tap hint atom                      | S    | a `👆` that taps over its target until the player does, then never again. Wordless, so it carries the "where" no line should. Reduced motion: still, no tap. First uses: the travel map card, the first journey card. Candidates later: the first empty exterior block, the first move on floor 0 |
| One word for journey / expedition    | S    | `Travel`, `Plan Expedition`, `Choose your Journey`, `Expedition Level` — pick, in en + nl                                                                                                                                                                                                         |
| "Click" → "Tap"                      | XS   | `Klik ergens om door te gaan`                                                                                                                                                                                                                                                                     |
| Arrival on the travel list           | ✓    | fires on the journey's first exterior screen, before `pyramidIntro`, once per journey                                                                                                                                                                                                             |

### F. Art

| Task                                                  | Size | Notes                                                                                                                                                                                 |
| ----------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explorer faces inward on the right                    | S    | `Fez.tsx` puts the explorer right, the sprite faces right. Mirror it — but the bust crop cuts the map at the right edge, so a mirror puts that cut mid-screen                         |
| Re-crop the explorer bust if the mirror shows the cut | S    | from `art/masters/characters/`, `yarn import-portrait --bust=0.55`                                                                                                                    |
| The Sphinx at the Sphinx                              | M    | `starter_1`'s exterior is the generic sun, pyramid and camel; the arrival and the ending both talk about the base of the Sphinx. The first of Act I's _landmark per journey_          |
| The Sphinx inscription, sealed                        | M    | `ART.md` "new, and the story does not work without them": two states of one drawing. The reading encounter draws catalogue glyphs today. The sealed state is what floor 0 shows first |
| The meeting room on the map                           | ?    | a conversation room is drawn as its family icon (`💬`, `nodeShapes.tsx`); `yarn art-census` lists no story-room art. Look at it on the floor before deciding: a lamp, a stall, Fez    |
| Fez in the dark                                       | —    | no new art if the voice line simply has no portrait. A pair of eyes or a silhouette is the alternative, and costs a drawing                                                           |

---

# Act I — starter arrivals

`arrival.starter_2` … `starter_4`, read in en and nl against `script-act-1.md`. `starter_1` is the
opening's. The four journeys open one after another (`journeyAvailability.ts`), and Ipi's tomb needs all
four map pieces (`entryLock: { count: 4 }`), so every arrival here plays before Ipi — the cat error planted
at `starter_3` is always corrected after it is made.

## What reads today

1. **The English matches the script line for line.** Fez's _"Now this I understand"_ at `starter_2` lands
   as his first arrival after the meeting with no change.
2. **The card says the joke first.** The rewritten journey descriptions (`journeys.json`) tell the same
   fact the arrival then tells: `starter_2` _"The receipts outlasted the cargo"_ against Fez's _"the
   receipts outlived the goods"_; `starter_4` broken pottery and dear papyrus, both times. The player reads
   it on the card, again in the arrival, and a third time under the exterior board.
3. **nl, `starter_3.5`**: _"Aanbeden werden ze. Ze konden er niets aan doen."_ reads as the cats being
   helpless. The English means the people: _Adored them. Couldn't help themselves._
4. **nl, `starter_3.1`**: _"om bescherming vragen"_ wants _"te"_.
5. **Every story line is drawn in the default pose.** `spokenLines` builds keys as
   `<scene>.<n>.<speaker>` and has nowhere to say `pointUp` or `glassesPoint`, so Fez's three other
   portraits and the explorer's two never appear in a story beat. Applies to every stretch below.
6. **Between the arrival and the tomb, the floors are silent.** No story room in any starter pyramid
   after the meeting. Whether that is right is the same rule as the opening: Fez speaks where he teaches
   something (the first-encounter list), not to fill a corridor.

## Tasks

### A. Copy

| Task                                   | Size | Notes                                                                                                                                           |
| -------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Card and arrival stop telling one fact | ✓    | the card names the place and a reason to go; the arrival keeps the joke. `starter_2`, `starter_4` done; `starter_1` follows its arrival rewrite |
| nl `starter_3.5`                       | ✓    | _"Ze aanbaden ze. Ze konden het niet laten."_                                                                                                   |
| nl `starter_3.1`                       | ✓    | _"om bescherming te vragen"_                                                                                                                    |
| Drop the English descriptions in data  | XS   | `journeys.ts` still holds the pre-story brochure copy; the locales override it, so it only misleads a reader                                    |

### B. Placement

Nothing to place: arrivals fire from the journey, not a room — at whichever of its pyramids' exteriors
the player opens first, for all twenty.

### C. Art and presentation

| Task                   | Size | Notes                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A pose per story line  | S    | decided: an optional pose in the key or beside it, read by `spokenLines`. The portraits exist; only the authoring cannot reach them. Where a line wants a pose nobody has drawn, it goes on the art list                                                                                                                                                                        |
| A landmark per journey | M    | every pyramid journey is `exterior: "pyramid"`; only time of day and the Nile differ. The board **is** the pyramid, so the place cannot replace it — it stands on the horizon behind it, small and low-contrast, the way the camel and the Nile already do (`DesertBackdrop`, `PyramidDisplay`). One silhouette per journey: the Sphinx, storehouses, temple pylons, the school |
