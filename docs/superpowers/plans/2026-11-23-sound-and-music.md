# Sound, Music, Credits and What's New Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The game plays synthesised musical sounds at the moments the spec marks M, plays one music track that ducks during encounters, and gets two Settings switches, a credits screen and a what's-new screen. Slices 1 and 2 of the spec.

**Architecture:** There is one core audio service in `src/app/audio/`. Sounds are registered by name in a registry, the way homecomings and HUD widgets are. A sound definition is a pure function that returns tones, and the service renders those tones through an injected Web Audio context. Core and mods call `playSound(name)`. A name nobody registered stays silent, so a mod that is off is silent too. Music is one `<audio>` element routed through a gain node. It loads only when Music is on, and the service workbox caches it at runtime rather than precaching it.

**Tech Stack:** React 19, TypeScript, the Web Audio API, `useGameStorage` (localforage), vite-plugin-pwa/workbox, Vitest (node by default, jsdom opt-in per file), react-i18next.

**Spec:** `docs/superpowers/specs/2026-11-23-sound-and-music-design.md`

## Global Constraints

- Defaults: sound effects **on**, music **off**, for new and existing players alike. A missing key means the default, so no save migration is needed.
- With both switches off, the game creates no AudioContext, fetches no audio file and throws no errors.
- The audio context starts on the first tap. A moment before that stays silent and is never queued.
- Musical sounds are synthesised, with no files. Real sounds (R in the spec table) are slice 3 and are not built here.
- Music: "Egyptian Dawn (Full version)" by kaazoom, Pixabay Content License. It loops and never enters the precache. It loads the first time Music is on and is cached at runtime after that.
- Every audio file in the repo has a credit file next to it, and the credits screen reads those files.
- What's new shows the last **3** released versions from `CHANGELOG.md`, in English, built from the changelog. There is no second copy.
- Audio is a mod-agnostic core service: core names no mod sound, and mods register their own sounds inside their `isModEnabled` block.
- Runtime only: `git diff origin/main -- src/data` stays empty. The starter, junior and expert freezes stay green (`yarn verify` runs them).
- Tests carry their intent in their names. There are no wall-clock or duration assertions: count calls on mocks and fakes. Tests never pin authored locks, puzzles or the changelog text; they use made-up locks and made-up markdown. Checks over the baked world live in `*.verify.ts`.
- No historical comments: a comment says what the code does now and why.
- Commits are one line, `type: what changed`, followed by:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01F6g2diRzQCzQwEf9zsEEGH
  ```
- New strings go into `public/locales/en/common.json` and `public/locales/nl/common.json`. The other 40 locales get them in the per-release translation round, and English is the fallback until then. `src/i18n/languages.spec.ts` only refuses keys that English lacks, so it stays green.
- `src/ui/` components are stateless and each has a story. `src/app/` components hold state and render through `src/ui/`.

## Review Focus

1. **A reload with a lock already open.** The floor mounts with its door open and the player expects silence. A lock-solved chime on every reload is the failure the spec names. (Test in Task 5.)
2. **A phone that backgrounds the app, then a tap after.** iOS suspends ("interrupted") the context, and the player expects sound back on the next tap rather than permanent silence. (Test in Task 1.)
3. **Music on, then the app hidden.** Music should not keep playing from a locked phone or a background tab. (Test in Task 10.)
4. **A lever thrown back and forth.** The player expects the lock-solved chime once, not on every re-open. (Test in Task 5.)
5. **A browser or test environment without `AudioContext`** (jsdom, old Safari, a locked-down WebView). The game should run silently. (Test in Task 1.)

---

## PR boundaries

| PR  | Branch                       | Tasks | Changelog `## Unreleased` line (Added)                                                                    |
| --- | ---------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| A   | `audio/sound-service`        | 1–6   | `Musical tones for solved puzzles, opened locks, finds and finished levels; switch them off in Settings.` |
| B   | `settings/whats-new-credits` | 7–8   | `Settings shows what's new and who made the game's sounds.`                                               |
| C   | `audio/music`                | 9–11  | `Background music, off at first: turn it on in Settings.`                                                 |

Branch each PR from `origin/main`, not from `docs/sound-design`. PR B does not depend on A. PR C depends on A (the service) and on B (the credits screen, which C fills). Each PR's last task adds its own changelog line. Wait for CI with `yarn pr:wait N`.

## File structure

```
src/app/audio/
  soundRegistry.ts        registerSound / soundNamed; Tone, SoundDef, SoundOptions types
  audioService.ts         createAudioService(deps): renders tones, unlock, switches, music, duck
  audio.ts                the singleton, playSound(), resumeAudioOnGesture()
  fakeAudio.testing.ts    fake AudioContext + fake media element that record calls
  tones.ts                scale, wrong tone, phrases, motif() — pure
  coreSounds.ts           registers the core names (CORE_SOUNDS, rewardSound())
  audioSettings.ts        storage keys + useAudioSettings()
  useDuckMusic.ts         (PR C) ducks while mounted/active
src/game/lockSolved.ts    solvedLocks(): pure, from lock topology + open doors
src/app/SiteMap/useLockSolvedSound.ts
src/app/SiteMap/lockSolved.verify.ts
src/app/PyramidExpedition/useLevelSounds.ts
src/app/whatsNew/parseChangelog.ts, WhatsNewPanel.tsx
src/app/credits/audioCredits.ts, CreditsPanel.tsx
src/ui/molecules/ReleaseNotes.tsx (+ stories), CreditsList.tsx (+ stories), SettingsSwitch.tsx (+ stories)
src/assets/audio/music-egyptian-dawn.mp3 + music-egyptian-dawn.credit.json   (PR C)
```

---

## PR A — sound service and musical sounds (slice 1, part 1)

### Task 1: Audio service, registry and fake context

**Files:**

- Create: `src/app/audio/soundRegistry.ts`, `src/app/audio/audioService.ts`, `src/app/audio/audio.ts`, `src/app/audio/fakeAudio.testing.ts`
- Test: `src/app/audio/audioService.spec.ts` (node; the fake needs no DOM)

**Interfaces:**

- Produces:

  ```ts
  // soundRegistry.ts
  export type Tone = { frequency: number; start: number; duration: number; gain?: number; wave?: OscillatorType }
  export type SoundOptions = { note?: number; delay?: number } // delay in seconds after now
  export type SoundDef = (options: SoundOptions) => readonly Tone[]
  export const registerSound: (name: string, def: SoundDef) => void
  export const soundNamed: (name: string) => SoundDef | undefined
  // audioService.ts
  export type AudioContextLike = Pick<
    AudioContext,
    "currentTime" | "state" | "resume" | "createOscillator" | "createGain" | "destination"
  >
  export type AudioService = {
    play: (name: string, options?: SoundOptions) => void
    unlock: () => void // call inside a user gesture
    setEffects: (on: boolean) => void
    setMusic: (on: boolean) => void // no-op body until Task 10
    duck: () => () => void // returns release; no-op body until Task 10
  }
  export const createAudioService: (deps: {
    createContext: () => AudioContextLike | undefined
    lookup?: (name: string) => SoundDef | undefined // defaults to soundNamed
  }) => AudioService
  // audio.ts
  export const audio: AudioService
  export const playSound: (name: string, options?: SoundOptions) => void
  export const resumeAudioOnGesture: (target: EventTarget, service?: AudioService) => () => void // pointerdown + keydown, capture; returns cleanup
  // fakeAudio.testing.ts
  export const fakeAudioContext: () => {
    context: AudioContextLike
    oscillators: { frequency: number; startAt: number }[]
    resumes: number
    setState: (s: AudioContextState) => void
  }
  ```

- [ ] **Step 1: Write the failing tests** in `audioService.spec.ts`, using `fakeAudioContext()` and a `lookup` holding the made-up sound `"test.two"`, which returns two tones (440 Hz at 0 and 660 Hz at 0.1):
  - `it("makes no audio context and plays nothing before the first tap")`: `play("test.two")`, then expect `createContext` called 0 times.
  - `it("never plays a sound asked for before the first tap, even after it")`: `play`, then `unlock()`, then expect `oscillators` to have length 0.
  - `it("after the first tap starts one oscillator per tone, at the tone's frequency and time")`: `unlock(); play("test.two", { delay: 0.5 })`, then expect `oscillators` to equal `[{ frequency: 440, startAt: 0.5 }, { frequency: 660, startAt: 0.6 }]` (the fake's `currentTime` is 0).
  - `it("plays nothing for a name nobody registered")`: expect it not to throw, and 0 oscillators.
  - `it("with sound effects off, a tap makes no audio context")`: `setEffects(false); unlock()`, then expect `createContext` called 0 times.
  - `it("with sound effects off, a sound plays nothing")`.
  - `it("without Web Audio, the game stays silent and nothing throws")`: `createContext` returns `undefined`; `unlock(); play(...)` does not throw.
  - `it("resumes a context the system suspended on the next tap")`: `unlock()`, then `setState("suspended")`, then `unlock()`, then expect `resumes` to be 2.
  - In `audio.spec.ts` (jsdom): `it("a pointerdown on the page unlocks the service")`, using a `vi.fn()` service. Also `it("stops listening after cleanup")`.
- [ ] **Step 2:** Run `yarn test src/app/audio`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement.**
  - The context is created on the first `unlock()` while effects or music are on, and once only.
  - `unlock()` calls `context.resume()` whenever `state !== "running"`.
  - `play` is a no-op until unlocked, while effects are off, or for an unknown name.
  - Each tone is an oscillator into its own gain node, with a short attack and release envelope so it does not click. It starts at `currentTime + delay + tone.start`.
  - The default `createContext` in `audio.ts` returns `new (globalThis.AudioContext ?? webkitAudioContext)()` when one exists, and `undefined` otherwise.
- [ ] **Step 4:** Run `yarn test src/app/audio`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: core audio service that plays registered tones`

### Task 2: Settings switches and their storage

**Files:**

- Create: `src/app/audio/audioSettings.ts`, `src/ui/molecules/SettingsSwitch.tsx` + `.stories.tsx`
- Modify: `src/app/SettingsModal.tsx` (beside the tutorials checkbox, ~:93-101; `handleClearGameData` :26-31), `src/app/saveEpoch.ts:8` (`KEPT`), `src/App.tsx` (mount the hook), `public/locales/{en,nl}/common.json` (`ui.music`, `ui.soundEffects`)
- Test: `src/app/audio/audioSettings.spec.tsx`, `src/app/SettingsModal.spec.tsx`, `src/app/saveEpoch.spec.ts`

**Interfaces:**

- Consumes: `audio`, `resumeAudioOnGesture` (Task 1).
- Produces:

  ```ts
  export const SOUND_EFFECTS_KEY = "soundEffects" // default true
  export const MUSIC_KEY = "music" // default false
  export const useAudioSettings: (service?: AudioService) => void // syncs storage → service, installs the gesture listener on window
  export const SettingsSwitch: FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }>
  ```

- [ ] **Step 1: Write the failing tests.**
  - `audioSettings.spec.tsx`: `it("hands sound effects on and music off to the service when nothing is stored")`, which expects `setEffects(true)` and `setMusic(false)`. Also `it("hands a stored switch change to the service")`.
  - `SettingsModal.spec.tsx`: change the `useGameStorage` mock to return `initialValue` per key. Then:
    - `it("shows Sound effects checked and Music unchecked for a save without them")`
    - `it("writes sound effects off when its switch is cleared")`
    - `it("keeps both switches when game data is cleared")`, which expects both setters called with their current values after `clearGameData`.
  - `saveEpoch.spec.ts`: `it("keeps the music and sound effects switches when it throws an older save away")`.
- [ ] **Step 2:** Run `yarn test src/app/audio src/app/SettingsModal.spec.tsx src/app/saveEpoch.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Add `KEPT = ["tutorialsEnabled", SOUND_EFFECTS_KEY, MUSIC_KEY]`.
  - `SettingsSwitch` is a positive checkbox (checked means on), styled like the tutorials row.
  - The modal renders two `SettingsSwitch` rows after the tutorials row.
  - `useAudioSettings()` is mounted once in `App.tsx`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: music and sound effects switches in settings`

### Task 3: Core musical sounds: puzzle solved, level and journey complete

**Files:**

- Create: `src/app/audio/tones.ts`, `src/app/audio/coreSounds.ts`, `src/app/PyramidExpedition/useLevelSounds.ts`
- Modify: `src/mods/core/app/PuzzleFamilyShell.tsx` (`handleSolved`, :182-186); `src/app/PyramidExpedition.tsx` (call `useLevelSounds(activeJourney.levelNr, journey.levelCount)` beside :114); `src/App.tsx` (import `coreSounds` once)
- Test: `src/app/audio/tones.spec.ts`, `src/app/PyramidExpedition/useLevelSounds.spec.ts`, `src/mods/core/app/PuzzleFamilyShell.spec.tsx`

**Interfaces:**

- Produces:

  ```ts
  // tones.ts
  export const scaleFrequency: (step: number) => number // D Hijaz from D4 (293.66 Hz): semitones [0,1,4,5,7,8,10], repeating per octave
  export const WRONG_TONE: SoundDef
  export const motif: (steps: readonly number[], spacing?: number) => SoundDef // scale steps played in turn
  export const SOLVED: SoundDef
  export const LEVEL_COMPLETE: SoundDef
  export const JOURNEY_COMPLETE: SoundDef
  export const LOCK_SOLVED: SoundDef
  // coreSounds.ts
  export const CORE_SOUNDS = {
    puzzleSolved: "puzzle.solved",
    levelComplete: "level.complete",
    journeyComplete: "journey.complete",
    sequenceStep: "sequence.step",
    sequenceWrong: "sequence.wrong",
    lockSolved: "lock.solved",
  } as const
  export const rewardSound: (rewardType: string) => string // `reward:${type}`
  // sequence.step reads options.note as the scale step
  ```

- [ ] **Step 1: Write the failing tests.**
  - `tones.spec.ts`:
    - `it("each step of the scale is higher than the one before, across two octaves")`, for steps 0..13.
    - `it("starts the scale on D4")`: `expect(scaleFrequency(0)).toBeCloseTo(293.66, 1)`.
    - `it("the wrong tone is none of the scale's notes")`.
    - `it("the journey phrase is bigger than the level phrase")`: more tones and a later last end.
  - `useLevelSounds.spec.ts` (renderHook, `playSound` mocked via `vi.mock("@/app/audio/audio")`):
    - `it("moving on to the next level plays level.complete once")`
    - `it("moving past the last level plays journey.complete instead")`
    - `it("mounting at any level plays nothing")`, which covers reload and opening a finished journey
    - `it("going back to an earlier level plays nothing")`
  - `PuzzleFamilyShell.spec.tsx`: `it("solving the board plays puzzle.solved once")`.
- [ ] **Step 2:** Run `yarn test src/app/audio src/app/PyramidExpedition/useLevelSounds.spec.ts src/mods/core/app/PuzzleFamilyShell.spec.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `useLevelSounds` keeps the previous `levelNr` in a ref and plays only when `levelNr` rises. It plays `journey.complete` when the new `levelNr > levelCount`, and `level.complete` otherwise.
  - `useJourneys.completeLevel` bumps `levelNr` once per finished level, after the interior or the board, so this fires once for each finished level.
  - Add `playSound(CORE_SOUNDS.puzzleSolved)` as the first line of `handleSolved`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: musical sounds for solved puzzles and finished levels`

### Task 4: Sequence tiles play a rising scale, with a wrong tone

**Files:**

- Modify:
  - `src/game/sequencePlay.ts` (`walkPresses` :14: each press also returns `at: Place`, the tile's cell)
  - `src/app/SiteMap/useSiteNavigation.ts` (`walkTo` :250-256: play one cue per press, delayed by `walkDelay(...at) / 1000` seconds)
- Create: `src/app/SiteMap/sequenceSounds.ts`
- Test: `src/app/SiteMap/sequenceSounds.spec.ts`, `src/game/sequencePlay.spec.ts` (update the expectations to include `at`), `src/app/SiteMap/processionWalk.spec.tsx` (or a new spec on `sequenceFixtures`)

**Interfaces:**

- Consumes: `CORE_SOUNDS.sequenceStep`, `CORE_SOUNDS.sequenceWrong` (Task 3); the state format of `src/game/sequence.ts:1-12` (`"k"` means k walked in order, `"x<k>.<w>"` means spoiled).
- Produces: `export const sequenceCue: (state: string) => { name: string; options?: SoundOptions } | undefined`

- [ ] **Step 1: Write the failing tests.**
  - `sequenceSounds.spec.ts`:
    - `it("the third tile walked in order plays the third note of the scale")`: `sequenceCue("3")` equals `{ name: "sequence.step", options: { note: 2 } }`.
    - `it("a tile walked out of order plays the wrong tone")`: `sequenceCue("x1.3")?.name === "sequence.wrong"`.
    - `it("after the reset the first tile starts the scale again")`: `sequenceCue("1")` has `note: 0`.
  - Walk spec: `it("walking across two due tiles plays two rising notes, the second scheduled later")`. Mock `playSound` and assert two calls, with `note` 0 then 1 and a larger `delay` on the second.
- [ ] **Step 2:** Run `yarn test src/app/SiteMap/sequenceSounds.spec.ts src/game/sequencePlay.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `sequenceCue`: a numeric `k >= 1` maps to step `k - 1`, and the spoiled form maps to the wrong tone. `"0"` (the reset) gives `undefined`. Register `sequence.step` as `options => [one tone at scaleFrequency(options.note ?? 0)]`, and `sequence.wrong` as `WRONG_TONE`.
- [ ] **Step 4:** Run the same command plus the walk spec. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: sequence tiles play a rising scale and a wrong tone`

### Task 5: Lock-solved event

The new event: "the last door of this lock is open". It fires once per lock, on the transition, never on reload.

The runtime reads it from data the site map already holds. The floor's `locks` (`PlacedLock[]`, in `generatedWorld` per floor) give the topology, and `openGateKeys` from `useAssembledFloor` (`src/app/SiteMap/useAssembledFloor.ts:431-438`) gives the doors open right now. A placed lock compiles with namespace `instance = placed.as ?? placed.lock.name` (`floorLocks.ts:103`, `lockCompile.ts:329`), so its gate `g` is the obstacle `${instance}.${g}`. The door's key is `gateKeyOf(floorRef, "${instance}.${g}")` (`src/game/carve/ids.ts:18`). The lock's last doors are its gates that touch `lock.out`: a connection gate whose `from` or `to` is `out`, or a region gate on `out`. The lock counts as solved while any of them is open.

**Files:**

- Create: `src/game/lockSolved.ts`, `src/app/SiteMap/useLockSolvedSound.ts`, `src/app/SiteMap/lockSolved.verify.ts`
- Modify: `src/game/floorLocks.ts:103` (export `instanceName`); `src/app/SiteMap/SiteMapScreen.tsx` (call the hook beside `useAssembledFloor`, :107)
- Test: `src/game/lockSolved.spec.ts`, `src/app/SiteMap/useLockSolvedSound.spec.ts`

**Interfaces:**

- Consumes: `CORE_SOUNDS.lockSolved`, `LOCK_SOLVED`.
- Produces:

  ```ts
  export const lastDoorsOf: (placed: PlacedLock) => string[] // obstacle ids `${instance}.${gate}`
  export const solvedLocks: (locks: readonly PlacedLock[], isOpen: (obstacleId: string) => boolean) => Set<string> // instance names
  export const useLockSolvedSound: (args: {
    locks: readonly PlacedLock[] | undefined
    openGateKeys: ReadonlySet<string>
    floorRef: FloorRef
  }) => void
  ```

- [ ] **Step 1: Write the failing tests.** Use made-up `Lock` objects only, written in the spec file. Never read a `.lock` from `src/game/locks`.
  - `lockSolved.spec.ts`:
    - `it("a lock whose door into its way out is shut is not solved")`
    - `it("a lock is solved once any door into its way out stands open")`
    - `it("names a lock placed with as by that name, not by the lock's")`
    - `it("a lock with no door into its way out is never solved")`
    - `it("an open door elsewhere in the lock does not solve it")`
  - `useLockSolvedSound.spec.ts` (renderHook; `playSound` mocked; `openGateKeys` swapped through `rerender`):
    - `it("opening a lock's last door plays lock.solved once")`
    - `it("a floor that loads with the lock already open plays nothing")`: the first render is already solved, so this is the reload case.
    - `it("closing and reopening the last door does not play again")`
    - `it("moving to another floor where a lock is open plays nothing")`: the `floorRef` changes and the hook re-seeds.
    - `it("two locks opened in one write play twice")`
  - `lockSolved.verify.ts`: for every floor of `generatedWorldConfigs` with `locks`, assemble it (`assemblePlayedFloor`). Assert that every id from `lastDoorsOf` has a gate cell whose `requiredKeyId` equals `gateKeyOf(floorRef, id)`: `it("every lock's last door carries the key the lock-solved event reads")`. Use `console.info` to list the locks that have no last door (they never chime), for the report.
- [ ] **Step 2:** Run `yarn test src/game/lockSolved.spec.ts src/app/SiteMap/useLockSolvedSound.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Register `lock.solved` as `LOCK_SOLVED` in `coreSounds.ts`.
  - The hook keeps `{ floor: string; solved: Set<string>; fired: Set<string> }` in a ref, keyed by `${journeyId}#${levelIndex}#${floorIndex}`.
  - On a new key, it records the current solved set without playing.
  - After that, it plays for each instance that is newly solved and not yet in `fired`, then adds that instance to `fired`.
  - Build `floorRef` the way `useAssembledFloor` passes it to `assemblePlayedFloor`.
- [ ] **Step 4:** Run the specs (PASS), then `yarn verify-content src/app/SiteMap/lockSolved.verify.ts` (PASS). Note the "no last door" list for the PR description.
- [ ] **Step 5: Commit:** `feat: a chime when the last door of a lock opens`

### Task 6: Mod sounds: finds, heal, tableau; changelog and PR A

**Files:**

- Modify:
  - `src/app/SiteMap/useRewardOffer.ts:35-37`: `offerFound` plays `rewardSound(reward.type)` after the `skip` check.
  - `src/mods/hieroglyph/app/index.ts`: register `reward:hieroglyphFragment` and `hieroglyph.tableauComplete`.
  - `src/mods/hieroglyph/app/TombPuzzle.tsx`: in `handleLockSubmit`, in the right-code branch next to `setLockState("open")`.
  - `src/mods/mosaic/app/index.ts`: `reward:mosaicPiece`.
  - `src/mods/tombTreasure/app/index.ts`: `reward:mapPiece`, plus `reward:tombKey`. A tomb key is the treasure (`rewardDisplay.tsx:31-45`), and it gets the biggest motif.
  - `src/mods/trap/app/index.ts`: register `trap.heal`.
  - `src/mods/trap/app/useTrapProgress.ts:70-76`: `restoreHealth` and `drinkWaterskin` play `trap.heal` only when health was below max.
  - `CHANGELOG.md` `## Unreleased`.
- Test: `src/app/SiteMap/useRewardOffer.spec.ts`, `src/mods/hieroglyph/app/TombPuzzle.spec.tsx`, `src/mods/trap/app/useTrapProgress.spec.ts`

**Interfaces:**

- Consumes: `registerSound`, `playSound`, `motif`, `rewardSound` (Tasks 1 and 3).
- Every mod registers inside its existing `if (isModEnabled(...))` block. Money, sellables, camp finds, waterskins and purchases get no loot sound: those finds are R (slice 3) or not in the table.

- [ ] **Step 1: Write the failing tests.**
  - `it("a found reward plays the sound named for its type")`
  - `it("a reward a mod skips plays nothing")`
  - `it("the right tableau code plays the tableau sound once; a wrong code plays nothing")`
  - `it("coming home hurt plays the heal; coming home whole plays nothing")`
  - `it("a waterskin drunk at full health plays nothing")`
- [ ] **Step 2:** Run the three specs. Expected: FAIL.
- [ ] **Step 3: Implement** as listed under Files. Motifs are short `motif([...])` phrases on the core scale, ordered by worth: fragment < mosaic piece = map piece < treasure. Add the PR A changelog line from the PR table under `### Added` in `## Unreleased`.
- [ ] **Step 4: Verify.**
  - `yarn verify` exits 0. It runs lint, types, tests, the starter, junior and expert freezes, and betterer.
  - `git diff --stat origin/main -- src/data` prints nothing.
  - Mod toggle-off check: locally remove `trap` from `registeredMods`, then run `yarn check-types && yarn test src/app/audio src/mods/trap`. Restore it afterwards.
  - Then `yarn dev` and check by ear: solve a puzzle, walk a sequence, open a lock, find a fragment.
- [ ] **Step 5: Commit** `feat: mod sounds for finds, heals and tableaus`, push `audio/sound-service`, open PR A, and run `yarn pr:wait N`.

---

## PR B — what's new and credits (slice 1, part 2)

### Task 7: What's new

**Files:**

- Create: `src/app/whatsNew/parseChangelog.ts`, `src/app/whatsNew/WhatsNewPanel.tsx`, `src/ui/molecules/ReleaseNotes.tsx` + `.stories.tsx`
- Modify: `src/app/SettingsModal.tsx`: a toggle button plus a panel, the same pattern as `saveCard` (:104-113). Locales: `ui.whatsNew`, plus `whatsNew.section.{Added,Changed,Fixed,Removed}` in en and nl.
- Test: `src/app/whatsNew/parseChangelog.spec.ts`, `src/app/whatsNew/WhatsNewPanel.spec.tsx`

**Interfaces:**

- Produces:

  ```ts
  export type Release = { version: string; date: string; sections: { heading: string; lines: string[] }[] }
  export const parseChangelog: (markdown: string, count: number) => Release[]
  export const WHATS_NEW_COUNT = 3
  export const ReleaseNotes: FC<{ releases: Release[]; sectionLabel: (heading: string) => string }>
  ```

- [ ] **Step 1: Write the failing tests.** Use made-up markdown in the spec, never the real CHANGELOG.
  - `it("reads the newest released versions first, skipping Unreleased")`
  - `it("returns no more than count releases")`
  - `it("keeps each section's heading and its bullet lines")`, which pins the `## 1.2.3 - 2026-01-02` heading format and `### Added|Changed|Fixed|Removed` sections.
  - `it("a release with no bullets is still listed with no sections")`
  - Panel: `it("shows the releases once the changelog has loaded")`, with the raw import mocked.
- [ ] **Step 2:** Run `yarn test src/app/whatsNew`. Expected: FAIL.
- [ ] **Step 3: Implement.** The panel loads the text with `import("@/../CHANGELOG.md?raw")` when it opens. That puts the 50 KB changelog in its own chunk instead of the main bundle. The panel parses it and renders `ReleaseNotes`. A heading with no translation key shows as written.
- [ ] **Step 4:** Run `yarn test src/app/whatsNew` (PASS). Run `yarn build`; afterwards `ls dist/assets | grep -i changelog` shows a separate chunk.
- [ ] **Step 5: Commit:** `feat: what's new in settings`

### Task 8: Credits; changelog and PR B

**Files:**

- Create:
  - `src/app/credits/audioCredits.ts`: the zod schema plus `import.meta.glob("@/assets/audio/**/*.credit.json", { eager: true, import: "default" })`
  - `src/app/credits/audioCredits.spec.ts`
  - `src/app/credits/CreditsPanel.tsx`
  - `src/ui/molecules/CreditsList.tsx` + `.stories.tsx`
- Modify: `src/app/SettingsModal.tsx` (a Credits toggle and panel). Locales: `ui.credits`, `credits.sounds`, `credits.none` ("Every sound you hear is made by the game itself."), `credits.source`, `credits.licence`. `CHANGELOG.md`.

**Interfaces:**

- Produces:

  ```ts
  export type Credit = {
    file: string
    title: string
    author: string
    authorUrl?: string
    source: string
    licence: string
    licenceUrl: string
  }
  export const audioCredits: () => Credit[] // sorted by title
  export const CreditsList: FC<{
    heading: string
    credits: Credit[]
    empty: string
    sourceLabel: string
    licenceLabel: string
  }>
  ```

  The credit file is `<audio file name>.credit.json`, next to the audio file. It holds every field of `Credit` except `file`, which is derived from the file name.

- [ ] **Step 1: Write the failing tests** (node; uses `fs`):
  - `it("every audio file has a credit file next to it")`: walk `src/assets/audio` (missing means empty) for `.mp3|.aac|.m4a|.ogg|.opus|.wav`.
  - `it("every credit file names an audio file that exists")`
  - `it("every credit file has a title, author, source URL and licence")`: zod parse.
  - Panel: `it("says the sounds are made by the game when no file is credited")`.
- [ ] **Step 2:** Run `yarn test src/app/credits`. Expected: FAIL.
- [ ] **Step 3: Implement** as listed. Links open in a new tab with `rel="noopener noreferrer"`. Add the PR B changelog line.
- [ ] **Step 4:** `yarn verify` exits 0. `git diff --stat origin/main -- src/data` is empty.
- [ ] **Step 5: Commit** `feat: credits in settings`, push `settings/whats-new-credits`, open PR B, and run `yarn pr:wait N`.

---

## PR C — music (slice 2)

### Task 9: Music file, credit, and the precache exclusion

**Files:**

- Create: `src/assets/audio/music-egyptian-dawn.mp3` (provided by the user from Pixabay; see the designer questions), `src/assets/audio/music-egyptian-dawn.credit.json`
- Modify: `vite.config.ts`. Add `"**/music-*.{mp3,aac,m4a,ogg}"` to `globIgnores` (:154). `globPatterns` (:120) already precaches every mp3 and aac. Add a `runtimeCaching` entry for `/\/music-[^/]+\.(mp3|aac|m4a|ogg)$/` with `CacheFirst`, `cacheName: "music"`, `expiration: { maxEntries: 2 }`, `cacheableResponse: { statuses: [200] }` and `rangeRequests: true`, so the `<audio>` element's Range requests are served from the cached full file.

**Interfaces:**

- Produces: the file naming rule. A file named `music-*` is music, never precached and cached at runtime. Effects (slice 3) use any other name and are precached.

- [ ] **Step 1:** Write the credit JSON:
  - title "Egyptian Dawn (Full version)"
  - author "kaazoom", with the Pixabay user URL
  - source: the track's Pixabay URL
  - licence "Pixabay Content License", `https://pixabay.com/service/license-summary/`

  The Task 8 credit tests now cover it.

- [ ] **Step 2:** Run `yarn test src/app/credits`. Expected: PASS, with the credit listed.
- [ ] **Step 3:** Change `vite.config.ts` as listed.
- [ ] **Step 4: Verify** with `yarn build`:
  - `ls dist/assets/music-egyptian-dawn-*.mp3` finds the file.
  - `grep -c "music-egyptian-dawn" dist/sw.js` prints `0`, so it is not in the precache manifest.
  - `grep -c "\"music\"" dist/sw.js` prints at least `1`, so the runtime route exists.
- [ ] **Step 5: Commit:** `feat: background music track, cached at runtime only`

### Task 10: Music playback with ducking

**Files:**

- Modify: `src/app/audio/audioService.ts` (`setMusic`, `duck`, a visibility hook), `src/app/audio/audio.ts` (pass in the music URL and the element factory), `src/app/audio/fakeAudio.testing.ts` (a fake media element and `createMediaElementSource`)
- Test: `src/app/audio/audioMusic.spec.ts`

**Interfaces:**

- Consumes: Task 1's `AudioService`. Task 1's `AudioContextLike` gains `createMediaElementSource`.
- Produces: `createAudioService` deps gain `music?: { url: string; createElement: (url: string) => MediaElementLike; warmCache?: (url: string) => void }` and `onHidden?: (cb: (hidden: boolean) => void) => () => void`.
  - `MediaElementLike = Pick<HTMLAudioElement, "play" | "pause" | "loop" | "src" | "preload">`
  - `MUSIC_GAIN = 0.35`, `DUCKED_GAIN = 0.08`, `DUCK_FADE_S = 0.8` (exported constants)
  - The music URL comes from `import musicUrl from "@/assets/audio/music-egyptian-dawn.mp3?url"`.

- [ ] **Step 1: Write the failing tests:**
  - `it("with music off, no music element is made and nothing is fetched")`: the element factory and `warmCache` are each called 0 times.
  - `it("turning music on after the first tap starts the looping track once")`: one element, `loop === true`, one `play`.
  - `it("music turned on before the first tap waits for the tap")`
  - `it("turning music off pauses it")`
  - `it("while ducked, the music gain ramps to the ducked level, and back when released")`: assert the ramp **target** values on the fake gain, not times.
  - `it("two overlapping ducks restore full volume only when both are released")`
  - `it("hiding the page pauses the music and showing it resumes it")`
  - `it("turning music on fetches the track once to fill the runtime cache")`: `warmCache` is called once across two toggles.
- [ ] **Step 2:** Run `yarn test src/app/audio`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The element is created lazily with `preload = "auto"` and routed through `createMediaElementSource` into a gain node at `MUSIC_GAIN`.
  - `duck()` keeps a counter and ramps with `linearRampToValueAtTime` over `DUCK_FADE_S`.
  - The default `warmCache` is `fetch(url)`, with errors ignored. While offline before first caching, the music simply does not play.
  - The default `onHidden` listens to `visibilitychange`.
- [ ] **Step 4:** Run `yarn test src/app/audio`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat: looping music that ducks on request`

### Task 11: Duck during encounters and the exterior board; changelog and PR C

**Files:**

- Create: `src/app/audio/useDuckMusic.ts`
- Modify:
  - `src/app/SiteMap/SiteMapScreen.tsx`: `useDuckMusic(encounter.isOpen)`. `useEncounter` exposes `isOpen` (`useEncounter.ts:211`), and `EncounterModal` renders at :330-345.
  - `src/app/PyramidExpedition.tsx`: `useDuckMusic(!showingInterior && !boardSolved && !expeditionCompleted)`. This is the exterior pyramid board, which is a puzzle.
  - `CHANGELOG.md`.
- Test: `src/app/audio/useDuckMusic.spec.ts`

**Interfaces:**

- Consumes: `audio.duck()` (Task 10).
- Produces: `export const useDuckMusic: (active: boolean, service?: AudioService) => void`

- [ ] **Step 1: Write the failing tests:**
  - `it("ducks while active and releases when it turns inactive")`
  - `it("releases on unmount")`
  - `it("never ducks while inactive")`
- [ ] **Step 2:** Run `yarn test src/app/audio/useDuckMusic.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Write an effect on `active` that returns the release. Wire it into the two screens listed. Add the PR C changelog line.
- [ ] **Step 4: Verify.**
  - `yarn verify` exits 0, and `git diff --stat origin/main -- src/data` is empty.
  - Run `yarn build && yarn preview`. In the browser's Application tab, the precache holds no `music-` file before Music is turned on, and the `music` cache holds it after.
  - With Music on, open a puzzle and the music drops, then returns when the puzzle closes.
- [ ] **Step 5: Commit** `feat: music ducks during encounters`, push `audio/music`, open PR C, and run `yarn pr:wait N`.

---

## Slice 3 follow-up (not tasks: the designer has not picked the files yet)

- Add a `{ kind: "file"; url }` form of `SoundDef`. Files are decoded once into `AudioBuffer`s, lazily, the first time effects are on. Effects are precached because their names do not start with `music-`.
- Each file lands with its `.credit.json`. The Task 8 test refuses a file without one.
- Hook points, verified 2026-11-23 (paths under `src/`):
  - stones fly in: `app/PyramidLevel/PyramidDisplay.tsx:130-132`
  - next-level zoom: where `flow.startNextLevel` turns true (`useExpeditionFlow.ts`)
  - first footstep of a walk: `walkTo` in `useSiteNavigation.ts`, once per walk
  - lever: `throwLever`, `useSiteNavigation.ts:317-321`
  - stone, plate, pipe: `useSiteNavigation.ts:394-406`
  - reveal wave: `useRevealWave` (`SiteMapView.tsx:1729`), not its render
  - zipline and squeeze: `takeSpan` (:184) / `useCrossing.ts`
  - barrier recedes: `useRegionBarrierCovers.ts:30-37`
  - chest: `mods/core/app/treasureChest/plugin.tsx:24`
  - money: `reward:money` registered by the shop mod
  - canister pour, balance settle, sudoku furl: the handlers that set the `animate-pour`, `animate-settle` and `animate-furl` state, not the class lines
  - trap damage: `mods/trap/app/TrapFamilyShell.tsx:52-53`; crocodile bite: `CrocodilePit.tsx:164`
  - buy and sell: `mods/shop/app/fezShop/plugin.tsx:67`, `:98`
  - campfire loop: while `CampScene` is mounted in `app/Base.tsx:244`
  - tomb tile: `TombPuzzle.tsx` `handleTileClick`; lock panel: where `lockState` becomes `"open"`
- Each of these is a mod-owned name except the core ones (footstep, lever, stone, reveal, crossing, barrier, chest, stones fly). Each mod registers its own names in its enabled block.
