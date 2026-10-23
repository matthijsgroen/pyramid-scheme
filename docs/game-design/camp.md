# Camp — home base, healing and camp loot

Status: design direction · not implemented  
Date: 2026-10-23  
Sketches and impressions: [Kamp schetsen canvas](https://claude.ai/artifact/TJWJCGKWWPbmQUPgT6BwVp) (private to the owner)  
See also: `pyramid-interior-design.md §11` (traps and health), `shop-mechanic.md` (economy guard),
`loot-distribution.md`

---

## Why

Traps were meant to feel dangerous. That brought in health, then consumables to heal, then a carry cap
so consumables would not trivialise traps, then `pack-mule` and the consumable detector to soften the
cap. The result is a lot of machinery whose most visible effect is a bad moment: opening a chest,
finding a bandage and having to leave it behind because the pack is full.

The danger only needs to exist **within one trip** ("one heart left — push on or turn back?"). A
shortage carried across sessions adds frustration, and a way to get stuck, without adding tension.

## Decisions

### 1. Health restores at camp

- Health refills to max when the player leaves a site and returns to camp.
- Inside a site, damage stays damage: the push-on-or-turn-back choice is unchanged.
- Getting stuck is impossible: walking out is always enough to heal.
- Trap paths stay optional side branches, as today.

### 2. No consumable pack

- Bandage, oil and trapTool as carried items go away, together with the carry cap and "left behind"
  chests.
- Where healing is still found inside a site it is a **waterskin**: it heals on pickup when hurt, and
  stays in the chest at full health. It is never carried, so leaving it is not a loss.
- `pack-mule` (`starter_a_3`) and consumable detector L1–L3 need new perks (open, see below).
- The shop loses its consumable stock; money needs a different steady sink (open).

### 3. The travel screen becomes the camp

One fixed camp, the home screen between trips. It never moves, so travelling back to an earlier tier is
always one tap.

- **"Op pad" (set off)** is the big button: it continues the current journey, which covers most
  visits.
- **"Alle reizen" (all journeys)** opens one flat list in a popup. Tiers are only headings, newest first;
  completed tiers collapse to one line with a dot when something new is reachable there. There is no
  "pick a difficulty first" step.
- **Everything opens as a popup over the camp**, nothing hides behind a sliding sheet. On desktop the
  journey list stays as an always-visible side panel.
- **Objects in the camp are entrances**, each with a visible label and a badge:
  - the **chest** opens the collection (hieroglyphs, treasures);
  - the **stained-glass window** is the mosaic. It stands in the camp so the main goal is always in sight;
  - the **map table** can open "Alle reizen".
- **Coming home** is a moment: rest by the fire (hearts fill), then unpack the haul. New camp items
  are placed in the scene where the player can see them land.

### 4. Chapters live on the horizon

Each tier is a pyramid on the horizon. A new tier = a new pyramid appears, and the camera zooms out one
step to reveal fresh empty ground for that tier's camp spots. The camp itself never changes material or
style per tier.

- Beginner: camera close to the fire, one pyramid.
- Each new chapter: zoom out one step, one more pyramid.
- Wizard: the full camp, five pyramids, the last with a golden capstone.

**No placeholders.** A spot is empty sand until something stands there. No dotted outlines or "?"
slots.

## Camp loot

Camp items are a new tier-bound filler currency. Every find adds one step to one spot in the camp.

**12 spots that keep growing.** A spot appears in one tier and gains additions in every later tier. 73
finds in total, scaled to the loot space each tier has.

| Spot           | Beginner                         | Junior                          | Expert               | Master                            | Wizard                         |
| -------------- | -------------------------------- | ------------------------------- | -------------------- | --------------------------------- | ------------------------------ |
| Fire pit       | stone ring, fire, cooking stones | pot over the fire               | seating stones       | clay oven                         | cushions and rugs on the seats |
| Sleeping place | reed mat, blanket, windbreak     | tent, rug in the tent           | flag on the tent     | second tent                       | pavilion                       |
| Water          | gourd, jar                       | second jar                      | water trough         | stone well                        | roof, crank and rope           |
| Cooking corner | —                                | tripod, spice rack, bread board | bread oven           | drying rack with fish             | feast                          |
| Donkey         | —                                | halter, donkey, saddlebags      | cart with blanket    | second donkey                     | painted cart                   |
| Camel          | —                                | —                               | rope, camel, saddle  | second camel, trough              | caravan banner                 |
| Map table      | —                                | —                               | map, table, compass  | star map, scroll case             | astrolabe, reed globe          |
| Palm garden    | —                                | —                               | seed, sprout, palm   | second palm, dates                | lotus planter, fig tree        |
| Ibis pond      | —                                | —                               | —                    | edge stones, papyrus, reeds, ibis | lotus, second ibis             |
| Lookout tower  | —                                | —                               | —                    | post, platform, ladder, flag      | roof, signal fire              |
| God statues    | —                                | —                               | —                    | —                                 | Thoth, Bastet, Anubis, Ra      |
| Star canopy    | —                                | —                               | —                    | —                                 | poles, cloth, stars, planets   |
| **Finds**      | **8**                            | **10**                          | **14**               | **19**                            | **22**                         |

The chest, the mosaic window and the campfire's glow are fixed from the start: they anchor the camp
as home even when it is nearly empty.

The full camp fits a portrait phone screen in three rows of depth (about 60 px per spot). The scene
fills the whole screen as background; hearts and coins sit in the sky, "Op pad" floats at the bottom.

### Art budget

12 objects, each drawn in its final state and built up in layers for the earlier steps, plus the
chest, the window and the horizon. The canvas holds AI impressions of all five tier end states (Gemini,
for direction only, not production art).

## Slot conversion

Current world (`scripts/worldInfo.ts`, `src/data/generatedWorld.ts`, counted by the **section**
difficulty a reward sits in):

| Section tier | Consumables | Money drops | Sellables | Mosaic | Fragments |
| ------------ | ----------- | ----------- | --------- | ------ | --------- |
| Beginner     | 3           | 78          | 6         | 33     | 19        |
| Junior       | 4           | 92          | 20        | 43     | 36        |
| Expert       | 55          | 97          | 20        | 51     | 65        |
| Master       | 63          | 106         | 20        | 59     | 94        |
| Wizard       | 60          | 139         | 19        | 66     | 82        |

Consumables only really exist from expert sections up (the 14 in starter journeys sit behind expert
and master ward wings). So:

- **Beginner and junior** camp finds (8 + 10) come mostly from money slots. Those coins move into
  the remaining money drops, so the money total and the shop guard in `src/worldGen/validate.ts` do not
  change.
- **Expert, master and wizard** camp finds (14 + 19 + 22) come from consumable slots. Roughly 60 of
  the remaining consumable slots become waterskins on and after trap paths. The rest become money,
  which only raises income and keeps the guard satisfied.
- Fragments, mosaic, map pieces, tomb keys and sellables are unchanged.

### New areas (tomb redesign)

The starter tomb's new cave and cavern (`tomb/cave-and-cavern`) should carry loot so the puzzles added
there reward something. Camp items fit: their count is flexible, so extra beginner slots add camp
steps without touching the fixed currency totals.

### Money drops

512 money drops average 2 coins each, which barely reads as a find. Merging them into fewer, larger
drops with the same total keeps the shop guard intact.

## Open

- New perks for `pack-mule` and consumable detector L1–L3.
- A steady money sink once the shop no longer sells consumables.
- Whether the "coming home" screen shows on every return or only when something new was brought back.
- Exact camera framing per chapter.
