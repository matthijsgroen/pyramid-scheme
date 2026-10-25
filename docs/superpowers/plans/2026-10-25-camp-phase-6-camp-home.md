# Camp phase 6 — the camp as home, coming home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Goal:** The camp is the home screen. `CampScene` replaces the Travel/Collection pager: a HUD in the sky (title, mod widgets such as coins and hearts, a settings gear), the scene with its entrances (chest → Verzameling, mosaic window → the mosaic screen, map table → Alle reizen), a **Verder met** card with **Op pad** and **Alle reizen**, and a hint row. On desktop Alle reizen is a panel beside the camp, always shown; on a phone it is a popup. Every return to base (journey end, leaving mid-journey) goes through the **coming-home** screen: the fire, what mods say about resting (hearts), the haul since the last homecoming, **Uitpakken**. A newly reached tier then shows the **new-chapter** screen. The completion overlay no longer offers the next journey. Settings, dev tools and the story log move per decision 7. Nothing in this phase depends on phase 4: there are no animals, no gate needs and no shop in the camp.

**Architecture:** The home is core (`src/app/home/` plus `src/app/Base.tsx`) and names no mod. It reaches mod content only through seams, each a registry filled by a mod's app entrypoint and empty when the mod is off: the **camp's found state** (what the scene draws), **mod entrances** (a mod claims a fixed scene object, the window, with its label and the screen it opens), **rest panels** on the coming-home screen (beside the existing homecoming handlers), **haul lines** (how a mod sums up its own rewards in the haul), and the existing **HUD widgets** (`src/app/SiteMap/hudRegistry.ts`) and **Collection sections**. Two new pieces of core state live in one new versioned store, the **home save** (`useGameStorage("homecoming")`): the haul (every reward collected from a found-loot popup since the last Uitpakken) and the chapter last announced. Its model is a pure state model in `src/game/homeSave.ts` with the never-clobber read/update pair phase 3 used for the camp save. What the Verder met card shows is a pure function over the journeys and their availability. The design system gains stateless pieces (HUD, Verder met card, popup, home layout, haul row, coming-home and new-chapter screens), each with a story. `CampScene` stops drawing stand-ins outside Storybook.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Storybook, immer state models (`docs/instructions/state-models.md`), `useGameStorage` / `useModState`, Tailwind v4, i18next (en + nl), a headless Chromium script for the look.

**Spec:** `docs/handover-camp-release.md` (Phase 6 brief, "How the driver session works", Decisions 3, 4 and 7, State), `docs/design/camp-sketches/` (`README.md`, `Main.dc.html`, `DesktopKamp.dc.html`, `MobielUitpakken.dc.html`, `DesktopUitpakken.dc.html`, `MobielHoofdstuk.dc.html`), `docs/superpowers/specs/2026-10-23-camp-scene-design.md` (props, insets, "no stand-in ships"), `docs/game-design/camp.md` §3–4, `docs/mods/TARGET.md` (core names no mod; toggle-off is the gate). Phase 3's plan for the camp save pattern (`readCampSave` / `updateCampSave`). Phase 4 stopped after its Tasks 1–2 and phase 5 is skipped: nothing here reads animals, purchases or gate needs.

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. Commit after every task. Another agent may be reading the repo: commit only your own files.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen` never name the camp, mosaic, story, shop or trap mod, a mod's reward type, a camp step or a mod's locale namespace; the `no-restricted-imports` rules stay at zero. Core's own strings live in `common.json` (its existing `camp.entrance.*` key is extended there). Mods import no sibling mod.
- **`src/app/appImports.spec.ts` stays green:** nothing the home pulls in may reach `node:fs`, `worldSpec`, `lockCatalogue` or `webCatalogue`. Run it in every task that adds an import to the app graph.
- **Saves:** one new core store, `useGameStorage("homecoming")`, `version: 1`, read through a function that turns an unknown shape into the empty save and updated through one that hands back a value it cannot read **untouched** (phase 3's `updateCampSave` pattern). Stored rewards are kept as the opaque reward objects the popup offered; no index, ordinal or derived count is stored. No other store changes shape; the camp, trap, shop and mosaic saves are only read.
- **No unit test pins real content:** specs build made-up journeys, made-up registries, made-up rewards and made-up saves. No test names a real journey id, a real camp step or a real count of the world. The world is not baked: `src/data/generatedWorld.ts` must be byte-identical at the end of the phase.
- **Design system** (`src/ui/`): stateless, props in, JSX out, no `useTranslation`, no hooks except `useRef`. Every new `src/ui/` component gets a story beside it with made-up props (`docs/instructions/storybook.md`). Measuring a container (ResizeObserver) is an app hook.
- **Strings:** every new user-facing string in both `public/locales/en/` and `public/locales/nl/` (`src/i18n/keys.spec.ts` checks both). nl first, spoken everyday Dutch, then en. Texts the sketches carry are used as written; new ones go to the review list as drafts.
- **No stand-in ships:** outside Storybook a camp piece without art is not drawn and offers no entrance; the spot stays bare ground.
- **Comments state the current state and why, never history.** Commits: one subject line, `type: what changed`, ≤ 72 chars, ending with the session's attribution trailer.
- **Checks per task:** the task's own specs, `yarn check-types`, `yarn lint`. Only Task 10 runs `yarn verify`, `yarn verify-content` and `yarn build`, each under `timeout 900`. Betterer may only re-key entries whose lines moved; a new backlog entry is a finding to fix, never to accept.
- The phase's last step updates the handover's "State" and ticks Phase 6 there (driver's job, not a task).

## Review Focus

1. **The home save never loses or invents a haul:** a collected reward is recorded once, at the moment it is taken; a skipped reward, a shop purchase and a dev grant are not; Uitpakken empties the haul; an unreadable save is never overwritten (Task 2, soundness).
2. **Coming home fires exactly where phase 1 fires the homecoming** (journey complete, close) and nowhere else; the screen shows on every such return, with or without loot; a reload at base shows none (Task 9).
3. **The new chapter shows once per newly reached tier**, never for the starter tier and never for a save that had no record (Tasks 2 and 9).
4. **Core names no mod:** every mod-owned thing on the home reaches it through a registry; with every mod's registrations absent the home still renders, sets off and opens the Verzameling (Tasks 3, 8, 10).
5. **Verder met is right:** a journey in progress is continued, otherwise the newest tier's first open, unfinished journey is started; a locked, hidden or finished journey is never offered (Task 5).
6. **No stand-in in the app** and no layout regression in Storybook, where stand-ins stay on (Task 1).
7. **Toggle-off:** with `campMod` out of `REGISTERED_MODS` the home is the bare camp (fixed chest, window, campfire, oasis; no spots; no map-table entrance) and works; with `mosaicMod`, `storyMod`, `trapMod` or `shopMod` out, `check-types` and `build` pass (Task 10).

## Decisions for the review list

Each is the option that changes the least shipped behaviour or the one the brief names; Task 10 writes them into `docs/review-camp-release.md` under Decisions, each prefixed `Phase 6 —`.

1. **Alle reizen is the existing Travel page, as an interim,** shown in a popup on a phone and in the side panel on desktop, minus its dev tools (they move to settings). Phase 7 replaces it with the flat list of `MobielReizen.dc.html`. Alternative: build the flat list now.
2. **Desktop starts at the `lg` breakpoint (1024 px):** from there Alle reizen and the Verder met card sit in a side panel beside the camp; below it the card floats over the scene's bottom and Alle reizen is a popup. Alternative: `md` (768 px).
3. **The fire is not an entrance.** The fire is where coming home happens; tapping it does nothing in this phase. Alternative: the fire reopens the last coming-home overview, or the story log.
4. **The map table opens Alle reizen on a phone; on desktop it offers no entrance,** since the panel is already in view. The map table is a camp step (fixed); with the camp mod off it is not drawn, so there is no map entrance, and Alle reizen is reached from the card. Alternative: on desktop the map table flashes the panel.
5. **The mosaic window is claimed by the mosaic mod** through a new "mod entrance" seam: the mod gives the label ("Mozaïek 61/252") and the screen; with the mosaic off the window stands as decor. Alternative: a core screen registry keyed by scene object.
6. **The chest carries no badge yet:** the "new in the Verzameling" count needs the NIEUW tracking of phase 7. Alternative: count new items now.
7. **The camp HUD reuses the site map's HUD widgets** (coins from the shop mod, hearts from the trap mod), not a second registry. Alternative: a separate camp HUD registry.
8. **The haul is every reward the player takes from a found-loot popup** (`useRewardOffer`'s collect), stored as the reward objects in the core home save. Shop purchases and dev grants are not haul. It stays across reloads and is emptied by Uitpakken; a reload mid-trip does not fire coming home, so its finds join the next homecoming's haul. Alternative: record every applied reward, purchases included.
9. **Haul lines are summed by the mod that owns the reward** (a new seam): the shop sums coins ("+85 munten") and groups sellables, mosaic counts pieces, camp marks a find **NIEUW** and groups parts by structure, the trap mod lists no waterskin (it was drunk on the spot). A reward type no mod sums up gets core's default line: its name and visual from the reward display, "×n" for equal rewards. New lines first, then in the order first found. Alternative: core's default line for everything.
10. **An empty haul** shows the title, the fire and the rest panels; its button reads "Naar het kamp" instead of "Uitpakken". Alternative: the same "Uitpakken" label.
11. **Resting is a mod panel:** the trap mod shows the full hearts and "Uitgerust bij het vuur — weer helemaal fit" on the coming-home screen; with the trap mod off the screen shows only the fire. Alternative: a fixed core rest line.
12. **No arrow to where a find lands** (DesktopUitpakken), and found pieces are drawn at once rather than held back until Uitpakken. Alternative: hold the haul's camp pieces back and let them fade in on Uitpakken, with the arrow on desktop.
13. **The chapter is the highest released tier the player holds a key to** (`isTierUnlocked`). The home save records the chapter last announced; a save without a record takes the current chapter silently (a fresh game starts at starter, so starter is never announced). When several tiers open at once only the highest is announced. Alternative: announce every tier in turn.
14. **The new-chapter screen is a card over the camp at the new chapter** (the scene already draws the new pyramid on the horizon), with the tier's first open journey and **Op pad**, plus a close. It shows after the coming-home screen, or on opening the home when a tier opened elsewhere (a dev grant). There is no "new camp piece" line: camp pieces are found now, not given per chapter. The tier's own line (the sketch's trap remark) is left to story phase 8. Alternative: a separate sunrise picture.
15. **Verder met:** the journey in progress, else the first open, unfinished, not hidden journey of the highest tier that has one (a tomb counts once its lock is open); its line reads "Piramide n van m · <tier>" (the journey's level) or "Graftombe · <tier>" for a tomb. When nothing is left to start the card shows only Alle reizen and "Alles staat open op je kaart". Alternative: the first open journey in list order across tiers.
16. **The hint row** counts finished journeys that still hold something reachable (the Travel page's `hasReachableUnexplored` rule) — "2 oude reizen hebben iets nieuws te ontdekken" — and opens Alle reizen; hidden at zero.
17. **A first-run hand points at Op pad** (a new tap hint, `setOff`), once, after Fez's welcome. The Travel page's own hints stay in the interim panel.
18. **The completion overlay keeps its announcements** ("Nieuwe expeditie ontgrendeld: …", the tomb line) **but loses its start buttons;** its one button reads "Terug naar het kamp". `onStartJourney` is removed from the overlay, `PyramidExpedition` and `App`. Alternative: drop the announcements too.
19. **Settings** opens from the gear in the HUD; in developer mode the panel also holds the playtesting tools that were on Travel (grants and jumps, jump to the shop tomb, save transfer, lock editor, puzzle lab). Developer mode keeps its 7 taps, on the HUD title "Kamp". `BaseHeader` goes. Alternative: a separate dev panel.
20. **The story log is a Collection section** (registered by the story mod at order 50, after Constructies); phase 7 turns sections into tabs. The mod screen registry (`screenRegistry.ts`) goes, since mosaic and story were its only users. Alternative: keep the registry for later mod screens.
21. **The `Page` atom goes** with the pager; Travel, Collection, the mosaic screen and the story log fill the popup or panel they are put in. Alternative: keep `Page` with a non-snapping variant.
22. **Home with the camp mod off is the bare camp:** the fixed chest, window, campfire and oasis on the horizon of the current chapter, the same HUD, card and entrances (no map table). No core stand-in for the camp's state. Alternative: fall back to the old Travel page.

---

### Task 1: CampScene draws no stand-in outside Storybook

Small; one agent (Sonnet).

**Files:**

- Modify: `src/ui/atoms/CampScene.tsx` (new prop `standIns?: boolean`, default false)
- Modify: `src/ui/atoms/campScene/campLayout.ts` only if entrance areas must skip pieces without art (prefer filtering in the component)
- Modify: `src/ui/atoms/CampScene.stories.tsx` (every story passes `standIns: true` through its default args)
- Modify: `src/ui/atoms/CampScene.spec.tsx`

**Interfaces:**

- Produces: `CampSceneProps.standIns?: boolean`. Without it, a placed piece whose art is missing renders nothing (no box, no shadow, no light from it), and an entrance whose object has no art is not offered. With it, today's stand-in box.

- [x] **Step 1: Failing tests** (`CampScene.spec.tsx`, made-up catalogue with one piece that has art and one id that has none): without `standIns` the missing piece is not in the DOM and no `.camp-standin` exists; with `standIns` it is; an entrance on a piece with no art is not rendered without `standIns`.
- [x] **Step 2: Run** `yarn test src/ui/atoms/CampScene` — FAIL.
- [x] **Step 3: Implement.** The prop's doc comment says stand-ins are for Storybook while art is owed, and the app never passes it.
- [x] **Step 4: Run** the specs — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: the camp scene leaves a spot bare when its art is owed`

---

### Task 2: The home save — haul and chapter (**soundness**: saves; Opus, per-task review)

**Files:**

- Create: `src/game/homeSave.ts`, `src/game/homeSave.spec.ts`
- Create: `src/app/home/useHomeSave.ts`, `src/app/home/useHomeSave.spec.ts`
- Modify: `src/app/SiteMap/useRewardOffer.ts`, `src/app/SiteMap/useRewardOffer.spec.ts` (an optional `onTaken(reward)` called on collect)
- Modify: `src/app/SiteMap/SiteMapScreen.tsx` (passes the home save's `addToHaul` as `onTaken`)
- Modify: `src/app/pages/journeyAvailability.ts`, `src/app/pages/journeyAvailability.spec.ts` (`currentChapter`)

**Interfaces:**

- Produces (game, a state model): `HomeSave = { version: 1; haul: TreasureReward[]; chapter?: Difficulty }`, `emptyHomeSave()`.
  - Actions (immer, pure): `addToHaul(save, reward)` appends a copy; `clearHaul(save)`; `markChapter(save, tier)` sets `chapter`.
  - Queries (pure): `chapterToAnnounce(save, current): Difficulty | undefined` — `current` when `chapter` is set and `current` is a later difficulty; otherwise undefined. `needsChapterRecord(save)` — true when no `chapter` is stored.
  - `readHomeSave(stored: unknown): HomeSave` — another shape or version reads as the empty save; a v1 save comes back unchanged, rewards of unknown types included. `updateHomeSave(stored, action): unknown` — nothing stored starts from the empty save; a stored value it cannot read is returned untouched.
- Produces (app): `useHomeSave(): { haul: readonly TreasureReward[]; chapter?: Difficulty; loaded: boolean; addToHaul; clearHaul; markChapter }` over `useGameStorage("homecoming", emptyHomeSave)`, every read through `readHomeSave`, every write through `updateHomeSave`.
- Produces: `useRewardOffer({ …, onTaken? })` — `onTaken(reward)` runs once, right after `applyReward`, when the player collects; never for a skipped reward.
- Produces: `currentChapter(heldKeys): Difficulty` — the last difficulty in order that `isTierUnlocked`; the first tier when none is.

- [x] **Step 1: Failing tests** (made-up rewards and saves).
  - `homeSave.spec.ts`: adding two rewards keeps both, in order, equal rewards included; `clearHaul` empties it and keeps `chapter`; `chapterToAnnounce` gives the later tier, nothing for the same or an earlier tier, nothing without a record; `needsChapterRecord` is true only without one; `readHomeSave` of `undefined`, a number, an object without `version`, and `version: 2` gives the empty save; `updateHomeSave` on a `version: 2` value returns that value itself (same reference), on `undefined` applies the action to the empty save.
  - `useHomeSave.spec.ts` (renderHook over the real storage, fresh store): `addToHaul` twice then `clearHaul` leaves an empty haul; the stored value carries `version: 1` and the reward objects only; with a `version: 2` value primed in storage, `addToHaul` leaves the stored value unchanged.
  - `useRewardOffer.spec.ts`: collecting an offered reward calls `applyReward` then `onTaken` with that reward; a skipped reward calls neither; dismissing without collecting calls neither.
  - `journeyAvailability.spec.ts`: `currentChapter` over made-up held keys gives the highest unlocked released tier, and the first tier with no keys.
- [x] **Step 2: Run** `yarn test src/game/homeSave src/app/home src/app/SiteMap/useRewardOffer src/app/pages/journeyAvailability` — FAIL.
- [x] **Step 3: Implement.** The model file's comment says the haul is the reward objects as offered (so a display can be drawn later by whichever mod owns the type) and why an unreadable save is left alone. The shop's purchase path (`applyReward` from the shop plugin) is not touched.
- [x] **Step 4: Run** the specs — PASS. `yarn test src/app/appImports`, `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Per-task review** (soundness): one record per collect; no record for skip, purchase or dismiss; unreadable save untouched; no derived value stored; store key is core's own and generic.
- [x] **Step 6: Commit** — `feat: the home save keeps the haul and the chapter last shown`

---

### Task 3: The home seams — found state, mod entrances, rest panels, haul lines

One agent (Sonnet).

**Files:**

- Create: `src/app/home/campFoundSource.ts`, `src/app/home/campFoundSource.spec.ts`
- Create: `src/app/home/modEntrances.ts`, `src/app/home/modEntrances.spec.ts`
- Modify: `src/app/homecomingRegistry.ts`, `src/app/homecomingRegistry.spec.ts` (rest panels)
- Create: `src/app/home/haulLines.ts`, `src/app/home/haulLines.spec.tsx`

**Interfaces:**

- Produces: `registerCampFoundSource(useFound: () => CampFound)`, `useCampFound(): CampFound` — the one registered source, `{}` with none (a second registration replaces the first).
- Produces: `ModEntrance = { id; object: "window"; useLabel: () => { label: string; badge?: number }; Screen: FC; title: (t) => string }` (the screen's popup title through the caller's `t`; or a `useTitle` hook — implementer's choice, stated in the comment), `registerModEntrance(entrance)` (by id, replacing), `modEntrances()`. Only the window is claimable: the chest and the map table are core's.
- Produces: `HomecomingPanel = { id; order: number; Component: FC }`, `registerHomecomingPanel`, `homecomingPanels()` sorted by order.
- Produces: `HaulLine = { key: string; visual: ReactNode; title: string; note?: string; isNew?: boolean }`; `registerHaulLines(useLines: () => Partial<Record<string, (rewards: readonly TreasureReward[], t: TFn) => HaulLine[]>>)`; `useHaulLines(haul): HaulLine[]` — groups the haul by type in first-found order, hands each group to its registered summariser, falls back to core's default per group (equal rewards merged with "×n", name and visual from `useMergedRewardDisplays`, a type with no display skipped), puts `isNew` lines first, otherwise keeps first-found order. Core's strings: `home.haul.times` ("×{{count}}").

- [x] **Step 1: Failing tests** (made-up registrations; each spec resets what it registers).
  - `campFoundSource.spec.ts`: no source gives `{}`; a registered source's value comes through; a second registration replaces the first.
  - `modEntrances.spec.ts`: registering twice under one id keeps one; the list holds what was registered.
  - `homecomingRegistry.spec.ts`: panels come back sorted by order; the existing handler tests stay.
  - `haulLines.spec.tsx`: a made-up summariser for type `a` receives all `a` rewards in found order and its lines are used; a type without one gets one default line per distinct reward with "×2" for two equal ones; a type with neither summariser nor display is left out; an `isNew` line moves to the top; an empty haul gives no lines.
- [x] **Step 2: Run** `yarn test src/app/home src/app/homecomingRegistry` — FAIL.
- [x] **Step 3: Implement.** Each registry's comment says what a mod contributes and what is shown when none does. Hooks run in fixed registry order (the pattern of `rewardContributions.ts`).
- [x] **Step 4: Run** the specs — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: seams for the camp home — found state, entrances, rest, haul`

---

### Task 4: The mods plug into the home seams

Mechanical, batched; one agent (Sonnet). Each mod registers only inside its existing `isModEnabled` gate. `registerModScreen` calls stay until Task 8 removes the pager.

**Files:**

- Modify: `src/mods/camp/app/index.ts`; Create: `src/mods/camp/app/haulLines.tsx`, `src/mods/camp/app/haulLines.spec.tsx`
- Modify: `src/mods/mosaic/app/index.ts`; Create: `src/mods/mosaic/app/campEntrance.ts` (label hook), `src/mods/mosaic/app/haulLines.tsx`, `src/mods/mosaic/app/campEntrance.spec.tsx`
- Modify: `src/mods/shop/app/index.ts`; Create: `src/mods/shop/app/haulLines.tsx`, `src/mods/shop/app/haulLines.spec.tsx`
- Modify: `src/mods/trap/app/index.ts`; Create: `src/mods/trap/app/RestPanel.tsx`, `src/mods/trap/app/RestPanel.spec.tsx`, `src/mods/trap/app/haulLines.ts`
- Modify: `src/mods/story/app/index.ts`; Create: `src/mods/story/app/log/StoryLogSection.tsx` (the log's body as a Collection section), `StoryLogSection.spec.tsx`
- Modify: the mods' locale files in `public/locales/{en,nl}/` (where each mod keeps its strings today)

**Interfaces:**

- camp: `registerCampFoundSource(() => useCampProgress().found)`; haul lines: each find one line, `isNew`, title the find's name, note "Nieuw in je kamp" / "New in your camp", visual its layer art; parts one line per structure, "<structure> · n onderdelen" / "n parts", visual the structure art.
- mosaic: `registerModEntrance({ id: "mosaic", object: "window", useLabel → "Mozaïek {{found}}/{{total}}", Screen: MosaicPage })`; haul line: one line "n mozaïekstukjes" / "n mosaic pieces", note "Naar het glas-in-loodraam" / "For the stained-glass window".
- shop: haul lines: coins summed into one line "+n munten" / "+n coins", note "Losse munten onderweg" / "Loose coins on the way"; sellables one line per item with "×n".
- trap: `registerHomecomingPanel({ id: "trap", order: 0, Component: RestPanel })` — full hearts and "Uitgerust bij het vuur — weer helemaal fit" / "Rested by the fire — fit again"; waterskin summariser returns no line.
- story: `registerCollectionSection({ id: "story", order: 50, Component: StoryLogSection })` — heading and the log list the `StoryLogPage` shows today, no `Page` wrapper.

- [x] **Step 1: Failing tests** (made-up rewards; translations through the test `t`).
  - camp: two finds and three parts of one made-up structure give two `isNew` find lines and one structure line reading 3 parts.
  - mosaic: the entrance label reads found/total from a primed ledger; three pieces give one line counting 3.
  - shop: coin rewards of 5, 10 and 70 give one line "+85"; two equal sellables give one line "×2".
  - trap: `RestPanel` shows max hearts; the waterskin summariser gives `[]`.
  - story: the section lists a played made-up conversation and shows nothing for an empty log.
- [ ] **Step 2: Run** `yarn test src/mods/camp src/mods/mosaic src/mods/shop src/mods/trap src/mods/story` — FAIL.
- [x] **Step 3: Implement.** Strings nl first, en second.
- [x] **Step 4: Run** the specs — PASS. `yarn test src/i18n`, `yarn check-types`, `yarn lint` (import rules at zero: no mod imports a sibling).
- [x] **Step 5: Commit** — `feat: mods fill the camp home — found state, window, rest, haul`

---

### Task 5: Verder met — which journey the card offers

One agent (Sonnet).

**Files:**

- Create: `src/app/home/continueJourney.ts`, `src/app/home/continueJourney.spec.ts`

**Interfaces:**

- Consumes: `availablePyramidJourneyIds`, `Journey`, the merged journey contributions' `lock` and `hidden`, `getJourney`, `getUnexploredLevels` (passed in as plain functions).
- Produces: `continueJourney(input): { journeyId: string; mode: "continue" | "start"; levelNr?: number; levelCount: number } | undefined` where `input = { journeys; activeJourneyId?; isInProgress(id); completionCount(id); levelNr(id); available: ReadonlySet<string>; lockOpen(id); hidden(id) }`. Rule: the active journey when in progress (`continue`, with its level); else, over journeys that are pickable (an available pyramid journey, or an entry-locked one whose lock is open), not hidden and never completed, the first in list order of the highest difficulty that has one (`start`); else undefined.
- Produces: `newToDiscoverCount(input): number` — finished journeys (completion > 0) with at least one reachable unexplored level.

- [x] **Step 1: Failing tests** (made-up journeys over two tiers, one tomb with a lock): in progress wins over everything; with nothing in progress the higher tier's first open unfinished journey is chosen over a lower tier's; a locked tomb is skipped, an opened one counts; a hidden journey is skipped; a completed one is skipped; all done gives undefined; the count counts only finished journeys with unexplored levels.
- [x] **Step 2: Run** `yarn test src/app/home/continueJourney` — FAIL.
- [x] **Step 3: Implement** as pure functions; the comment states the rule in one sentence each.
- [x] **Step 4: Run** — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: the camp knows which journey to offer next`

---

### Task 6: The design-system pieces of the home

One agent (Sonnet). Follow the sketches' layout and colours (`Main.dc.html`, `DesktopKamp.dc.html`, `MobielUitpakken.dc.html`, `DesktopUitpakken.dc.html`, `MobielHoofdstuk.dc.html`); the camp itself is `CampScene`.

**Files** (each with `.stories.tsx` beside it; specs where named):

- Create: `src/ui/molecules/CampHud.tsx`, `CampHud.spec.tsx`
- Create: `src/ui/molecules/ContinueCard.tsx`, `ContinueCard.spec.tsx`
- Create: `src/ui/molecules/HaulRow.tsx`
- Create: `src/ui/organisms/CampPopup.tsx`, `CampPopup.spec.tsx`
- Create: `src/ui/organisms/CampHomeLayout.tsx`
- Create: `src/ui/organisms/ComingHomeScreen.tsx`, `ComingHomeScreen.spec.tsx`
- Create: `src/ui/organisms/NewChapterScreen.tsx`, `NewChapterScreen.spec.tsx`

**Interfaces:**

- `CampHud`: `{ title; onTitleTap; tapsLeft?: number; devBadge?: string; settingsLabel; onSettings; children }` — title left (tappable, shows `tapsLeft…` when 1–3), widgets and a gear button right.
- `ContinueCard`: `{ heading; journeyName?; detail?; setOffLabel; onSetOff?; allJourneysLabel; onAllJourneys?; emptyText?; hint?: { text; onOpen } ; setOffSlot?: (button) => ReactNode }` — without `journeyName` it shows `emptyText` and no Op pad; without `onAllJourneys` no Alle reizen button (desktop); `hint` renders the hint row. (`setOffSlot` lets the app wrap Op pad in a `TapHint`; any equivalent is fine.)
- `HaulRow`: `{ visual; title; note?; badge? }`.
- `CampPopup`: `{ title; closeLabel; onClose; children }` — full screen below `lg`, a large centred panel from `lg`; Escape and the close button call `onClose`; `role="dialog"`, labelled by the title.
- `CampHomeLayout`: `{ hud; scene; sceneRef; card; aside? }` — phone: scene fills the screen, HUD over its sky, card floating at its bottom; from `lg`: HUD across the top, scene left, `aside` (card + panel) right, about 440 px wide. Full `--screen-height`, safe-area padding.
- `ComingHomeScreen`: `{ title; fire: ReactNode; rest?: ReactNode; haulTitle; lines: { key; visual; title; note?; badge? }[]; buttonLabel; onDone }` — no haul heading when `lines` is empty.
- `NewChapterScreen`: `{ title; subtitle; body; journeyName?; journeyNote?; setOffLabel; onSetOff?; closeLabel; onClose }` — a card that sits over whatever is behind it.

- [x] **Step 1: Failing tests.** `CampHud`: title taps call `onTitleTap`, the gear calls `onSettings` and has its label, `tapsLeft` 2 shows "2…", 5 shows nothing. `ContinueCard`: Op pad and Alle reizen call their handlers; no journey → no Op pad, empty text shown; hint row calls `onOpen`; no hint → no row. `CampPopup`: Escape and close call `onClose`; dialog labelled by its title. `ComingHomeScreen`: lines render with the badge; empty lines → no haul heading; the button calls `onDone`. `NewChapterScreen`: Op pad and close call their handlers; no journey → no Op pad.
- [ ] **Step 2: Run** `yarn test src/ui/molecules src/ui/organisms` — FAIL.
- [x] **Step 3: Implement.** Stories: `CampHud` with two made-up widgets and with the DEV badge; `ContinueCard` in progress, start, empty, with and without hint; `HaulRow` plain and NIEUW; `CampPopup` with filler; `CampHomeLayout` with placeholder blocks at phone and desktop viewports; `ComingHomeScreen` with three lines and empty; `NewChapterScreen` with and without a journey. Fire visual in stories: the campfire art via `campArt("campfire")`. Tailwind class order per lint.
- [x] **Step 4: Run** — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: camp home pieces — HUD, card, popup, coming home, new chapter`

---

### Task 7: Settings behind the gear, dev tools inside it

One agent (Sonnet).

**Files:**

- Modify: `src/app/SettingsModal.tsx`, `src/app/SettingsModal.spec.tsx` (new prop `startGame`; a developer block when develop mode is on)
- Modify: `src/app/pages/Travel.tsx`, `src/app/pages/Travel.spec.tsx` (dev tools removed)
- Modify: locale `common.json` (en, nl) if a heading for the developer block is needed

**Interfaces:**

- Produces: `SettingsModal` props `{ isOpen; onClose; startGame: () => void }`; in develop mode, below the normal settings and scrollable: the `DevPanel` with `useDevActions(startGame)`, "Jump to Shop Tomb" (start that journey, then `startGame`), `SaveTransfer`, the lock editor button, `PuzzleLab`. Outside develop mode none of them render.

- [x] **Step 1: Failing tests.** `SettingsModal.spec.tsx`: with develop mode off no dev tool is in the dialog; on, the playtesting panel and the lock editor button are. `Travel.spec.tsx`: in develop mode the Travel page shows no dev panel.
- [ ] **Step 2: Run** `yarn test src/app/SettingsModal src/app/pages/Travel` — FAIL.
- [ ] **Step 3: Implement.** Move, do not rewrite: the same components and actions; the shop-tomb jump keeps its journey id lookup as Travel has it today.
- [x] **Step 4: Run** — PASS. `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Commit** — `feat: dev tools move from travel into settings`

---

### Task 8: The camp is home

One agent (Sonnet). The biggest task; it replaces the pager.

**Files:**

- Modify: `src/app/Base.tsx` (the camp home), Create: `src/app/Base.spec.tsx`
- Create: `src/app/home/useElementSize.ts`, `src/app/home/useElementSize.spec.ts`
- Delete: `src/app/BaseHeader.tsx`, `src/app/BaseHeader.stories.tsx`, `src/app/pages/screenRegistry.ts`, `src/app/pages/screenRegistry.spec.ts`, `src/ui/atoms/Page.tsx`, `src/ui/atoms/Page.stories.tsx`
- Modify: `src/app/pages/Travel.tsx`, `src/app/pages/Collection.tsx`, `src/mods/mosaic/app/MosaicPage.tsx`, `src/mods/story/app/log/StoryLogPage.tsx` (no `Page`; fill the parent) — or delete `StoryLogPage` if Task 4's section replaced all its use
- Modify: `src/mods/mosaic/app/index.ts`, `src/mods/story/app/index.ts` (drop `registerModScreen`)
- Modify: `public/locales/{en,nl}/common.json` (`camp.title` "Kamp" / "Camp", `camp.continue.*`, `camp.entrance.*`, `camp.hint`, plural)
- Modify: `src/app/state/useTapHint.ts` only if hint keys are listed there (`setOff`)

**Interfaces:**

- Produces: `useElementSize(): [ref, { width; height }]` over a ResizeObserver (zero until measured).
- Produces: `Base({ startGame })` composed of `CampHomeLayout`:

  - **HUD:** `CampHud` with title `camp.title`, 7 taps toggling develop mode (`useSecretTaps`, as `BaseHeader` did), "DEV" in develop mode, `hudWidgets()` as children, the gear opening `SettingsModal` (with `startGame`).
  - **Scene:** `CampScene` with the measured size, `chapter = currentChapter(useMergedHeldKeys())`, `found = useCampFound()`, insets from the measured HUD and (phone) card heights, entrances: chest → Verzameling popup (`CollectionPage`, label `camp.entrance.collection`); window → the registered mod entrance's popup with its label and badge (none when nothing claims it); map table → Alle reizen popup on a phone only.
  - **Card:** `ContinueCard` from `continueJourney` and `newToDiscoverCount`: Op pad continues (`startGame`) or starts (`startJourney`, awaited, then `startGame`); Alle reizen opens the popup on a phone; the hint row opens Alle reizen; Op pad wrapped in `TapHint` for `setOff` while Fez is not speaking.
  - **Desktop aside** (from `lg`, `matchMedia`): the card without its Alle reizen button, then the Travel page content as the panel.
  - Fez's `welcome` conversation on mount and `LockEditorHost` in develop mode stay.

- [x] **Step 1: Failing tests** (`Base.spec.tsx`, made-up journeys through the existing test helpers, mod registrations of this spec only, `matchMedia` stubbed per case).
  - With no mod entrance, no found source and no HUD widget registered, the home renders the scene, the card and the chest entrance; tapping the chest opens a dialog titled Verzameling; Escape closes it.
  - With a journey in progress Op pad calls `startGame` without starting a journey; with none it starts the offered journey, then calls `startGame`.
  - On a phone, Alle reizen opens a dialog holding the Travel content; on desktop the Travel content is in the page without a tap and the card has no Alle reizen button.
  - A registered made-up window entrance shows its label and opens its screen in a dialog.
  - The gear opens settings; seven title taps turn develop mode on (the DEV badge shows).
  - `useElementSize.spec.ts`: reports the size a stubbed ResizeObserver delivers and disconnects on unmount.
- [ ] **Step 2: Run** `yarn test src/app/Base src/app/home` — FAIL.
- [ ] **Step 3: Implement.** No HTML/CSS of the home's own beyond composing the ui pieces. Remove every import of the deleted files (`rg "BaseHeader|screenRegistry|atoms/Page"` must find nothing).
- [ ] **Step 4: Run** `yarn test src/app src/mods/mosaic src/mods/story src/ui`, `yarn test src/app/appImports`, `yarn test src/i18n` — PASS. `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Commit** — `feat: the camp is the home screen`

---

### Task 9: Coming home and the new chapter

One agent (Sonnet); per-task review (it clears the haul).

**Files:**

- Modify: `src/App.tsx` (a `cameHome` flag set at the two homecoming exits, passed to `Base`; `onStartJourney` gone)
- Modify: `src/app/PyramidExpedition.tsx`, `src/app/PyramidExpedition.spec.tsx` (no `onStartJourney`)
- Modify: `src/app/PyramidExpedition/ExpeditionCompletionOverlay.tsx`, `ExpeditionCompletionOverlay.spec.tsx` (announcements stay, start buttons go; the button reads `ui.goBackToBase`, its text changed to "Terug naar het kamp" / "Back to camp")
- Create: `src/app/home/ComingHome.tsx`, `src/app/home/ComingHome.spec.tsx`
- Create: `src/app/home/NewChapter.tsx`, `src/app/home/NewChapter.spec.tsx`
- Modify: `src/app/Base.tsx`, `src/app/Base.spec.tsx` (props `cameHome`, `onArrived`)
- Modify: `public/locales/{en,nl}/common.json` (`camp.comingHome.*`, `camp.chapter.*`)

**Interfaces:**

- Produces: `ComingHome({ onDone })` — `ComingHomeScreen` with title "Terug in het kamp", the campfire art as `fire`, `homecomingPanels()` as `rest`, `useHaulLines(haul)` as lines, haul title "Je buit van deze tocht", button "Uitpakken" (or "Naar het kamp" when empty); `onDone` clears the haul, then calls the caller's `onDone`.
- Produces: `NewChapter({ tier, startGame, onClose })` — `NewChapterScreen` for `tier` with the tier's first open journey (Task 5's rule restricted to that tier): Op pad starts it and calls `startGame`; close only closes. Either marks the chapter seen.
- `Base`: when `cameHome`, `ComingHome` shows over the home until done (`onArrived` resets the flag in `App`); after it, or on mount without a homecoming, `chapterToAnnounce(save, currentChapter)` decides whether `NewChapter` shows; a save without a chapter record gets `markChapter(current)` silently once loaded.

- [x] **Step 1: Failing tests.**
  - `ComingHome.spec.tsx`: with a made-up haul and a made-up haul summariser the lines show; Uitpakken empties the stored haul and calls `onDone`; an empty haul shows no haul heading and the "Naar het kamp" button; a registered made-up rest panel renders.
  - `NewChapter.spec.tsx`: Op pad starts the tier's first open journey and marks the chapter; close marks it and starts nothing.
  - `Base.spec.tsx`: `cameHome` shows the coming-home screen and the home behind it; without it, none; a save whose chapter is behind the current one shows the new chapter after Uitpakken; a save without a record shows none and gets the current chapter stored.
  - `ExpeditionCompletionOverlay.spec.tsx`: a newly unlocked journey is announced and there is no start button; the one button calls `onJourneyComplete`.
  - `PyramidExpedition.spec.tsx` / an `App` level check: completing a journey and closing an expedition each run the homecoming handlers once and land on the coming-home screen.
- [ ] **Step 2: Run** `yarn test src/app` — FAIL.
- [ ] **Step 3: Implement.** The `cameHome` flag lives in `App` state (not stored): a reload never shows the screen.
- [ ] **Step 4: Run** `yarn test src/app src/i18n` — PASS. `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Per-task review:** coming home only on the two exits; the haul cleared only by the screen's button; the chapter marked on both ways out of the new-chapter screen; no start offer left in the expedition.
- [ ] **Step 6: Commit** — `feat: coming home to the fire, and a new chapter on a new tier`

---

### Task 10: Gate, toggle-off, look, record

**Files:**

- Modify: `docs/review-camp-release.md` (decisions, drafts, toggle-off and gate results, look-at items)
- Modify: `CHANGELOG.md` (`## Unreleased`, one line: "the camp is home: set off, all journeys, the collection and the mosaic open from the camp; coming home shows your haul")
- Modify: `docs/superpowers/plans/2026-10-25-camp-phase-6-camp-home.md` (tick boxes)
- Possibly: `.betterer.results` (re-keyed lines only)

**Interfaces:** none.

- [ ] **Step 1: No bake.** `git diff --stat <phase start>..HEAD -- src/data/ src/worldGen/` is empty; if not, the change is a finding, not a bake.
- [ ] **Step 2: Toggle-off, camp.** Remove `campMod` (and its import) from `src/mods/registeredMods.ts`; each under `timeout 900`: `yarn check-types`, `yarn build`, `yarn test src/app`. Then the look of Step 4 at phone width on a fresh save: the bare camp (chest, window, campfire, oasis), the card, the HUD; Op pad sets off; the chest opens the Verzameling without Constructies. Screenshot. Restore with `git checkout src/mods/registeredMods.ts`; `git status --short` clean.
- [ ] **Step 3: Toggle-off, the others.** One at a time — `mosaicMod`, `storyMod`, `trapMod`, `shopMod` — remove, `timeout 900 yarn check-types`, `timeout 900 yarn build`, restore. Record per mod what drops (window entrance, story section, hearts and rest panel, coins).
- [ ] **Step 4: Look** (`docs/instructions/browser-checks.md`: own headless Chromium from a scratchpad script, own `yarn dev` on a free port, fresh context, close everything, screenshots to `.playwright-mcp/`):
  - Phone 390×844, fresh save: home with Fez's welcome, then the hand on Op pad; Op pad starts the first starter journey; the expedition's back button lands on the coming-home screen (empty haul: fire only, "Naar het kamp"); the chest opens the Verzameling popup; the window opens the mosaic; the gear opens settings; seven title taps show DEV and the dev tools in settings.
  - With a dev grant or a short solve, collect one reward, go back: the haul lists it; Uitpakken clears it (reload, go back again: empty).
  - Desktop 1440×900: camp left, card and Alle reizen panel right; no map-table entrance.
  - Storybook: every new story renders; `CampScene` stories still show stand-ins.
  - Anything not reachable unattended (a real new chapter, hearts after trap damage, a camp find landing) goes under Look at in browser with steps.
- [ ] **Step 5: Gate** — each under `timeout 900`: `yarn verify`, `yarn verify-content`, `yarn build`. All pass.
- [ ] **Step 6: Record** in `docs/review-camp-release.md`: this plan's 22 decisions under Decisions (`Phase 6 —`); under Drafts the new strings that are not in the sketches (empty-card text, "Naar het kamp", the generic chapter body, the haul notes, the rest line), nl / en; the toggle-off and gate results; under Look at in browser the screenshots' paths and the unreached checks with steps. Tick this plan's boxes; CHANGELOG line.
- [ ] **Step 7: Commit** — `docs: phase 6 results in the review list`

The driver then runs the phase review (Sonnet), pushes the branch, ticks Phase 6 in `docs/handover-camp-release.md` and adds one line to its State.
