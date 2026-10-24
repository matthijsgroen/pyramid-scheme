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

## Drafts

- Phase 1 — Fez's `shopArrival2`, now without supplies. en: "Rare finds cost the most, but I'll pay you for any trinkets you're carrying." nl: "Zeldzame vondsten kosten het meest, maar ik betaal je voor snuisterijen die je meedraagt."
- Phase 1 — `chest.waterskinDescription`. en: "Cool water. You drink it on the spot and feel your wounds ease." nl: "Koel water. Je drinkt hem meteen leeg en voelt je wonden minder pijn doen."

## Failures

## Look at in browser

- Phase 1 — Hearts refill after leaving an expedition. Not reached unattended: every trap section in the world is hidden and sealed, so no trap was walkable from a fresh dev save. Steps: take damage in any trap (expert pyramid, e.g. Vallei der Koningen), tap "← Terug" to base, tap "Ga door met Expeditie": all hearts are full.
- Phase 1 — A waterskin while hurt heals one heart (two with pack-mule). Not reached unattended (needs a trap first). Steps: after taking trap damage, solve a puzzle that holds a waterskin (Vallei der Koningen floor 1, the first puzzle up the main corridor): one heart comes back.
- Phase 1 — The waterskin popup. Checked unattended: Vallei der Koningen floor 1, first puzzle (dev "Solve") shows "Je hebt gevonden — 💧 Waterzak" at full health; hearts stay 12/12. Walking back onto the solved room, and again after "← Terug" to base and "Ga door met Expeditie", offers nothing.
- Phase 1 — Fez's shop without supplies. Checked unattended: Edelman's Verborgen Kluis level 2, Fez's Kraam shows only "Zeldzame vondsten" (mosaic piece 500, Hathor fragment sold out); no Supplies section.
- Phase 1 — The trap warning without heal or disarm buttons.
- Phase 1 — The HUD without the supplies bar.
- Phase 1 — The detector toggles without the supplies detector.
