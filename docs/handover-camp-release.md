# Handover — the camp release: loot, camp home, journeys, collection, healing, story

The task queue for turning the camp into the game's home and its loot into camp things. It is built to run
**unattended**: one driver session works through the phases below, each task done by a fresh subagent, and the
designer reviews the result the next day. Read this file, then [`docs/instructions/agent-work.md`](instructions/agent-work.md)
and `AGENTS.md`, then start at the first phase whose box is unchecked.

## How the driver session works

- **Branch.** Work on `camp/home-and-loot` (worktree `prickly-gila`), branched from `origin/main` after PR #322
  (story, art direction, tomb caves and caverns) was merged. Never work on `main`. Commit after every task; push the branch
  after every phase (the designer allows it for this queue). Never merge a PR.
- **One phase at a time.** A phase starts with its **plan task**: a fresh planning subagent (Opus) writes
  `docs/superpowers/plans/2026-10-25-camp-<phase>.md` from this brief, the specs it names and the code as it is
  _then_, in the format of `docs/superpowers/plans/2026-10-22-tomb-redesign.md` (Goal, Architecture, Spec, Global
  Constraints, Review Focus, tasks with Files / Interfaces / checkbox Steps) and the rule in agent-work.md that a
  plan says what to build, which files, and what the tests prove, **without code**. Commit the plan, then run it.
- **One subagent per task** (superpowers:subagent-driven-development). Sonnet implements; Opus implements the tasks
  a plan marks _soundness_ (saves, world-gen placement, reachability, the economy guard). One review per phase at
  its end (Sonnet), plus a per-task review on soundness tasks. A reviewer's finding is fixed by a fresh subagent,
  then the next task starts.
- **Checks.** Each task runs its own specs, `yarn check-types` and `yarn lint`. A phase's last task runs, each
  under `timeout 900`: the bake (`yarn generate-world`) when the phase touches world-gen, `yarn verify`,
  `yarn verify-content`, `yarn build`. A phase is done only when all of them pass. When a process is quiet for
  long, check `ps` for a hung node/vitest.
- **When stuck.** Two failed attempts at the same task: stop that phase, write what failed into the review list
  (below), and continue with the next phase that does not depend on it. Never weaken a check, skip a test or
  edit a baked number by hand to get past a failure.
- **Decisions.** Where a brief leaves a choice open, take the default written here; where a new choice comes up,
  take the option that changes the least shipped behaviour, and write it into the review list with the
  alternative. Never stop to ask: the designer is not there.
- **The review list.** `docs/review-camp-release.md` (create it in the first task): one line per decision taken,
  per draft text to approve, per failure left behind, per thing to look at in the browser. This is what the
  designer reads first the next day.
- **Progress.** After each task, tick its box in the phase plan; after each phase, tick it below and add one line
  to "State" at the bottom of this file.

## Sources

- Design: [`docs/game-design/camp.md`](game-design/camp.md) (direction; its find model and slot conversion are
  replaced by the loot spec), [`docs/superpowers/specs/2026-10-23-camp-loot-design.md`](superpowers/specs/2026-10-23-camp-loot-design.md)
  (the loot model, decided), [`docs/superpowers/specs/2026-10-23-camp-scene-design.md`](superpowers/specs/2026-10-23-camp-scene-design.md)
  (the scene component; its "step count per spot" is superseded by the found-ids model in
  `src/ui/atoms/campScene/campTypes.ts`).
- Screens: [`docs/design/camp-sketches/`](design/camp-sketches/README.md), the approved sketches (camp, Alle reizen,
  coming home, new chapter, Verzameling, mosaic window, desktop camp, the 12 spots and their 74 finds).
- Built: `src/ui/atoms/CampScene.tsx` and `src/ui/atoms/campScene/*` (Storybook only, not mounted).
- Conventions: `AGENTS.md`, [`docs/mods/TARGET.md`](mods/TARGET.md) (mods toggle off; core never names a mod).
- Story voice: [`docs/game-design/story/IMPLEMENTATION.md`](game-design/story/IMPLEMENTATION.md) and the story
  review notes beside it.

## Decisions (taken; the designer reviews them)

Decided by the designer:

- **Saves reset** at the starter release; there is no migration for the shapes this queue changes (trap
  consumables, left-behind chests, pack-mule and detector perk ids). A save from before simply starts over.
- **Loot stays the size it is.** −185 consumables, +26 found items, +~78 structure parts, +~60 waterskins (expert
  and up). The animals add money **value**, not slots: sellables go up in number or price. Every chest and path
  end carries loot; a puzzle room may be empty. The share of puzzles with loot is reported per tier (measured on
  the current bake: starter 81%, junior 43%, expert 40%, master 27%, wizard 17%).
- **Loot first, then screens.** The screens follow the sketches.
- **After a journey the player always returns to the camp**, with the coming-home overview. Nothing chains into
  the next journey.
- **Story texts are drafted unattended** and marked as drafts; the designer reviews them the next day.

Defaults this queue takes (each goes into the review list):

1. **A new `camp` mod** owns camp items, structure parts, the camp's saved state and the camp screens' content.
   The step-to-tier data world-gen needs moves from `src/ui/atoms/campScene/campCatalogue.ts` into the mod's
   domain layer; the ui atom keeps taking everything as props.
2. **Waterskin** belongs to the trap mod (it owns health): picked up, it heals one heart at once if a heart
   is missing, and otherwise heals nothing. Either way it is used up: there is no inventory of supplies any more,
   and nothing is ever left behind in a chest. (Decided by the designer.)
3. **Healing** happens at the camp fire on every coming home: hearts refill to full. (Decided by the designer.) Core gets a "coming home" seam
   that mods register into; core never names trap or health.
4. **"Coming home"** fires whenever the player leaves the expedition screen back to base: at a journey's end
   (always) and when leaving mid-journey, so going home to recover is always possible. (Decided by the designer.) The overview lists what was found since the last homecoming; an empty
   haul shows only the fire and hearts.
5. **Perks that pointed at consumables** (decided by the designer): pack-mule (`starter_a_3`) becomes "a
   waterskin heals two hearts". The supplies detector levels 1–3 are removed; the three treasures that granted
   them stay as plain treasures in the collection, with no perk. Waterskins lie on expert-and-up only.
6. **Animal prices** are authored defaults that satisfy the per-ground guard with a margin, chosen by Claude and
   listed for review; the caravan banner opens nothing. Animals are bought from Fez in his tomb shops only and
   wait in the camp on coming home; there is no shop in the camp. (Decided by the designer.)
7. **Where things live once the pager is gone** (decided by the designer): settings behind a gear in the camp HUD (developer mode keeps
   its 7-tap entrance on the title), the story log as a tab in the Verzameling, the mosaic window opens the
   existing mosaic screen, the dev tools from Travel move to the settings panel.

## Phases

Each brief is the input for that phase's plan task. Order is fixed; a later phase may start only when the
earlier ones it names are done.

### Phase 1 — consumables out, healing at the camp [x]

Remove bandage, oil and trapTool as a currency everywhere: the trap descriptor's distributions and shop stock,
the DSL `consumableRates`, the reward contribution and its full-pack `canAccept`, the left-behind chest flow
(`disabledTraps`, `skippedConsumables`, `useRewardOffer`, `RewardFlow`'s `consumableFull`), the HUD bar, the
consumable emoji/display/schema, the shop's `CONSUMABLE_PRICES`, Fez's shop rows, the locale keys. Traps keep
dealing damage; inside a site only a waterskin heals. Add the core "coming home" seam (decision 3) and the trap mod's
registration that refills health. Add the waterskin currency (decision 2) as a trap-owned distribution on
expert-and-up puzzle slots, replacing the consumable fill there one for one where possible. Retarget pack-mule and
remove the supplies detector levels (decision 5). Rewrite the docs that describe consumables and health:
`docs/game-design/pyramid-interior-design.md` (health section), `docs/game-design/shop-mechanic.md`,
`docs/mods/collection-and-detector-design.md`. Soundness: the bake and the economy guard. Ends with a bake; the
loot overview below is run and its numbers recorded in the review list.

### Phase 2 — the loot overview [x]

`yarn loot-report`: from the baked world, per tier and per journey/level, every slot and what fills it (by
reward type), empty puzzle rooms, the share of puzzles with loot, chests filled, and totals per currency against
demand (fragments needed by tableaus, mosaic 252, map pieces, keys, camp finds, money needed before each gate once
phase 4 exists). A pure function over the baked configs with specs on a made-up world, and a world validator
that fails the bake when a chest or path end is empty. The report prints tables and writes `docs/loot-report.md` (committed, so every
bake shows what moved). The puzzle-loot share is reported only, never enforced. (Decided by the designer.) Small, but every later phase reads its output.

### Phase 3 — camp loot: found items and structure parts [x]

The `camp` mod (decision 1). Two currencies from the loot spec: **found items** (26) and **structure parts**
(26 structures; parts per structure SCALE WITH THE TIER, about 2–3 on starter and junior up to 4–6 on master and
wizard, so the higher tiers pay more often — a little more loot than today is accepted; every part has its own
name, drafted in nl and en by Claude and listed in the review list), placed by tier following each step's tier
in the catalogue, as a capped/dynamic distribution so they fill slots without
gating. Reward contributions that record a find; the camp's found state (`CampFound` per spot, any order); a
structure appears only when all its parts are in; self-growing steps follow on the next homecoming. The
Verzameling gets a **Constructies** tab (started structures only, "n van m", parts named or "???"). It must not
clutter: one row per structure with its art and "n van m"; its parts show only when the row is opened. A find
shows its own camp art (cut from the painted camp layers) with how far it is, as hieroglyph fragments do ("Put ·
3 van 5"). ART: every sellable (junk) and every part icon gets a prompt in `docs/instructions/repaint-queue.md`
so the designer can paint them; until painted, the current icon stays. (Decided by the designer.) The scene
reads the found state through props. Soundness: placement and the bake. Ends with a bake and the loot report.

### Phase 4 — animals as gates, the per-gate guard [x]

The animals are **obstacles**: without the right one the player cannot reach a higher tier or an optional
tomb. The seven purchases (loot spec, "Bought at Fez"):

| Purchase (Fez)         | Lands in the camp                 | Opens                                           |
| ---------------------- | --------------------------------- | ----------------------------------------------- |
| Junior: donkey         | halter, donkey, saddlebags        | the expert tier                                 |
| Expert: cart           | cart with blanket                 | the master tier                                 |
| Expert: camel          | rope, camel, saddle, water trough | the second expert tomb (Inner Sanctum)          |
| Master: second donkey  | second donkey                     | the wizard tier                                 |
| Master: second camel   | second camel, camel trough        | the second master tomb (Hall of Osiris)         |
| Wizard: sturdier cart  | the painted cart                  | the second wizard tomb (Realm of Cosmic Forces) |
| Wizard: caravan banner | the banner                        | nothing — just for fun                          |

A locked journey or tier shows what it needs (in Alle reizen: "Je hebt een ezel nodig"). The purchases are sold in Fez's tomb shops (the builder picks which shop, reachable before
its gate), each landing its camp steps and opening its gate **on top of** the existing gate (tier unlock
treasure, tomb `entryLock`). Core grows a registry so several mods can each add a requirement to the same gate
(today `journeyEntryLock` returns one lock and `tierUnlockBucket` is an OR; mods may not import each other). The
economy guard becomes **per gate**: all income reachable before a gate ≥ the price of everything buyable before
it, the animal included. (Built per ground instead: a per-gate check is unsound, see the review list, §2 Phase 4.) Shop mod off: the animal gates fall away. Starter → junior needs no animal. Soundness:
reachability and the guard. Ends with a bake.

### Phase 5 — the economy recomputed [x]

Sinks = the 13 rare items + the 7 purchases. Income ≈ 1.1 × sinks and passing the per-ground guard, split over
sellables and loose coins; sellables go up: the same 25 kinds, more of them and dearer (decided by the designer; `src/data/sellables.ts`) so the animals are
affordable. The total number of drops stays about what it is (the loot report shows it). Sold items stay
visible in the collection. Ends with a bake, the loot report in the review list, and the tier fingerprints
updated deliberately (the world is unreleased; starter moves only if this phase must touch it, and the review
list says why).

### Phase 4b — locks as side-path blueprints [x]

A lock is a generic blueprint of rooms and corridors; its corridors may be filled as a side path, so between
two areas of a lock lie a side path's puzzles and chests with the lock's obstacles in between. Open and trapped
side paths go into a lock's corridors; gated and hidden ones keep hanging as branches (a key or a detector inside a
lock would make it not provably solvable). Its own plan; after phase 4, before the release; it re-carves every
lock floor and bakes through the layout-first guards. The layout-first plan leaves `it.todo("a corridor asking for
a side path that carries none is named")` ready for it.

### Phase 4c — the tunnel to the Sphinx [x]

The ending moves inside the Sphinx. Behind starter_1's ward gate (opened by the Vault of the Gods' key, sealed
and visible in the first hour as today) a staircase leads down into a cave floor at wizard difficulty; the player
puzzles through it and takes a staircase up into the Sphinx itself, where the same inscription stands, clear
of the sand that keeps covering it outside, and the reading plays. Build: a stair side path names the floor it
leads to (stairs already link by id at runtime; only `wireSideSectionStaircases` wires floor i to i+1 today),
the starter_1 authoring (floor 0's ward stair → cave floor → Sphinx floor), the Sphinx-placement spec rewritten,
the stair drawn going up out of the cave. Art: the Sphinx's inside (floor, wall face, the inscription wall);
prompts go to the repaint queue. Baked together with phase 4b.

### Phase 6 — the camp as home, coming home [x]

On desktop Alle reizen is a panel beside the camp, always shown (`DesktopKamp.dc.html`); on mobile a popup
(decided by the designer). Mount `CampScene` as the home screen in place of the Travel/Collection pager (`src/app/Base.tsx`), following
`docs/design/camp-sketches/Main.dc.html` and `DesktopKamp.dc.html`: the HUD (coins, hearts, settings gear), the
scene with its entrances (chest → Verzameling, mosaic window → mosaic screen, map → Alle reizen, fire), the
"Verder met" card with **Op pad**, **Alle reizen**, the hint row. Journey end and leaving an expedition go
home through the coming-home screen (`MobielUitpakken`, `DesktopUitpakken`): fire, hearts refilled, the haul
since last time, **Uitpakken**; the completion overlay stops offering the next journey. A newly unlocked tier
shows the new-chapter screen (`MobielHoofdstuk`). Settings, dev tools and story log move per decision 7. New ui
pieces get stories; strings in en and nl. No camp spot ships as a stand-in: a spot without art stays bare ground.

### Phase 7 — Alle reizen and the Verzameling [x]

Alle reizen as a popup over the camp (side panel on desktop), per `MobielReizen.dc.html`: one flat list, tiers
as headers newest first, the current journey marked, completed tiers collapsed with a dot when something new
waits, locked journeys showing what they need; every journey one tap away. It replaces `src/app/pages/Travel.tsx`
and its map view. The Verzameling as a popup from the chest, per `MobielVerzameling.dc.html`: the existing
collection sections as tabs, NIEUW badges, plus the Constructies tab from phase 3 and the story log. The mosaic
window per `MobielMozaiek.dc.html`.

### Phase 8 — story drafts [x]

Draft every new line in the voice of the story docs (spoken, from the character's feeling, addressed to someone;
jokes land on first read; the explorer speaks only where it helps), mark each as a draft, and wire its hook:

- every tomb: entering the cave, reaching the pillar, arriving at the cavern (the story hooks of
  `docs/superpowers/specs/2026-10-22-tomb-redesign-design.md`);
- the camp: first arrival, coming home (with and without loot), resting at the fire after taking damage, a new
  chapter per tier;
- Fez: the animals for sale, each purchase, the banner;
- the animal gates: the first time a tier or optional tomb is blocked for want of an animal (who says it, and
  where to get one), the moment the animal lets the player through, and the animal arriving in the camp;
- finishing a structure; the first camp find.

Voices (decided by the designer): in the camp the explorer and Fez talk together (Fez travels home with the
explorer; he sells nothing there); at a gate that needs an animal, Fez says so and points to where one is
sold. Drafts are written in Dutch first (spoken, everyday Dutch), then in English; both go in.

Lines go where the story layer keeps them, each listed in the review list with where it fires. No line is
"final" until the designer has read it.

### Phase 9 — wrap-up [x]

CHANGELOG (edit the Unreleased bullets, do not pile them up), `docs/playtest-backlog.md` (what to try in the
browser), the onboarding/handover docs this queue made stale, a last loot report, the full gate in a clean
worktree, and the review list sorted: decisions, drafts, failures, things to look at. Push the branch; open no PR.

## State

- 2026-10-24 — queue written; PR #322 merged into main; branch `camp/home-and-loot` created. Next: phase 1 plan task, in a fresh session.
- 2026-10-25 — phase 1 done (plan `docs/superpowers/plans/2026-10-25-camp-phase-1-consumables-out.md`): supplies, pack and supplies detector gone; 60 waterskins (20 per tier, expert and up) heal on pickup; hearts refill on every return to base; gate green. Two trap checks wait in the review list. Next: phase 2 plan task.
- 2026-10-25 — phase 2 done (plan `docs/superpowers/plans/2026-10-25-camp-phase-2-loot-report.md`): `yarn loot-report` writes `docs/loot-report.md`; mods report demand through `lootTotals`; the bake names the path of any empty chest or path end. Next: phase 3 plan task.
- 2026-10-25 — phase 3 done (plan `docs/superpowers/plans/2026-10-25-camp-phase-3-camp-loot.md`): `camp` mod; 28 finds + 99 parts (+127 drops) on puzzle slots of their tier; camp save v1; Constructies in the Collection; 124 repaint prompts; app-import guard spec. Popups not yet browser-checked (review list). Next: phase 4 plan task.
- 2026-10-25 — phase 4 STOPPED after Tasks 1–2 (plan `docs/superpowers/plans/2026-10-25-camp-phase-4-animal-gates.md`): gates AND every mod's requirement; gate walk; loot never on a shop's end (8 hieroglyph pieces were lost there, pre-existing on main). Blocker, pre-existing: placement walks default-seed floors, the bake ships pinned seeds — at the shipped layout no wizard journey can be entered (review list, Failures). Tasks 3–8 wait on the designer. Phase 5 skipped (needs 4). Next: phase 6.
- 2026-10-25 — phase 6 done (plan `docs/superpowers/plans/2026-10-25-camp-phase-6-camp-home.md`): the camp is home (HUD, scene entrances, Verder met, desktop side panel); coming-home screen with the haul; new-chapter card; settings hold the dev tools; story log is a Collection section; nothing chains into the next journey. Alle reizen is still the old Travel page (phase 7). Next: phase 7 plan task.
- 2026-10-25 — phase 7 done (plan `docs/superpowers/plans/2026-10-25-camp-phase-7-journeys-collection.md`): Alle reizen replaces Travel (one list, tiers newest first, locked needs, `extraNeeds` seam for animals later); the Verzameling opens in tabs with NIEUW and a chest badge (seen save); mosaic window count line. Next: phase 8 plan task.
- 2026-10-25 — phase 8 done (plan `docs/superpowers/plans/2026-10-25-camp-phase-8-story-drafts.md`): 64 draft scenes nl+en (27 tomb, 10 camp, 27 animal — the animal ones unwired, waiting on phase 4) in `docs/game-design/story/script-camp-release.md`; tomb and camp beats wired once each; develop mode plays the drafts from settings. Next: phase 9 wrap-up.
- 2026-10-25 — phase 9 wrap-up done: changelog condensed, playtest backlog and the docs the queue made stale updated (`camp.md`, the mod architecture, the Travel page's old references), loot report unchanged, the review list sorted with a "Start here" summary, the clean-worktree gate green (bake clean after re-keying the carve ledger's hashes, verify, verify-content, build); branch pushed, no PR.
- 2026-10-25 — phase 4 done (plan `docs/superpowers/plans/2026-10-25-camp-phase-4-layout-first.md`, which replaced the old plan's Tasks 3–8): every floor's layout is picked before loot under hard criteria (packing is intent), keys are placed on it room by room, a hidden corridor needs the corridor detector, and the bake refuses a stamped world with a stuck point (29 of 29 journeys entered); the seven purchases are keys sold by Fez; Alle reizen shows a locked tier's need and where to buy it; bought animals arrive in the camp; all 27 animal beats play. Starter teaches five families. Shop toggle-off is refused by the bake (review list, Failures); camp off passes.
- 2026-10-25 — phase 5 done inside phase 4's plan: money is placed last, ground by ground (21 grounds, every one with a surplus, the smallest +166); sellables 30–150; the allowance is gone; found waterskins follow the traps (0.5 per trap, 159) and Fez sells 14. Clean-worktree gate green (review list, §2 Phase 4 gate).
- 2026-10-26 — phase 4b done (plan `docs/superpowers/plans/2026-10-26-camp-phase-4b-4c.md`): open and trapped side paths stand on a lock's inside corridors, one to a corridor; 35 floors carry them on 101 corridors, 39 side paths on 19 floors hang outside their lock, 2 floors take two to a corridor; the layout search keeps lays and spreads stages over cores, so the bake fits 900 s (345 s). Three checks fail on the baked world and wait (review list, Failures): toggle-off on junior_4 L4 F0, a prop bound for portals, a roomless lock region on expert_4 L4 F0.
- 2026-10-26 — phase 4c done (same plan): stairs name their floor and direction; starter_1's ward stair goes down two wizard floors to a seven-puzzle cave, up a small cave into the Sphinx, where the wall is read. Strict walk 29 of 29, totals exact, smallest ground +164. Sphinx art queued for painting, not a blocker.

## Next

Phase 4b's three failing checks (review list, Failures): the toggle-off difference on junior_4 L4 F0 first, since toggle-off is the mod acceptance gate; then the designer's calls on the portal prop bound and the roomless workshop region. The two walks under the review list's §5 (a side path in a lock corridor; the ward stair, cave and climb into the Sphinx). The shop toggle-off decision (review list, Failures).
