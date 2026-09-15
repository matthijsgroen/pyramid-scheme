# The tomb exterior — a threshold nobody designed

Entering a tomb plays the sum-pyramid board, because when tombs were added it was the only outside puzzle
there was. `PyramidExpedition.tsx` branches on `isTomb` for the intro conversation and for nothing else.
So a sealed tomb is opened by solving a pyramid of numbers standing in front of it, which is the one place
in the game where the fiction and the board have no relationship at all.

Nine tombs use it. It is worth designing.

## A threshold is a different job from a room

| Constraint                                              | Why                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **One board, not a chain.** It is the door, not a floor | tombs already have interiors; the exterior is the act of getting in                                                       |
| **It repeats.** Players re-enter tombs                  | so either it is once-only per tomb, or it is short enough to be a ceremony rather than a toll (the review's complaint #1) |
| **It scales by RANK, and rank is tier here**            | a merchant's cache and the Throne of Eternity should not wear the same door                                               |
| **It must read as _closed on purpose_**                 | Act I already plants it: _"Every sealed thing in this country was sealed by someone who meant it."_                       |
| **It holds up as a puzzle on its own**                  | `PUZZLE_FAMILIES.md`: a dress is not a reason to build a mechanic                                                         |

## Where the catalogue's gaps actually are

`journeys.md` §9 is blunt about it: **half the catalogue asks for something funerary or cosmic, and those
are the two things no role serves.** `cosmos` holds exactly one member and needs three more before
`wizard_4` can restrict to the story it is named after.

Tombs are funerary by definition, and the three wizard tombs — Vault of the Gods, Realm of Cosmic Forces,
Throne of Eternity — are cosmic. **A tomb-door family points straight at the biggest documented gap**, which
is the rare case of a mechanic and a pool wanting the same thing.

The twelve shipped families cover latin-square (sudoku, futoshiki), quota placement (star battle), route
and path (hidato, lightbeam, constellation), arithmetic (sumplete, balance scale, canisters), time
(procession, eclipse) and move-ordering (rush hour). **Absent shapes: matching, tiling, sorting,
partitioning.** Anything proposed below should be one of those or it is a repaint.

## Candidates

### A. Seal impressions — matching, and the one I would build

Egyptian tombs were closed with cord and a clay lump, stamped from a cylinder seal. The necropolis had its
own seal; so did an owner, an official, a priesthood. A door carried several impressions and they said who
had closed it and on whose authority.

**Mechanic:** impressions on the door, and seals to match them against. Which seal made which mark — and
**which impression could not have been made by any seal here**. Deduction, not memory: the constraints are
overlaps, partial rolls, and marks that share features.

Why this one:

- **Matching is an absent shape**, so it is a new mechanic rather than a new costume.
- **It is the skill the story needs.** Act II is "what real looks like"; Act IV turns on a forged seal. A
  family whose whole question is _which of these was really made by that_ teaches the player to tell a
  genuine impression from a wrong one, nine times, before the plot asks them to.
- **It scales by rank naturally.** A merchant's cache carries two seals and obvious differences; a god's
  vault carries six and subtle ones.
- **Wordless by construction** — it is patterns against patterns.
- **Ipi would approve**, which is a sign it belongs to this world: seals are administration, and the
  starter tomb's ghost is a bookkeeper.

### B. The false door — deduction

A false door is a real artefact: a stela the dead pass through and the living do not. Several doors, one
is true.

Strong theme and it rhymes with the forgery, but the clues that make it deduction rather than a guess want
to be _facts about doors_, which is knowledge the player has not got and which tips toward text. Possible;
harder to keep wordless.

### C. Stretching the cord — alignment, and cosmic

_Pedj shes_, the founding ceremony: the king and Seshat fixed a building's axis by sighting on stars.
Aligning an axis under constraints is a real mechanic and it is **cosmic**, which is the pool that needs
three members.

The risk is constellation, which already owns star lattices. This has to be about _orientation_ rather
than about joining stars, or it is the same family facing a different way.

### D. Blocking stones — ruled out

Slabs wedged in a doorway, removed in the right order. Tactile and thematic, and it is **rush hour**:
_"nothing on this board is unknown… the whole question is the ORDER."_ Already built, already funerary-able
by a face.

## One family or two?

Nine tombs across five ranks. The merchant, noble, priest and pharaoh doors are **funerary**; the three
wizard vaults are **cosmic**, and they are the ones `journeys.md` says nothing can carry.

- **One family (A), faced five ways** — cheapest, and the door stays one idea the player gets better at.
- **Two families, A for ranks 1–4 and C for the gods' vaults** — serves both documented gaps and makes the
  last threshold feel like a different order of thing, which is exactly what the story wants at wizard.

Two is more honest to the fiction and costs a second family. It is also the only version where `cosmos`
gets a member out of this work.

## Open

1. **One family or two?**
2. **Once per tomb, or every entry?** The review wants the pyramid's exterior board dropped on re-entry;
   a tomb door is a better candidate for keeping, because opening a tomb is a thing that happens once and
   re-entering is walking back in.
3. **Does it consume map pieces?** Map pieces already gate tomb entry. If the door is also the lock, the
   pieces could be what the seals are matched against — or that is one idea too many in one screen.
4. **Is the forged seal in `arc-offering-to-the-gods.md` the same object as a door impression?** If the
   family teaches seals for four tiers, the Act IV forgery could be read on its own board rather than
   refused by a priest — which is a much better scene and a much bigger change.
