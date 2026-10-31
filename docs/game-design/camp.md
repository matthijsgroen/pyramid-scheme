# Camp — home base, healing and camp loot

Status: built, except the animals (bought at Fez, they open the next tier or an optional tomb), which wait on
the designer's loot-placement decision (`docs/review-camp-release.md`)  
Date: 2026-10-23, current as of 2026-10-25  
Sketches: [`docs/design/camp-sketches/`](../design/camp-sketches/README.md)  
See also: [`camp loot spec`](../superpowers/specs/2026-10-23-camp-loot-design.md) (what the player finds and how
the camp grows), `pyramid-interior-design.md §11` (traps and health), `shop-mechanic.md` (economy guard),
`docs/mods/ARCHITECTURE.md` (the `camp` mod), `docs/loot-report.md` (what lies where)

---

## Why

Traps are meant to feel dangerous, but a shortage carried across sessions adds frustration, and a way to
get stuck, without adding tension. The danger only needs to exist **within one trip** ("one heart left —
push on or turn back?"). Nothing the player finds is ever left behind for want of room.

## Decisions

### 1. Health restores at camp

- Hearts refill to full on every coming home: at a journey's end and when leaving mid-journey.
- Inside a site, damage stays damage: the push-on-or-turn-back choice is unchanged.
- Getting stuck is impossible: walking out is always enough to heal.
- Trap paths stay optional side branches.

### 2. No pack

- Nothing is carried for later: no supplies, no carry cap, no chest left half-emptied.
- Healing inside a site is a **waterskin** (expert and up, on puzzle slots): picked up, it heals one heart
  if one is missing (two with `pack-mule`), and is used up either way.
- The supplies detector does not exist; the three treasures on its old levels carry no perk.

### 3. The camp is the home screen

One fixed camp, the home screen between trips. It never moves, so travelling back to an earlier tier is
always one tap.

- **"Op pad" (set off)** on the "Verder met" card continues the current journey, else the first open one of
  the highest tier.
- **"Alle reizen" (all journeys)** is one flat list: tiers are headings, newest first; a finished tier
  folds to one line with a dot when something new is reachable there; a locked journey or tier says what it
  needs. On a phone it is a popup, on desktop (from 1024 px) a side panel always in view.
- **Everything opens as a popup over the camp.** Settings sit behind a gear in the HUD (developer mode: 7
  taps on the "Kamp" title, its tools inside settings).
- **Objects in the camp are entrances**: the **chest** opens the Verzameling (tabs, NIEUW marks, a badge
  with the number of new items; the story log is one of its tabs); the **stained-glass window** opens the
  mosaic; the **map table** opens Alle reizen on a phone. The fire is not an entrance.
- **Coming home** is a moment: the fire, the hearts refilled, the haul found since the last homecoming,
  then **Uitpakken**. An empty haul shows only the fire and the hearts. Nothing chains into the next
  journey.
- In the camp Fez and the explorer talk together; Fez sells nothing there.

### 4. Chapters live on the horizon

Each tier is a pyramid on the horizon. A new tier shows a new-chapter card over the camp, the new pyramid
appears, and the camera zooms out one step to reveal fresh ground for that tier's camp spots. The camp
itself never changes material or style per tier.

- Beginner: camera close to the fire, one pyramid.
- Each new chapter: zoom out one step, one more pyramid.
- Wizard: the full camp, five pyramids, the last with a golden capstone.

**No placeholders.** A spot is empty sand until something stands there. No dotted outlines or "?"
slots.

## Camp loot

The camp grows from what the player finds, as the loot spec sets out: **28 found items** (one find, one
object in the camp, in any order), **26 structures** built from **99 parts** (a structure stands once all
its parts are found; started ones show in the Verzameling's Constructies tab), a few steps that grow by
themselves on the next homecoming, and the **animals and carts** bought from Fez in his tomb shops (not
built yet). Camp loot lies on puzzle slots of its own tier and never gates anything.

**12 spots that keep growing.** A spot appears in one tier and gains additions in every later tier:

| Spot           | Beginner                         | Junior                          | Expert               | Master                            | Wizard                         |
| -------------- | -------------------------------- | ------------------------------- | -------------------- | --------------------------------- | ------------------------------ |
| Fire pit       | stone ring, fire, cooking stones | pot over the fire               | seating stones       | clay oven                         | cushions and rugs on the seats |
| Sleeping place | reed mat, blanket, windbreak     | tent, rug in the tent           | flag on the tent     | second tent                       | pavilion                       |
| Water          | gourd, jar                       | second jar                      | water trough         | stone well                        | roof, crank and rope           |
| Cooking corner | —                                | tripod, spice rack, bread board | bread oven           | drying rack with fish             | feast                          |
| Donkey         | —                                | halter, donkey, saddlebags      | cart with blanket    | second donkey                     | painted cart                   |
| Camel          | —                                | —                               | rope, camel, saddle  | second camel, trough              | caravan banner                 |
| Map table      | map (fixed)                      | —                               | table, compass       | star map, scroll case             | astrolabe, reed globe          |
| Palm garden    | —                                | —                               | seed, sprout, palm   | second palm, dates                | lotus planter, fig tree        |
| Ibis pond      | —                                | —                               | —                    | edge stones, papyrus, reeds, ibis | lotus, second ibis             |
| Lookout tower  | —                                | —                               | —                    | post, platform, ladder, roof      | flag, signal fire              |
| God statues    | —                                | —                               | —                    | —                                 | Thoth, Bastet, Anubis, Ra      |
| Star canopy    | —                                | —                               | —                    | —                                 | poles, cloth, stars, planets   |

The chest, the mosaic window and the campfire's glow are fixed from the start: they anchor the camp
as home even when it is nearly empty.

The full camp fits a portrait phone screen in three rows of depth (about 60 px per spot). The scene
fills the whole screen as background; hearts and coins sit in the HUD, the "Verder met" card floats at
the bottom.

### Art budget

12 objects, each drawn in its final state and built up in layers for the earlier steps, plus the
chest, the window and the horizon. A spot without art stays bare ground; nothing ships as a stand-in.

## Open

- The animals as gates and the economy around them (sinks = rare items + purchases), which wait on the
  designer's loot-placement decision.
- Exact camera framing per chapter.
