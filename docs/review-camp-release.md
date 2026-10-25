# Camp release review list

The designer's morning list for the unattended camp-release queue. Newest phase last within each section.

## Decisions

- A new `camp` mod owns camp items, structure parts, the camp's saved state and the camp screens' content (queue default).
- Waterskin belongs to the trap mod: heals one heart at once if one is missing, otherwise nothing, and is used up either way (queue default).
- Healing happens at the camp fire: hearts refill to full on every coming home (queue default).
- Coming home fires on every return to base: a journey's end and leaving mid-journey (queue default).
- Pack-mule and the supplies detector: pack-mule becomes "a waterskin heals two hearts", the supplies detector is removed and its three treasures carry no perk (queue default).
- Animal prices are authored defaults that satisfy the per-gate guard with a margin; animals are bought from Fez in tomb shops only (queue default).
- Where things live once the pager is gone: settings behind a gear in the camp HUD, story log as a Verzameling tab, mosaic window opens the mosaic screen, dev tools move to settings (queue default).
- Phase 1 — 60 waterskins, not 150, the rest of the freed expert-and-up puzzle slots wait for phase 3's camp loot. Alternative: 150, keeping today's puzzle-loot share.
- Phase 1 — Waterskins spread evenly by tier (20 each over expert, master, wizard), round-robin over sites. Alternative: proportional to each tier's puzzle slots.
- Phase 1 — The shop's money budget keeps its size via an authored allowance of 1070 coins until phase 5. Alternative: let the budget fall to the rare stock.
- Phase 1 — Shop stock slots the consumables filled stay empty and the "Supplies" section goes, until phase 4 sells animals. Alternative: fill them with rares or sellables.
- Phase 1 — Pack-mule keeps its perk id `pack-mule`; only meaning and label change. Alternative: rename the id.
- Phase 1 — The supplies detector's three treasures (`expert_b_1`, `master_b_1`, `wizard_b_1`) carry perk `none`. Alternative: give them a new perk.
- Phase 1 — Waterskin is reward type `waterskin`, icon 💧, heals one heart, plain reward popup. Alternative: a popup that says whether it healed.
- Phase 1 — Disarming a trap goes with the trap tool, no replacement. Alternative: keep a disarm action some other way.
- Phase 1 — Coming home fires on the two exits to base (journey complete, close), not on chaining into the next journey or an app reload on the base. Alternative: fire on those too.
- Phase 1 — Fez's `shopArrival2` loses "everyday supplies" (en + nl). Alternative: keep the line and the supplies wording.
- Phase 1 fingerprints — starter moved (`8689d49a0de31c21`): one more coin on a puzzle (71 → 72 drops with loot, 152 → 155 coins); the coin round-robin's cut-off shifts when the expert-and-up puzzle pools change.
- Phase 1 fingerprints — junior moved (`1d5597b49315f636`): its tomb shop's 4 supply stock slots fall empty, and one more coin on a puzzle (201 → 202 coins), the same round-robin shift.
- Phase 1 fingerprints — expert moved (`9cd2d41a4173e69a`): 56 supply puzzle slots become 20 waterskins and 36 empty puzzles; 9 shop stock slots empty; coins 187 → 185.
- Phase 1 fingerprints — master moved (`b6f13390418f0f13`): 56 supply puzzle slots become 20 waterskins and 36 empty puzzles; 9 shop stock slots empty; coins 197 → 196.
- Phase 1 fingerprints — wizard moved (`f2faabe2e557a758`): 38 supply puzzle slots become 20 waterskins and 18 empty puzzles; 13 shop stock slots empty; coins 345 → 344.
- Phase 2 — The empty-loot refusal is the existing bake check (`findEmptyChests`, judged on the assembled floor so a floor-key host is not taken for empty), now pinned by a spec for every kind of loot end, not a second check. Alternative: a second, config-level `WorldValidator` in `buildConfigs`, which would refuse a `loot: false` key host.
- Phase 2 — The bake's empty-end check skips journeys whose capabilities say `emitFragmentSlots === false`, as it already did: a site outside the loot economy grows no reward slot, so its chests stand empty by design. No journey in the world sets it today. Alternative: check them too.
- Phase 2 — `yarn generate-world` does not write `docs/loot-report.md`; `yarn loot-report` is its own command, run in the last task of every phase that bakes (3, 5, 9), and the bake prints one line pointing at it. Alternative: chain the report into `generate-world` so the doc can never go stale.
- Phase 2 — `yarn loot-report` runs prettier on the doc from inside the script, so its output is the committed bytes and two runs match. Alternative: leave formatting to lint-staged.
- Phase 2 — "Every slot" is counted by reward type per level in the doc, not listed one per line (about 3000 lines); `yarn loot-report --journey <id>` prints one journey's slots on the console. Alternative: list every slot in the doc.
- Phase 2 — Puzzle rooms are counted as in phase 1 (a floor's or non-shop section's `pathPuzzles`, loot = its defined `rewards[]`, by section tier), so the numbers compare one to one; tableaus, traps and the crocodile count as puzzle rooms without loot. Alternative: count only loot-eligible rooms.
- Phase 2 — Demand reaches the report through a new descriptor field, `lootTotals`: each mod reports its own currency found and needed, core never learns what a fragment or a coin is, and a toggled-off mod's rows drop. Alternative: let `scripts/lootReport.ts` import each mod's numbers directly.
- Phase 2 — Demand rows now: fragments against `HIEROGLYPH_REQUIRED`, mosaic pieces against `MOSAIC_TOTAL`, map pieces against the tombs' `piecesRequired`, tomb treasures against the catalogue plus every ward gate with its key, waterskins (count only), coins and sellables (count and value), income against the shop's buyable stock. Camp finds come with phase 3, money before each gate with phase 4. Alternative: counts only, demand later.
- Phase 2 — Loot ends without a reward in the spec (a floor-key host, a `loot: false` end) are listed under their own heading, not counted as empty; the bake has already refused any truly empty one. Alternative: count them as empty.
- Phase 3 — 28 found items, not 26. The catalogue's own steps split this way: the palm, fig, papyrus and reeds are found as seeds and cuttings, and the star cloth and the lookout flag are finds. The brief and the loot spec say 26 (the spec's own list counts 28). Alternative: make two of them (star map, scroll case) structure parts.
- Phase 3 — Parts per structure are 2 / 3 / 3 / 4 / 5 by tier (99 parts), authored per structure inside a checked band (starter and junior 2–3, expert 3–4, master and wizard 4–6). The brief's "scale with the tier" wins over the spec's "scale with the slots a tier has"; counts are authored, never computed from slots. Alternative: 2 / 3 / 4 / 5 / 6 (119 parts).
- Phase 3 — 28 finds + 99 parts = 127 more drops, against the handover's estimate of about 104. The plan took the low end of the parts bands (2/3/3/4/5 per structure by tier). Alternative: 2/3/4/5/6 = 119 parts (147 drops).
- Phase 3 — Camp loot lies only on loot-bearing puzzle slots of exactly its step's tier (a slot's tier is its section's). Chests, path ends and shop stock stay with the shop and the capped currencies. A tier that is short fails the bake (TARGET rule 2). Alternative: allow chests, or let a short tier use the next tier's slots.
- Phase 3 — Within a tier the order is ungated main slots first, then ward-gated, then hidden. Sites are dealt round-robin in id order and slots in path order, and a structure's parts are dealt so they fall on different sites. Deterministic, no seed. Alternative: a seeded random spread.
- Phase 3 — Core gives every puzzle slot `wardKeys: []`, so camp's "ward-gated last" step never applies in the real world. Some camp parts can sit behind ward gates (reachable with keys placed in the world). Alternative: core puzzle slots carry their section's wardKeys (moves every dynamic distribution).
- Phase 3 — Registry order is trap → camp → shop. Waterskins keep their 60 slots, camp takes its 127 next, and the shop's money fills what is left (its budget is global, so its coins move to other slots, not out of the world). Alternative: camp before trap.
- Phase 3 — The mod's step table is the source of each step's tier and source. The ui catalogue keeps `chapter` for its camera framing, and `yarn verify-content` fails when the two disagree (a step missing on either side, or a different tier or spot). Alternative: strip `chapter` from the ui catalogue and pass a merged catalogue in as a prop (left to phase 6, which mounts the scene).
- Phase 3 — The camp save is `useModState("camp")` holding `{ version: 1, finds: step ids, parts: structure id → part ids, grown: step ids }`. `CampFound` for the scene is derived from it (fixed steps + finds + finished structures + grown steps). Alternative: store `CampFound` itself.
- Phase 3 — The camp save refuses to overwrite a save it cannot read (a newer version or a damaged one), and such a save reads as an empty camp. Alternative: reset it to an empty camp on the next write.
- Phase 3 — Growth: the sprout comes after the palm seed, the palm after the sprout, dates once both palms stand, the first ibis after the reeds, and the second ibis once the first ibis and the lotus are there. Each rule grows one stage per homecoming, judged on the save as it was on arriving home. Alternative: grow every ready stage at once.
- Phase 3 — Camp growth runs once per homecoming, called from core's homecoming handler. Alternative: grow on every visit to the base screen.
- Phase 3 — The second palm seed and the fig seed land as their tree at once (no sprout art exists for them). Alternative: make them grow too.
- Phase 3 — Constructies is a Collection section now (registered at order 40, after the shop's), titled "Constructies". Phase 7 turns the sections into tabs. Alternative: build the tab bar in this phase.
- Phase 3 — The brief overrides the Verzameling sketch's note "Kampspullen staan hier niet in": started structures are listed in Constructies. Found items stay out of the Verzameling (they are seen in the camp and in their popup).
- Phase 3 — Progress lines: a part reads "<structure> · n van m" over that structure's parts. A find reads "<spot> · n van m" over the spot's finds and structures in place. Alternative: a find shows no progress line.
- Phase 3 — Missing parts always read "???" in an opened row; there is no "seen" state, because the spec's "not seen yet" variant needs a store nothing else uses. Alternative: remember seen parts.
- Phase 3 — Until it is painted, a part shows its structure's camp art and a sellable shows its glyph. A painted icon takes over once its file is dropped in (`src/assets/camp/parts/<structure>-<part>.webp`, `src/assets/sellables/<id>.webp`). Alternative: an emoji per part.
- Phase 3 — The icon prompts live in `docs/instructions/repaint-queue.md` (as the brief asks), in the camp house style (`docs/game-design/camp-art-prompts.md` §0: matte, flat `#ff00ff` ground, neutral light). Their keys are `part/<structure>-<part>` and `sellable/<id>`, imported with `yarn import-camp --out-dir`. Alternative: put them in `camp-art-prompts.md`.
- Phase 3 — A new locale namespace `camp` (`public/locales/*/camp.json`) holds the spot, find, structure and part names and the Constructies strings. Alternative: keep them under the `camp` key of `common.json`.
- Phase 3 — A camp reward is skipped silently only when the save already has it (a revisit, a dev grant); otherwise it is always taken. Alternative: no skip.
- Phase 3 — Finds and parts get no description line in this phase; the popup shows name, art and progress. Story phase 8 may add flavour. Alternative: draft a description per find now.
- Phase 3 — Loot report rows: "Camp finds" against the table's found items and "Structure parts" against the table's parts, each counted wherever it lies.
- Phase 3 — The brief wins over the spec on three points: parts scale with the tier (the parts decision above), the found-item count follows the catalogue (the 28 finds decision above), and the Constructies list shows structure art plus "n van m", with parts only in an opened row (the spec showed parts inline).
- Phase 4 — World-gen offers no slot on the end of a section that resolves to Fez's shop, and clears a placeholder standing there, because a shop room shows only its stock. Nothing (fragment, key, money, camp loot) lands there any more. The bake moved: pieces relocated, so the junior, expert, master and wizard tier fingerprints changed; starter did not. Alternative: let a shop room also hand out its end reward (a new room kind).
- Phase 4 — World-gen refuses an authored (non-placeholder) `endReward` on a shop's end ("authored endReward on a shop end: <address>"), since it would vanish in play. None is authored today.
- Phase 4 — checked: no reward on a key-host end at shipped seeds (0 of 633 section end rewards, and 0 at the placement layout too). All 90 key-hosting chests stand on sections the carve grows itself, never on an authored one. Neither `findEmptyChests` (it skips key hosts) nor the loot report (it reads the config) would have counted one.

## Phase 1 loot

Measured on the committed world before (c493c30b) and after the bake (5f0d80f4), with a throwaway script over `generatedWorldConfigs` by section tier. Shops are not counted as puzzle rooms.

| tier    | puzzles with loot               | waterskins | slots changed                                                                                   |
| ------- | ------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| starter | 71/92 = 77% → 72/92 = 78%       | 0          | one more coin on a puzzle (78 → 79 drops, 152 → 155 coins)                                      |
| junior  | 71/186 = 38% → 72/186 = 39%     | 0          | 4 shop stock slots (supplies) → empty; one more coin on a puzzle (201 → 202 coins)              |
| expert  | 127/431 = 29% → 91/431 = 21%    | 20         | 56 supply puzzle slots → 20 waterskins + 36 empty; 9 shop stock slots → empty; coins 187 → 185  |
| master  | 127/540 = 24% → 91/540 = 17%    | 20         | 56 supply puzzle slots → 20 waterskins + 36 empty; 9 shop stock slots → empty; coins 197 → 196  |
| wizard  | 109/860 = 13% → 91/860 = 11%    | 20         | 38 supply puzzle slots → 20 waterskins + 18 empty; 13 shop stock slots → empty; coins 345 → 344 |
| all     | 505/2109 = 24% → 417/2109 = 20% | 60         | 150 supply puzzle slots and 35 supply shop slots gone                                           |

- Empty chests 0/194 and empty path ends 0/633, before and after.
- Waterskins sit only on expert, master and wizard puzzle slots; none on a chest, path end or shop slot. No `consumable` left in `generatedWorld.ts`.
- Money 1082 coins before and after (530 → 532 drops); sellables 85 worth 7025, unchanged; buyable 6300, unchanged; income 8107 covers it and the economy guard passes.
- Toggle-off: with `trapMod` out of `REGISTERED_MODS` (and its import, which `check-types` otherwise refuses as unused), `yarn generate-world`, `yarn check-types` and `yarn build` pass, and the bake holds no waterskin. Restored afterwards; the tree was clean.
- Gate after Tasks 7 and 8: the re-bake left `generatedWorld.ts` byte-identical (only carve-ledger hashes moved from comment edits), the fingerprint verify passes unchanged, and `yarn verify` (531 files, 6406 tests, betterer ratcheted 5 fixed issues), `yarn verify-content` (43 files, 751 tests) and `yarn build` pass.

## Phase 2 loot

From `yarn loot-report` on the committed bake (byte-identical to phase 1's). `docs/loot-report.md` is the full table, per tier and per journey level; refresh it with `yarn loot-report`.

| tier    | puzzles with loot | empty puzzle rooms | chests filled | path ends filled | shop stock filled |
| ------- | ----------------- | ------------------ | ------------- | ---------------- | ----------------- |
| starter | 72/92 = 78%       | 20                 | 20/20         | 52/52            | 0/0               |
| junior  | 72/186 = 39%      | 114                | 27/27         | 113/113          | 2/6               |
| expert  | 91/431 = 21%      | 340                | 35/35         | 141/141          | 3/12              |
| master  | 91/540 = 17%      | 449                | 54/54         | 158/158          | 3/12              |
| wizard  | 91/860 = 11%      | 769                | 58/58         | 169/169          | 5/18              |
| all     | 417/2109 = 20%    | 1692               | 194/194       | 633/633          | 13/48             |

- Against demand: mosaic pieces 252/252, hieroglyph fragments 296/296, map pieces 31/31, tomb treasures 40/40, ward gates with their key 290/290 — all exact. Income 8107 coins (1082 coins in 532 drops + 85 sellables worth 7025) against 6300 buyable: surplus 1807. Waterskins 60, no demand.
- Loot ends without a reward in the spec: none. The empty shop stock slots (35) are phase 1's emptied supply slots, waiting for phase 4's animals.
- Determinism: two `yarn loot-report` runs on the same bake write identical bytes.
- Toggle-off: with `trapMod` out of `REGISTERED_MODS` (and its import), `yarn loot-report` runs and drops the Waterskins row; `yarn check-types` passes. Without a re-bake the baked world still holds its waterskins, so they still show as `waterskin` counts in the tier columns (reward types are counted as opaque strings). Restored afterwards.
- Gate: `yarn generate-world` left `generatedWorld.ts` byte-identical (carveLedger unchanged too); `yarn verify` (539 files, 6439 tests; betterer only re-keyed the `§` backlog entries of `modDescriptor.ts` and `registeredMods.ts` whose lines moved), `yarn verify-content` (43 files, 751 tests) and `yarn build` pass.

## Phase 3 loot

From `yarn loot-report` before (651aad2c) and after the bake (88646b9e). `docs/loot-report.md` has the full table. The tier is the section's tier.

| tier    | camp finds + parts | puzzles with loot               | empty puzzle rooms | chests filled | path ends filled | coins on puzzles (drops) | coins in the tier |
| ------- | ------------------ | ------------------------------- | ------------------ | ------------- | ---------------- | ------------------------ | ----------------- |
| starter | 4 + 8 = 12         | 72/92 = 78% → 78/92 = 85%       | 20 → 14            | 20/20         | 52/52            | 72 → 66                  | 155 → 145         |
| junior  | 5 + 6 = 11         | 72/186 = 39% → 83/186 = 45%     | 114 → 103          | 27/27         | 113/113          | 72 → 72                  | 202 → 206         |
| expert  | 3 + 9 = 12         | 91/431 = 21% → 104/431 = 24%    | 340 → 327          | 35/35         | 141/141          | 71 → 72                  | 185 → 192         |
| master  | 5 + 36 = 41        | 91/540 = 17% → 133/540 = 25%    | 449 → 407          | 54/54         | 158/158          | 71 → 72                  | 196 → 193         |
| wizard  | 11 + 40 = 51       | 91/860 = 11% → 142/860 = 17%    | 769 → 718          | 58/58         | 169/169          | 71 → 71                  | 344 → 346         |
| all     | 28 + 99 = 127      | 417/2109 = 20% → 540/2109 = 26% | 1692 → 1569        | 194/194       | 633/633          | 357 → 353                | 1082 → 1082       |

- Against demand: Camp finds 28/28 and Structure parts 99/99, both exact. Mosaic 252/252, fragments 296/296, map pieces 31/31, tomb treasures 40/40 and ward gates with their key 290/290 are unchanged.
- Every camp find and part lies on a puzzle slot of its step's tier: none on a chest, path end or shop stock slot. 100 lie on main paths and 27 on side paths. The camp loot fills empty puzzle rooms and takes some puzzle slots the shop's coins held before.
- Waterskins: 60, on the same 60 slots before and after (compared slot by slot over every journey's `yarn loot-report --journey` listing).
- Money: 1082 coins before and after, in 532 → 528 drops. Sellables 85 worth 7025, unchanged. Income 8107 against 6300 buyable: surplus 1807, unchanged, and the economy guard passes.
- The bake also moved the carve ledger's input hashes for its refused master/wizard floors (each refusal is unchanged). Reward placement feeds that hash; no floor carves differently.
- Phase 3 fingerprints — starter moved (`f528edc2c6be20f8`): 8 camp finds and parts on puzzle slots of its journeys, and the shop's coins moved to other slots (coin drops 87 → 85).
- Phase 3 fingerprints — junior moved (`ee7ad76c08ed137f`): 17 camp finds and parts on puzzle slots of its journeys, and coins moved to other slots (coin drops 112 → 104).
- Phase 3 fingerprints — expert moved (`88e695ec8e596a0a`): 27 camp finds and parts on puzzle slots of its journeys, and coins moved to other slots (coin drops 100 → 88).
- Phase 3 fingerprints — master moved (`8efaa7248d8645f0`): 28 camp finds and parts on puzzle slots of its journeys, and the shop's budget put coins on other slots here (coin drops 90 → 104).
- Phase 3 fingerprints — wizard moved (`b3c21b3af901eeb4`): 47 camp finds and parts on puzzle slots of its journeys, and coins moved to other slots (coin drops 143 → 147).
- (The fingerprint counts are by journey tier: a starter-tier part can lie in an expert journey's starter-tier section, so these differ from the table's section-tier counts.)
- Toggle-off: with `campMod` out of `REGISTERED_MODS` (and its import), `yarn generate-world`, `yarn check-types`, `yarn build` and `yarn loot-report` pass. The report has no camp rows, and the baked world holds no `campFind` / `campPart`. `generatedWorld.ts` is then byte-identical to the bake before this phase. Restored afterwards; the tree was clean.
- Gate: `yarn verify` (551 files, 6529 tests; betterer only re-keyed the `§` entries of `registeredMods.ts` and `CollectibleSlot.tsx`, whose lines moved), `yarn verify-content` (44 files, 753 tests, the camp catalogue agreement included) and `yarn build` pass.
- Found during the look: `yarn dev` showed a blank page (`node:path` has no export `dirname`). Since phase 2, the tomb-treasure loot rows imported `WORLD_TARGETS` from `worldSpec.ts`, which pulls the lock catalogue (read from disk) into the app; the production bundle carried the same `node:` shims. Fixed in 7afaa564: `WORLD_TARGETS` has its own file, and the app graph no longer reaches the spec.

## Drafts

- Phase 1 — Fez's `shopArrival2`, now without supplies. en: "Rare finds cost the most, but I'll pay you for any trinkets you're carrying." nl: "Zeldzame vondsten kosten het meest, maar ik betaal je voor snuisterijen die je meedraagt."
- Phase 1 — `chest.waterskinDescription`. en: "Cool water. You drink it on the spot and feel your wounds ease." nl: "Koel water. Je drinkt hem meteen leeg en voelt je wonden minder pijn doen."
- Phase 3 — structure parts (names are drafts, nl / en; one line per structure):
  - Stenen kring / Stone ring: Veldkeien / Field stones, Zandbed / Sand bed
  - Vuur / Fire: Tondel / Tinder, Acaciahout / Acacia logs
  - Kookstenen / Cooking stones: Platte steen / Flat stone, Steunstenen / Support stones
  - Zitstenen / Seating stones: Gladde keien / Smooth boulders, Zandsteenblok / Sandstone block, Gehouwen plaat / Hewn slab
  - Leemoven / Clay oven: Ovenvloer / Oven floor, Vuurvaste stenen / Firebricks, Rookgat / Smoke hole, Koperen rooster / Copper grate
  - Windscherm / Windbreak: Rietbundels / Reed bundles, Houten palen / Wooden stakes
  - Tent / Tent: Tentstokken / Tent poles, Geweven doek / Woven cloth, Haringen / Tent pegs
  - Tweede tent / Second tent: Groot tentdoek / Large tent cloth, Nokbalk / Ridge pole, Spantouwen / Guy ropes, Wollen vloerkleed / Wool ground cloth
  - Paviljoen / Pavilion: Paviljoenpalen / Pavilion posts, Linnen dak / Linen canopy, Gordijnen / Curtains, Wollen kleden / Wool rugs, Houten vloer / Wooden floor
  - Put / Well: Putstenen / Well stones, Lang touw / Long rope, Emmer / Bucket, Windas / Windlass
  - Katrolput / Pulley well: Katrol / Pulley wheel, Draagframe / Support frame, Hijstouw / Hoisting rope, Tegengewicht / Counterweight, Leren emmer / Leather bucket
  - Driepoot / Tripod: Drie stokken / Three poles, Bindtouw / Binding rope, Bronzen haak / Bronze hook
  - Broodoven / Bread oven: Leemstenen / Mud bricks, Kleipleister / Clay plaster, Ovenklep / Oven lid
  - Droogrek / Drying rack: Rekpalen / Rack poles, Dwarshout / Crossbar, Vlechtwerk / Wickerwork tray, Hangkoorden / Hanging cords
  - Feestmaal / Feast: Lage tafel / Low table, Broodmanden / Bread baskets, Gebraden eend / Roast duck, Bierkruiken / Beer jars, Fruitschaal / Fruit bowl
  - Kaartentafel / Map table: Tafelblad / Table top, Schragen / Trestles, Leren riempjes / Leather straps
  - Lotusbak / Lotus planter: Kleibak / Clay trough, Nijlslib / Nile silt, Waterkruik / Water jar, Lotusknollen / Lotus tubers, Stenen rand / Stone rim
  - Vijverrand / Pond edge: Rivierstenen / River stones, Kleibed / Clay bedding, Grind / Gravel, Afbakenpaaltjes / Boundary stakes
  - Uitkijkpaal / Lookout post: Palmstam / Palm trunk, Voetstenen / Foundation stones, Wiggen / Wedges, Schoren / Braces
  - Uitkijkplatform / Lookout platform: Draagbalken / Support beams, Planken / Planks, Sjortouw / Lashing rope, Reling / Railing
  - Ladder / Ladder: Ladderzijden / Ladder rails, Sporten / Rungs, Grondpennen / Ground pegs, Leren lussen / Leather loops
  - Dak / Roof: Dakbalkjes / Roof poles, Palmbladeren / Palm thatch, Kleilaag / Clay layer, Bindgras / Binding grass
  - Seinvuur / Signal fire: Vuurschaal / Fire basin, Pek / Pitch, Droog kreupelhout / Dry brushwood, Vuursteen / Flint, Blaasbalg / Bellows
  - Sterrenmasten / Canopy masts: Masten / Masts, Hoekstenen / Corner stones, Tuilijnen / Stay lines, Grote haringen / Large pegs, Paalvoeten / Pole sockets
  - Sterren / Stars: Bladgoud / Gold leaf, Naald en draad / Needle and thread, Indigoverf / Indigo dye, Krijt / Chalk, Sjablonen / Stencils
  - Planeten / Planets: Oker / Ochre, Koperen schijven / Copper discs, Lapispoeder / Lapis powder, Ophanglusjes / Hanging loops, Passer / Dividers
- Phase 3 — find names (nl / en): Kookpot / Cooking pot, Zitkussens / Seat cushions, Rietmat / Reed mat, Deken / Blanket, Tenttapijt / Tent rug, Tentvlag / Tent flag, Kalebas / Gourd, Kruik / Jar, Tweede kruik / Second jar, Kruidenrek / Spice rack, Broodplank / Bread board, Kompas / Compass, Sterrenkaart / Star map, Rolkoker / Scroll case, Astrolabium / Astrolabe, Rieten wereldbol / Reed globe, Palmzaad / Palm seed, Palmzaad / Palm seed, Vijgenzaad / Fig seed, Papyruswortel / Papyrus root, Rietstek / Reed cutting, Lotusknol / Lotus tuber, Uitkijkvlag / Lookout flag, Thoth-beeldje / Thoth statuette, Bastet-beeldje / Bastet statuette, Anubis-beeldje / Anubis statuette, Ra-beeldje / Ra statuette, Sterrendoek / Star cloth

## Failures

- Phase 4 — 8 hieroglyph fragments (a2, art3, d9, art10, d5, d12, a10, d13) sat on the end of a tomb's shop section, which the shop room never shows, so their tomb tableaus could not be finished. Pre-existing on main. Fixed: such an end is no slot any more. That fix alone took the strict gate walk over the shipped world from 16 to 22 of 29 journeys.
- Phase 4 — stopped after Tasks 1–2 (gate registries with AND across mods; the gate walk; world-gen no longer places loot on a shop's end, which lost 8 hieroglyph pieces, pre-existing on main). Remaining blocker, pre-existing on main: loot placement walks floors laid out at the default seed and checks a slot's floor, while the bake ships pinned seeds. At the shipped layout the strict walk enters 22 of 29 journeys and none of the 7 wizard journeys (e.g. art6's last piece is in expert_treasure_tomb_b level 2's shop behind that floor's own tableau needing art6). A room-level placement check (commit 2911e017, reverted) reaches 29/29 at the placement layout but only 16/29 shipped. Decision needed: place loot on the pinned layout (pin every floor first), or make placement layout-independent and guard the stamped world. Phase 4 Tasks 3–8 (purchases, per-gate guard, gate needs, buying, arrival) wait on that.

## Look at in browser

- Phase 1 — Hearts refill after leaving an expedition. Not reached unattended: every trap section in the world is hidden and sealed, so no trap was walkable from a fresh dev save. Steps: take damage in any trap (expert pyramid, e.g. Vallei der Koningen), tap "← Terug" to base, tap "Ga door met Expeditie": all hearts are full.
- Phase 1 — A waterskin while hurt heals one heart (two with pack-mule). Not reached unattended (needs a trap first). Steps: after taking trap damage, solve a puzzle that holds a waterskin (Vallei der Koningen floor 1, the first puzzle up the main corridor): one heart comes back.
- Phase 1 — The waterskin popup. Checked unattended: Vallei der Koningen floor 1, first puzzle (dev "Solve") shows "Je hebt gevonden — 💧 Waterzak" at full health; hearts stay 12/12. Walking back onto the solved room, and again after "← Terug" to base and "Ga door met Expeditie", offers nothing.
- Phase 1 — Fez's shop without supplies. Checked unattended: Edelman's Verborgen Kluis level 2, Fez's Kraam shows only "Zeldzame vondsten" (mosaic piece 500, Hathor fragment sold out); no Supplies section.
- Phase 1 — The trap warning without heal or disarm buttons.
- Phase 1 — The HUD without the supplies bar.
- Phase 1 — The detector toggles without the supplies detector.
- Phase 3 — The Constructies section. Checked unattended on a fresh dev save with a seeded camp save (stone ring 1 part, fire both parts, well 1 part, plus the jar find): the section sits last in the Collection with each structure's camp art, "1 van 2", "gebouwd", "1 van 4". Opening "Put" lists "???", "Lang touw" with its art, "???", "???". The jar find is not listed. Its heading is brown without an icon or underline, unlike the purple hieroglyph sections above it. Look at it on a phone too.
- Phase 3 — A part popup. Not reached unattended: no puzzle room turned up on the first floor walked. Steps: on a fresh save start Dageraad bij de Sfinx, finish level 1, and on level 2 solve the first puzzle up the main corridor. It holds the stone ring's sand bed: the popup shows the stone ring's camp art and "Stenen kring · 1 van 2".
- Phase 3 — A find popup with its layer art. Not reached unattended. Steps: Dageraad bij de Sfinx level 1, the first puzzle on side path 1, holds the jar: the popup shows the jar's camp layer art and a "<spot> · n van m" line.
- Phase 3 — The StructureRow and StructuresPanel stories (closed, open, complete, "???", "gebouwd") render. The panel story's rows have no art because its made-up rows pass none.
