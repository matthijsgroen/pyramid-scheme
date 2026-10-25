# Camp phase 7 — Alle reizen and the Verzameling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Goal:** The three popups the camp opens look and work as the sketches draw them. **Alle reizen** (`MobielReizen.dc.html`, and the panel of `DesktopKamp.dc.html`) is one flat list: tiers as headers, newest first, each with "n van m klaar"; the journey in progress marked **NU**; finished tiers collapsed, with a dot when something new waits inside; locked journeys and the next locked tier saying what they need; every journey one tap away. It replaces `src/app/pages/Travel.tsx` and its map view (`JourneyPathView`, `JourneyCard`, `LockedJourneyCard`). The **Verzameling** (`MobielVerzameling.dc.html`), opened from the chest, shows the collection sections as tabs (Schatten, Hiërogliefen, Snuisterijen, Constructies, the story log), with **NIEUW** on what the player has not looked at yet, "· n nieuw" on a tab, and a count badge on the chest (`Main.dc.html`, `DesktopKamp.dc.html`). The **mosaic window** (`MobielMozaiek.dc.html`) gets its "n van 252 stukjes · k nieuw" line and progress bar. Phase 4 stopped after its Tasks 1–2, so nothing here reads animals or purchases: a locked journey or tier says what it needs from what exists today (a tomb's map pieces, a tier's unlock treasures), and the list model takes one optional input through which a later phase can add a gate's other needs.

**Architecture:** Core owns both screens and names no mod. **Alle reizen** is a pure model, `allJourneys(input)` in `src/app/pages/allJourneys.ts`, that turns the journeys, their state, availability, the mods' journey contributions and the held keys into tier groups and rows; `src/app/pages/AllJourneys.tsx` feeds it from the existing hooks (`useJourneys`, `useAvailableJourneyIds`, `useMergedJourneyContributions`, `useMergedHeldKeys`, `useMergedKeyDisplay`, `useMergedDetectorLevels`) and draws it with new stateless `src/ui` pieces. A tier's need is core's own fact (`TIER_UNLOCK_PERK_IDS` in `src/data`, read today by `isTierUnlocked`), drawn with the symbols the key-display seam already hands out; a tomb's need is the mod's existing `lock`. The model's optional `extraNeeds(gate)` input (`Gate = { tier } | { journeyId }`, the shape phase 4's Task 5 named) is the extension point; nothing fills it in this phase. **The Verzameling** becomes tabs over the existing Collection section registry: each entry gains a `useTab` hook (its label, whether it has anything to show, the ids it can mark new, whether its save is read), and a section is handed `isNew(id)`. What the player has seen lives in one new versioned core store, the **seen save** (`useGameStorage("collectionSeen")`), with the never-clobber read/update pair of `homeSave.ts`; a section without a record is taken as seen, silently, once its own save is read, so no existing player is flooded with NIEUW. A tab's ids become seen when the player leaves the tab or closes the Verzameling. `useCollectionNews()` sums what is new per tab and in all; `Base` puts the sum on the chest. **The mosaic** keeps its place-by-hand window; its page gains the sketch's count line and bar, which the mod draws from its own ledger and placed counts.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Storybook, immer state models (`docs/instructions/state-models.md`), `useGameStorage`, Tailwind v4, i18next (en + nl), a headless Chromium (Playwright from npm, in a scratchpad script) for the look.

**Spec:** `docs/handover-camp-release.md` (Phase 7 brief, "How the driver session works", Decision 7, State — phase 4 stopped after Tasks 1–2, phase 5 skipped), `docs/design/camp-sketches/` (`README.md`, `MobielReizen.dc.html`, `MobielVerzameling.dc.html`, `MobielMozaiek.dc.html`, `DesktopKamp.dc.html`, `Main.dc.html` for the chest badge), `docs/superpowers/plans/2026-10-25-camp-phase-6-camp-home.md` (the home, `CampPopup`, `dialogFocus`, `useHomeSave` as the save pattern, `continueJourney` / `newToDiscoverCount`), `docs/superpowers/plans/2026-10-25-camp-phase-4-animal-gates.md` Task 5 (only for the `Gate` shape the extension point keeps), `docs/mods/TARGET.md`, `docs/review-camp-release.md` (Phase 3 and 6 decisions on Constructies, the story log section, the chest badge; Look at: the interim Travel with its "July 2026 redesign" banner).

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. Commit after every task. Another agent may be reading the repo: commit only your own files.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen` never name a mod, a mod's reward type, a mod's locale namespace, a camp step or a mod's section id; the `no-restricted-imports` rules stay at zero. Core's strings live in `common.json`. Mods import no sibling mod. A tier's unlock treasure ids are core data already (`TIER_UNLOCK_PERK_IDS`); their look comes through `useMergedKeyDisplay`, never by naming the tomb-treasure mod.
- **`src/app/appImports.spec.ts` stays green:** nothing the home pulls in may reach `node:fs`, `worldSpec`, `lockCatalogue` or `webCatalogue`. Run it in every task that adds an import to the app graph.
- **Saves:** one new core store, `useGameStorage("collectionSeen")`, `version: 1`, read through a function that turns an unknown shape into the empty save and updated through one that hands back a value it cannot read **untouched** (`homeSave.ts`'s `readHomeSave` / `updateHomeSave`). It stores only item ids the player has seen, per section id; no count, index or derived flag. No other store changes shape; the journeys, camp, mosaic, tomb, hieroglyph, inventory and conversation saves are only read.
- **No unit test pins real content:** specs build made-up journeys, made-up tiers' keys, made-up sections, made-up ids and made-up saves. No test names a real journey id, a real treasure, a real camp step or a real count of the world. **No bake:** `src/data/` and `src/worldGen/` must be byte-identical at the end of the phase.
- **Design system** (`src/ui/`): stateless, props in, JSX out, no `useTranslation`, no hooks except `useRef`. Every new `src/ui/` component gets a story beside it with made-up props (`docs/instructions/storybook.md`); a changed one gets a story for its new prop. Colours and shapes follow the sketches (`#F4EAD5` panel, `#FFF8EA` rows, `#A3401A` accent, dashed `#B8A584` for locked, Cinzel headings, 44 px touch targets).
- **Dialogs:** every dialog and popup uses `src/ui/atoms/dialogFocus.ts` (`focusOnMount`, `closeOnEscape`, `trapTab`), `role="dialog"`, `aria-modal`, labelled by its title. A confirmation opened inside a popup closes itself first on Escape. Tabs are `role="tablist"` / `tab` (`aria-selected`, `aria-controls`) over a `tabpanel`, left/right arrow keys move between tabs.
- **Strings:** every new user-facing string in both `public/locales/en/` and `public/locales/nl/` (`src/i18n/keys.spec.ts` checks both; plurals through `_one` / `_other`, `src/i18n/plurals.spec.ts`). nl first, spoken everyday Dutch, then en. Texts the sketches carry are used as written; new ones go to the review list as drafts. A key no code asks for any more is removed from both files.
- **Comments state the current state and why, never history.** Commits: one subject line, `type: what changed`, ≤ 72 chars, ending with the session's attribution trailer.
- **Checks per task:** the task's own specs, `yarn check-types`, `yarn lint`. Only Task 9 runs `yarn verify`, `yarn verify-content` and `yarn build`, each under `timeout 900`. Betterer may only re-key entries whose lines moved; a new backlog entry is a finding to fix, never to accept.
- The phase's last step updates the handover's "State" and ticks Phase 7 there (driver's job, not a task).

## Review Focus

1. **The seen save never invents or loses news, and never overwrites what it cannot read:** an id is new only when its section has a record and the id is not in it; a section without a record is seeded silently, and only after that section says its save is read; leaving a tab or closing the Verzameling marks exactly that tab's shown ids; a `version: 2` or damaged value is never written over (Tasks 1, 2, 5; soundness).
2. **Alle reizen offers exactly what Travel offered, flat:** a hidden journey is never listed; a pyramid journey the player cannot pick is not listed but counts in "n van m"; a locked tomb shows its lock and cannot be entered; the current journey continues; a finished one is re-entered at its last site or at a chosen earlier site; starting another journey while one is under way asks first, as Travel did, except for a tomb (Tasks 6, 7).
3. **What a locked thing needs is true:** the next tier's need lists that tier's unlock treasures with the held ones lit; a tomb's need reads its own lock's found/required; nothing is said about animals (Task 6).
4. **Core names no mod:** with every section, contribution and key display absent the Verzameling shows its empty line and Alle reizen still lists, starts and continues journeys (Tasks 2, 7, 9).
5. **Nothing of Travel is left behind:** no import of the deleted components, no dead locale key, no tap-hint key without a user, the dev tools stay in settings (Task 7).
6. **Toggle-off:** each mod out of `REGISTERED_MODS` in turn, `check-types` and `build` pass and the list of what drops is recorded (Task 9).

## Decisions for the review list

Each is the option that changes the least shipped behaviour or the one the brief or sketch names; Task 9 writes them into `docs/review-camp-release.md` under Decisions, each prefixed `Phase 7 —`.

1. **Rows within a tier keep the authored order;** only the tiers run newest first. The sketch shows the in-progress journey above an earlier finished one. Alternative: newest first inside a tier as well, or the current journey always on top.
2. **A pyramid journey the player cannot pick yet is not listed** (as Travel), but it counts in the header's "n van m klaar", so the header says how much of the tier is left. Alternative: list it as a locked row "Eerst <vorige reis>".
3. **The next locked tier shows as a header with one locked line,** "Vind een van deze schatten" with that tier's unlock treasures as symbols, the held ones lit; tiers beyond it are not shown. A tier whose key is held but which this release does not ship keeps Travel's "onderweg" note. Alternative: show every locked tier, or none.
4. **A locked tomb keeps its name hidden,** as the locked card did: it reads as the mod's lock title ("Schatlokatie") with the journey's `mapHint`, and its need line "Kaartdelen: 2 van 3". The sketch names it ("Edelman's Verborgen Kluis", "Nog 1 kaartstuk nodig"). Alternative: name it, as the sketch does.
5. **Revisiting:** tapping a finished journey's row goes straight back in at its last site (what tapping Travel's map card did); a separate chevron on the row opens its sites as numbered stops — a dot on a stop that holds something new, a buried stop shut — and tapping a stop goes in there. A journey in progress gets the same chevron for the sites already behind the player. Alternative: tapping a finished row opens the stops, two taps to go in.
6. **Mods' journey-card slots** (the tableau's fragment preview, the sand's "nog n% bedolven") show inside the opened stops of a row, the only place a row has room for them. Alternative: drop the card-slot registry.
7. **Starting or re-entering another journey while one is under way asks first** with Travel's confirmation ("Onderbreek expeditie"), except when the one under way is a tomb, which is left without asking, as Travel did. Alternative: always ask, or never.
8. **A finished tier is collapsed** (its header a button with a chevron, the dot when something inside is new) unless it is the newest open tier; the player's opening and closing of a tier is not saved. Alternative: remember it per device in browser storage.
9. **Row lines** (drafts where the sketch has none): in progress "Bezig · piramide n van m" / "Bezig · in de graftombe", finished with news "Voltooid · iets nieuws te ontdekken" plus the dot, finished without a check mark, not started "Nog niet geweest". The mark a mod gives a journey (the map piece 📜) stays at the row's end. Alternative: the sketch's specific "1 verborgen deur open", which needs per-mod wording.
10. **The dot means what Travel's ring meant:** a finished journey with a reachable unexplored site, or, with the corridor detector at level 4, an unexplored hidden corridor. Alternative: only the first.
11. **Desktop shows the same list, compact** (name, short note, dot; no icon tile), as `DesktopKamp.dc.html`. Alternative: the phone rows in the panel.
12. **Travel's tap hints go** (`travelMap`, `firstJourney`): the hand on **Op pad** (phase 6) is the only first-run hint. Alternative: point at the first row when Alle reizen opens for the first time.
13. **The Verzameling's tabs follow the registry order** (Schatten, Hiërogliefen, Snuisterijen, Constructies, Verhalen), not the sketch's Hiërogliefen-first. A tab shows once its section holds something; with none the popup says "Je kist is nog leeg". It opens on the first tab with something new, else the first. Alternative: the sketch's order, or every tab always.
14. **Constructies stays a Verzameling tab** (the queue's brief) although the sketch's note says camp things are seen in the camp only. Alternative: drop the tab.
15. **NIEUW marks** a treasure held, a hieroglyph completed, a sellable owned, a structure part found and a story scene heard, for as long as the player has not left that tab; leaving the tab or closing the Verzameling marks everything that tab showed. A partly found hieroglyph is not new until it is whole. Alternative: mark each item seen when it is tapped.
16. **The seen save starts silently:** a section with no record is seeded with everything it holds the first time its own save has been read, so a save from before this phase shows no NIEUW, and a fresh game shows NIEUW from the first find. Alternative: mark everything already held as new once.
17. **The chest's badge is the number of new items** over all tabs, hidden at zero (`Main.dc.html`). The window gets no badge (the sketch has none). Alternative: the window shows the number of pieces still to set in.
18. **A section's own heading goes inside its tab** where it only repeats the tab (Constructies, the story log); the tomb treasures and hieroglyphs keep their per-difficulty and per-category headings. Alternative: keep every heading.
19. **The Verzameling has no chest picture at its top;** the popup's title row is the plain one every camp popup has. Alternative: the sketch's banner with the open chest.
20. **On a phone a camp popup is an inset panel** over the dimmed camp (16 px at the sides, below the HUD, rounded), as all three sketches draw it; on desktop it stays the centred panel. Alternative: keep phase 6's full-screen popup.
21. **The mosaic keeps placing by hand:** the window still waits for the player's "zet n stukjes" tap and outlines what just fell in; below it the sketch's "n van 252 stukjes" (pieces found, as the window's label counts them), "k nieuw" (found, not yet set in) and the bar. Alternative: set the pieces in by themselves when the window opens.

---

### Task 1: The seen save (**soundness**: saves; Opus, per-task review)

**Files:**

- Create: `src/game/collectionSeen.ts`, `src/game/collectionSeen.spec.ts`
- Create: `src/app/pages/useCollectionSeen.ts`, `src/app/pages/useCollectionSeen.spec.ts`

**Interfaces:**

- Produces (game, a state model): `CollectionSeen = { version: 1; seen: Record<string, string[]> }`, `emptyCollectionSeen()`.
  - Actions (immer, pure): `markSeen(save, section, ids)` adds the ids not yet in the section's list (creating the record when missing), never removes one; `seedSection(save, section, ids)` creates the record with those ids only when the section has none, otherwise returns the save unchanged.
  - Queries (pure): `hasRecord(save, section)`; `newIds(save, section, ids)` — the given ids not in the record, in the given order; empty when the section has no record.
  - `readCollectionSeen(stored: unknown): CollectionSeen` — another shape or version, or a record that is not a list of strings, reads as the empty save; a v1 save comes back unchanged, records of unknown sections included. `updateCollectionSeen(stored, action): unknown` — nothing stored starts from the empty save; a stored value it cannot read is returned untouched.
- Produces (app): `useCollectionSeen(): { loaded: boolean; hasRecord(section); newIds(section, ids); markSeen(section, ids); seedSection(section, ids) }` over `useGameStorage("collectionSeen", emptyCollectionSeen)`, every read through `readCollectionSeen`, every write through `updateCollectionSeen` from the latest stored value; the actions keep their identity across writes.

- [x] **Step 1: Failing tests** (made-up section ids and item ids).
  - `collectionSeen.spec.ts`: `newIds` is empty for a section without a record and lists unseen ids in order once seeded; `markSeen` twice with overlapping ids keeps each id once and keeps earlier ones; `seedSection` on a section with a record changes nothing (same reference), on one without creates it; `readCollectionSeen` of `undefined`, a number, an object without `version`, `version: 2`, and a v1 save whose record holds a number gives the empty save; a v1 save with an unknown section reads back with it; `updateCollectionSeen` on a `version: 2` value returns that value itself (same reference), on `undefined` applies the action to the empty save.
  - `useCollectionSeen.spec.ts` (renderHook over the real storage, fresh store): seed then `markSeen` then `newIds` gives what is left; the stored value carries `version: 1` and id lists only; with a `version: 2` value primed in storage, `markSeen` and `seedSection` leave the stored value unchanged and `newIds` is empty.
- [ ] **Step 2: Run** `yarn test src/game/collectionSeen src/app/pages/useCollectionSeen` — FAIL.
- [x] **Step 3: Implement.** The model file's comment says why a section without a record has nothing new (a save from before, or a mod switched on later, is not flooded) and why an unreadable save is left alone.
- [x] **Step 4: Run** the specs — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Per-task review** (soundness): no write path bypasses `updateCollectionSeen`; nothing derived is stored; an unreadable value survives every action; the store key is core's and generic.
- [x] **Step 6: Commit** — `feat: the seen save remembers what the collection showed`

---

### Task 2: Collection tabs as a seam, and what is new

One agent (Sonnet).

**Files:**

- Modify: `src/app/pages/collectionSectionRegistry.ts` (and its spec if one exists; else Create `collectionSectionRegistry.spec.ts`)
- Create: `src/app/pages/useCollectionNews.ts`, `src/app/pages/useCollectionNews.spec.tsx`
- Modify: `public/locales/{en,nl}/common.json` (`collection.tabNew`, plural)
- Modify: `src/app/pages/Collection.tsx` (passes `isNew` answering false and the NIEUW label, until Task 5 wires it)

**Interfaces:**

- Produces: `CollectionTab = { label: string; shown: boolean; ids: readonly string[]; loaded: boolean }` — the label in the mod's own words; whether the section has anything to show; the ids it can mark new (only things the player holds); whether the section's save has been read.
- Changes: `CollectionSectionEntry` gains `useTab?: () => CollectionTab` (optional in this task only, see Step 3). `CollectionSectionProps` gains `isNew: (id: string) => boolean` and `newLabel: string`.
- Produces: `useCollectionNews(): { tabs: { id: string; label: string; shown: boolean; newIds: readonly string[] }[]; total: number; markTabSeen(id: string): void }` — calls every entry's `useTab` in registry order (fixed at module load, the `rewardContributions.ts` pattern), reads the seen save, and once both the seen save and a tab are loaded seeds that tab's record from its ids when it has none (an effect, once per missing record). `total` sums the shown tabs' new ids. `markTabSeen` marks that tab's current ids.
- Core string: `collection.tabNew_one/_other` "{{label}} · {{count}} nieuw" / "{{label}} · {{count}} new" (the sketch's "Schatten · 1 nieuw").

- [x] **Step 1: Failing tests** (made-up registrations through the registry, reset per spec; the real seen storage, fresh store).
  - A section without a record shows no new ids before it is loaded, and after it reports `loaded` its record is seeded with its ids and still nothing is new; an id that appears afterwards is new and counted in `total`.
  - A tab that is not loaded is never seeded, however long the seen save has been loaded.
  - `markTabSeen` empties that tab's new ids and leaves the other tab's.
  - A tab that is not `shown` adds nothing to `total`.
  - With no section registered: no tabs, `total` 0.
- [ ] **Step 2: Run** `yarn test src/app/pages/useCollectionNews src/app/pages/collectionSectionRegistry` — FAIL.
- [x] **Step 3: Implement.** The registry comment says what a tab declares and that `ids` are only things held. So that this commit type-checks before the mods are filled, `useTab` is optional here and an entry without one is skipped by `useCollectionNews` (no tab, nothing new); Task 4 makes it required once every section supplies one.
- [x] **Step 4: Run** the specs — PASS. `yarn test src/i18n`, `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: collection sections are tabs that know what is new`

---

### Task 3: The design-system pieces

One agent (Sonnet). Follow `MobielReizen.dc.html`, `DesktopKamp.dc.html` (the panel), `MobielVerzameling.dc.html`, `MobielMozaiek.dc.html`.

**Files** (each new component with `.stories.tsx` beside it; specs where named):

- Create: `src/ui/atoms/NewBadge.tsx`
- Modify: `src/ui/molecules/CollectibleSlot.tsx`, `CollectibleSlot.spec.tsx`, `CollectibleSlot.stories.tsx` (`newLabel?`)
- Modify: `src/ui/molecules/StructureRow.tsx`, `StructureRow.spec.tsx`, `StructureRow.stories.tsx` (`newLabel?` on a part)
- Create: `src/ui/molecules/CollectionTabs.tsx`, `CollectionTabs.spec.tsx`
- Create: `src/ui/molecules/JourneyRow.tsx`, `JourneyRow.spec.tsx`
- Create: `src/ui/molecules/TierHeader.tsx`, `TierHeader.spec.tsx`
- Create: `src/ui/molecules/JourneyStops.tsx`, `JourneyStops.spec.tsx`
- Create: `src/ui/molecules/CountProgress.tsx`
- Create: `src/ui/organisms/JourneyList.tsx`, `JourneyList.spec.tsx`
- Modify: `src/ui/organisms/CampPopup.tsx`, `CampPopup.spec.tsx`, `CampPopup.stories.tsx` (inset panel on a phone, decision 20)

**Interfaces:**

- `NewBadge`: `{ label }` — the small accent pill ("NIEUW").
- `CollectibleSlot` / `StructureRow` part: `newLabel?: string` — when set, the NewBadge on the slot's corner and an accent border; the accessible name includes it.
- `CollectionTabs`: `{ tabs: { id; label }[]; selected: string; onSelect(id); panelId: string }` — a scrolling row of tab buttons, the selected one dark (sketch), `role="tablist"`, arrow keys move and select.
- `JourneyRow`: `{ name; note?; status: "current" | "open" | "finished" | "locked"; exterior: "pyramid" | "tomb"; currentLabel: string /* "NU" */; dot?: boolean; dotLabel?: string; mark?: string; needs?: { label; symbols?: { symbol; held }[] }[]; compact?: boolean; onOpen?(); stops?: { label; open: boolean; onToggle() } ; children? /* the opened stops */ }` — the sketch's row: icon tile (pyramid, tomb, lock), name, note, NU / dot / check at the end; locked rows dashed, transparent and `aria-disabled` with their needs read; `compact` drops the icon tile (desktop); the chevron is its own 44 px button with `aria-expanded`.
- `TierHeader`: `{ title; progress: string /* "1 van 5 klaar" */; collapsible?: { open: boolean; onToggle(); label } ; dot?: boolean; dotLabel?: string }` — a plain divider header, or a button with a chevron when collapsible.
- `JourneyStops`: `{ stops: { n: number; label: string; state: "done" | "ahead" | "buried"; dot?: boolean }[]; onStop(n) ; children? /* mod slots */ }` — numbered stops; only `done` stops are buttons.
- `CountProgress`: `{ label: string; note?: string; value: number; max: number }` — the bold label, the muted note on the right, the bar.
- `JourneyList`: `{ groups: { key; header: ReactNode; rows: ReactNode[]; open: boolean }[]; footer?: ReactNode; emptyText?: string }` — the scrolling flat list, collapsed groups showing their header only.
- `CampPopup`: below `lg` an inset panel (16 px gutters, top below the safe area plus the HUD height the caller passes or a fixed 72 px, 40 px from the bottom plus safe area, 18 px radius, 2 px border) over `bg-black/60`; from `lg` unchanged; `fill` keeps working.

- [x] **Step 1: Failing tests.** `CollectibleSlot`/`StructureRow`: `newLabel` shows the badge and is in the accessible name; without it none. `CollectionTabs`: the selected tab has `aria-selected`; a click and ArrowRight call `onSelect` with the right id. `JourneyRow`: `onOpen` fires on an open/current/finished row; a locked row is `aria-disabled`, fires nothing, shows each need and lit/unlit symbols; current shows its NU label; `dot` shows with its label; the chevron toggles without firing `onOpen`. `TierHeader`: collapsible header toggles and carries `aria-expanded`; plain header is not a button. `JourneyStops`: a done stop calls `onStop(n)`; ahead and buried stops are not buttons; a dot shows on its stop. `JourneyList`: a closed group renders its header and none of its rows. `CampPopup`: the existing Escape/close/label tests stay green.
- [ ] **Step 2: Run** `yarn test src/ui/atoms src/ui/molecules src/ui/organisms` — FAIL.
- [x] **Step 3: Implement.** Stories with made-up props: `JourneyRow` in each status, compact, with a need and symbols, with stops open; `TierHeader` plain, collapsed with dot; `JourneyStops` with done/ahead/buried and a dot; `JourneyList` as the sketch (Junior open with NU, finished with dot, locked tomb; Beginner collapsed with dot) at 390 px and in a 440 px panel; `CollectionTabs` with five tabs, one "· 1 nieuw"; `CountProgress` "61 van 252 stukjes · 3 nieuw"; `CollectibleSlot` and `StructureRow` with NIEUW; `CampPopup` at phone and desktop width. Tailwind class order per lint.
- [x] **Step 4: Run** — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: pieces for all journeys, collection tabs and NIEUW`

---

### Task 4: The mods fill their tabs, and the mosaic its count

Mechanical, batched; one agent (Sonnet). Each change stays inside the mod's existing `isModEnabled` gate; no mod imports a sibling.

**Files:**

- Modify: `src/mods/tombTreasure/app/index.ts`, `TombTreasureCollectionSection.tsx`; Create `src/mods/tombTreasure/app/collectionTab.ts`, `collectionTab.spec.tsx`
- Modify: `src/mods/hieroglyph/app/collection.ts`, `HieroglyphCollectionSection.tsx`; Create `src/mods/hieroglyph/app/collectionTab.ts`, `collectionTab.spec.tsx`
- Modify: `src/mods/shop/app/index.ts`, `ShopCollectionSection.tsx`; Create `src/mods/shop/app/collectionTab.ts`, `collectionTab.spec.tsx`
- Modify: `src/mods/camp/app/index.ts`, `CampCollectionSection.tsx`; Create `src/mods/camp/app/collectionTab.ts`, `collectionTab.spec.tsx`
- Modify: `src/mods/story/app/index.ts`, `src/mods/story/app/log/StoryLogSection.tsx`; Create `src/mods/story/app/log/collectionTab.ts`, `collectionTab.spec.tsx`
- Modify: `src/mods/mosaic/app/MosaicPage.tsx`, `MosaicWindow.tsx`, `MosaicWindow.spec.tsx`, `MosaicWindow.stories.tsx`
- Modify: the locale files where each mod keeps its strings today (`public/locales/{en,nl}/…`)
- Modify: `src/app/pages/collectionSectionRegistry.ts` (`useTab` becomes required)

**Interfaces:**

- tomb-treasure `useTab`: label "Schatten" / "Treasures"; ids = treasure ids whose key is held; shown when any; loaded = its mod state's loaded flag. The section passes `newLabel` to a slot whose treasure `isNew`.
- hieroglyph: label "Hiërogliefen" / "Hieroglyphs"; ids = completed hieroglyphs (all fragments, or held as an item); shown when any fragment is found; loaded from its progress and the inventory.
- shop: label from the existing junk category name without its emoji, "Snuisterijen" / its en; ids = sellables owned; shown when any.
- camp: label "Constructies" (`camp:collection.title`); ids = found parts as `structure/part`; shown when any structure is started; the section drops its `StructuresPanel` title in the tab (decision 18) and passes `newLabel` to new parts; a structure row with a new part shows the badge on the row too.
- story: label "Verhalen" / "Stories" (draft); ids = heard scene ids; shown when any; the section drops its own `<h2>`; a new scene's row carries the NewBadge.
- mosaic: `MosaicPage` keeps the window and its place button and adds `CountProgress` below it: label `mosaic.window.count` "{{found}} van {{total}} stukjes" (found counted as the window's label counts it), note `mosaic.window.new` "{{count}} nieuw" (owned, not yet placed; hidden at 0), value/max found/total; the page sits on the popup's light panel, the window in its dark arch.

- [x] **Step 1: Failing tests** (made-up state through each mod's own test helpers; translations through the test `t`).
  - Each `collectionTab.spec`: with nothing held the tab is not shown and has no ids; with two held made-up items its ids are those two; `loaded` follows the mod's own loaded flag.
  - One render spec per changed section (tomb, camp, story enough): an item for which `isNew` answers true carries the `newLabel`, the others do not.
  - `MosaicWindow.spec` (or a `MosaicPage` spec): made-up owned/placed counts show "found van total" and "k nieuw"; with nothing carried no "nieuw".
- [ ] **Step 2: Run** `yarn test src/mods/tombTreasure src/mods/hieroglyph src/mods/shop src/mods/camp src/mods/story src/mods/mosaic` — FAIL.
- [x] **Step 3: Implement.** Strings nl first, en second.
- [x] **Step 4: Run** the specs — PASS. `yarn test src/i18n`, `yarn check-types`, `yarn lint` (import rules at zero).
- [x] **Step 5: Commit** — `feat: every collection section is a tab with NIEUW marks`

---

### Task 5: The Verzameling popup, and the chest's badge

One agent (Sonnet); per-task review (it writes the seen save).

**Files:**

- Modify: `src/app/pages/Collection.tsx`, `src/app/pages/Collection.spec.tsx`
- Modify: `src/app/Base.tsx`, `src/app/Base.spec.tsx` (chest badge)
- Modify: `public/locales/{en,nl}/common.json` (`collection.empty`, `camp.entrance.collectionNew` if the badge needs its own accessible text)

**Interfaces:**

- Consumes: `useCollectionNews()`, `collectionSections()`, `CollectionTabs`, `NewBadge`.
- Produces: `CollectionPage` — the shown tabs (label, with `collection.tabNew` when it has new ids) over the selected section's panel and the shared detail panel; the first tab with something new is selected on open, else the first; the selected section gets `isNew = id ∈ that tab's new ids at the moment the tab opened` (so a badge does not vanish while looking) and `newLabel` "NIEUW" / "NEW"; switching away from a tab and unmounting the page call `markTabSeen` for the tab that was open; no shown tab → `collection.empty` "Je kist is nog leeg" / "Your chest is still empty" (draft). Fez's `collectionIntro` stays.
- `Base`: the chest entrance gets `badge = total` when above 0.

- [x] **Step 1: Failing tests.**
  - `Collection.spec.tsx` (two made-up sections, made-up seen save): only shown sections become tabs; the tab with something new opens first and its label reads "· 1 nieuw"; its new item carries NIEUW; switching to the other tab marks the first tab's ids seen in storage and the NIEUW is gone when switching back; unmounting marks the open tab; no shown section → the empty line; the tab list is a `tablist` with the panel labelled by the tab.
  - `Base.spec.tsx`: with a made-up section holding one new id the chest's accessible name carries the count; with none, no badge.
- [ ] **Step 2: Run** `yarn test src/app/pages/Collection src/app/Base` — FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** — PASS. `yarn test src/app/appImports`, `yarn test src/i18n`, `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Per-task review:** seen is marked only on leaving a tab or closing; only the open tab's ids; nothing is marked for a tab never opened; the badge counts shown tabs only.
- [x] **Step 6: Commit** — `feat: the Verzameling opens in tabs and the chest counts what is new`

---

### Task 6: The Alle reizen model

One agent (Sonnet).

**Files:**

- Create: `src/app/pages/allJourneys.ts`, `src/app/pages/allJourneys.spec.ts`
- Modify: `src/app/pages/journeyAvailability.ts`, `src/app/pages/journeyAvailability.spec.ts` (`tierKeyNeed`)

**Interfaces:**

- Produces: `Gate = { tier: Difficulty } | { journeyId: string }`; `JourneyNeed = { key: string; label: string; progress?: { found: number; required: number }; symbols?: readonly { symbol: string; held: boolean }[] }`.
- Produces: `tierKeyNeed(tier, heldKeys, display: (keyId) => { symbol } | undefined, label: string): JourneyNeed | undefined` — undefined for a tier with no unlock keys; otherwise one need with the given label and one symbol per unlock key that has a display, `held` from the held keys.
- Produces: `allJourneys(input): { groups: TierGroup[]; comingSoon?: Difficulty }` with `input = { journeys; activeJourneyId?; isInProgress(id); completionCount(id); levelNr(id); available: ReadonlySet<string>; hidden(id); lock(id): JourneyLock | undefined; news(id): boolean; tierOpen(tier): boolean; tierNeeds(tier): readonly JourneyNeed[]; comingSoon?: Difficulty; extraNeeds?: (gate: Gate) => readonly JourneyNeed[] }`.
  - `TierGroup = { tier; done: number; total: number; finished: boolean; news: boolean; collapsed: boolean; locked: boolean; needs: readonly JourneyNeed[]; rows: readonly JourneyRowModel[] }`; `JourneyRowModel = { journeyId; status: "current" | "open" | "finished" | "locked"; levelNr: number; levelCount: number; news: boolean; needs: readonly JourneyNeed[] }`.
  - Rules: tiers newest first; a tier is listed when `tierOpen` or any of its journeys is `available` (develop mode opens them all); the one tier after the highest listed, if `tierOpen` is false for it, is listed `locked` with `needs = tierNeeds(tier) ++ extraNeeds({ tier })` and no rows. Rows keep the journeys' order; a `hidden` journey is skipped and not counted; a pyramid journey (no `entryLock`) not in `available` is not a row but counts in `total`; an entry-locked journey whose `lock` is unmet is `locked` with the lock as a need (`label` = the lock's unit, `progress` = found/required); any journey with non-empty `extraNeeds({ journeyId })` is `locked` with those needs added. Status otherwise: `current` when it is the active journey and in progress, `finished` when its completion count is above 0, else `open`. `done` = finished journeys of the tier, `total` = its journeys not hidden. `finished` = done equals total. `news` = any row's news. `collapsed` = finished and not the newest listed open tier. `comingSoon` passes through.
  - `extraNeeds` is the one extension point for a gate's other requirements; its doc comment says a mod-filled registry may feed it and that nothing does today.

- [x] **Step 1: Failing tests** (made-up journeys over three tiers, one tomb with a lock, made-up keys).
  - Tiers come newest first; the tier above the highest open one is listed locked with its key need and no rows; a further tier is not listed.
  - A not-yet-available pyramid journey is no row but counts in "total"; a hidden one is neither.
  - The active in-progress journey is `current`; a completed one `finished`; others `open`.
  - A locked tomb is `locked` with progress 2/3; with its lock met it is `open`.
  - An `extraNeeds` answer for a journey locks it, for a tier adds to its needs; without `extraNeeds` nothing changes.
  - A fully finished older tier is collapsed with `news` when one row has news; the newest open tier is never collapsed.
  - `tierKeyNeed`: no keys → undefined; held keys lit; a key without display gives no symbol.
- [ ] **Step 2: Run** `yarn test src/app/pages/allJourneys src/app/pages/journeyAvailability` — FAIL.
- [x] **Step 3: Implement** as pure functions; each rule one sentence of comment.
- [x] **Step 4: Run** — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: the all-journeys list as one flat model`

---

### Task 7: Alle reizen replaces Travel

One agent (Sonnet). The biggest task: it removes the Travel page.

**Files:**

- Create: `src/app/pages/AllJourneys.tsx`, `src/app/pages/AllJourneys.spec.tsx`
- Modify: `src/app/Base.tsx`, `src/app/Base.spec.tsx` (popup and desktop aside show `AllJourneys`)
- Delete: `src/app/pages/Travel.tsx`, `src/app/pages/Travel.spec.tsx`, `src/ui/atoms/JourneyPathView.tsx`, `JourneyPathView.spec.tsx`, `JourneyPathView.stories.tsx`, `src/ui/organisms/JourneyCard.tsx`, `JourneyCard.stories.tsx`, `src/ui/organisms/LockedJourneyCard.tsx`, `LockedJourneyCard.spec.tsx`, `LockedJourneyCard.stories.tsx`
- Modify: `src/ui/atoms/TapHint.stories.tsx` (a plain made-up target instead of the map), `src/app/state/useTapHint.ts` and its spec only if `travelMap` / `firstJourney` are listed there (the spec then uses made-up keys), `src/ui/atoms/DetectorPanel.tsx` (its comment names `JourneyCard`)
- Modify: `public/locales/{en,nl}/common.json` (`journeys.*` row lines, tier progress, need label, stops; keys only Travel used removed from both)

**Interfaces:**

- Consumes: Task 6's model; `useJourneys`, `useJourneyTranslations`, `useAvailableJourneyIds`, `useMergedJourneyContributions`, `useMergedHeldKeys`, `useMergedKeyDisplay`, `useMergedDetectorLevels`, `isTierUnlocked`, `comingSoonDifficulty`, `journeyCardSlots`, `ConfirmModal`, Task 3's pieces.
- Produces: `AllJourneys({ startGame, compact? })`:
  - feeds `allJourneys` with `news(id)` = finished and (an unexplored reachable site, or the corridor detector at 4 with an outstanding hidden corridor) — Travel's two rules, moved; `tierNeeds(tier)` = `tierKeyNeed(tier, heldKeys, keyDisplay, t("journeys.tierNeed"))` (draft "Vind een van deze schatten" / "Find one of these treasures"); `extraNeeds` left out.
  - Draws `JourneyList` with a `TierHeader` per group ("{{done}} van {{total}} klaar"; collapsible when `finished`, open by default when not `collapsed`; local state) and a `JourneyRow` per row: name (a locked tomb: its lock's title and `mapHint`), the note of decision 9, NU, the dot, the mod mark.
  - Taps: `current` → `startGame`; `open` → `startJourney` (awaited) then `startGame`; `finished` → `visitLevel(id, levelCount)` (awaited) then `startGame`; a stop → `visitLevel(id, n)` then `startGame`. When another journey is in progress and the tapped one is not it, a pyramid in progress asks first with Travel's `ConfirmModal` texts, a tomb in progress does not; confirm → `cancelJourney`, then the tap's action.
  - Stops (chevron) for `current` and `finished` rows with more than one site: one stop per site, `done` when behind the player (all for a finished journey), `buried` from the contributions' `buried`, a dot from Travel's unexplored-node rule (moved verbatim, including the web-key case for the site the player is in); the mod card slots render under the stops with the journey's state.
  - The tier-coming-soon note (Travel's strings) as the list's footer when `comingSoon` is set.
- `Base`: the journeys popup and the desktop aside render `AllJourneys` (`compact` on desktop); the hint row and the map table keep opening it.

- [x] **Step 1: Failing tests** (`AllJourneys.spec.tsx`: made-up journeys through mocked `useJourneys` and translations as `Travel.spec.tsx` did; made-up contributions; made-up key display).
  - The newest tier's header comes first with its "n van m klaar"; the current journey shows NU and its tap calls `startGame` without starting anything.
  - An open journey's tap starts it, then calls `startGame`.
  - A finished journey's tap visits its last site; its chevron shows the stops and a stop's tap visits that site; a buried stop is not a button.
  - With a pyramid in progress, tapping another journey shows the confirmation; confirming cancels, starts and calls `startGame`; cancelling does nothing. With a tomb in progress no confirmation shows.
  - A locked tomb shows its unit and "2 van 3" and its tap does nothing.
  - A finished older tier is collapsed with a dot when one of its journeys has an unexplored site; opening it shows the rows.
  - The locked next tier shows "Vind een van deze schatten" and the symbols the made-up key display gives, the held one lit.
  - A registered made-up card slot renders inside an opened row.
  - `Base.spec.tsx`: on a phone the map table and Alle reizen open a dialog with the list; on desktop the list is in the page.
- [ ] **Step 2: Run** `yarn test src/app/pages src/app/Base` — FAIL.
- [x] **Step 3: Implement.** Remove every import of the deleted files (`rg "TravelPage|JourneyPathView|JourneyCard\b|LockedJourneyCard|travelMap|firstJourney" src` finds nothing; `journeyCardSlots` stays). Remove locale keys no code asks for any more (check each with `rg` across `src/` before removing), in both languages.
- [x] **Step 4: Run** `yarn test src/app src/ui src/mods/hieroglyph src/mods/topology src/i18n`, `yarn test src/app/appImports` — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: all journeys in one list, the travel page goes`

---

### Task 8: The review fixes slot

Reserved for the end-of-phase review's findings (driver dispatches a fresh Sonnet agent per finding batch). If the review finds nothing, tick and skip.

- [x] **Step 1:** fix each finding with a failing test first where it is behaviour; run the touched specs, `yarn check-types`, `yarn lint`.
- [x] **Step 2: Commit** — `fix: <what the review found>`

---

### Task 9: Gate, toggle-off, look, record

**Files:**

- Modify: `docs/review-camp-release.md` (decisions, drafts, toggle-off and gate results, look-at items; the Phase 6 "chest carries no badge yet" and "Alle reizen is the interim Travel page" lines each get "— done in phase 7" appended rather than removed)
- Modify: `CHANGELOG.md` (`## Unreleased`: edit the existing camp line, do not add a new bullet — e.g. "The camp is home: set off, all journeys in one list, the collection in tabs with NIEUW marks and the mosaic open from the camp; coming home shows your haul.")
- Modify: `docs/superpowers/plans/2026-10-25-camp-phase-7-journeys-collection.md` (tick boxes)
- Possibly: `.betterer.results` (re-keyed lines only)

**Interfaces:** none.

- [x] **Step 1: No bake.** `git diff --stat <phase start>..HEAD -- src/data/ src/worldGen/` is empty; if not, that is a finding, not a bake.
- [x] **Step 2: Toggle-off.** One at a time, every mod in `src/mods/registeredMods.ts` (`puzzleMod`, `mosaicMod`, `hieroglyphMod`, `trapMod`, `campMod`, `shopMod`, `tombTreasureMod`, `storyMod`, `topologyMod`): remove the entry and its import, each under `timeout 900`: `yarn check-types`, `yarn build`; restore with `git checkout src/mods/registeredMods.ts`; `git status --short` clean. Record per mod what drops from these screens (tombTreasure: the Schatten tab, the tomb rows' lock and mark, the tier symbols — the tier need shows its label alone; hieroglyph: the Hiërogliefen tab and the fragment card slot; shop: Snuisterijen; camp: Constructies; story: Verhalen; topology: buried stops and the sand slot; mosaic: the window and its count). A mod whose removal fails: check the same removal at the phase's first commit; if it failed there too, record it under Failures as pre-existing, otherwise fix it here.
- [x] **Step 3: Look** (`docs/instructions/browser-checks.md`: Playwright from npm in a scratchpad script — the MCP server may be down — own `yarn dev` on a free port, a fresh context per check, close everything, screenshots to `.playwright-mcp/`):
  - Phone 390×844, fresh save: Alle reizen from the card — Beginner header "0 van n klaar", the first journey "Nog niet geweest", the locked Junior line with its four treasure symbols unlit; tapping the first journey sets off; back home, the row reads NU. The chest has no badge; the Verzameling says the chest is empty.
  - Seven title taps for develop mode, grant "All treasures + keys" (settings): every tier listed; the chest's badge shows a count; the Verzameling opens on Schatten "· n nieuw" with NIEUW slots; switch tab, switch back: the NIEUW is gone; close, the chest's badge has dropped by that many. Reload: still gone.
  - The mosaic window: "n van 252 stukjes" and the bar.
  - Desktop 1440×900: the compact list in the panel beside the camp under the Verder met card; the popups (Verzameling, mosaic) as centred panels.
  - Storybook: every new and changed story renders.
  - Anything not reachable unattended (a real finished tier collapsing with a dot, a stop with something new, a tomb lock at 2 of 3, the confirmation with a pyramid under way) goes under Look at in browser with steps.
- [x] **Step 4: Gate** — each under `timeout 900`: `yarn verify`, `yarn verify-content`, `yarn build`. All pass.
- [x] **Step 5: Record** in `docs/review-camp-release.md`: this plan's 21 decisions under Decisions (`Phase 7 —`); under Drafts every new string not in the sketches (row lines, "Vind een van deze schatten", "Je kist is nog leeg", "Verhalen", the stops' labels, the mosaic's "nieuw"), nl / en; the toggle-off and gate results; under Look at in browser the screenshots' paths and the unreached checks with steps; remove nothing else. Tick this plan's boxes; edit the CHANGELOG line.
- [x] **Step 6: Commit** — `docs: phase 7 results in the review list`

The driver then runs the phase review (Sonnet), dispatches Task 8 for its findings, pushes the branch, ticks Phase 7 in `docs/handover-camp-release.md` and adds one line to its State.
