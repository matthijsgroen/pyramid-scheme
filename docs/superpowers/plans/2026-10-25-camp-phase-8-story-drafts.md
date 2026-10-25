# Camp phase 8 — story drafts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Goal:** Fez and the explorer talk at the new places the camp release made: in every tomb (entering the cave, reaching the pillar, arriving at the cavern), in the camp (the first time home together, coming home with and without a haul, resting at the fire after taking damage, a new chapter per tier), when the camp gets its first find and its first finished structure. Every line is drafted in spoken Dutch first, then English, both shipped, each marked draft and listed in the review list with where it fires. Each beat plays once, where intended. The Fez-and-animals lines (animals for sale, each purchase, the banner, a gate blocked for want of an animal, the animal letting the player through, the animal arriving in the camp) are **drafted only**: phase 4 stopped after its Tasks 1–2, so no purchase, gate or animal stock exists to fire them. They are parked in the story data, unwired, and listed as "drafted, waits on phase 4".

**Architecture:** The lines live where the story layer keeps every beat: `public/locales/{nl,en}/fez.json`, read by `spokenLines` as `<conversation>.<n>.<speaker>`, with optional poses in `src/app/fez/storyPoses.ts`. The source copy, nl and en side by side with where each scene fires, goes in a new script file beside the acts. Firing reuses the **reaction rail**, the existing core seam through which core reports facts and the story mod alone decides which beat a fact is worth (`src/app/reactions/reactionContributions.ts`, `src/mods/story/app/reaction/rail.ts`, `beatFor`). Core gains new `Reaction` kinds for the places and the home (`siteArrived`, `exitReached`, `homeShown`, `chapterOpened`; `siteLeft` learns which level was left) and one small core registry of **home tags**: opaque strings a mod says about the player's state at home (the trap mod: "a heart was refilled at the last homecoming"; the camp mod: "something has been found", "a structure is complete"). Core never reads a tag; the story mod matches them. The story mod maps each reaction to an **ordered list of candidate beats** and the rail offers the **first one the save has not heard** (the `conversations` store FezCompanion already keeps), so one moment never speaks twice and a beat dropped because Fez is not met yet stays unheard for later. Only beats in a declared set play, so an id without lines can never render "not-found". What is a draft is a list in the story mod (`DRAFT_BEATS`), which the designer empties as lines are approved; the unwired animal lines are a second list (`WAITING_BEATS`) naming the phase-4 seam each waits on.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, i18next (nl + en), `useGameStorage`, a headless Chromium (Playwright from npm, in a scratchpad script) for the look.

**Spec:** `docs/handover-camp-release.md` (Phase 8 brief, "How the driver session works", Decisions, State — phase 4 stopped after Tasks 1–2, phase 5 skipped), `docs/game-design/story/IMPLEMENTATION.md` (read first: the built story layer, "the mod owns the mechanisms, the arcs stay data", authored-but-unfired precedent `story.end.*`), `docs/game-design/story/review.md` (the opening decisions: the explorer speaks only where it helps; Fez teaches where he knows), `docs/game-design/story/FORMAT.md` §5 ("Every line names its speaker", "Every line is spoken, not narrated", "The explorer speaks…": no pronoun, no name, no gendered self-description; poses and faces in the prefix), `docs/game-design/story/cast.md` (Fez, the explorer, the pair, the one thing Fez is wrong about per tier, his age and name — never spoiled), `docs/game-design/story/what-the-player-knows.md` and `main-path.md` (what a tier may assume), `script-act-1.md` … `script-act-5.md` (each tier's arrivals and tomb scene), `docs/superpowers/specs/2026-10-22-tomb-redesign-design.md` §5–6 (the three tomb hooks), `docs/superpowers/plans/2026-10-25-camp-phase-4-animal-gates.md` (purchase ids, shops and what each opens — the table at its top and its decisions 6, 9), `docs/superpowers/plans/2026-10-25-camp-phase-6-camp-home.md` (home, coming-home screen, new-chapter card, `registerHomeHook`), `docs/superpowers/plans/2026-10-25-camp-phase-3-camp-loot.md` (finds, parts, structures), `docs/mods/TARGET.md`, `docs/review-camp-release.md` (the Drafts section format).

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. Commit after every task. Another agent may be reading the repo: commit only your own files.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen` never name a mod, a mod's tag, a story beat id or a mod's locale namespace; the `no-restricted-imports` rules stay at zero. Mods import no sibling mod: the story mod matches the trap's and camp's tags as plain strings, as `beatFor` matches journey ids today. Core reports facts; only the story mod decides what is worth a line.
- **The voice** (writing tasks): spoken, from the character's feeling, addressed to someone (each other, the place, the fire), never a narrated caption; jokes land on first read; the explorer speaks only where it helps and stays without pronoun, name or gendered self-description in both languages (present tense, questions, observations); "wizard" / "tovenaar" is only the top difficulty's name, never magic; nothing pays off on a fact the game has not given by that tier; Fez's age and name stay unspoken. In the camp the explorer and Fez talk together; Fez travels home with the explorer and **sells nothing there**. At a gate that needs an animal, **Fez** says so and says where one is sold. Dutch first, everyday spreektaal (_weet je_ at most once a scene), then English, which adapts rather than translates word for word. A scene is short: one to four lines; a beat the player hears on every tier-up or homecoming should be lighter than a tomb's.
- **Poses:** a line may name an existing pose or face (`Pose`, `Face` in `src/app/fez/portraits.ts`) through `src/app/fez/storyPoses.ts` and the script prefix; no new art. A pose nobody has drawn goes on the art list in the script file, not into code.
- **Ids are fixed by this plan** (the writing tasks and the wiring tasks meet on them). Groups in `fez.json`, one level deep so `arrivalContent.spec.ts` can read them:
  - Tombs, for each of the nine ids in `TOMB_STRUCTURES` (`src/data/journeyStructure.ts`): `cave.<tombId>` (the cave mouth, level 1's exterior), `pillar.<tombId>` (the cave's exit pillar), `cavern.<tombId>` (the cavern's exterior, level 2). 27 scenes.
  - Camp: `camp.firstHome`, `camp.homeHaul`, `camp.homeEmpty`, `camp.rested`, `camp.chapterJunior`, `camp.chapterExpert`, `camp.chapterMaster`, `camp.chapterWizard`. 8 scenes.
  - Structures and finds: `camp.firstFind`, `camp.structureDone`. 2 scenes.
  - Animals (unwired), with the phase-4 purchase ids `donkey`, `cart`, `camel`, `secondDonkey`, `secondCamel`, `sturdyCart`, `caravanBanner` capitalised into the id: `animal.forSale`; `animal.bought<Id>` for all seven; `animal.blocked<Id>` and `animal.through<Id>` for the six that open a gate (not the banner); `animal.arrives<Id>` for all seven. 27 scenes.
- **No unit test pins authored content:** specs build made-up journeys, made-up beat ids, made-up tags and made-up heard maps. The only specs that read the real locales check presence and numbering (every declared id has line 1 in both languages, no gap), as `src/app/fez/arrivalContent.spec.ts` does today — never a line's words.
- **Saves:** one optional field in the trap mod's state (Task 7); absent reads as "nothing refilled". No other store changes shape; `conversations` is only read (and written by FezCompanion as today).
- **No bake:** `src/data/` and `src/worldGen/` byte-identical at the end of the phase.
- **Comments state the current state and why, never history.** Commits: one subject line, `type: what changed`, ≤ 72 chars, ending with the session's attribution trailer.
- **Checks per task:** the task's own specs, `yarn test src/i18n src/app/fez`, `yarn check-types`, `yarn lint`. Only Task 9 runs `yarn verify`, `yarn verify-content` and `yarn build`, each under `timeout 900`. Betterer may only re-key entries whose lines moved.
- The phase's last step updates the handover's "State" and ticks Phase 8 there (driver's job, not a task).

## Review Focus

1. **Each beat fires once, where intended:** a moment offers at most one beat — the first candidate not in `conversations`; a beat dropped because Fez is not met stays unheard and plays at the next such moment; the tutorials toggle cannot silence these (`story: true`) (Tasks 5, 6).
2. **Reporters fire once per fact, not per render:** `useMergedReactions` returns a new function every render, so each reporter keeps the listener out of its effect's dependencies and reports once per arrival, exit, home showing and chapter card (Task 5).
3. **The tomb beats land at the right level:** cave and pillar on level 1 (exterior `caveMouth`), cavern on level 2; the existing `tombIntro` tutorial still plays first at the cave mouth; `bond.starterTomb` (Ipi's afterword on `siteLeft`) no longer plays on leaving the cave, before Ipi has been met (Tasks 5, 6).
4. **Core names no mod:** tags are opaque strings; with story off nothing listens; with trap or camp off their tags are simply absent and the home still shows (Tasks 5, 7, 9).
5. **The trap save field** is optional, read as false when absent, written on every homecoming (true when a heart was missing, false otherwise), and never breaks a save that lacks it (Task 7; soundness).
6. **The writing:** voice rules above, no spoilers ahead of a tier, no line repeating what the new-chapter card, the rest panel ("Uitgerust bij het vuur…") or `tombIntro` already say on the same screen; the animal lines say nothing a phase-4 decision could still change except the tomb that sells each animal, and that dependency is noted per line (Tasks 1–4).

## Decisions for the review list

Each is the option that changes the least shipped behaviour or the one the brief names; Task 9 writes them into `docs/review-camp-release.md` under Decisions, each prefixed `Phase 8 —`.

1. **One beat per moment.** A moment's candidates are ordered; the rail plays the first the save has not heard, never two. Precedence at home: first home together, rested after damage, first finished structure, first find, then the haul line. Alternative: queue every matching beat.
2. **"First arrival at the camp" is the first time Fez and the explorer are home together** (the first home showing after the meeting); the fresh-game `welcome` (the explorer alone, before Fez) stays as it is. Alternative: rewrite `welcome` as the camp's first arrival and drop `camp.firstHome`.
3. **Home beats play at the camp, after the coming-home screen is left,** in one moment (`homeShown`) that knows whether the player just unpacked and whether anything was in the haul. The conversation layer (`Fez.tsx`, `z-10`) sits under the coming-home and new-chapter screens (`z-40`); lifting it changes every in-site panel's layering. Alternative: lift the conversation layer above those two screens and speak at the fire.
4. **Coming home with and without a haul each play once ever** (the first homecoming with something in the haul, the first with nothing). Alternative: a small pool of lines rotating per homecoming.
5. **Resting at the fire after damage** is one beat, once: the trap mod remembers whether its last homecoming refilled a heart (one optional save field) and says so as a home tag. Alternative: a line per tier, or no save field and no beat.
6. **A new chapter** is one beat per tier (junior to wizard; starter is never announced), played when the new-chapter card is left — by "Later" at the camp, by "Op pad" on the way out, before the journey's arrival. Alternative: play it only on "Later".
7. **Finishing a structure** is one beat, for the first structure completed, played at the camp on the next home showing. Alternative: one beat per structure (26 scenes).
8. **The first camp find** plays at the camp on the next home showing, where the find stands, not when it is picked up. Alternative: at pickup, in the site.
9. **Tomb beats are per tomb** (`cave.` / `pillar.` / `cavern.<tombId>`), all nine tombs; `tombIntro` stays and plays first at the cave mouth. Alternative: one set per tier, or fold `tombIntro` into the cave beats.
10. **The tomb beats join the story log** under their tomb, in the order cave, pillar, cavern, then the tomb's ghost scene; camp and structure beats stay out of the log, which remembers places. Alternative: a "Het kamp" row in the log.
11. **`bond.starterTomb` waits for the tomb's last level.** `siteLeft` fires on every level's exit, so with the two-level tomb Ipi's afterword plays on leaving the cave, before Ipi. `siteLeft` now carries whether the level left was the journey's last, and the tomb afterwords fire only then. Alternative: leave it and list it under Failures.
12. **The animal lines are drafted but unwired,** parked in `fez.json` under `animal.*` and in `WAITING_BEATS` with the seam each waits on; they follow the phase-4 plan's purchase ids, shops and gates. Alternative: keep them in the script file only until phase 4.
13. **A gate line names the tomb whose stall sells the animal** (phase 4's decision 6); if phase 4 moves a purchase, the line moves with it. Alternative: a line that names no place ("bij een van mijn kraampjes").
14. **Drafts are marked in data, not on screen:** `DRAFT_BEATS` in the story mod and "draft" on every scene in the script file; the designer removes an id when the line is approved. Alternative: a "concept" tag on draft lines in develop mode.
15. **A develop-mode tool plays the drafts:** in settings, one button per area (tombs, camp, structures and finds, animals) plays that area's beats in order with `forceReplay`, so the designer reads each in its bubble, the unwired animal lines included. Alternative: no tool; read them in the review list.
16. **Home tags are owned by the mod that says them** (`trap.mended`, `camp.found`, `camp.structureDone`) and matched by the story mod as strings. Alternative: a core vocabulary of home facts.
17. **Only existing poses and faces;** a line that wants an undrawn one notes it on the script file's art list. Alternative: draw new poses first.

---

### Task 1: Write the tomb beats (Opus)

One Opus agent, reading the voice sources before writing a line: `FORMAT.md` §5, `cast.md`, `what-the-player-knows.md`, `main-path.md`, the script act of each tier (`script-act-1.md` starter … `script-act-5.md` wizard), the existing `fez.json` lines `tombIntro*`, `exitPillar`, `tomb.<tier>*`, `bond.*` and that tier's `arrival.*` (in nl and en), and the tomb redesign spec §5–6. The cave beat is the first moment in a hill's dark mouth; the pillar is daylight at the end of the cave; the cavern is the sunlit hole with the pyramid in it. None of the three may pre-empt the tomb's ghost scene, which plays later in the cavern's floors, nor repeat `tombIntro` or `exitPillar`.

**Files:**

- Create: `docs/game-design/story/script-camp-release.md` (header: what this file is, the voice rules in two lines, the status "draft — awaits the designer"; a section "Tombs" with one sub-section per tomb, each scene under its id with "fires:" and its lines as `> **Fez:** nl` followed by `> _en:_ …`; an "Art list" at the end, empty if nothing is wanted)
- Modify: `public/locales/nl/fez.json`, `public/locales/en/fez.json` (groups `cave`, `pillar`, `cavern`)
- Modify: `src/app/fez/storyPoses.ts` (only lines that want a pose or face)
- Create: `src/mods/story/game/drafts.ts`, `src/mods/story/game/drafts.spec.ts`
- Modify: `src/app/fez/arrivalContent.spec.ts` (its group list gains `cave`, `pillar`, `cavern`, `camp`, `animal`)
- Modify: `docs/review-camp-release.md` (Drafts)

**Interfaces:**

- Produces: 27 scenes, `cave.<tombId>`, `pillar.<tombId>`, `cavern.<tombId>` for the nine tombs, one to four lines each, speakers `fez` and `explorer` (a ghost never speaks outside its room).
- Produces (story mod data): `DRAFT_BEATS: Record<"tombs" | "camp" | "structures" | "animals", readonly string[]>` — this task fills `tombs` with the 27 ids; `WAITING_BEATS: Readonly<Record<string, string>>` — beat id → the missing seam it waits on (empty here).
- `drafts.spec.ts`: every id in `DRAFT_BEATS` and `WAITING_BEATS` has a line 1 (some speaker) in both `nl` and `en` `fez.json` (read with `node:fs`, resolved with `spokenLines`); no id appears twice across the areas. Presence only, never the words.

- [x] **Step 1: Write the drafts** in the script file, nl first, en beneath each line, every scene with "fires: <tomb name> — <entering the cave | reaching the pillar | arriving at the cavern>".
- [x] **Step 2: Copy them into** both `fez.json` files under the fixed ids; poses into `storyPoses.ts`.
- [x] **Step 3: Drafts list and spec** (`drafts.ts`, `drafts.spec.ts`); extend `arrivalContent.spec.ts`'s groups.
- [x] **Step 4: Run** `yarn test src/mods/story src/app/fez src/i18n` — PASS; `yarn check-types`, `yarn lint`.
- [x] **Step 5: Review list:** under Drafts, one bullet per scene: `Phase 8 — \`<id>\` — fires: <where>`, then one sub-bullet per line, `Speaker: "nl" / "en"`.
- [x] **Step 6: Commit** — `story: draft the tomb cave, pillar and cavern lines`

---

### Task 2: Write the camp beats (Opus)

One Opus agent, same reading list as Task 1 (the acts for what each tier's chapter may assume), plus the phase-6 strings in the review list's Drafts (`camp.chapter.body`, `trap.rested`, the coming-home labels) so no line repeats them, and `welcome*` in `fez.json` (the explorer alone, before Fez). Fez is home with the explorer and sells nothing here; the camp is theirs, small and growing.

**Files:**

- Modify: `docs/game-design/story/script-camp-release.md` (section "Camp")
- Modify: `public/locales/{nl,en}/fez.json` (group `camp`), `src/app/fez/storyPoses.ts`
- Modify: `src/mods/story/game/drafts.ts` (`camp`), `docs/review-camp-release.md` (Drafts)

**Interfaces:**

- Produces: `camp.firstHome` (fires: the first time the camp shows after Fez has been met — their first evening together there), `camp.homeHaul` (fires: the first home showing after unpacking a haul with something in it), `camp.homeEmpty` (fires: the first home showing after coming home with nothing), `camp.rested` (fires: at the camp, the first time a homecoming refilled a heart), `camp.chapterJunior` / `Expert` / `Master` / `Wizard` (fires: when that tier's new-chapter card is left — the line must work both at the camp and on the way out to the journey).

- [x] **Step 1: Write** the eight scenes in the script file, nl first, with "fires:" per scene.
- [x] **Step 2: Copy** into both `fez.json`; poses.
- [x] **Step 3: Drafts list** (`camp`).
- [x] **Step 4: Run** `yarn test src/mods/story src/app/fez src/i18n`, `yarn check-types`, `yarn lint`.
- [x] **Step 5: Review list** Drafts, same format.
- [x] **Step 6: Commit** — `story: draft the camp homecoming and chapter lines` (one commit with Task 3: `story: draft the camp homecoming, chapter, find and structure lines`)

---

### Task 3: Write the structure and find beats (Opus)

One Opus agent; reading list as Task 2, plus the phase-3 find and structure names in the review list's Drafts and `docs/design/camp-sketches/README.md` (the 12 spots). The line must not name a particular find or structure: it plays for whichever came first.

**Files:**

- Modify: `docs/game-design/story/script-camp-release.md` (section "Structures and finds")
- Modify: `public/locales/{nl,en}/fez.json` (group `camp`), `src/app/fez/storyPoses.ts`
- Modify: `src/mods/story/game/drafts.ts` (`structures`), `docs/review-camp-release.md` (Drafts)

**Interfaces:**

- Produces: `camp.firstFind` (fires: at the camp, the first home showing after the first camp find was brought home), `camp.structureDone` (fires: at the camp, the first home showing after the first structure has all its parts).

- [x] **Step 1–6** as Task 2. Commit — `story: draft the first find and first structure lines` (committed together with Task 2)

---

### Task 4: Write the Fez and animal beats, unwired (Opus)

One Opus agent; reading list as Task 1, plus the phase-4 plan's purchase table and decisions 6, 9 and 17 (which tomb's stall sells which animal, what each opens, what lands in the camp), the shop's existing Fez lines (`shopFirstVisit*`, `shopArrival*` in `fez.json`) and `cast.md` on Fez as a trader. At a gate Fez is the one who says an animal is needed and names the tomb whose stall sells it; when the animal lets the player through, Fez or the explorer reacts to the animal; in the camp, the animal arrives — Fez sells nothing there.

**Files:**

- Modify: `docs/game-design/story/script-camp-release.md` (section "Fez and the animals — waits on phase 4", stating at its top that nothing fires these yet and which phase-4 seam each would hang on)
- Modify: `public/locales/{nl,en}/fez.json` (group `animal`), `src/app/fez/storyPoses.ts`
- Modify: `src/mods/story/game/drafts.ts` (`animals`, and every id in `WAITING_BEATS` with its seam: "Fez's stall shows a purchase for the first time", "a purchase is bought", "a gate refuses for want of a purchase", "a gate opens because of a purchase", "a bought step arrives in the camp")
- Modify: `docs/review-camp-release.md` (Drafts, each scene marked "drafted, waits on phase 4")

**Interfaces:**

- Produces: the 27 `animal.*` scenes of the id list in Global Constraints. `animal.boughtCaravanBanner` and `animal.arrivesCaravanBanner` carry the joke: it opens nothing.

- [x] **Step 1–4** as Task 2.
- [x] **Step 5: Review list** Drafts, each scene `Phase 8 — \`<id>\` — drafted, waits on phase 4 — would fire: <where>`.
- [x] **Step 6: Commit** — `story: draft the Fez and animal lines, unwired`

---

### Task 5: Core reports the places and the home (Sonnet)

**Files:**

- Modify: `src/app/reactions/reactionContributions.ts` (+ a spec beside it if none covers the new kinds)
- Create: `src/app/home/homeTags.ts`, `src/app/home/homeTags.spec.ts`
- Modify: `src/app/PyramidExpedition.tsx` (or `src/app/PyramidExpedition/useExpeditionIntro.ts`), `src/app/SiteMap/SiteMapScreen.tsx` (or `useExitIntro.ts`), `src/app/Base.tsx`, `src/app/home/ComingHome.tsx`, `src/app/home/NewChapter.tsx`, and their specs

**Interfaces:**

- Produces (core `Reaction` kinds, beside `solved` and `siteLeft`):
  - `siteArrived { journeyId; levelNr; exterior?: string }` — reported when a level's exterior screen shows (where `useExpeditionIntro` runs), `exterior` the level's authored `exterior` from `src/data/journeys.ts` (`caveMouth`, `cavern`, absent for a plain pyramid).
  - `exitReached { journeyId; levelNr; exterior?: string }` — reported when the explorer arrives at the site's exit (where `useExitIntro` offers `exitPillar`).
  - `siteLeft` gains `lastLevel: boolean` — whether the level walked out of is the journey's last.
  - `homeShown { arrived?: { haul: boolean }; tags: readonly string[] }` — reported once per home showing, when the home has settled and neither the coming-home screen nor a new-chapter card is up (the condition `HomeHooks` mounts on). `arrived` is set when the player has just left the coming-home screen; `haul` is whether that screen showed any line. `tags` from `useHomeTags()`.
  - `chapterOpened { tier: Difficulty }` — reported when the new-chapter card is left, by either button, before `startGame`.
- Produces (core registry): `registerHomeTags(useTags: () => readonly string[])`, `useHomeTags(): readonly string[]` — every registered hook in registration order, merged, duplicates dropped; none registered → empty.
- `ComingHome`'s `onDone` hands back whether a haul was shown; `Base` keeps it until the home showing reports it, and forgets it after.
- Every reporter reports once per fact: the merged listener is held so that a re-render with the same facts reports nothing.

- [x] **Step 1: Failing tests** (a made-up reaction contribution registered for the test, counting calls; made-up journeys with made-up exteriors; made-up tag hooks).
  - `homeTags.spec`: two hooks' tags merge in order with duplicates dropped; no hooks → empty.
  - Expedition: arriving at a made-up level with `exterior: "caveMouth"` reports one `siteArrived` with that exterior; a re-render reports nothing more; the next level reports its own.
  - Site map: reaching the exit reports one `exitReached` with the level's exterior; `siteLeft` carries `lastLevel` true on the last level, false before it.
  - Base / ComingHome: leaving the coming-home screen with a haul line reports one `homeShown` with `arrived.haul` true and the registered tags; with an empty haul `haul` false; a home showing with no homecoming has no `arrived`; nothing is reported while the coming-home screen or a chapter card is up.
  - NewChapter: "Later" reports one `chapterOpened` with its tier; "Op pad" reports it before `startGame` is called.
- [ ] **Step 2: Run** the specs — FAIL.
- [x] **Step 3: Implement.** Existing listeners (`beatFor`) keep compiling: unknown kinds return nothing.
- [x] **Step 4: Run** — PASS. `yarn test src/app/appImports src/app/fez src/mods/story`, `yarn check-types`, `yarn lint` (import rules at zero).
- [x] **Step 5: Commit** — `feat: core reports site arrivals, exits and home showings`

---

### Task 6: The story mod plays one beat per moment (Sonnet)

**Files:**

- Modify: `src/mods/story/game/reaction/beatFor.ts`, `beatFor.spec.ts` (or a new `momentBeats.ts` beside it, with its spec)
- Modify: `src/mods/story/app/reaction/rail.ts`, `rail.spec.tsx`
- Modify: `src/mods/story/game/log/heardScenes.ts`, `heardScenes.spec.ts`
- Create: `src/mods/story/game/reaction/storyBeats.ts` (the declared set), with its content spec beside `drafts.spec.ts`

**Interfaces:**

- Produces: `STORY_BEATS: ReadonlySet<string>` — every beat the rail may play: the 27 tomb ids derived from `TOMB_STRUCTURES`, the 10 camp ids, the existing bond beats. The `animal.*` ids are not in it. A content spec: every id in it has line 1 in both locales (presence only).
- Produces: `beatsFor(reaction, declared = STORY_BEATS): string[]` — the candidates in order, filtered to `declared`:
  - `siteArrived` with exterior `caveMouth` → `cave.<journeyId>`; `cavern` → `cavern.<journeyId>`; otherwise none.
  - `exitReached` with exterior `caveMouth` → `pillar.<journeyId>`.
  - `siteLeft` → the existing `ON_LEAVING` afterword, only when `lastLevel`.
  - `solved` → as today.
  - `homeShown` → `camp.firstHome`; `camp.rested` when tags hold `trap.mended`; `camp.structureDone` when tags hold `camp.structureDone`; `camp.firstFind` when tags hold `camp.found`; and, when `arrived`, `camp.homeHaul` or `camp.homeEmpty` by `haul`.
  - `chapterOpened` → `camp.chapter<Tier>` (tier capitalised).
- The rail offers the first candidate not in the `conversations` store, with `{ story: true }`, and nothing when every candidate is heard.
- `ALL_SCENES` gains, per tomb, `cave.`, `pillar.`, `cavern.<tombId>` (each in `STORY_BEATS`) before the tomb's ghost scene, `journeyId` the tomb; no camp beat enters the log.

- [x] **Step 1: Failing tests** (made-up journey ids, a made-up declared set, made-up heard maps).
  - `beatsFor`: a made-up tomb id at `caveMouth` gives its cave id only when declared; `cavern` gives the cavern id; a plain pyramid exterior gives none; `exitReached` at `caveMouth` gives the pillar id, elsewhere none; `siteLeft` gives the afterword only with `lastLevel`; `homeShown` without tags and without `arrived` gives only the first-home id; with all three tags and `arrived` the order is first home, rested, structure, find, haul line; `arrived.haul` false gives the empty-haul id; `chapterOpened` gives the tier's id; an undeclared id is never returned.
  - Rail: with the first candidate heard it offers the second, once, with `story: true`; with all heard it offers nothing; a `solved` reaction still reaches its bond beat as before.
  - `heardScenes`: a made-up save that heard a tomb's cave beat lists it before that tomb's ghost scene; a heard camp beat is not listed.
- [x] **Step 2: Run** `yarn test src/mods/story` — FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** — PASS. `yarn test src/app/fez src/i18n`, `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: tomb and camp beats play once, one per moment`

---

### Task 7: The trap and camp say how things stand at home (**soundness**: saves; Opus, per-task review)

**Files:**

- Modify: `src/mods/trap/app/useTrapProgress.ts` (+ spec), `src/mods/trap/app/index.ts`
- Modify: `src/mods/camp/app/useCampProgress.ts` or a new `src/mods/camp/app/homeTags.ts` (+ spec), `src/mods/camp/app/index.ts`; a pure query in `src/mods/camp/game/campState.ts` if none says "some structure has all its parts" (+ spec)

**Interfaces:**

- Trap state gains `mended?: boolean`. `restoreHealth` writes `mended: true` when health was below the maximum and `false` when it was full, in the same write that refills. A stored state without the field reads as `mended: false`; nothing else in the trap state changes.
- Trap registers `registerHomeTags` → `["trap.mended"]` when `mended`, else none.
- Camp registers `registerHomeTags` → `"camp.found"` when the camp save holds any find, `"camp.structureDone"` when any structure in the step table has all its parts; read through the camp's existing save reader.

- [x] **Step 1: Failing tests** (made-up states, a made-up step table).
  - Trap: restoring from below max records `mended` true and full health; restoring at full records false; a stored state without `mended` reads false and a restore on it works; the tag hook gives `trap.mended` only when true.
  - Camp: an empty save gives no tags; one find gives `camp.found`; a made-up structure with all its parts gives `camp.structureDone`, with one missing it does not.
- [x] **Step 2: Run** `yarn test src/mods/trap src/mods/camp` — FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Per-task review:** the field is optional both ways; one write per homecoming; health never changes because of the field; no other save shape moved.
- [x] **Step 6: Commit** — `feat: trap and camp tell the home what happened`

---

### Task 8: Play the drafts in develop mode (Sonnet)

**Files:**

- Create: `src/mods/story/app/draftPlayer.ts` (+ spec); Modify: `src/mods/story/app/index.ts`
- Modify: `public/locales/{nl,en}/common.json` only if the labels are not plain dev labels (dev grants today use fixed labels; follow that)

**Interfaces:**

- Registers through `registerDevGrants` (gated on the story mod): one grant per `DRAFT_BEATS` area ("Story drafts: tombs" …), which offers every id of that area, in order, through `showConversation(id, undefined, { forceReplay: true, story: true })`. Nothing is recorded as heard that was not heard before (a forced replay of an unheard beat must not mark it heard — check how FezCompanion records it, and if a forced replay would record, pass the area's ids through a path that does not).

- [ ] **Step 1: Failing test:** a made-up drafts table of two areas gives two grants; running one offers its ids in order with `forceReplay`; the heard map is unchanged afterwards.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS); `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Commit** — `feat: develop mode plays the story drafts`

---

### Task 9: Gate, toggle-off, look, record (Sonnet)

**Files:**

- Modify: `docs/review-camp-release.md` (Decisions, Drafts completeness, gate and toggle-off results, Look at in browser)
- Modify: `CHANGELOG.md` (`## Unreleased`: one new bullet, since no existing one covers it — e.g. "Fez and the explorer talk in every tomb's cave and cavern, and at camp when you come home.")
- Modify: this plan (tick boxes)
- Possibly: `.betterer.results` (re-keyed lines only)

**Interfaces:** none.

- [ ] **Step 1: No bake.** `git diff --stat <phase start>..HEAD -- src/data/ src/worldGen/` is empty; if not, that is a finding, not a bake.
- [ ] **Step 2: Toggle-off.** One at a time, `storyMod`, `trapMod`, `campMod` out of `src/mods/registeredMods.ts` (entry and import), each under `timeout 900`: `yarn check-types`, `yarn build`; restore with `git checkout src/mods/registeredMods.ts`; `git status --short` clean. Record what drops (story: every new beat and the draft player; trap: the rested beat; camp: the find and structure beats). A failure: check the same removal at the phase's first commit; pre-existing goes under Failures, otherwise fix it here.
- [ ] **Step 3: Look** (`docs/instructions/browser-checks.md`: Playwright from npm in a scratchpad script — the MCP server may be down — own `yarn dev` on a free port, a fresh context per check, close everything, screenshots to `.playwright-mcp/`), phone 390×844, Dutch:
  - Develop mode (seven title taps), settings: each "Story drafts" button plays its area; screenshot one bubble per area (a cave line, `camp.firstHome`, `camp.structureDone`, an animal line); check no bubble shows "not-found" and long lines fit.
  - Fresh save: back out of the first journey before the meeting: the home shows no camp beat (Fez not met). Where dev jumps reach it (story room jumps, dev grants for map pieces): the starter tomb's cave mouth plays `tombIntro` then the cave beat; the cave's pillar plays the pillar beat and leaving the cave does not play Ipi's afterword; the cavern exterior plays the cavern beat. Coming home after the meeting: unpack, then `camp.firstHome` at the camp, and nothing more on that showing.
  - Anything not reachable unattended (rested after damage, a chapter card's beat, the first structure) goes under Look at in browser with steps.
- [ ] **Step 4: Gate** — each under `timeout 900`: `yarn verify`, `yarn verify-content`, `yarn build`. All pass.
- [ ] **Step 5: Record** in `docs/review-camp-release.md`: this plan's 17 decisions under Decisions (`Phase 8 —`); check Drafts holds every scene of `DRAFT_BEATS` (64 scenes: 27 tomb, 8 camp, 2 structure and find, 27 animal), each line nl / en with where it fires, the animal ones "drafted, waits on phase 4"; the toggle-off and gate results; under Look at in browser the screenshots' paths and the unreached checks with steps. Tick this plan's boxes; the CHANGELOG bullet.
- [ ] **Step 6: Commit** — `docs: phase 8 results in the review list`

The driver then runs the phase review (Sonnet), dispatches a fresh agent for its findings, pushes the branch, ticks Phase 8 in `docs/handover-camp-release.md` and adds one line to its State.
