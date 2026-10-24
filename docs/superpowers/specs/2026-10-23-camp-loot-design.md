# Camp loot — where the camp comes from

Status: design, approved direction · not implemented
Date: 2026-10-23
Builds on: `docs/game-design/camp.md` (replaces its "Camp loot" find model and its "Slot conversion"),
`docs/game-design/shop-mechanic.md`, `docs/superpowers/specs/2026-10-23-camp-scene-design.md`

## Why

`camp.md` says "every find adds one step to one spot", but never says what the player picks up. A gourd
or a jar can lie in a tomb; a donkey, a palm, a well or an ibis cannot. What the player finds has to be
something that could lie there, and the camp has to grow as a believable result of it.

Two more constraints came out of the discussion:

- **Every player's camp fills.** Anything optional is skipped by some players, and then their camp stays
  half empty. So camp growth may not depend on optional purchases (one exception below).
- **The shop must keep meaning.** Dropping consumables (camp.md §2) leaves Fez with only 13 rare items,
  while ~500 money drops stay in the world: money would be nearly worthless.

## The model: three sources

Every camp step has exactly one source.

### 1. Found as itself (26 steps)

Portable things that can plausibly lie in a tomb are found as loot, one find = one step:
gourd, jar, second jar, reed mat, blanket, tent rug, pot, spice rack, bread board, tent flag, compass,
star map, scroll case, lookout flag, seat cushions, astrolabe, reed globe, star cloth, the four god statues
(Thoth, Bastet, Anubis, Ra), and seeds and cuttings: palm seed (×2: palm and second palm), fig seed,
papyrus root, reed cutting, lotus.

**Any order.** Finds come in any order, so the camp does not show "step n of a chain". A spot is drawn
as its base plus one **layer** per object the player has, in any combination. The layers come from the
painted chains, no new art: each step differs from the one before by one object, so that object's layer
is the pixels where the two differ (a spike on the map table, 2026-10-23, composed every subset cleanly;
tiny noise specks need dropping). An object painted on a host (a compass on the table) shows once its host
stands; until then it is only in the chest. The step order stays as the art workflow, never as a game rule.

### 2. Built from found parts (26 structures)

Structures are not found whole; their **parts** are, like hieroglyph fragments. A structure appears once
all its parts are found. Examples: well stones, a pulley wheel, a bundle of poles, mud bricks, an oven
mouth, planks, a ladder, thatch.

Structures: stone ring, fire, cooking stones, seating stones, clay oven, windbreak, tent, second tent,
pavilion, tripod, bread oven, drying rack, feast, well, well pulley, table, edge stones, lotus planter,
lookout post, platform, ladder, roof, signal fire, canopy poles, canopy stars, canopy planets.

**Shown only once started.** A structure with zero parts found is invisible, in the camp and in the chest.

- **In the chest:** a new tab **"Constructies"** lists every started structure with its art,
  "n van m", and its parts: found ones named and lit, missing ones dashed. A structure with parts still
  missing that the player has not seen yet shows "???" for those. A finished structure shows "gebouwd".
- **In the camp:** a spot with a started but unfinished structure shows a **generic construction pile**
  (poles, planks, mud bricks; one shared piece of art for every spot) with a small label
  "<name> · n/m". When the last part lands, the pile gives way to the structure's step art.

This is the mockup the user approved (`.superpowers/brainstorm/…/constructies.html`).

### 3. Bought at Fez — the animals are keys (12 steps in 7 purchases)

The donkey and camel spots are bought, never found. Each purchase lands one or more art steps at once and
**opens something**, so buying is required progress and every player's camp gets them:

| Purchase (Fez) | Lands in the camp | Opens |
| --- | --- | --- |
| Junior: donkey | halter, donkey, saddlebags | the expert tier |
| Expert: cart | cart with blanket | the master tier |
| Expert: camel | rope, camel, saddle, and the water trough (water spot) | the second expert tomb (Inner Sanctum) |
| Master: second donkey | second donkey | the wizard tier |
| Master: second camel | second camel and the camel trough | the second master tomb (Hall of Osiris) |
| Wizard: sturdier cart | the painted cart | the second wizard tomb (Realm of Cosmic Forces) |
| Wizard: caravan banner | the banner | nothing — the one purchase just for fun |

**On top of the existing gates, not instead of them.** A tier still opens with its tier-unlock treasure,
a second tomb still has its `entryLock`; the animal is one more requirement. The existing keys keep their
job, and more: ward keys also open areas in earlier tiers, so a new key lets the player go back and find
the money for the transport there.

**Where to buy.** Fez sells them in his tomb shops, as he sells everything now. Buying is an order, not a
pickup: the animal is waiting in the camp on coming home, so nothing requires a camel standing in a tomb.
Which shop offers which purchase is the builder's call (below), as long as the shop is reachable before
the gate it opens.

The painted cart is sold as a **sturdier cart**: what Fez sells is what the trip needs; that it looks
better is the camp's bonus. A purchase is the animal plus what it needs (the troughs go with the camels).

### Growing by itself (a few steps)

Only what really happens by itself is not loot: sprout, palm and dates grow from a found palm seed; the
ibises arrive once the pond has reeds. Builder's call (see below) when exactly.

### Fixed from the start

The entrances stand from the first visit and are never loot: the chest (collection), the mosaic window,
the small campfire (healing), and **the map** on the ground, weighted with stones (it opens "Alle reizen").
The map table's other steps (table, compass, star map, …) are finds that join it later.

### Healing

Unchanged from camp.md: hearts refill at the fire on coming home. The small campfire stands from the
start, so healing never depends on any find; the fire pit's steps only dress that spot.

## No softlock: the per-gate guard

An animal that opens a tier or tomb must always be affordable, however the player spends. The current
guard (`economyGuard.ts`, `validate.ts`) checks one global sum. It becomes **per gate**:

> For every gate an animal opens: all income the player can collect before that gate ≥ the price of
> everything buyable before that gate, the animal included.

So a player who first buys every mosaic tile and fragment can still buy the animal afterwards. World
generation fails when this does not hold, as it does now. "Before that gate" means reachable without the
gate's purchase; the keys-and-locks reachability solver already knows which chests and shops lie before
which gate.

## The economy, recomputed

The world was budgeted for consumable spending that no longer exists. Recompute from the sinks:

1. **Sinks:** the 13 rare items (current prices in `src/mods/shop/game/pricing.ts`) + the 7 purchases.
   No consumable restock.
2. **Income:** about 1.1× the sinks, as now (`BUDGET_CEILING` in `src/mods/shop/game/loot.ts`), and
   satisfying the per-gate guard.
3. **Split** that income over sellable items (`src/data/sellables.ts`, sold to Fez) and loose coins.
   Sellables also form a collection: a sold item stays visible as found in the collection (the user says
   this already holds today; verify).

Animal prices are a dial: the dearer the animals, the more money and sellables the world can carry.

## Slots

From the camp.md table (rewards counted by section tier):

| Tier | Found items (1) | Parts (2), at ~3 per structure | Free slots |
| --- | --- | --- | --- |
| Beginner | 4 | the starter structures' parts | 3 consumable, 78 money |
| Junior | 5 | " | 4 consumable, 92 money |
| Expert | 4 | " | 55 consumable |
| Master | 3 | " | 63 consumable |
| Wizard | 9 | " | 60 consumable |

- **Beginner and junior:** camp finds and parts take over money slots (there are hardly any consumable
  slots).
- **Expert and up:** the old consumable slots become ~60 waterskins (camp.md §2), camp finds, parts, and
  the rest money and sellables.
- With 26 structures × ~3 parts ≈ 78 parts plus 26 items, camp loot fills most of the ~100 free slots
  on expert and up; the economy recompute decides the rest.
- Fragments, mosaic, map pieces, tomb keys and treasures are unchanged.
- **The table does not count the tomb redesign's slots** (`docs/superpowers/specs/2026-10-22-tomb-redesign-design.md`). The
  starter tomb is now a cave and a sunlit cavern and adds five beginner slots: the cave's end chest and one
  puzzle on each of the four cavern floors. A room's loot tier is its path's, so the cavern's junior-weight
  puzzles count as beginner. The four cavern slots are empty today (the filler pool runs out first), which
  makes them natural homes for camp finds and parts. Every later tier's tomb brings its own cave and cavern
  slots with its release; recount the table from `yarn world-info` when building.
- **The world is still growing** (new areas are being authored in another session), and more loot is
  better. Camp loot is the flexible filler: the number of parts per structure scales with the slots a
  tier has, so new areas add camp parts without touching the fixed currency totals. Nothing in the build
  may pin a slot count; counts above are today's world, not targets.

## Goals

- Everything picked up in a tomb could plausibly lie there.
- Every player who plays through ends with a full camp (except the banner).
- Fez matters: he buys your finds and sells what moves you on.
- No softlock, guaranteed at world generation.

## Non-goals

- A second perk system: camp steps give no gameplay bonus, except the animals' gates.
- Re-drawing the art: the step art stays as painted; a purchase may land several steps at once.
- Changing fragments, mosaic, map pieces, treasures or tomb keys.

## Anti-goals

- A camp that stays half empty because the player skipped optional purchases.
- A player stuck before a gate because they spent their money elsewhere.
- Money that has nothing left to buy.

## Decided by the user

- Three sources: found, built from parts, bought (animals).
- Animals and their upgrades are keys; the purchases above, one per tier per animal line; master and
  wizard tombs carry the camel gates.
- The painted cart is sold as a sturdier cart; the banner is just for fun.
- Seeds can be found; the troughs belong with the animals.
- Parts like hieroglyph fragments; chest tab "Constructies"; generic construction art in the camp;
  nothing visible before the first part.
- Economy rebuilt from the sinks at ~1.1×, split over sellables and coins; sold items stay in the
  collection.
- Healing stays at the camp fire.

- Animals gate on top of the existing tier-unlock treasures and tomb entry locks.
- Fez sells the animals in his tomb shops; they arrive in the camp.
- **Starter stays simple:** starter → junior needs no ride, no shop, no money; the first purchase is the
  junior donkey, which opens expert.

## Settled with the builder check (Claude's calls, flagged for review)

- **Prerequisite:** dropping consumables (camp.md §2) is its own slice, built first; this design builds on
  a world without consumable stock or restock.
- **Shop mod off:** the animal gates fall away (open), as with every toggled-off mod: same carve, bare
  nodes, open corridors. The shop mod owns the animal purchases and the per-gate guard.
- **Saves:** nothing past starter is released, so no player stands past a gate without its animal; no
  migration slice.
- **Prices are authored**; the per-gate guard only checks them and fails generation. No self-tuning.
- **"Before the gate"** = reachable without that purchase, over the whole world (global wallet,
  revisitable shops).

## Left to the builder (Claude's calls, flagged for review)

- Exact part counts per structure (default 3; a small structure like the stone ring may be 1–2) and the
  part names.
- When the self-growing steps appear (default: on the next return home after their seed or reeds landed).
- Animal prices, within the per-gate guard.
- Which tomb shop offers which purchase (default: a shop of the tier named in the purchase table that is
  reachable before the gate).
- Which of the ~29 items and the parts go to which tier's slots, following the tier each step belongs to
  in `campCatalogue.ts`.
- Generic construction pile art: one new piece through the camp art loop.
