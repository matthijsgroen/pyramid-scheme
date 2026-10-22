# Handover — the tomb redesign

A tomb should feel like **the end of a difficulty tier**, not a weak extra pyramid, and it should be **hidden**:
found through map pieces. Today a tomb's exterior is a plain pyramid (tombs never had an exterior of their
own) and its floors are not exciting. This is the brainstorm's state on 2026-10-22, run with the designer; the
next session picks it up at "present the design in sections", then writes the spec and the plan
(superpowers:brainstorming → superpowers:writing-plans).

## Decided with the designer

**A tomb is a journey of two levels (two sites).**

1. **The cave.** Exterior: a small desert range with a cave mouth — the tomb is hidden. There is **no number
   pyramid to fill in** on this exterior. Inside: one floor, **not dressed in the rank's art but as a cave**.
   Its purpose is build-up and atmosphere; the heart of it is **a substantial floor lock** at **tier + 1**
   (starter has no floor locks of its own, so the starter cave carries the game's first floor lock — e.g.
   levers and doors, one mechanic, but several levers and several doors), with **a few puzzles in between**
   so it is not too compact. **No loot.** The player leaves the cave by the **pillar of light**, the one exit,
   as every site does now.
2. **The sunlit cavern.** Exterior: a gigantic cave with sunlight falling in, the pyramid standing in it
   (background art to generate). Its exterior number pyramid is **tier + 1**. Inside: **several floors, as
   tombs have now**, with floor locks and puzzles at **tier + 1** around the existing content.

**Kept exactly as they are:** the **tableaus**, in the same order on the main path, each floor leading to its
ward key — so the hieroglyph collection does not change; the crocodile and the treasure chest; the tomb's own
loot. **No loot from the new puzzles or locks** (cave or tomb): tier + 1 puzzles must not pull higher-tier loot
into the early game.

**Flow:** no slide transition between cave and cavern — the cave's pillar leads straight to the cavern's
exterior; it reads as one place. On a **later visit the cave is skipped**: the journey continues at the
pyramid, the way a journey resumes at its level.

**Wizard tomb:** there is no tier above wizard, so its "+1" is wizard at its heaviest — the largest boards
and the hardest floor-lock combinations.

**Scope and timing:** the **starter tomb ships in the starter release** (saves reset with that release anyway,
`docs/instructions/world-reshape-release.md`); the other tiers' tombs follow with their own releases.

## Already true, so not part of the redesign

- One exit per site, at the main path's end (`docs/instructions/exit-on-top-floor-plan.md`).
- Faces and poses, ghosts on the floor with revisit lines, Ipi's rewritten scene, Fez's tomb lines (hieroglyph
  line now plays with the tableau open).

## Next steps

1. Re-run the read-only exploration (an Explore agent was mapping this when the session ended): how a tomb
   journey is defined (`TOMB_JOURNEYS`, `src/worldGen/spec/starter.ts` tomb entry, `entryLock`, map pieces);
   journey `exterior`/`background`/levels and where the level slide transition lives (`PyramidExpedition`);
   how a floor gets its rank dressing and whether a non-rank "cave" skin has a precedent; where the exterior
   board's tier comes from; floor-lock placement and per-section tier; loot slots and authoring a no-loot site.
2. Present the design in sections (journey shape, cave site, cavern site, flow/transition, art list, lock and
   puzzle tiers, what stays untouched, testing), get approval per section.
3. Write the spec to `docs/superpowers/specs/2026-10-xx-tomb-redesign-design.md`, then the plan.
4. Art to queue (the user paints): the cave-mouth exterior, the sunlit cavern with its pyramid, the cave floor
   and wall tiles; and a junior floor lock for the starter cave (Claude may write junior/expert locks).

## Open questions still to ask

- The cave floor's puzzles: own tier or tier + 1?
- The cave floor lock: which mechanic per tier (starter → junior: levers and doors, per the designer).
- Story beats in the cave (Fez/explorer lines on entering the cave, on the light, on seeing the pyramid).
