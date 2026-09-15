# The casual-mobile review, and where each item now stands

[`docs/ux/casual-mobile-review.md`](../../ux/casual-mobile-review.md) ranks twelve changes. It landed on
`main` in PR #282.

This table is the honest position after the story pass: what the story work actually addresses, what it
merely _documents_, and what it does not touch at all. The middle column is the one to read sceptically —
writing a plan is not shipping a fix.

| #   | Review item                                            | Status after this pass                                                                                                                                  |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Persist in-progress boards                             | **Untouched.** Listed in `IMPLEMENTATION.md` as a big rock. Still the cheapest item on the review's own list                                            |
| 2   | Drop the exterior board on re-entry                    | **Reframed.** `../tomb-exteriors.md` splits it: the _tomb_ threshold is worth keeping (opening a tomb happens once), the pyramid toll is not            |
| 3   | Frame the interior camera on the floor                 | **Untouched.** Not a story problem                                                                                                                      |
| 4   | Sound and haptics on solve                             | **Untouched.** Still zero audio files                                                                                                                   |
| 5   | Make every solve move something visible — the drum     | **Explicitly not solved**, and said so in `arc-offering-to-the-gods.md`'s Payoff row: the story lands on seams only and cannot close this hole          |
| 6   | Replace or cut the multiple-choice trap                | **Untouched**                                                                                                                                           |
| 7   | Wordless first encounter per family                    | **Made structural rather than optional.** If the explorer starts alone (`cast.md`), the opening board has no companion and must teach itself            |
| 8   | Re-order the mosaic reveal so the picture is a mystery | **Superseded by something larger.** Part 3 designs five narrative panels; `ART.md` flags replacing the abstract window as the highest-leverage art call |
| 9   | Let a hieroglyph keep its value across a tomb or tier  | **Open, and pointed at.** `main-path.md` §Open 1 — whether the Sphinx is readable because of collected glyphs is the same question                      |
| 10  | Give Fez an arc, opinions and a secret                 | **Done as design.** `cast.md` — wants, voice, never-says, an arc, and one thing he is wrong about per tier, corrected by the dead                       |
| 11  | Name a critical path, let the rest be optional depth   | **Answered and refused.** `main-path.md` is the critical path; the "world too big" half is the signal that produced the authorship doom loop once       |
| 12  | Ship save migration, take the red banner down          | **Untouched**                                                                                                                                           |

## The honest score

**Two of twelve are addressed as design** (10, and 7 by consequence). **Three are reframed or redirected**
(2, 8, 11). **One is explicitly declined** (5 — the drum is a reward-cadence problem and the story says so
rather than pretending). **Three are now in flight in another session** (1, 2, 3 — persistence, the once-only exterior, lighting). **Three remain untouched** (4, 6, 12).

That is the expected shape — the review's top items are systems work and this pass was narrative — but it
is worth stating plainly, because a story document that appears to answer a UX review is the easiest way to
lose six months. What closed items 1–3 was somebody building them, not this.

## What the story pass added that the review did not ask for

- A **spine** built from journey names and treasures that already exist, ending where the game began
- A **cast** with rules that survive being written by different hands
- The finding that **12 of 40 tomb floors grant no capability**, and that the shuffle is one mod file
- The finding that **nothing keys a conversation to a journey**, which every story beat needs
- The finding that **the tomb exterior was never designed** — nine tombs opened by a pyramid board

## Open

1. **Which of the six untouched items go in this PR's wake?** 1 and 4 are small and change how the game
   feels more than anything in the story does.
