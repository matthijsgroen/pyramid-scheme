# Camp release review list

The designer's morning list for the unattended camp-release queue (`docs/handover-camp-release.md`). Read it top
down: the summary, then the decisions by phase, the drafts, what failed, and what to look at in the browser.

## 1. Start here

What got built, per phase:

- **Phase 1** — bandage, oil, trap tool, the pack and the supplies detector are gone; 60 waterskins (20 per tier, expert and up) heal on pickup; hearts refill on every coming home; pack-mule makes a waterskin heal two.
- **Phase 2** — `yarn loot-report` writes `docs/loot-report.md` (every slot per tier and level, demand per currency); the bake names any empty chest or path end.
- **Phase 3** — the `camp` mod: 28 found items and 99 structure parts on puzzle slots of their tier, the camp save, the Constructies tab, 124 icon prompts in the repaint queue.
- **Phase 4** — STOPPED after Tasks 1–2: gates hold every mod's requirement, a gate walk, no loot on a shop's end. The animals, the per-gate guard and buying are not built.
- **Phase 5** — skipped: the economy recompute needs phase 4's purchases.
- **Phase 6** — the camp is the home screen (HUD, scene entrances, Verder met, desktop side panel), the coming-home screen with the haul, the new-chapter card, settings with the dev tools.
- **Phase 7** — Alle reizen replaces the Travel page; the Verzameling opens in tabs with NIEUW and a chest badge. The mosaic window has no count line; the camp label carries the count.
- **Phase 8** — 64 draft scenes in nl and en (27 tomb, 10 camp, 27 animal); tomb and camp beats wired, the animal ones wait on phase 4; settings play every draft in develop mode.
- **Phase 9** — changelog, playtest backlog, docs, the last loot report and the clean-worktree gate.

What most needs your eye:

1. **Phase 4's blocker (Failures):** loot placement walks floors at the default seed, the bake ships pinned seeds, and at the shipped layout no wizard journey can be entered. Pick one: place loot on the pinned layout (pin every floor first), or make placement layout-independent and guard the stamped world. Phase 4 Tasks 3–8 and phase 5 wait on it.
2. **How much camp loot (phase 3):** 28 finds and parts at 2 / 3 / 3 / 4 / 5 per structure by tier, 127 more drops; or 2 / 3 / 4 / 5 / 6 (147).
3. **The stopgaps that stand until phase 4–5 run (phase 1):** 60 waterskins rather than 150, 35 emptied shop stock slots, and the shop's authored 1070-coin allowance.
4. **The 64 draft scenes (Drafts, phase 8):** play them from settings in develop mode (Story drafts); a draft is approved by taking its id out of `DRAFT_BEATS`.
5. **A save can be wiped (Failures, pre-existing):** when the IndexedDB read rejects, the next write overwrites the store with an empty value.

## 2. Decisions

### Queue defaults

- A new `camp` mod owns camp items, structure parts, the camp's saved state and the camp screens' content (queue default).
- Waterskin belongs to the trap mod: heals one heart at once if one is missing, otherwise nothing, and is used up either way (queue default).
- Healing happens at the camp fire: hearts refill to full on every coming home (queue default).
- Coming home fires on every return to base: a journey's end and leaving mid-journey (queue default).
- Pack-mule and the supplies detector: pack-mule becomes "a waterskin heals two hearts", the supplies detector is removed and its three treasures carry no perk (queue default).
- Animal prices are authored defaults that satisfy the per-gate guard with a margin; animals are bought from Fez in tomb shops only (queue default).
- Where things live once the pager is gone: settings behind a gear in the camp HUD, story log as a Verzameling tab, mosaic window opens the mosaic screen, dev tools move to settings (queue default).

### Phase 1 — consumables out, healing at the camp

- Phase 1 — 60 waterskins, not 150, the rest of the freed expert-and-up puzzle slots wait for phase 3's camp loot (phase 3 placed it there). Alternative: 150, keeping today's puzzle-loot share.
- Phase 1 — Waterskins spread evenly by tier (20 each over expert, master, wizard), round-robin over sites. Alternative: proportional to each tier's puzzle slots.
- Phase 1 — The shop's money budget keeps its size via an authored allowance of 1070 coins until phase 5 (phase 5 has not run, so the allowance stands). Alternative: let the budget fall to the rare stock.
- Phase 1 — Shop stock slots the consumables filled stay empty and the "Supplies" section goes, until phase 4 sells animals (phase 4 stopped before the animals, so they are still empty). Alternative: fill them with rares or sellables.
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

#### Phase 1 loot

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

### Phase 2 — the loot overview

- Phase 2 — The empty-loot refusal is the existing bake check (`findEmptyChests`, judged on the assembled floor so a floor-key host is not taken for empty), now pinned by a spec for every kind of loot end, not a second check. Alternative: a second, config-level `WorldValidator` in `buildConfigs`, which would refuse a `loot: false` key host.
- Phase 2 — The bake's empty-end check skips journeys whose capabilities say `emitFragmentSlots === false`, as it already did: a site outside the loot economy grows no reward slot, so its chests stand empty by design. No journey in the world sets it today. Alternative: check them too.
- Phase 2 — `yarn generate-world` does not write `docs/loot-report.md`; `yarn loot-report` is its own command, run in the last task of every phase that bakes (3, 5, 9), and the bake prints one line pointing at it. Alternative: chain the report into `generate-world` so the doc can never go stale.
- Phase 2 — `yarn loot-report` runs prettier on the doc from inside the script, so its output is the committed bytes and two runs match. Alternative: leave formatting to lint-staged.
- Phase 2 — "Every slot" is counted by reward type per level in the doc, not listed one per line (about 3000 lines); `yarn loot-report --journey <id>` prints one journey's slots on the console. Alternative: list every slot in the doc.
- Phase 2 — Puzzle rooms are counted as in phase 1 (a floor's or non-shop section's `pathPuzzles`, loot = its defined `rewards[]`, by section tier), so the numbers compare one to one; tableaus, traps and the crocodile count as puzzle rooms without loot. Alternative: count only loot-eligible rooms.
- Phase 2 — Demand reaches the report through a new descriptor field, `lootTotals`: each mod reports its own currency found and needed, core never learns what a fragment or a coin is, and a toggled-off mod's rows drop. Alternative: let `scripts/lootReport.ts` import each mod's numbers directly.
- Phase 2 — Demand rows now: fragments against `HIEROGLYPH_REQUIRED`, mosaic pieces against `MOSAIC_TOTAL`, map pieces against the tombs' `piecesRequired`, tomb treasures against the catalogue plus every ward gate with its key, waterskins (count only), coins and sellables (count and value), income against the shop's buyable stock. Camp finds came with phase 3; money before each gate waits on phase 4. Alternative: counts only, demand later.
- Phase 2 — Loot ends without a reward in the spec (a floor-key host, a `loot: false` end) are listed under their own heading, not counted as empty; the bake has already refused any truly empty one. Alternative: count them as empty.

#### Phase 2 loot

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

### Phase 3 — camp loot

- Phase 3 — 28 found items, not 26. The catalogue's own steps split this way: the palm, fig, papyrus and reeds are found as seeds and cuttings, and the star cloth and the lookout flag are finds. The brief and the loot spec say 26 (the spec's own list counts 28). Alternative: make two of them (star map, scroll case) structure parts.
- Phase 3 — Parts per structure are 2 / 3 / 3 / 4 / 5 by tier (99 parts), authored per structure inside a checked band (starter and junior 2–3, expert 3–4, master and wizard 4–6). The brief's "scale with the tier" wins over the spec's "scale with the slots a tier has"; counts are authored, never computed from slots. Alternative: 2 / 3 / 4 / 5 / 6 (119 parts). With 28 finds that is 127 more drops, against the handover's estimate of about 104 (the alternative: 147).
- Phase 3 — Camp loot lies only on loot-bearing puzzle slots of exactly its step's tier (a slot's tier is its section's). Chests, path ends and shop stock stay with the shop and the capped currencies. A tier that is short fails the bake (TARGET rule 2). Alternative: allow chests, or let a short tier use the next tier's slots.
- Phase 3 — Within a tier the order is ungated main slots first, then ward-gated, then hidden. Sites are dealt round-robin in id order and slots in path order, and a structure's parts are dealt so they fall on different sites. Deterministic, no seed. Alternative: a seeded random spread.
- Phase 3 — Core gives every puzzle slot `wardKeys: []`, so camp's "ward-gated last" step never applies in the real world. Some camp parts can sit behind ward gates (reachable with keys placed in the world). Alternative: core puzzle slots carry their section's wardKeys (moves every dynamic distribution).
- Phase 3 — Registry order is trap → camp → shop. Waterskins keep their 60 slots, camp takes its 127 next, and the shop's money fills what is left (its budget is global, so its coins move to other slots, not out of the world). Alternative: camp before trap.
- Phase 3 — The mod's step table is the source of each step's tier and source. The ui catalogue keeps `chapter` for its camera framing, and `yarn verify-content` fails when the two disagree (a step missing on either side, or a different tier or spot). Alternative: strip `chapter` from the ui catalogue and pass a merged catalogue in as a prop (phase 6 mounted the scene and kept the check).
- Phase 3 — The camp save is `useModState("camp")` holding `{ version: 1, finds: step ids, parts: structure id → part ids, grown: step ids }`. `CampFound` for the scene is derived from it (fixed steps + finds + finished structures + grown steps). Alternative: store `CampFound` itself.
- Phase 3 — The camp save refuses to overwrite a save it cannot read (a newer version or a damaged one), and such a save reads as an empty camp. Alternative: reset it to an empty camp on the next write.
- Phase 3 — Growth: the sprout comes after the palm seed, the palm after the sprout, dates once both palms stand, the first ibis after the reeds, and the second ibis once the first ibis and the lotus are there. Each rule grows one stage per homecoming, judged on the save as it was on arriving home. Alternative: grow every ready stage at once.
- Phase 3 — Camp growth runs once per homecoming, called from core's homecoming handler. Alternative: grow on every visit to the base screen.
- Phase 3 — The second palm seed and the fig seed land as their tree at once (no sprout art exists for them). Alternative: make them grow too.
- Phase 3 — Constructies is a Collection section now (registered at order 40, after the shop's), titled "Constructies". Phase 7 made the sections tabs. Alternative: build the tab bar in this phase.
- Phase 3 — The brief overrides the Verzameling sketch's note "Kampspullen staan hier niet in": started structures are listed in Constructies, one row each with the structure's art and "n van m", its parts only in an opened row (the spec showed them inline); phase 7 kept it a tab. Found items stay out of the Verzameling (they are seen in the camp and in their popup).
- Phase 3 — Progress lines: a part reads "<structure> · n van m" over that structure's parts. A find reads "<spot> · n van m" over the spot's finds and structures in place. Alternative: a find shows no progress line.
- Phase 3 — Missing parts always read "???" in an opened row; there is no "seen" state, because the spec's "not seen yet" variant needs a store nothing else uses. Alternative: remember seen parts.
- Phase 3 — Until it is painted, a part shows its structure's camp art and a sellable shows its glyph. A painted icon takes over once its file is dropped in (`src/assets/camp/parts/<structure>-<part>.webp`, `src/assets/sellables/<id>.webp`). Alternative: an emoji per part.
- Phase 3 — The icon prompts live in `docs/instructions/repaint-queue.md` (as the brief asks), in the camp house style (`docs/game-design/camp-art-prompts.md` §0: matte, flat `#ff00ff` ground, neutral light). Their keys are `part/<structure>-<part>` and `sellable/<id>`, imported with `yarn import-camp --out-dir`. Alternative: put them in `camp-art-prompts.md`.
- Phase 3 — A new locale namespace `camp` (`public/locales/*/camp.json`) holds the spot, find, structure and part names and the Constructies strings. Alternative: keep them under the `camp` key of `common.json`.
- Phase 3 — A camp reward is skipped silently only when the save already has it (a revisit, a dev grant); otherwise it is always taken. Alternative: no skip.
- Phase 3 — Finds and parts get no description line in this phase; the popup shows name, art and progress. Phase 8 drafted story beats, no descriptions. Alternative: draft a description per find now.
- Phase 3 — Loot report rows: "Camp finds" against the table's found items and "Structure parts" against the table's parts, each counted wherever it lies.

#### Phase 3 loot

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

### Phase 4 — animals as gates (stopped after Tasks 1–2)

- Phase 4 — World-gen offers no slot on the end of a section that resolves to Fez's shop, and clears a placeholder standing there, because a shop room shows only its stock. Nothing (fragment, key, money, camp loot) lands there any more. The bake moved: pieces relocated, so the junior, expert, master and wizard tier fingerprints changed; starter did not. Alternative: let a shop room also hand out its end reward (a new room kind).
- Phase 4 — World-gen refuses an authored (non-placeholder) `endReward` on a shop's end ("authored endReward on a shop end: <address>"), since it would vanish in play. None is authored today.
- Phase 4 — checked: no reward on a key-host end at shipped seeds (0 of 633 section end rewards, and 0 at the placement layout too). All 90 key-hosting chests stand on sections the carve grows itself, never on an authored one. Neither `findEmptyChests` (it skips key hosts) nor the loot report (it reads the config) would have counted one.

### Phase 6 — the camp as home

- Phase 6 — **Alle reizen is the existing Travel page, as an interim,** shown in a popup on a phone and in the side panel on desktop, minus its dev tools (they move to settings). Phase 7 replaces it with the flat list of `MobielReizen.dc.html`. Alternative: build the flat list now. — done in phase 7
- Phase 6 — **Desktop starts at the `lg` breakpoint (1024 px):** from there Alle reizen and the Verder met card sit in a side panel beside the camp; below it the card floats over the scene's bottom and Alle reizen is a popup. Alternative: `md` (768 px).
- Phase 6 — **The fire is not an entrance.** The fire is where coming home happens; tapping it does nothing in this phase. Alternative: the fire reopens the last coming-home overview, or the story log.
- Phase 6 — **The map table opens Alle reizen on a phone; on desktop it offers no entrance,** since the panel is already in view. The map table is a camp step (fixed); with the camp mod off it is not drawn, so there is no map entrance, and Alle reizen is reached from the card. Alternative: on desktop the map table flashes the panel.
- Phase 6 — **The mosaic window is claimed by the mosaic mod** through a new "mod entrance" seam: the mod gives the label ("Mozaïek 61/252") and the screen; with the mosaic off the window stands as decor. Alternative: a core screen registry keyed by scene object.
- Phase 6 — **The chest carries no badge yet:** the "new in the Verzameling" count needs the NIEUW tracking of phase 7. Alternative: count new items now. — done in phase 7
- Phase 6 — **The camp HUD reuses the site map's HUD widgets** (coins from the shop mod, hearts from the trap mod), not a second registry. Alternative: a separate camp HUD registry.
- Phase 6 — **The haul is every reward the player takes from a found-loot popup** (`useRewardOffer`'s collect), stored as the reward objects in the core home save. Shop purchases and dev grants are not haul. It stays across reloads and is emptied by Uitpakken; a reload mid-trip does not fire coming home, so its finds join the next homecoming's haul. Alternative: record every applied reward, purchases included.
- Phase 6 — **Haul lines are summed by the mod that owns the reward** (a new seam): the shop sums coins ("+85 munten") and groups sellables, mosaic counts pieces, camp marks a find **NIEUW** and groups parts by structure, the trap mod lists no waterskin (it was drunk on the spot). A reward type no mod sums up gets core's default line: its name and visual from the reward display, "×n" for equal rewards. New lines first, then in the order first found. Alternative: core's default line for everything.
- Phase 6 — **An empty haul** shows the title, the fire and the rest panels; its button reads "Naar het kamp" instead of "Uitpakken". Alternative: the same "Uitpakken" label.
- Phase 6 — **Resting is a mod panel:** the trap mod shows the full hearts and "Uitgerust bij het vuur — weer helemaal fit" on the coming-home screen; with the trap mod off the screen shows only the fire. Alternative: a fixed core rest line.
- Phase 6 — **No arrow to where a find lands** (DesktopUitpakken), and found pieces are drawn at once rather than held back until Uitpakken. Alternative: hold the haul's camp pieces back and let them fade in on Uitpakken, with the arrow on desktop.
- Phase 6 — **The chapter is the highest released tier the player holds a key to** (`isTierUnlocked`). The home save records the chapter last announced; a save without a record takes the current chapter silently (a fresh game starts at starter, so starter is never announced). When several tiers open at once only the highest is announced. Alternative: announce every tier in turn.
- Phase 6 — **The new-chapter screen is a card over the camp at the new chapter** (the scene already draws the new pyramid on the horizon), with the tier's first open journey and **Op pad**, plus a close. It shows after the coming-home screen, or on opening the home when a tier opened elsewhere (a dev grant). There is no "new camp piece" line: camp pieces are found now, not given per chapter. The tier's own line (the sketch's trap remark) is left to story phase 8. Alternative: a separate sunrise picture.
- Phase 6 — **Verder met:** the journey in progress, else the first open, unfinished, not hidden journey of the highest tier that has one (a tomb counts once its lock is open); its line reads "Piramide n van m · <tier>" (the journey's level) or "Graftombe · <tier>" for a tomb. When nothing is left to start the card shows only Alle reizen and "Alles staat open op je kaart". Alternative: the first open journey in list order across tiers.
- Phase 6 — **The hint row** counts finished journeys that still hold something reachable (the Travel page's `hasReachableUnexplored` rule) — "2 oude reizen hebben iets nieuws te ontdekken" — and opens Alle reizen; hidden at zero.
- Phase 6 — **A first-run hand points at Op pad** (a new tap hint, `setOff`), once, after Fez's welcome. The Travel page's own hints stay in the interim panel.
- Phase 6 — **The completion overlay keeps its announcements** ("Nieuwe expeditie ontgrendeld: …", the tomb line) **but loses its start buttons;** its one button reads "Terug naar het kamp". `onStartJourney` is removed from the overlay, `PyramidExpedition` and `App`. Alternative: drop the announcements too.
- Phase 6 — **Settings** opens from the gear in the HUD; in developer mode the panel also holds the playtesting tools that were on Travel (grants and jumps, jump to the shop tomb, save transfer, lock editor, puzzle lab). Developer mode keeps its 7 taps, on the HUD title "Kamp". `BaseHeader` goes. Alternative: a separate dev panel.
- Phase 6 — **The story log is a Collection section** (registered by the story mod at order 50, after Constructies); phase 7 made it the Verhalen tab. The mod screen registry (`screenRegistry.ts`) goes, since mosaic and story were its only users. Alternative: keep the registry for later mod screens.
- Phase 6 — **The `Page` atom goes** with the pager; Travel, Collection, the mosaic screen and the story log fill the popup or panel they are put in. Alternative: keep `Page` with a non-snapping variant.
- Phase 6 — **Home with the camp mod off is the bare camp:** the fixed chest, window, campfire and oasis on the horizon of the current chapter, the same HUD, card and entrances (no map table). No core stand-in for the camp's state. Alternative: fall back to the old Travel page.
- Phase 6 — The mosaic reminder runs when the home shows, through a home-hook seam the mosaic mod registers (`registerHomeHook`), not when the window opens. Alternative: remind only on opening the window.
- Phase 6 — Fez's welcome waits until coming home is done: on a return the coming-home screen comes first, the welcome after Uitpakken or "Naar het kamp". Alternative: the welcome over the coming-home screen.
- Phase 6 — A haul whose reward types no mod draws and core cannot name stays in the save until a drawable haul is unpacked; then Uitpakken clears all of it. Alternative: clear only the types the screen showed.
- Phase 6 — The held-keys seam reports whether it has loaded, so the chapter record waits for the keys before deciding the current chapter (a save read before its keys would announce or record the wrong tier). Alternative: take the chapter from the keys as they stand.

#### Phase 6 gate

- No bake: `git diff --stat 04c39df8..HEAD -- src/data/ src/worldGen/` is empty; `generatedWorld.ts` is byte-identical to the phase start.
- Toggle-off, camp: with `campMod` (and its import) out of `REGISTERED_MODS`, `yarn check-types` and `yarn build` pass. `yarn test src/app` against the shipped bake fails 40 files with "unregistered reward type(s): campFind, campPart" (the bake still places camp loot), so the look ran on a temporary camp-off `yarn generate-world`; with it `yarn test src/app` passes (144 files, 1659 tests). The home is the bare camp: chest, window, fire and oasis on the starter horizon, no map table, the HUD and the card; Op pad sets off, the back button lands on the coming-home screen (fire, rest panel, "Naar het kamp"), the chest opens the Verzameling with no Constructies, the window opens the mosaic. Screenshots `.playwright-mcp/p6-gate-campoff-390-*.png`. Restored (`registeredMods.ts`, `generatedWorld.ts`, `carveLedger.json`); the tree was clean.
- Toggle-off, the others: with `mosaicMod`, `storyMod`, `trapMod` or `shopMod` out (one at a time, with its import), `yarn check-types` and `yarn build` pass; restored each time, tree clean. What drops, from each mod's registrations: mosaic — the window's entrance and label (the window stands as decor), its haul line and the home reminder hook; story — the story log section of the Verzameling; trap — the HUD hearts, the rest panel on the coming-home screen, the heal on homecoming and its (empty) haul lines; shop — the HUD coins, the coin and sellable haul lines and its Verzameling section. (Not run with a re-bake, so the baked rewards of a mod that is off would still fail the placed-reward check at runtime, as for camp above.)
- Gate: `yarn verify` (575 files, 6661 tests; betterer only re-keyed the `§` entries of `src/mods/tombTreasure/app/index.ts` and `src/mods/trap/app/index.ts`, whose lines moved), `yarn verify-content` (44 files, 753 tests) and `yarn build` pass. After the fix below: mosaic specs, `yarn check-types`, `yarn lint` and `yarn build` pass again.
- Found during the look, fixed (aee69450): on desktop the mosaic popup collapsed to a strip about 80 px high, since the camp popup sizes to its content from `lg` and the mosaic window takes its parent's height. The window now claims the viewport's height from `lg`.

### Phase 7 — Alle reizen and the Verzameling

- Phase 7 — **Rows within a tier keep the authored order;** only the tiers run newest first. The sketch shows the in-progress journey above an earlier finished one. Alternative: newest first inside a tier as well, or the current journey always on top.
- Phase 7 — **A pyramid journey the player cannot pick yet is not listed** (as Travel), but it counts in the header's "n van m klaar", so the header says how much of the tier is left. Alternative: list it as a locked row "Eerst <vorige reis>".
- Phase 7 — **The next locked tier shows as a header with one locked line,** shown only once its treasure is held and something else (an animal) still keeps it shut: "Vind deze schat" with the first-floor treasure of the tomb before it as one symbol; tiers beyond it are not shown. Before the treasure is held the next tier is not teased. A tier whose key is held but which this release does not ship is no locked group (it keeps Travel's "onderweg" note). Alternative: show every locked tier, or none.
- Phase 7 — **A locked tomb keeps its name hidden,** as the locked card did: it reads as the mod's lock title ("Schatlokatie") with the journey's `mapHint`, and its need line "Kaartdelen: 2 van 3". The sketch names it ("Edelman's Verborgen Kluis", "Nog 1 kaartstuk nodig"). Alternative: name it, as the sketch does.
- Phase 7 — **Revisiting:** tapping a finished journey's row goes straight back in at its last site (what tapping Travel's map card did); a separate chevron on the row opens its sites as numbered stops — a dot on a stop that holds something new, a buried stop shut — and tapping a stop goes in there. A journey in progress gets the same chevron for the sites already behind the player. Alternative: tapping a finished row opens the stops, two taps to go in.
- Phase 7 — **Mods' journey-card slots** (the tableau's fragment preview, the sand's "nog n% bedolven") show under every open row, whether or not it has stops to open (the plan put them inside the opened stops; the phase review moved them, since a one-site journey has no chevron). An empty slot list, or slots that all render nothing, leave no space. Alternative: only inside the opened stops, or drop the card-slot registry.
- Phase 7 — **Starting or re-entering another journey while one is under way asks first** with Travel's confirmation ("Onderbreek expeditie"), except when the one under way is a tomb, which is left without asking, as Travel did. Alternative: always ask, or never.
- Phase 7 — **A finished tier is collapsed** (its header a button with a chevron, the dot when something inside is new) unless it is the newest open tier; the player's opening and closing of a tier is not saved. Alternative: remember it per device in browser storage.
- Phase 7 — **Row lines** (drafts where the sketch has none): in progress "Bezig · piramide n van m" / "Bezig · in de graftombe", finished with news "Voltooid · iets nieuws te ontdekken" plus the dot, finished without a check mark, not started "Nog niet geweest", started and left "Eerder begonnen · piramide n van m" / "Eerder begonnen · in de graftombe". The mark a mod gives a journey (the map piece 📜) stays at the row's end. Alternative: the sketch's specific "1 verborgen deur open", which needs per-mod wording.
- Phase 7 — **A tomb cancelled on its first floor still reads "Nog niet geweest":** the row has no progress signal for it (its level is still 1). Alternative: a stored "visited" flag per journey.
- Phase 7 — **The dot means what Travel's ring meant:** a finished journey with a reachable unexplored site, or, with the corridor detector at level 4, an unexplored hidden corridor. Alternative: only the first.
- Phase 7 — **Desktop shows the same list, compact** (name, short note, dot; no icon tile), as `DesktopKamp.dc.html`. Alternative: the phone rows in the panel.
- Phase 7 — **Travel's tap hints go** (`travelMap`, `firstJourney`): the hand on **Op pad** (phase 6) is the only first-run hint. Alternative: point at the first row when Alle reizen opens for the first time.
- Phase 7 — **The Verzameling's tabs follow the registry order** (Schatten, Hiërogliefen, Snuisterijen, Constructies, Verhalen), not the sketch's Hiërogliefen-first. A tab shows once its section holds something; with none the popup says "Je kist is nog leeg". It opens on the first tab with something new, else the first. Alternative: the sketch's order, or every tab always.
- Phase 7 — **NIEUW marks** a treasure held, a hieroglyph completed, a sellable owned, a structure part found and a story scene heard, for as long as the player has not left that tab; leaving the tab or closing the Verzameling marks everything that tab showed. A partly found hieroglyph is not new until it is whole. Alternative: mark each item seen when it is tapped.
- Phase 7 — **The camp tab badges per structure while it counts parts:** a closed Constructies row carries one NIEUW for its structure, but the tab's "· n nieuw" and the chest's badge count the new parts in it. Alternative: count structures with something new.
- Phase 7 — **The seen save starts silently:** a section with no record is seeded with everything it holds the first time its own save has been read, so a save from before this phase shows no NIEUW, and a fresh game shows NIEUW from the first find. Alternative: mark everything already held as new once.
- Phase 7 — **Only seeding opens a section in the seen save:** marking items seen in a section without a record does nothing (the plan had it create the record). A mark before the seed would otherwise open the section with only those ids and flood everything else it holds as NIEUW. A mark lost that way is harmless: the seed then takes everything as seen. Alternative: the plan's "create the record when missing".
- Phase 7 — **The chest's badge is the number of new items** over all tabs, hidden at zero (`Main.dc.html`). The window gets no badge (the sketch has none). Alternative: the window shows the number of pieces still to set in.
- Phase 7 — **A section's own heading goes inside its tab** where it only repeats the tab (Constructies, the story log); the tomb treasures and hieroglyphs keep their per-difficulty and per-category headings. Alternative: keep every heading.
- Phase 7 — **The Verzameling has no chest picture at its top;** the popup's title row is the plain one every camp popup has. Alternative: the sketch's banner with the open chest.
- Phase 7 — **On a phone a camp popup is an inset panel** over the dimmed camp (16 px at the sides, below the HUD, rounded), as all three sketches draw it; on desktop it stays the centred panel. Alternative: keep phase 6's full-screen popup.
- Phase 7 — **The mosaic keeps placing by hand:** the window still waits for the player's "zet n stukjes" tap and outlines what just fell in; no count line or bar below it (the camp label "Mozaïek n/252" counts). Alternative: set the pieces in by themselves when the window opens.

#### Phase 7 gate

- No bake: `git diff --stat 7190a4ac..HEAD -- src/data/ src/worldGen/` is empty.
- Toggle-off: each of `puzzleMod`, `mosaicMod`, `hieroglyphMod`, `trapMod`, `campMod`, `shopMod`, `tombTreasureMod`, `storyMod`, `topologyMod` out of `REGISTERED_MODS` in turn (entry and import), `yarn check-types` and `yarn build` pass every time; restored with `git checkout src/mods/registeredMods.ts`, tree clean after. Not run with a re-bake, so the look stayed on all mods. What drops from Alle reizen, the Verzameling and the window, read from each mod's registrations:
  - tombTreasure: the Schatten tab; the tomb rows' lock, need line ("Kaartdelen: n van m") and map-piece mark, and the rule that hides an undiscovered tomb, so every tomb lists as an open row; the tier need's treasure symbols (the locked tier shows "Vind deze schat" alone).
  - hieroglyph: the Hiërogliefen tab and the tableau slot (the fragment preview) under a tomb row in progress.
  - shop: the Snuisterijen tab (and the HUD coins).
  - camp: the Constructies tab (and the camp pieces, the map table).
  - story: the Verhalen tab.
  - topology: buried stops and the sand slot (levers pulled) on a pyramid row.
  - mosaic: the window's entrance and label, so no count line or bar (the window stands as decor).
  - trap, puzzle: nothing on these screens (trap: the HUD hearts and the rest panel; puzzle: the puzzle families in the world).
- Gate: `yarn verify` (592 files, 6793 tests; betterer unchanged), `yarn verify-content` (44 files, 753 tests) and `yarn build` pass.
- Fixed before the gate (7224c17c): a journey row drew an empty details wrapper (12 px) when no card slot had anything to show; and the all-journeys spec's made-up slot leaked into the module registry for other specs.

### Phase 8 — story drafts

- Phase 8 — **One beat per moment.** A moment's candidates are ordered; the rail plays the first the save has not heard, never two. Precedence at home: first home together, rested after damage, first finished structure, first find, then the haul line. Alternative: queue every matching beat.
- Phase 8 — **"First arrival at the camp" is the first time Fez and the explorer are home together** (the first home showing after the meeting); the fresh-game `welcome` (the explorer alone, before Fez) stays as it is. Alternative: rewrite `welcome` as the camp's first arrival and drop `camp.firstHome`.
- Phase 8 — **Home beats play at the camp, after the coming-home screen is left,** in one moment (`homeShown`) that knows whether the player just unpacked and whether anything was in the haul. The conversation layer (`Fez.tsx`, `z-10`) sits under the coming-home and new-chapter screens (`z-40`); lifting it changes every in-site panel's layering. Alternative: lift the conversation layer above those two screens and speak at the fire.
- Phase 8 — **Coming home with and without a haul each play once ever** (the first homecoming with something in the haul, the first with nothing). Alternative: a small pool of lines rotating per homecoming.
- Phase 8 — **Resting at the fire after damage** is one beat, once: the trap mod remembers whether its last homecoming refilled a heart (one optional save field) and says so as a home tag. Alternative: a line per tier, or no save field and no beat.
- Phase 8 — **A new chapter** is one beat per tier (junior to wizard; starter is never announced), played when the new-chapter card is left — by "Later" at the camp, by "Op pad" on the way out, before the journey's arrival. Alternative: play it only on "Later".
- Phase 8 — **Finishing a structure** is one beat, for the first structure completed, played at the camp on the next home showing. Alternative: one beat per structure (26 scenes).
- Phase 8 — **The first camp find** plays at the camp on the next home showing, where the find stands, not when it is picked up. Alternative: at pickup, in the site.
- Phase 8 — **Tomb beats are per tomb** (`cave.` / `pillar.` / `cavern.<tombId>`), all nine tombs; `tombIntro` stays and plays first at the cave mouth. Alternative: one set per tier, or fold `tombIntro` into the cave beats.
- Phase 8 — **The tomb beats join the story log** under their tomb, in the order cave, pillar, cavern, then the tomb's ghost scene; camp and structure beats stay out of the log, which remembers places. Alternative: a "Het kamp" row in the log.
- Phase 8 — **`bond.starterTomb` waits for the tomb's last level.** `siteLeft` fires on every level's exit, so with the two-level tomb Ipi's afterword plays on leaving the cave, before Ipi. `siteLeft` now carries whether the level left was the journey's last, and the tomb afterwords fire only then. Alternative: leave it and list it under Failures.
- Phase 8 — **The animal lines are drafted but unwired,** parked in `fez.json` under `animal.*` and in `WAITING_BEATS` with the seam each waits on; they follow the phase-4 plan's purchase ids, shops and gates. Alternative: keep them in the script file only until phase 4.
- Phase 8 — **A gate line names the tomb whose stall sells the animal** (phase 4's decision 6); if phase 4 moves a purchase, the line moves with it. Alternative: a line that names no place ("bij een van mijn kraampjes").
- Phase 8 — **Drafts are marked in data, not on screen:** `DRAFT_BEATS` in the story mod and "draft" on every scene in the script file; the designer removes an id when the line is approved. Alternative: a "concept" tag on draft lines in develop mode.
- Phase 8 — **A develop-mode tool plays the drafts:** in settings, one button per area (tombs, camp, structures and finds, animals) plays that area's beats in order with `forceReplay`, so the designer reads each in its bubble, the unwired animal lines included. Alternative: no tool; read them in the review list.
- Phase 8 — **Home tags are owned by the mod that says them** (`trap.mended`, `camp.found`, `camp.structureDone`) and matched by the story mod as strings. Alternative: a core vocabulary of home facts.
- Phase 8 — **Only existing poses and faces;** a line that wants an undrawn one notes it on the script file's art list. Alternative: draw new poses first.
- Phase 8 — **A tier-up homecoming is two moments:** the chapter beat plays on leaving the new-chapter card, and the home beat then plays as a separate moment on that same home showing. Alternative: the card swallows the home beat, so a tier-up homecoming says one thing.
- Phase 8 — **`camp.rested` plays only on the homecoming showing** (the home showing right after the coming-home screen), not on a later open of the app while hearts were refilled. Alternative: on any home showing while the trap mod says the last homecoming refilled a heart.
- Phase 8 — **Drafts play unrecorded from settings:** the develop-mode buttons replay each beat without writing it into the heard save, so a preview never silences the real beat when its moment comes; a preview closes settings so its bubbles are seen. Alternative: record them as heard, as any forced replay does.
- Phase 8 — **The explorer speaks in most animal scenes;** the rule is "only where it helps", so the designer trims. Alternative: Fez alone in the animal scenes.

#### Phase 8 gate

- No bake: `git diff --stat a242a96d..HEAD -- src/data/ src/worldGen/` is empty.
- Toggle-off: each of `storyMod`, `trapMod`, `campMod` out of `REGISTERED_MODS` in turn (entry and import), `yarn check-types` and `yarn build` pass every time; restored with `git checkout src/mods/registeredMods.ts`, tree clean after. Not run with a re-bake. What drops, read from each mod's registrations: story — every new beat (tomb, camp, structure, find), the bond beats and the "Story drafts" buttons, core still reports arrivals, exits and home showings to no listener; trap — its `trap.mended` home tag, so `camp.rested` never plays; camp — its `camp.found` and `camp.structureDone` tags, so `camp.firstFind` and `camp.structureDone` never play. The home still shows in each case.
- Gate: `yarn verify` (600 files, 6857 tests; betterer only re-keyed the `§` entries of `src/mods/trap/app/index.ts` and `src/mods/trap/app/useTrapProgress.ts`, whose lines moved), `yarn verify-content` (44 files, 753 tests) and `yarn build` pass.
- Fixed before the gate: the cave beat was queued before `tombIntro` (the arrival was reported before the intro was offered), so `tombIntro` now plays first at the cave mouth (94d4b7bc); `bond.master` is out of the wired beats, and the wired and waiting lists derive from `DRAFT_BEATS` (76a085ef). Found during the look, fixed (8118119e): a "Story drafts" button played its bubbles under the settings dialog (`z-10` under `z-50`); a preview now closes settings.

### Phase 9 — wrap-up

- Phase 9 — the gate ran in a clean worktree (`git worktree add` at HEAD, `yarn install --immutable`). `yarn generate-world` left `generatedWorld.ts` byte-identical but re-keyed 20 refused master/wizard floors' hashes in `carveLedger.json` (every refusal unchanged): the hash reads every source file the carve imports, and phases 6–8 edited some. Committed (bd97d310); a second bake at that commit left `src/data` clean. `yarn verify` (600 files, 6859 tests; betterer unchanged), `yarn verify-content` (44 files, 753 tests) and `yarn build` pass.
- Phase 9 — `yarn loot-report` left `docs/loot-report.md` unchanged: no bake since phase 4 moved loot.

## 3. Drafts

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
- Phase 6 — strings not in the sketches (key, nl / en):
  - `common:camp.chapter.body`: "{{tier}}-reizen staan open. Kom op adem in het kamp en ga op pad als je er klaar voor bent." / "{{tier}} journeys are open. Catch your breath at camp and set off when you are ready."
  - `common:camp.chapter.journeyNote`: "Eerste {{tier}}-reis" / "First {{tier}} journey"
  - `common:camp.chapter.later`: "Later" / "Later"
  - `common:camp.comingHome.new`: "NIEUW" / "NEW"
  - `common:camp.comingHome.toCamp` (button on an empty haul): "Naar het kamp" / "To the camp"
  - `common:camp.continue.empty` (card with nothing left to start): "Alles staat open op je kaart" / "Everything is open on your map"
  - `common:trap.rested` (rest panel): "Uitgerust bij het vuur — weer helemaal fit" / "Rested by the fire — fit again"
  - `common:ui.goBackToBase` (completion overlay's one button): "Terug naar het kamp" / "Back to camp"
  - Haul lines: `common:shop.haul.coins_one/_other` "+{{count}} munt" / "+{{count}} munten" (en "+{{count}} coin(s)"), `common:shop.haul.note` "Losse munten onderweg" / "Loose coins on the way"; `common:mosaic.haul.pieces_one/_other` "{{count}} mozaïekstukje(s)" / "{{count}} mosaic piece(s)", `common:mosaic.haul.note` "Naar het glas-in-loodraam" / "For the stained-glass window"; `camp:haul.new` "Nieuw in je kamp" / "New in your camp"; `camp:haul.parts_one/_other` "{{name}} · {{count}} onderdeel/onderdelen" / "{{name}} · {{count}} part(s)"; `common:home.haul.times` "×{{count}}" (core's default line).
- Phase 7 — strings not in the sketches (key, nl / en):
  - Row lines: `common:journeys.noteCurrentPyramid` "Bezig · piramide {{level}} van {{count}}" / "In progress · pyramid {{level}} of {{count}}"; `common:journeys.noteCurrentTomb` "Bezig · in de graftombe" / "In progress · in the tomb"; `common:journeys.noteFinished` "Voltooid" / "Finished"; `common:journeys.noteFinishedNews` "Voltooid · iets nieuws te ontdekken" / "Finished · something new to discover"; `common:journeys.noteOpen` "Nog niet geweest" / "Not visited yet"; `common:journeys.noteResumePyramid` "Eerder begonnen · piramide {{level}} van {{count}}" / "Started before · pyramid {{level}} of {{count}}"; `common:journeys.noteResumeTomb` "Eerder begonnen · in de graftombe" / "Started before · in the tomb".
  - Tiers: `common:journeys.tierNeed` "Vind deze schat" / "Find this treasure" (one symbol: the tomb's first-floor treasure); `common:journeys.tierProgress` "{{done}} van {{total}} klaar" / "{{done}} of {{total}} done"; `common:journeys.tierLockedName` "{{tier}}-reizen" / "{{tier}} journeys"; `common:journeys.toggleTier` (screen reader) "Toon of verberg de {{tier}}-reizen" / "Show or hide the {{tier}} journeys".
  - Row bits: `common:journeys.now` "NU" / "NOW"; `common:journeys.newDot` (screen reader) "Iets nieuws te ontdekken" / "Something new to discover"; `common:journeys.needProgress` "{{unit}}: {{found}} van {{required}}" / "{{unit}}: {{found}} of {{required}}".
  - Stops: `common:journeys.showStops` (screen reader) "Toon de plekken van {{name}}" / "Show the sites of {{name}}"; `common:journeys.stopPyramid` "Piramide" / "Pyramid"; `common:journeys.stopTomb` "Plek" / "Site".
  - Verzameling: `common:collection.empty` "Je kist is nog leeg" / "Your chest is still empty"; `common:collection.newLabel` "NIEUW" / "NEW"; `common:collection.tabNew_one/_other` "{{label}} · {{count}} nieuw" / "{{label}} · {{count}} new"; `common:collection.tabsLabel` (screen reader) "Wat je verzameld hebt" / "What you have collected"; tabs `common:collection.tabs.treasures` "Schatten" / "Treasures", `.hieroglyphs` "Hiërogliefen" / "Hieroglyphs", `.junk` "Snuisterijen" / "Trinkets", `.stories` "Verhalen" / "Stories" (Constructies keeps the camp's existing section title).
- Phase 8 — `cave.starter_treasure_tomb` — fires: Forgotten Merchant's Cache — entering the cave
  - Fez: "Een grot! Op de kaart stond een kelderdeur, en dit is een hele heuvel!" / "A cave! The map showed a cellar door, and this is a whole hill!"
  - Fez: "Slimme vent. Je voorraad in een heuvel verstoppen, daar komt geen dief op." / "Clever fellow. Hide your stock inside a hill — no thief would think of that."
  - Explorer: "Wij wel." / "We did."
  - Fez: "Wij zijn geen dieven. Wij zijn klanten. Héle late klanten." / "We're not thieves. We're customers. Very late customers."
- Phase 8 — `pillar.starter_treasure_tomb` — fires: Forgotten Merchant's Cache — reaching the pillar
  - Fez: "Al die hendels en deuren, voor één kelder!" / "All those levers and doors, for one cellar!"
  - Fez: "Dan ligt er wat goeds, hoor. Niemand doet zoveel moeite voor rommel." / "Then there's something good down there. Nobody goes to that much trouble over rubbish."
- Phase 8 — `cavern.starter_treasure_tomb` — fires: Forgotten Merchant's Cache — arriving at the cavern
  - Fez: "Kijk dan! Een piramide, onder de grond! Voor een handelaar!" / "Look at that! A pyramid, underground! For a merchant!"
  - Fez: "Die heeft óf heel goed verdiend, óf heel goed afgedongen." / "He either earned very well, or haggled very well."
- Phase 8 — `cave.junior_treasure_tomb` — fires: Noble's Hidden Vault — entering the cave
  - Fez: "Hier moet het zijn. Henut! Die van de elf deben lapis!" / "This must be it. Henut! Eleven deben of lapis, that one!"
  - Fez: "Wat denk je, mogen we een procentje houden als we het innen?" / "What do you reckon — do we get a cut if we collect?"
  - Explorer: "Je hebt nog niks geïnd." / "You haven't collected anything."
  - Fez: "Ik reken alvast." / "I like to work it out early."
- Phase 8 — `pillar.junior_treasure_tomb` — fires: Noble's Hidden Vault — reaching the pillar
  - Fez: "Pff. Die deuren waren heel wat lastiger dan bij Ipi." / "Phew. Those doors were a lot fussier than Ipi's."
  - Fez: "Tja. Mevrouw had natuurlijk geld." / "Well. Madam had money, of course."
- Phase 8 — `cavern.junior_treasure_tomb` — fires: Noble's Hidden Vault — arriving at the cavern
  - Fez: "Kijk die punt eens glimmen in de zon! Echt goud, wedden?" / "Look at the tip shining in the sun! Real gold, I bet."
  - Explorer: "In een gat in de grond. Voor wie glimt dat dan?" / "Down a hole in the ground. Who's it shining for?"
  - Fez: "Voor haar. Zo'n type is het, dat zie je zo." / "Her. You can tell the type."
- Phase 8 — `cave.expert_treasure_tomb` — fires: High Priest's Treasury — entering the cave
  - Fez: "Dus hier zit die priester van Henut. Onuitstaanbaar, zei ze." / "So this is where Henut's priest is. Insufferable, she said."
  - Fez: "Wat denk jij, moeten we iets meenemen? Bloemen?" / "What do you think, should we bring something? Flowers?"
  - Explorer: "Hij is dood." / "He's dead."
  - Fez: "Juist daarom. Je wilt toch een goeie eerste indruk maken." / "All the more reason. You want to make a good first impression."
- Phase 8 — `pillar.expert_treasure_tomb` — fires: High Priest's Treasury — reaching the pillar
  - Fez: "Hè hè, eindelijk! Die grot wilde ons er echt niet in hebben." / "Phew, at last! That cave really did not want us in."
  - Explorer: "Dat was ook de bedoeling, denk ik." / "I think that was the idea."
- Phase 8 — `cavern.expert_treasure_tomb` — fires: High Priest's Treasury — arriving at the cavern
  - Fez: "Hm. Mag je eigenlijk iets verkopen wat al van een god is?" / "Hm. Are you actually allowed to sell something that already belongs to a god?"
  - Explorer: "Vraag het de god." / "Ask the god."
  - Fez: "Liever niet." / "I'd rather not."
- Phase 8 — `cave.expert_treasure_tomb_b` — fires: Inner Sanctum — entering the cave
  - Fez: "Hier mocht alleen de hogepriester naar binnen. En nu wij!" / "Only the high priest was allowed in here. And now us!"
  - Explorer: "Mogen wij dat?" / "Are we allowed?"
  - Fez: "Er staat niemand bij de deur om nee te zeggen." / "There's nobody on the door to say no."
- Phase 8 — `pillar.expert_treasure_tomb_b` — fires: Inner Sanctum — reaching the pillar
  - Fez: "Psst… Waarom fluister ik eigenlijk?" / "Psst… why am I whispering?"
  - Explorer: "Geen idee. Ik doe het ook." / "No idea. I'm doing it too."
- Phase 8 — `cavern.expert_treasure_tomb_b` — fires: Inner Sanctum — arriving at the cavern
  - Fez: "Zou die priester weten dat we hier rondlopen?" / "Do you think that priest knows we're wandering about in here?"
  - Explorer: "Hij houdt niks bij. Dat zou onprofessioneel zijn." / "He doesn't keep count. It would be unprofessional."
- Phase 8 — `cave.master_treasure_tomb` — fires: Pharaoh's Secret Hoard — entering the cave
  - Fez: "Kijk, hier houdt de kaart gewoon op. Zand, en dan niks meer." / "Look, the map just stops here. Sand, and then nothing."
  - Explorer: "Dan zitten we goed." / "Then we're in the right place."
  - Fez: "Dat bedoel ik nou. Daar word ik juist zenuwachtig van." / "That's what I mean. That's exactly what makes me nervous."
- Phase 8 — `pillar.master_treasure_tomb` — fires: Pharaoh's Secret Hoard — reaching the pillar
  - Fez: "Pfoe. Mijn staart trilt nog van die laatste deur." / "Whew. My tail's still shaking from that last door."
  - Fez: "Een koning die z'n spullen zó opbergt… die wil ze echt niet kwijt." / "A king who locks his things away like that… he really doesn't want to lose them."
- Phase 8 — `cavern.master_treasure_tomb` — fires: Pharaoh's Secret Hoard — arriving at the cavern
  - Fez: "Kijk hem staan, helemaal alleen in de zon. Mooi, hè?" / "Look at it, all alone in the sun. Lovely, isn't it?"
  - Fez: "Zullen we gewoon een tekening maken en weer gaan?" / "Shall we just do a drawing and go?"
  - Explorer: "Je kunt niet tekenen." / "You can't draw."
  - Fez: "…Nee. Naar binnen dan maar." / "…No. In we go, then."
- Phase 8 — `cave.master_treasure_tomb_b` — fires: Hall of Osiris — entering the cave
  - Fez: "De hal van Osiris! Groen, natuurlijk. Omdat hij elk jaar terugkomt, net als het graan." / "The hall of Osiris! Green, of course. Because he comes back every year, like the grain."
  - Explorer: "Dat wist je altijd al." / "You always knew that."
  - Fez: "Altijd al." / "Always."
- Phase 8 — `pillar.master_treasure_tomb_b` — fires: Hall of Osiris — reaching the pillar
  - Fez: "Zie je wel. Zit je maar lang genoeg onder de grond, dan kom je vanzelf weer boven." / "See? Stay under the ground long enough, and up you come again."
  - Explorer: "Is dat ook van Osiris?" / "Is that Osiris as well?"
  - Fez: "Nee, die is van mij." / "No, that one's mine."
- Phase 8 — `cavern.master_treasure_tomb_b` — fires: Hall of Osiris — arriving at the cavern
  - Fez: "Wie daarin ligt, rekent erop dat hij terugkomt. Dat is hier de afspraak." / "Whoever's in there is counting on coming back. That's the deal round here."
  - Explorer: "Hoe lang wacht hij al?" / "How long has he been waiting?"
  - Fez: "Lang. Maar dat hoort bij het vak, hè. Dood zijn is vooral wachten." / "A long time. Comes with the job, though. Being dead is mostly waiting."
- Phase 8 — `cave.wizard_treasure_tomb` — fires: Vault of the Gods — entering the cave
  - Fez: "De voorraadkamer van de goden! Wat sla je op als je al alles hebt?" / "The gods' own storeroom! What do you keep when you already have everything?"
  - Explorer: "Wat mensen je brengen." / "Whatever people bring you."
  - Fez: "…Ja. Dat zal het zijn." / "…Yes. That'll be it."
- Phase 8 — `pillar.wizard_treasure_tomb` — fires: Vault of the Gods — reaching the pillar
  - Fez: "Zulke deuren… daar waren we vroeger gewoon voor omgedraaid." / "Doors like those… once, we'd have just turned round."
  - Explorer: "Nu niet meer." / "Not any more."
- Phase 8 — `cavern.wizard_treasure_tomb` — fires: Vault of the Gods — arriving at the cavern
  - Explorer: "Wauw." / "Wow."
  - Fez: "Ja." / "Yes."
  - Fez: "Soms valt er gewoon niks meer bij te zeggen, hè." / "Sometimes there's just nothing left to say, is there."
- Phase 8 — `cave.wizard_treasure_tomb_b` — fires: Realm of Cosmic Forces — entering the cave
  - Fez: "Rijk der Kosmische Krachten. Zo, zo." / "Realm of Cosmic Forces. Well, well."
  - Fez: "Als ik iets moest verkopen dat niks voorstelde, zou ik het ook zo noemen." / "If I had something to sell that was nothing much, that's what I'd call it too."
- Phase 8 — `pillar.wizard_treasure_tomb_b` — fires: Realm of Cosmic Forces — reaching the pillar
  - Fez: "Drie verdiepingen grot, en dán pas de voordeur." / "Three floors of cave, and only then the front door."
  - Explorer: "Dan is het vast de moeite waard." / "Must be worth it, then."
  - Fez: "Dat zeggen ze altijd. En dan is het een kruik." / "That's what they always say. And then it's a jar."
- Phase 8 — `cavern.wizard_treasure_tomb_b` — fires: Realm of Cosmic Forces — arriving at the cavern
  - Fez: "Zie je die vlek zon op de piramide? Daar kun je zo de tijd op aflezen." / "See that patch of sun on the pyramid? You could tell the time by it."
  - Explorer: "Hoe laat is het dan?" / "What time is it, then?"
  - Fez: "…Middag. Zo ongeveer. Ik ben geen klok, hè." / "…Afternoon. Roughly. I'm not a clock."
- Phase 8 — `cave.wizard_treasure_tomb_c` — fires: Throne of Eternity — entering the cave
  - Fez: "Ik heb ineens het gevoel dat ik iets fout heb gedaan." / "I've suddenly got this feeling I've done something wrong."
  - Explorer: "Wat dan?" / "Like what?"
  - Fez: "Weet ik niet. Dat is nou juist het ergste." / "No idea. That's the worst part."
- Phase 8 — `pillar.wizard_treasure_tomb_c` — fires: Throne of Eternity — reaching the pillar
  - Fez: "Laatste stuk donker. Dat voel ik gewoon." / "Last stretch of dark. I can feel it."
  - Explorer: "Dat zei je bij de vorige ook." / "You said that at the last one."
  - Fez: "En toen had ik bijna gelijk." / "And I was nearly right."
- Phase 8 — `cavern.wizard_treasure_tomb_c` — fires: Throne of Eternity — arriving at the cavern
  - Fez: "Daar is hij. Alle lijnen op die kaart komen hier uit." / "There it is. Every line on that map ends up here."
  - Explorer: "Dan is dit het eind." / "Then this is the end."
  - Fez: "Van de kaart, ja. Raar. Ik dacht dat dat beter zou voelen." / "Of the map, yes. Funny. I thought that would feel better."
- Phase 8 — `camp.firstHome` — fires: the camp — the first time it shows after Fez has been met
  - Fez: "Is dít je kamp? Een vuurtje en een kist?" / "This is your camp? A fire and a chest?"
  - Explorer: "Ons kamp." / "Our camp."
  - Fez: "Ons. Goed. Dan wil ik wel het plekje vlak bij het vuur." / "Ours. Right. Then I'm having the spot by the fire."
  - Fez: "Ik ben nou eenmaal een hagedis. Als het mij uitkomt." / "I am a lizard, after all. When it suits me."
- Phase 8 — `camp.homeHaul` — fires: the camp — the first home showing after unpacking a haul with something in it
  - Fez: "Uitpakken! Het mooiste stuk van de hele reis." / "Unpacking! Best bit of the whole trip."
  - Explorer: "Mooier dan de piramide?" / "Better than the pyramid?"
  - Fez: "Die piramide is niet van ons. Dit wel." / "The pyramid isn't ours. This is."
- Phase 8 — `camp.homeEmpty` — fires: the camp — the first home showing after coming home with nothing
  - Explorer: "Lege handen." / "Empty-handed."
  - Fez: "Nou en? We hebben gelopen. Dat telt ook." / "So? We walked. That counts too."
  - Explorer: "Waarvoor?" / "Towards what?"
  - Fez: "Voor mijn benen. Die zijn heel kort, hè." / "My legs. They're very short, you know."
- Phase 8 — `camp.rested` — fires: the camp — the first time a homecoming refilled a heart
  - Fez: "Zo. Gaat het weer een beetje?" / "There. Feeling a bit better?"
  - Explorer: "Het was maar een schrammetje." / "It was only a scratch."
  - Fez: "Ik heb niet eens gekeken. En toch moest ik even zitten." / "I didn't even look. And I still had to sit down."
- Phase 8 — `camp.chapterJunior` — fires: leaving the junior new-chapter card
  - Fez: "Nou, dat hebben we mooi gedaan. Volgende!" / "Well, that went nicely. Next!"
  - Explorer: "Zo makkelijk ging het niet." / "It wasn't that easy."
  - Fez: "Achteraf wel. Achteraf gaat alles makkelijk." / "It is now. Everything's easy afterwards."
- Phase 8 — `camp.chapterExpert` — fires: leaving the expert new-chapter card
  - Fez: "Daar verderop zitten valstrikken. Echte, die bijten." / "Out there they've got traps. Real ones. They bite."
  - Fez: "Raak je gewond? Dan lopen we gewoon terug. Thuis knap je wel weer op." / "Get hurt? Then we just walk back. You'll mend at home."
  - Explorer: "En jij dan?" / "What about you?"
  - Fez: "Ik loop achter je. Daar is het veiliger." / "I'll walk behind you. It's safer there."
- Phase 8 — `camp.chapterMaster` — fires: leaving the master new-chapter card
  - Fez: "Vier piramides, daarginds. Weet je nog, toen er maar één stond?" / "Four pyramids out there. Remember when there was just the one?"
  - Explorer: "Zo lang is dat niet geleden." / "That wasn't so long ago."
  - Fez: "Nee. Toch voelt het zo." / "No. Feels it, though."
- Phase 8 — `camp.chapterWizard` — fires: leaving the wizard new-chapter card
  - Fez: "Moet je die laatste zien. Met een gouden punt!" / "Look at the last one. Golden tip and all!"
  - Fez: "Die gaat ons wat kosten. De laatste kost altijd het meest." / "That one'll cost us. The last one always does."
  - Explorer: "Wat dan?" / "Cost us what?"
  - Fez: "…Weet ik eigenlijk niet meer." / "…I'm not sure any more."
- Phase 8 — `camp.firstFind` — fires: the camp — the first home showing after the first camp find was brought home
  - Fez: "Kijk eens, het staat er alsof het er altijd al stond!" / "Look at that — like it's always been there!"
  - Fez: "Ik krijg zin om er een prijskaartje aan te hangen." / "I've got this itch to hang a price tag on it."
  - Explorer: "Niet doen." / "Don't."
  - Fez: "Nee, nee. Thuis verkoop je niks. Dat weet ik heus." / "No, no. You don't sell from home. I know that."
- Phase 8 — `camp.structureDone` — fires: the camp — the first home showing after the first structure has all its parts
  - Fez: "Het is af! Alle stukjes zitten erin!" / "It's done! Every last bit's in!"
  - Explorer: "Zelf gebouwd." / "All our own work."
  - Fez: "Nou ja. Ik heb vooral gewezen." / "Well. I mostly pointed."
- Phase 8 — `animal.forSale` — drafted, waits on phase 4 — would fire: Fez's stall — the first time it shows a purchase (the donkey, in Henut's vault)
  - Fez: "Kijk eens wat ik in de kraam heb! Vanaf nu verkoop ik ook vervoer." / "Look what's at the stall! I do transport now."
  - Explorer: "Het staat te kauwen." / "It's chewing."
  - Fez: "Dat zit bij de prijs in." / "That's included in the price."
- Phase 8 — `animal.boughtDonkey` — drafted, waits on phase 4 — would fire: Fez's stall in Henut's vault — the donkey is bought
  - Fez: "Verkocht! Eén ezel. Koppig, maar hij draagt alles." / "Sold! One donkey. Stubborn, but he'll carry anything."
  - Explorer: "Waar is hij dan?" / "So where is he?"
  - Fez: "Al op weg naar huis. Hij loopt liever zonder ons." / "Already on his way home. He'd rather walk without us."
- Phase 8 — `animal.blockedDonkey` — drafted, waits on phase 4 — would fire: Alle reizen — the expert tier refuses for want of the donkey
  - Fez: "Zo ver lopen wij niet, met al die spullen. Daar hoort een ezel bij." / "We're not walking that far with all this stuff. That takes a donkey."
  - Fez: "En wie heeft er eentje staan? Ik. In mijn kraam bij Henut." / "And guess who has one? Me. At my stall in Henut's vault."
- Phase 8 — `animal.throughDonkey` — drafted, waits on phase 4 — would fire: the expert tier opens because of the donkey (first expert journey entered)
  - Explorer: "Hij wil wel." / "He's willing."
  - Fez: "Vandaag. Morgen hebben we het er weer over." / "Today. Ask him again tomorrow."
- Phase 8 — `animal.arrivesDonkey` — drafted, waits on phase 4 — would fire: the camp — the donkey's steps arrive on the homecoming
  - Fez: "Daar staat hij! Hij was er eerder dan wij." / "There he is! Got here before us."
  - Explorer: "Het vuur heeft hij ook al gevonden." / "Found the fire, too."
  - Fez: "Mijn plekje. Nou ja. Hij was eerst." / "My spot. Well. He was first."
- Phase 8 — `animal.boughtCart` — drafted, waits on phase 4 — would fire: Fez's stall in the High Priest's Treasury — the cart is bought
  - Fez: "Een kar! Twee wielen, en ze rammelen bijna niet." / "A cart! Two wheels, and they hardly rattle."
  - Explorer: "Bijna?" / "Hardly?"
  - Fez: "Dat rammelen krijg je er gratis bij." / "The rattle comes free."
- Phase 8 — `animal.blockedCart` — drafted, waits on phase 4 — would fire: Alle reizen — the master tier refuses for want of the cart
  - Fez: "De ezel draagt geen tas meer. Ik heb het hem gevraagd." / "The donkey won't take another bag. I asked him."
  - Fez: "Een kar, dat hebben we nodig. Ik heb er een in mijn kraam, bij de hogepriester." / "A cart, that's what we need. There's one at my stall, at the high priest's."
- Phase 8 — `animal.throughCart` — drafted, waits on phase 4 — would fire: the master tier opens because of the cart (first master journey entered)
  - Explorer: "Hoor je dat?" / "Hear that?"
  - Fez: "Dat is de kar. Hij zingt een beetje." / "That's the cart. It sings a bit."
  - Explorer: "De hele weg?" / "All the way?"
- Phase 8 — `animal.arrivesCart` — drafted, waits on phase 4 — would fire: the camp — the cart arrives on the homecoming
  - Fez: "Een kar bij ons kamp! Nu zien we eruit alsof we ergens heen gaan." / "A cart at our camp! Now we look like we're going somewhere."
  - Explorer: "We gaan ook ergens heen." / "We are going somewhere."
  - Fez: "Ja, maar nu ziet iedereen het." / "Yes, but now everyone can tell."
- Phase 8 — `animal.boughtCamel` — drafted, waits on phase 4 — would fire: Fez's stall in the High Priest's Treasury — the camel is bought
  - Fez: "Een kameel! Die loopt dagen zonder water. Ik niet, hoor." / "A camel! Goes for days without water. I don't, mind you."
  - Explorer: "Hij kijkt naar je." / "He's looking at you."
  - Fez: "Op me neer. Kamelen kijken altijd op je neer." / "Down at me. Camels always look down at you."
- Phase 8 — `animal.blockedCamel` — drafted, waits on phase 4 — would fire: Alle reizen — the Inner Sanctum refuses for want of the camel
  - Fez: "Het Binnenste Heiligdom? Daar komen we te voet nooit." / "The Inner Sanctum? We'll never get there on foot."
  - Fez: "Toevallig heb ik een kameel. In mijn kraam, bij de hogepriester." / "As luck would have it, I have a camel. At my stall, at the high priest's."
- Phase 8 — `animal.throughCamel` — drafted, waits on phase 4 — would fire: the Inner Sanctum opens because of the camel (entered)
  - Fez: "Hij knielt! Voor mij!" / "He's kneeling! For me!"
  - Explorer: "Om op te stappen." / "So we can climb on."
  - Fez: "Laat me nou even." / "Let me have this."
- Phase 8 — `animal.arrivesCamel` — drafted, waits on phase 4 — would fire: the camp — the camel's steps arrive on the homecoming
  - Fez: "Daar staat hij. Hij doet alsof het kamp van hem is." / "There he is. Acting like the camp's his."
  - Explorer: "En de ezel?" / "And the donkey?"
  - Fez: "Die doet alsof hij hem niet ziet. Net als ik." / "Pretending not to see him. Same as me."
- Phase 8 — `animal.boughtSecondDonkey` — drafted, waits on phase 4 — would fire: Fez's stall in the Pharaoh's Secret Hoard — the second donkey is bought
  - Fez: "Nog een ezel! Dan heeft de eerste eindelijk iemand om mee te praten." / "Another donkey! Now the first one has someone to talk to."
  - Explorer: "Praten?" / "Talk?"
  - Fez: "Balken. Dat is praten, maar harder." / "Bray. It's talking, only louder."
- Phase 8 — `animal.blockedSecondDonkey` — drafted, waits on phase 4 — would fire: Alle reizen — the wizard tier refuses for want of the second donkey
  - Fez: "De ezel wil niet verder. Niet alleen, zegt hij." / "The donkey won't go on. Not alone, he says."
  - Explorer: "Zegt hij dat?" / "He said that?"
  - Fez: "Ik versta ezel. Hij wil een maatje, en bij de farao heb ik er een in de kraam." / "I speak donkey. He wants a pal, and I've got one at my stall in the pharaoh's hoard."
- Phase 8 — `animal.throughSecondDonkey` — drafted, waits on phase 4 — would fire: the wizard tier opens because of the second donkey (first wizard journey entered)
  - Fez: "Hoor ze! Ze balken om het hardst." / "Listen to them! Each one louder than the other."
  - Explorer: "Wie wint er?" / "Who's winning?"
  - Fez: "Wij niet. Wij moeten het aanhoren." / "Not us. We have to listen to it."
- Phase 8 — `animal.arrivesSecondDonkey` — drafted, waits on phase 4 — would fire: the camp — the second donkey arrives on the homecoming
  - Fez: "Kijk ze nou staan. Alsof ze elkaar al jaren kennen." / "Look at them. Like they've known each other for years."
  - Explorer: "Net als wij." / "Like us."
  - Fez: "Wij balken minder." / "We bray less."
- Phase 8 — `animal.boughtSecondCamel` — drafted, waits on phase 4 — would fire: Fez's stall in the Pharaoh's Secret Hoard — the second camel is bought
  - Fez: "Nog een kameel. Ja. Ik vind ze ook niet aardig." / "Another camel. Yes. I don't like them either."
  - Fez: "Maar deze kijkt tenminste vriendelijk." / "But this one at least looks friendly."
  - Explorer: "Hij kijkt naar je fez." / "He's looking at your fez."
- Phase 8 — `animal.blockedSecondCamel` — drafted, waits on phase 4 — would fire: Alle reizen — the Hall of Osiris refuses for want of the second camel
  - Fez: "De Hal van Osiris. Met één kameel komen we daar niet." / "The Hall of Osiris. One camel won't get us there."
  - Fez: "Gelukkig heb ik er nog een, bij de farao in de kraam. Mijn allerlaatste." / "Luckily I've got another, at my stall in the pharaoh's hoard. My very last one."
  - Explorer: "Dat zeg je altijd." / "You always say that."
- Phase 8 — `animal.throughSecondCamel` — drafted, waits on phase 4 — would fire: the Hall of Osiris opens because of the second camel (entered)
  - Fez: "Hij eet aan mijn fez!" / "He's eating my fez!"
  - Explorer: "Een vriendelijke kameel." / "A friendly camel."
  - Fez: "Té vriendelijk." / "Too friendly."
- Phase 8 — `animal.arrivesSecondCamel` — drafted, waits on phase 4 — would fire: the camp — the second camel arrives on the homecoming
  - Fez: "Twee kamelen. Nu kijken ze met z'n tweeën op me neer." / "Two camels. Now they both look down on me."
  - Explorer: "Ga dan bij de ezels staan." / "Go and stand with the donkeys, then."
  - Fez: "Daar sta ik al." / "I already am."
- Phase 8 — `animal.boughtSturdyCart` — drafted, waits on phase 4 — would fire: Fez's stall in the Vault of the Gods — the sturdier cart is bought
  - Fez: "Een stevigere kar. Deze zingt niet onderweg." / "A sturdier cart. This one doesn't sing on the road."
  - Explorer: "Er staan bloemen op geschilderd." / "There are flowers painted on it."
  - Fez: "Voor de stevigheid." / "For sturdiness."
- Phase 8 — `animal.blockedSturdyCart` — drafted, waits on phase 4 — would fire: Alle reizen — the Realm of Cosmic Forces refuses for want of the sturdier cart
  - Fez: "Daar komt die ouwe kar niet heel aan. Daar wil ik iets stevigers voor." / "The old cart won't get there in one piece. That wants something sturdier."
  - Fez: "Er staat er een in mijn kraam, in de Kluis van de Goden. Niet om de verf, hoor." / "There's one at my stall in the Vault of the Gods. Not for the paint, mind."
- Phase 8 — `animal.throughSturdyCart` — drafted, waits on phase 4 — would fire: the Realm of Cosmic Forces opens because of the sturdier cart (entered)
  - Explorer: "Geen gerammel." / "No rattle."
  - Fez: "Zie je wel? Stevigheid." / "See? Sturdiness."
  - Explorer: "En de bloemen?" / "And the flowers?"
  - Fez: "Die helpen ook een beetje." / "They help a bit too."
- Phase 8 — `animal.arrivesSturdyCart` — drafted, waits on phase 4 — would fire: the camp — the painted cart arrives on the homecoming
  - Fez: "Moet je zien hoe hij glimt!" / "Look at it shine!"
  - Explorer: "Mooier dan nodig." / "Prettier than it needs to be."
  - Fez: "Ja. Ik heb hem ook niet om de stevigheid verkocht." / "Yes. I didn't sell it for the sturdiness either."
- Phase 8 — `animal.boughtCaravanBanner` — drafted, waits on phase 4 — would fire: Fez's stall in the Throne of Eternity — the caravan banner is bought
  - Fez: "Een vaandel. Ik moet eerlijk zijn: hij opent niks." / "A banner. I'll be honest: it opens nothing."
  - Explorer: "Wat doet hij dan?" / "What does it do, then?"
  - Fez: "Wapperen. Heel mooi wapperen." / "It flaps. Beautifully."
- Phase 8 — `animal.arrivesCaravanBanner` — drafted, waits on phase 4 — would fire: the camp — the caravan banner arrives on the homecoming
  - Fez: "Kijk hem wapperen! Boven ons eigen kamp!" / "Look at it flap! Over our own camp!"
  - Explorer: "Hij opent nog steeds niks." / "Still opens nothing."
  - Fez: "Nee. Dat hoeft ook niet." / "No. It doesn't have to."

## 4. Failures

- Phase 4 — stopped after Tasks 1–2 (gates hold every mod's requirement; the gate walk; no loot on a shop's end, the failure below). Remaining blocker, pre-existing on main: loot placement walks floors laid out at the default seed and checks a slot's floor, while the bake ships pinned seeds. At the shipped layout the strict walk enters 22 of 29 journeys and none of the 7 wizard journeys (e.g. art6's last piece is in expert_treasure_tomb_b level 2's shop behind that floor's own tableau needing art6). A room-level placement check (commit 2911e017, reverted) reaches 29/29 at the placement layout but only 16/29 shipped. Decision needed: place loot on the pinned layout (pin every floor first), or make placement layout-independent and guard the stamped world. Phase 4 Tasks 3–8 (purchases, per-gate guard, gate needs, buying, arrival) wait on that.
- Phase 4 — 8 hieroglyph fragments (a2, art3, d9, art10, d5, d12, a10, d13) sat on the end of a tomb's shop section, which the shop room never shows, so their tomb tableaus could not be finished. Pre-existing on main. Fixed: such an end is no slot any more. That fix alone took the strict gate walk over the shipped world from 16 to 22 of 29 journeys.
- Phase 4 (layout-first) — Task 2 measurement (`yarn layout-report`, no bake): two starter tomb floors are **infeasible** under the new hard criterion "a lock holds a puzzle on its way", decided from the authoring with zero carves: `starter_treasure_tomb` level 2 floor 1 (lock `pitStair`) and floor 3 (lock `throwItBack`). Both are authored `lockBeforeFloorContent`, which makes every region but the lock's way out take nothing, so no puzzle can stand on its way. `bakedCarve.verify` names the same two on the committed world. Designer decision: place the lock after some of the floor's content, let a region on its way take puzzles, or exempt these locks. Task 6's bake refuses both until then. No floor is not-found. 20 floors carve only on the ladder (master_1–4 and wizard_1–4 main floors) and meet every hard criterion, so they are accepted. "On the way" is judged per region on the shortest solving walk: a puzzle in a dead-end branch of a region the walk crosses counts.
- Phase 7 — found while building the seen save, pre-existing: `useOfflineStorage` keeps the initial empty value when the IndexedDB read rejects, and the next write overwrites the store with it. This affects every save, not only the seen save. Not fixed in this phase.

## 5. Look at in browser

- Phase 1 — Hearts refill after leaving an expedition. Not reached unattended: every trap section in the world is hidden and sealed, so no trap was walkable from a fresh dev save. Steps: take damage in any trap (expert pyramid, e.g. Vallei der Koningen), tap ←: the coming-home screen's rest panel shows all hearts full.
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
- Phase 6 — Checked unattended (fresh save, `nl-NL`, 390×844 and 1440×900; `.playwright-mcp/p6-gate-<width>-*.png`): Fez's welcome first, then the hand on Op pad (`00welcome`, `01home`); the chest opens the Verzameling popup (`02collection`); Alle reizen is a popup from the card and from the map table on a phone (`03journeys`) and the side panel on desktop, where the map table has no label (`03journeys-panel`); the window opens the mosaic (`04mosaic`); Op pad starts Dageraad bij de Sfinx (`05journey`); its back button lands on the coming-home screen, empty haul: fire, rest panel, "Naar het kamp" (`06cominghome-empty`); the gear opens settings (`08settings`); seven title taps show DEV and the dev tools in settings (`09settings-dev`). Storybook: all 35 stories of CampScene, CampHud, ContinueCard, HaulRow, CampHomeLayout, CampPopup, ComingHomeScreen and NewChapterScreen render without errors (`p6-gate-sb-*.png`).
- Phase 6 — The haul screen was checked with a haul written into the home save (a jar find, a stone-ring part, a mosaic piece, 5 + 3 coins), not a real find: it lists "Kruik · Nieuw in je kamp · NIEUW", "Stenen kring · 1 onderdeel · NIEUW", "1 mozaïekstukje", "+8 munten" (`07cominghome-haul`); Uitpakken empties the stored haul, and after a reload the next trip comes home empty. Steps for the real thing: on a fresh save start Dageraad bij de Sfinx, solve the first puzzle on side path 1 of level 1 (the jar), take it, tap ←: the haul lists the jar with NIEUW.
- Phase 6 — The jar's haul icon is tiny (its camp layer art drawn at scene scale in a 40 px box). Look at whether finds need their own icon.
- Phase 6 — Alle reizen is the old Travel page until phase 7, banner "July 2026 redesign: …" and its "Plan Expeditie / Ga door met Expeditie" card included. — replaced by the flat list in phase 7.
- Phase 6 — On a phone Uitpakken sits under the haul, not pinned to the bottom of the screen as in the sketch.
- Phase 6 — Cinzel is not loaded; titles fall back to the browser's serif.
- Phase 6 — Settings' language dropdown reads "English" while the game speaks Dutch when the browser reports `nl-NL` (the dropdown knows only `en` and `nl`). Not new in this phase.
- Phase 6 — Not reached unattended: a real new chapter (steps: finish the starter tier's journeys until the junior key is held, go home; after the coming-home screen the new-chapter card shows "Eerste Junior-reis" with Op pad and Later, and only once); a camp find landing in the scene after Uitpakken (steps: take the jar as above, Uitpakken: the jar stands by its spot).
- Phase 7 — Checked unattended (`nl-NL`, own `yarn dev`, `.playwright-mcp/p7-gate-*.png`):
  - Phone 390×844, fresh save: Alle reizen from the card shows JUNIOR "0 van 4 klaar" with the locked "Junior-reizen" line, "Vind een van deze schatten" and four unlit symbols, then BEGINNER "0 van 4 klaar" with only "Dageraad bij de Sfinx · Nog niet geweest" (`390-journeys-fresh`). Tapping it sets off; ← lands on the coming-home screen; back home the row reads "Bezig · piramide 1 van 2 · NU" (`390-journeys-current`).
  - The chest on a fresh save says "Je kist is nog leeg" (`1440-collection-empty`). After the first trip it already reads 1: the opening story scene is a Verhalen item, so the first trip home brings "Verhalen · 1 nieuw" (`390-collection-empty` shows that state). Look at whether the opening scene should count as news.
  - Dev mode and "All treasures + keys": the new-chapter card first (`390-newchapter`), then the chest badge 40 (`390-home-badge`); the Verzameling opens on "Schatten · 40 nieuw" with 40 NIEUW slots (`390-collection-new`); to Verhalen and back: no NIEUW, the tab reads "Schatten"; closed: the badge is gone; after a reload still gone.
  - The window: "0 van 252 stukjes" and an empty bar (`390-mosaic`, `1440-mosaic` as a centred panel). Not reached with pieces: steps — find a mosaic piece (or seed `pyramid-scheme-mod-mosaic`), open the window: "n van 252 stukjes", "k nieuw", the bar filled.
  - Desktop 1440×900, starter journeys seeded as finished, Heilige Ibis Migratie at pyramid 2, "All hieroglyphs" + "All treasures + keys": chest badge 99; the compact list sits in the panel under Verder met (`1440-journeys`); BEGINNER "4 van 4 klaar" folded with its chevron, no dot (the seeded journeys hold nothing reachable); the Verzameling is the centred panel with "Schatten · 40 nieuw / Hiërogliefen · 59 nieuw" (`1440-collection`).
  - A tomb in progress (starter tomb seeded active, with "All map pieces"): its row reads "Bezig · in de graftombe · NU" with the tableau slot (two fragments, checked) under it; the rows above it carry no empty space (`390-tomb-slot`). A journey left at pyramid 2 reads "Eerder begonnen · piramide 2 van 3".
  - Storybook: the 48 stories of the 14 new or changed story files render without errors (`p7-gate-sb-*.png`).
- Phase 7 — In developer mode every journey is listed, master and wizard included (as Travel did), while the footer still says "Meester-expedities zijn onderweg". Not seen outside developer mode.
- Phase 7 — The opened stops of a journey in progress draw the site the player is on (2 of 3) dashed, like the sites ahead (`1440-journeys-full`). Look at whether it should read as reachable.
- Phase 7 — Not reached unattended:
  - A finished tier folded with the dot: finish every starter journey with something left behind (skip a side path), go home, open Alle reizen: BEGINNER is folded and its header carries the dot; open it: that row reads "Voltooid · iets nieuws te ontdekken" with the dot.
  - A stop with something new: open that row's chevron: the stop holding the unexplored site has its dot; a buried stop (sand) is shut.
  - A tomb lock at 2 of 3: find two of a tomb's three map pieces: its row is locked, named by the lock title with the map hint, "Kaartdelen: 2 van 3".
  - The confirmation with a pyramid under way: with a pyramid in progress, tap another open row: "Onderbreek expeditie" asks first; with a tomb in progress it goes without asking.
- Phase 8 — Checked unattended (`nl-NL`, 390×844, own `yarn dev`, `.playwright-mcp/p8-*.png`):
  - Develop mode, settings, each "Story drafts" button: settings close and the area plays in order — tombs 76 bubbles, camp 28, structures 7, animals 77 — none shows a key or "not-found", every settled bubble fits the screen (`p8-drafts-tombs-0`, a cave line; `p8-drafts-camp-0`, `camp.firstHome`; `p8-drafts-structures-0`, `camp.structureDone`; `p8-drafts-animals-0`, `animal.forSale`; `-1` is each area's third line).
  - Fresh save, Op pad, back out of Dageraad bij de Sfinx before the meeting: nothing on the coming-home screen, no camp beat at the camp (`p8-unmet-home`).
  - Fez met (starter_1 seeded at pyramid 2): the camp's first showing plays `camp.firstHome` and nothing more. That was the app opening on the camp, not a homecoming: the beat fires on the first home showing after the meeting, whichever it is.
  - The starter tomb seeded at level 1 (with "All map pieces"), Op pad: `tombIntro` (2 lines, `p8-tomb-intro`) then `cave.starter_treasure_tomb` (4 lines, `p8-tomb-cave-beat`). ← home: nothing on the coming-home screen, then `camp.homeEmpty` at the camp, and nothing more (`p8-tomb-home-beat`).
  - The starter tomb seeded at level 2, Op pad: `tombIntro`, then `cavern.starter_treasure_tomb` (`p8-cavern-intro`, `p8-cavern-beat`).
  - "Jump: Ipi's tomb" lands inside level 2's site map and plays one line of `tombIntro` and no cavern beat (`p8-ipi-after`): the jump skips the exterior, so it is no check of the cavern beat. Look at whether the jump should drop the arrival entirely.
- Phase 8 — Not reached unattended:
  - The pillar beat and Ipi's afterword: in the starter tomb's cave (level 1) walk to the exit pillar: `pillar.starter_treasure_tomb` plays; take it to the cavern: Ipi's afterword (`bond.starterTomb`) does not play on leaving the cave, only on leaving the cavern after Ipi.
  - A real homecoming as the first showing after the meeting: on a fresh save meet Fez on Dageraad bij de Sfinx's ground floor, tap ←, unpack: `camp.firstHome` at the camp, and nothing more on that showing.
  - Rested after damage: take damage in an expert trap, tap ←: hearts full on the coming-home screen, then `camp.rested` at the camp.
  - A chapter card's beat: finish the starter tier until the junior key is held, come home: after the coming-home screen the new-chapter card; Later plays `camp.chapterJunior`, then the home beat as its own moment.
  - The first find and the first finished structure: bring home the jar (Dageraad bij de Sfinx level 1, first puzzle on side path 1), unpack: `camp.firstFind` at the camp; finish the stone ring's two parts and come home: `camp.structureDone`.
