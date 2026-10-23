# Handover — the tomb redesign

Design: [the spec](superpowers/specs/2026-10-22-tomb-redesign-design.md). Build plan:
[the plan](superpowers/plans/2026-10-22-tomb-redesign.md).

**The starter tomb is built**: the cave (one floor, a lever lock, three puzzles, ending in a chest) and the sunlit cavern
(four floors, locks on floors 2 and 4, junior puzzles between the tableaus). A tomb should feel like **the end
of a difficulty tier**, and it is **hidden**, found through map pieces. What follows is the design it follows.

## Decided with the designer

**A tomb is a journey of two levels (two sites).**

1. **The cave.** Exterior: a small desert range with a cave mouth — the tomb is hidden. There is **no number
   pyramid to fill in** on this exterior. Inside: one floor, **not dressed in the rank's art but as a cave**.
   Its purpose is build-up and atmosphere; the heart of it is **a substantial floor lock** at **tier + 1**
   (starter has no floor locks of its own, so the starter cave carries the game's first floor lock — e.g.
   levers and doors, one mechanic, but several levers and several doors), with **a few puzzles in between**
   so it is not too compact. **The cave ends in a chest with filler loot.** The player leaves the cave by the **pillar of light**, the one exit,
   as every site does now.
2. **The sunlit cavern.** Exterior: a gigantic cave with sunlight falling in, the pyramid standing in it
   (background art to generate). Its exterior number pyramid is **tier + 1**. Inside: **several floors, as
   tombs have now**, with floor locks and puzzles at **tier + 1** around the existing content.

**Kept exactly as they are:** the **tableaus**, in the same order on the main path, each floor leading to its
ward key — so the hieroglyph collection does not change; the crocodile and the treasure chest; the tomb's own
loot. The cave ends in a chest, and the cavern puzzles keep loot slots at the tomb's own tier, never a higher one (a room's loot tier is its section's, not its node's); they fill when the pool allows and with camp supplies later.

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

## What is left

1. **Story lines for the hooks**: entering the cave, the pillar of light in the cave, arriving at the cavern.
2. **The loot economy, decided before the starter release** (spec, "Outside this spec"): mosaic piece counts,
   health drops, inventory use, and (decided: the cave ends in a chest, the cavern puzzles keep loot slots).
3. **Paint the art queue** (`yarn repaint`, "Cave and cavern" in `docs/instructions/repaint-queue.md`): the
   cave-mouth and cavern exteriors, the `cave` floor, wall face, threshold and encounter wall.
4. **The other tiers' caves, caverns and locks**, each with its own release.
5. Playtest items are in `docs/playtest-backlog.md`, "The tomb: cave and cavern".
