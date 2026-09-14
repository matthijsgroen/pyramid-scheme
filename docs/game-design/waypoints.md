# Waypoints — the guidance layer

**What the player should do next, at every range the world has.** Steering a player toward a story prop
(`story/FORMAT.md` §7) is one client of this; motivating the next tier, an unexplored side path, or a
deeper tomb treasure are the others, and they are the ones that have to work whether or not any story
exists.

**Guidance is a technology, not a feature of any narrative.** A mod boundary exists to keep technology from
entangling, so the question "where does this live" is answered by what it _is_ — a registry, a set of
ranges, a curation rule — and not by who happens to use it. A story arc is one caller among several, and it
registers a scanner the way the hieroglyph mod already does.

## What exists now

One waypoint, at one range: `nextPyramidJourneyId` offers the following pyramid on the completion screen,
and only if the player may actually pick it. Everything else — a side path never opened, a tomb two
treasures short, a ward gate whose key is now in the player's pocket — is silent.

The two detector mechanics (`docs/mods/collection-and-detector-design.md` §7) already define the ranges
this layer would use, in both directions:

| Range         | Written as                    | Detector level that already names it |
| ------------- | ----------------------------- | ------------------------------------ |
| Travel screen | a journey id                  | corridor L4                          |
| Pyramid       | `journeyId`                   | corridor L3, compass L1              |
| Floor         | `journeyId / floorIdx`        | corridor L2, compass L2              |
| Cell          | `journeyId / floorIdx / cell` | corridor L1, compass L3              |

Same address shape as a Places row in `story/FORMAT.md`, which is why one mechanic can serve both.

## Three kinds of pull, and only one of them is authored

| Kind               | Why the player cares                                              | Where it comes from                   |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------- |
| **Newly possible** | you now hold something that opens something you have already seen | derived from held keys vs. seen gates |
| **Nearly done**    | one piece short of a set, a tomb, a panel                         | derived from collection state         |
| **Asked for**      | a story arc pointed here                                          | authored, per arc                     |

**Newly possible is the strongest and the cheapest**, because it is the backwards map finally speaking.
The pitch already promises that no site is finished until every gate in it is open, and a key from a late
tier reopens an early pyramid — and today the player is told none of this. A ward gate they walked past
three tiers ago becoming openable is the single most motivating sentence this game could say, and every
fact needed to derive it is already on hand.

It also covers the user-facing asks directly: _go to the next difficulty_ is newly-possible at travel-screen
range, _open that side path_ is newly-possible or nearly-done at floor range, _go deeper into that tomb_ is
nearly-done at pyramid range.

## The two failure modes, which pull against each other

**Say too little and the world is silent** — which is today, and it is why a player with 1,780 puzzle nodes
in front of them has no idea which one matters.

**Say too much and it stops being exploration.** A game that always names the next tap has replaced its map
with a queue. The rule that keeps this honest: **a waypoint answers _what is open_, never _what to do
next_.** A list of live threads the player chooses among is guidance; a single arrow is a corridor with
extra steps, and it would flatten the one structural idea — a world explored in any order — that this
game is built on.

## The curation problem is the real design work

With 1,780 nodes, "everything unfinished" is noise wearing a badge. Options:

| Option                                                                      | Consequence                                                                                              |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Newly-possible only** — surface a thread the moment it opens, never again | Smallest and most motivating; a player who ignores it once loses it, which is bad after a fortnight away |
| **Newly-possible, plus a standing list of open threads**                    | Survives being put down; needs somewhere to live, and that place starts becoming a quest log             |
| **Ranked, top N**                                                           | Always short; requires a ranking nobody has designed, and a wrong ranking is worse than none             |

Unresolved, and it is the question this layer stands on.

## What it is not

**It is not the drum.** The casual-mobile review's fourth complaint is that seven solves in eight move
nothing the player can see, and a waypoint that updates on a solve is movement rather than reward. Adjacent,
much cheaper, and not a substitute — that hole belongs to the reward cadence.

## Open

1. **Curation** — which of the three options above, and does a standing list become a log by another name?
2. **Does a waypoint ever expire?** A thread surfaced once and never again is clean and punishes absence.
3. **Core or its own mod?** A technical question with a technical answer: newly-possible is derived from
   core reachability facts, while nearly-done reads mod collection state the way the compass already
   reaches into the hieroglyph mod. If the derivation needs no mod's state, it is core.
4. **Does the map show them, or only the travel screen?** The corridor detector's L3/L4 markers imply both,
   and the map's own rendering work is live (`docs/instructions/map-html-port.md`).
5. **What happens the first time two arcs and three derived pulls are live at once?** No design here
   survives contact with five simultaneous waypoints, and that is the ordinary mid-game state.
