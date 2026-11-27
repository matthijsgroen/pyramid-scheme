# Sound, music, credits and "what's new"

## Intent

The game is silent today: no audio, no haptics, no sound setting. Sound should mark the moments that matter
and leave thinking time quiet. There are two layers of effects plus one music track:

- **Real sounds** for what physically happens in the world: stone, levers, sand, coins.
- **Quiet recorded sounds** for success, where the table marks them.
- **Background music** for the map and the camp, played softer during a puzzle.

The game is free and open source, and every audio file lives in the public repo. So licences matter, and the
settings gain a credits screen. They also gain a "what's new" screen showing the latest changelog entries.

## Goals

- Every moment in the table below sounds as listed, and nothing else makes noise.
- Two independent switches in Settings: **Music** and **Sound effects**.
- The game behaves identically with both switched off: no audio loaded, no errors.
- The credits screen lists every audio file with its author, source and licence.
- A "what's new" screen shows the last few CHANGELOG entries.

## Non-goals

- No sound for UI buttons, modals, dialogue lines, stairs, the exit, or being blocked.
- No voice acting.
- No per-sound volume sliders; the two switches are enough.
- No haptics for now.

## Anti-goals (a failure even if it works)

- Noise during thinking: a loud or pitched click on every move, or music at full volume over a puzzle.
- A footstep on every step of a long walk. Only the first step of a walk sounds, softly.
- A first download that grows by megabytes because of music the player never turned on.
- An audio file in the repo whose licence forbids redistribution from a public repo.

## The moments

R = a recorded sample, "R, pitched" = one sample played at a different pitch per step, – = silent.

| Area   | Moment                                                            | Kind       | Notes                                                                                                                                                    |
| ------ | ----------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Map    | pyramid opens (stones fly in; zoom to the next level)             | R          | heavy stone sliding                                                                                                                                      |
| Map    | level complete, journey complete                                  | R          | an oud note for a level, a long ney tone for a journey                                                                                                   |
| Site   | first step of a walk                                              | R          | soft footstep; later steps silent                                                                                                                        |
| Site   | lever or handle thrown                                            | R          |                                                                                                                                                          |
| Site   | stone lifted, stone set down, pressure plate                      | R          |                                                                                                                                                          |
| Site   | sequence tile stepped on correctly                                | R, pitched | one quiet sample, pitched to the next note of a rising scale                                                                                             |
| Site   | sequence tile wrong                                               | R          | its own sample; the scale starts over                                                                                                                    |
| Site   | corridor opens behind a gate (reveal wave)                        | R          | stone grinding                                                                                                                                           |
| Site   | **last door of a lock opens**                                     | R          | a stone door settling; see below                                                                                                                         |
| Site   | zipline, squeeze                                                  | R          | whoosh, scrape                                                                                                                                           |
| Site   | sand or water barrier recedes                                     | R          |                                                                                                                                                          |
| Site   | chest opens                                                       | R          |                                                                                                                                                          |
| Site   | loot: money                                                       | R          | coins                                                                                                                                                    |
| Site   | loot: fragment, mosaic or map piece, treasure                     | R          | a rising harp glissando; a treasure rings finger cymbals                                                                                                 |
| Puzzle | move on the board                                                 | R, pitched | a soft tap, stone, or wood on a papyrus board, pitch varied a little; moves within 80 ms tap once; none where the move has its own sound (canister pour) |
| Puzzle | solved                                                            | R          | a short plucked run rising to a ringing note, timed with the finish                                                                                      |
| Puzzle | family flavour: canister pour, balance settle, sudoku scroll furl | R          |                                                                                                                                                          |
| Trap   | trap fires, heart lost                                            | R          | dull thud                                                                                                                                                |
| Trap   | heal (waterskin, rest)                                            | R          | a sip of water                                                                                                                                           |
| Shop   | buy, sell                                                         | R          | coins                                                                                                                                                    |
| Camp   | campfire crackle                                                  | R          | loop, while the camp is on screen                                                                                                                        |
| Tomb   | tile placed                                                       | R          |                                                                                                                                                          |
| Tomb   | lock panel slides open                                            | R          | a stone door sliding                                                                                                                                     |
| Tomb   | tableau complete                                                  | –          |                                                                                                                                                          |

Trigger points are in the appendix; the builder confirms each line before hooking it.

### Derived events

- **Lock solved:** "the last door of this lock is open" is derived at runtime from mechanism state and lock
  topology (`src/game/lockSolved.ts`). It fires once per lock, on the transition, and never again when the
  player reloads the floor.
- **Ward gate or key used:** no discrete event exists for it. It is not in this table, so no work is needed.

## Music

- Track: "Egyptian Dawn (Full version)" by kaazoom on Pixabay, 4:53, Pixabay Content License.
- Plays on the site map, the journey map and the camp, and loops.
- It plays well under the effects: footsteps must stay audible over it.
- During a puzzle or trap encounter it fades out to silence over two seconds, and fades back when the encounter closes, or already when a solved board shows its time:
  a tune distracts from a board.
- It loads only when Music is on, never in the precache of the first download, and it streams.

## Controls and platform

- Settings gets two checkboxes, Music and Sound effects, following the "tutorials" checkbox pattern
  (`useGameStorage`).
- Browsers allow audio only after a user gesture. The audio context starts on the first tap. A moment that
  happens before that stays silent and is never queued.
- Every sound is a short compressed file (format is the builder's call), fetched and decoded on its first
  play after the first tap, then cached. All effects pass through one low master gain.
- Audio is a mod-agnostic core service. Mods call it by sound name, in line with docs/mods/TARGET.md, and a
  disabled mod's sounds simply never play.

## Credits screen

- Reached from Settings. It lists each audio asset with its title, author, source URL and licence.
- The list is data next to the audio files, one entry per file, so adding a sound adds its credit. A test
  checks that every audio file has a credit entry.
- Room is left for other credits later; this spec does not decide their content.

## "What's new" screen

- Reached from Settings. It shows the last N released versions from CHANGELOG.md (builder's call: 3), with
  their Added, Changed, Fixed and Removed lines.
- It is read from the changelog at build time, so there is no separate copy to maintain.
- Entries are English, as written in the changelog. Translating them is out of scope for now.

## Decided by the designer

- Which moments sound, as in the table.
- The sequence tile as a rising scale with its own wrong sound.
- The music track, softer during puzzles.
- Sound candidates are proposed by Claude, and the designer picks.
- Credits and "what's new" both live under Settings.

## Claude's calls (check these)

- Footsteps only on the first step of a walk.
- Two switches, no sliders.
- The music lazy-loads, then is cached for offline play.
- The credits list is checked by a test.
- "What's new" shows the last 3 versions, built from CHANGELOG.md.

## Decided after review (designer, 2026-11-23)

- **Files and licences live in the repo.** Every audio file, the music included, is committed. A licence
  file stands next to each one, naming its title, author, source URL and licence, as in BlockSort. The
  credits screen reads the same data.
- **Offline:** effects go into the precache, so they play offline from the first visit. The music is not
  precached: it loads the first time Music is turned on, then is cached at runtime so it plays offline after
  that. The precache globs (`vite.config.ts:120`) must exclude it explicitly.
- **Defaults:** sound effects on, music off, for new and existing players alike. This is a new setting, so
  no save migration is needed; the default applies when the key is absent.
- **Music file:** AAC at 64 kbps in an `.m4a` file (2.4 MB), as BlockSort ships its music in AAC.
- **Ducking:** every encounter ducks the music, the shop and the exterior pyramid board included.
- **Lock solved:** a door into the lock's way-out region opens; it fires once per lock.
- **Scale:** D Hijaz from D4, approved by ear.
- Synthesised tones were tried and rejected (too emphatic, they hurt the ambience). Every moment uses a
  recorded sample or stays silent. The sequence tile pitches one quiet sample along the D Hijaz scale.
- **Puzzle solved plays a soft sound:** played on a phone (2026-11-25) a silent solve felt missing.
- **Tableau complete stays silent.**

## Scope and order (Claude's call)

- Audio is runtime only: no carve, bake or save data changes, so the freeze guards are untouched. It ships for
  every tier at once; moments on unreleased tiers simply play when players get there.
- The lock-solved event is computed at runtime from mechanism state; it writes nothing to frozen data.
- Slices: (1) sound service with sample playback + Settings switches + the trigger points + credits + what's
  new; (2) music; (3) the sound files, after the designer has picked them. No placeholder files ship, and a
  switch stays hidden until something exists for it to silence.

## Left to the builder

The file format, the volume levels and the duck fade, the event wiring, and how the sound
service is split across files.

## Appendix: trigger points (code inventory 2026-11-23; verify before hooking)

- Pyramid stones fly in `src/app/PyramidLevel/PyramidDisplay.tsx:132`; next-level zoom `src/app/PyramidExpedition.tsx:211-235`
- Level complete: `levelNr` rising (`completeLevel` in `src/app/state/useJourneys.ts`); journey complete: `levelNr > levelCount`,
  which also holds on reload, so both fire on the change only (`src/app/PyramidExpedition/useLevelSounds.ts`), a second
  after it so the pyramid's stones finish sliding first
- Walk steps `src/app/SiteMap/ExplorerDot.tsx:251`, delay `src/app/SiteMap/useSiteNavigation.ts:170`
- Sequence tile: `walkPresses` in `walkTo`, `useSiteNavigation.ts:253` (state format in `src/game/sequence.ts`)
- Lever `useSiteNavigation.ts:317-321`, `:492`
- Stone / plate / pipe `useSiteNavigation.ts:399-406`
- Corridor opens: reveal wave `src/app/SiteMap/SiteMapView.tsx:1729`, `:2642`
- Zipline / squeeze `useSiteNavigation.ts:184` (`takeSpan`), `src/app/SiteMap/useCrossing.ts`
- Barrier recedes `src/app/SiteMap/useRegionBarrierCovers.ts:34-36`
- Chest `src/mods/core/app/treasureChest/plugin.tsx:24`
- Loot `src/app/SiteMap/useRewardOffer.ts:40`; each mod registers `rewardSound(type)` in its `app/sounds.ts`
- Canister pour `CanistersBoard.tsx:142`; balance settle `BalanceBoard.tsx:192`; sudoku furl `SudokuScrolls.tsx:62`
- Trap damage `src/mods/trap/app/TrapFamilyShell.tsx:52-53`; crocodile `crocodile/CrocodilePit.tsx:165`
- Heal: waterskin `src/mods/trap/app/rewardContribution.ts:8`; rest `useTrapProgress.ts:70`
- Buy / sell `src/mods/shop/app/fezShop/plugin.tsx:67`, `:98`
- Camp `src/ui/atoms/CampScene.tsx`
- Tomb tile `src/mods/hieroglyph/app/TombPuzzle.tsx:92`; lock panel `src/mods/hieroglyph/app/TombPuzzle.tsx:67` (the last tile placed)
- Settings checkbox pattern `src/app/SettingsModal.tsx` (~96); precache globs `vite.config.ts:120`
