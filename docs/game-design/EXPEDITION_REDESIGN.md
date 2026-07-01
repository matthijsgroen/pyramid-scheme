# EXPEDITION_REDESIGN.md

Status: design draft · supersedes the flat "series of pyramids" expedition loop
Companion to: `TABLEAU_REDESIGN.md` (puzzle presentation), this doc covers the
**expedition / progression layer** that wraps it.

---

## 1. Core idea

Today an expedition is a flat list of pyramids, each a series of tableaux. This
redesign turns each pyramid into a **navigable place** and the journey into a
**hub you return to**, not a track you run once.

The whole design collapses to a single sentence worth keeping at the top of the
file:

> **One map primitive, three nested scales — and at every scale you reveal a
> hidden picture by doing math.**

- **Journey** scale → a map of *sites* (pyramids + tombs) along a linear path.
- **Site** scale → a map of *rooms* inside one pyramid or tomb.
- **Tableau** scale → the math puzzle itself (existing system, unchanged here).

The same verb recurs at every zoom: fog burns back as you solve, the tableau
becomes legible as you progress, the mosaic assembles as you journey. This
coherence is the point — it should feel authored, not assembled.

---

## 2. The site model (one polymorphic node)

A **site** (pyramid *or* tomb) is a node-graph:

- **Nodes** = points of interest (POIs).
- **Edges** = corridors between them.
- The graph grows as a **tree from the entrance** (mostly-tree; see §11 on
  optional rejoin shortcuts).
- One **entrance** node, one **exit** node, a **critical path** between them,
  plus optional branches.

Crucially, there is **one node primitive** with a strategy plugged in. Every
node is the same shape:

```
Node {
  id
  type            // see §3 — drives config only
  revealCondition // when it un-fogs
  completion      // what "clicking/clearing" it requires
  onComplete      // effect when cleared
  revealsEdges    // which corridors it opens on completion
}
```

The six "types" below are **configs of this one node**, not six classes. A
seventh type later (trap, shrine, …) is a config, not a rewrite.

The journey map reuses the *same* primitive at a higher altitude (sites as
nodes, the expedition path as edges). Build it once.

---

## 3. Node types (configs of the one primitive)

| type        | completion (click =)             | onComplete / reveals                          |
|-------------|----------------------------------|-----------------------------------------------|
| `puzzle`    | solve the math (a tableau)       | reveal continuing corridor                    |
| `fork`      | *free* — click completes it      | reveal branch POIs **to their end nodes**     |
| `gate`      | reveal key needed → spend key    | reveal continuing corridor                    |
| `treasure`  | open                             | grant item (key / hieroglyph / map / mosaic), reveal corridor *or* dead-end |
| `stairhead` | click                            | enter next floor (see §8 — floor = a zone)    |
| `exit`      | click                            | leave site, continue expedition               |

Key modelling rules:

- **A fork is free; a puzzle is not.** Forks cost nothing to clear — they exist
  to *buy a view of the map*. This makes the **count and placement of puzzle
  nodes** an independent difficulty lever (see §6).
- **`puzzle` is an axis, not a type.** Which math family runs inside a puzzle
  node is a `family` field (cross-sum / sundial / water-clock / clock-arith /
  eye-of-horus fractions / balance-scale — see §4), orthogonal to *where* the
  node sits. Keep map-position and math-content as separate dimensions.
- **A gate is an edge state, not a node** when it comes to backtracking: a
  corridor solved once stays open *forever*; walking back is free and never
  re-solves anything. A `gate` node gates *forward reachability* (needs key),
  never re-asks for math.

---

## 4. Puzzle families (the math menu)

All families share the same DNA as the current cross-sum: **hidden values
recovered by deduction.** Each family additionally **produces** or **consumes**
a value so it can participate in carry-forward along a corridor.

| family             | skill                          | Egyptian instrument / dressing            |
|--------------------|--------------------------------|-------------------------------------------|
| `cross-sum`        | addition, substitution (core)  | the pyramid tableau (existing)            |
| `sundial`          | telling time, reading analog   | shadow clock / obelisk shadow — *value source* |
| `water-clock`      | elapsed-time / duration, subtraction across hours, boundary-crossing | clepsydra draining between marks |
| `clock-arith`      | modular arithmetic (mod 12/24) | ritual durations wrapping the day — higher tiers / decoy rooms |
| `horus-fractions`  | unit fractions (½…1/64)        | Wedjat eye parts                          |
| `balance-scale`    | equality / solve-for-x         | weighing of the heart vs Ma'at's feather  |

**Carry-forward rule:** a value produced upstream (e.g. a sundial reading) may be
consumed downstream as a known symbol. **Carry-forward never crosses a
stairhead** (see §8) — each floor is a self-contained dependency zone so that
dormant lower floors resolve correctly on a later revisit.

**Time-of-day is mechanical, not cosmetic:** day expeditions use `sundial`,
night expeditions use the decan star-clock variant. Morning/afternoon/evening/
night now *chooses the instruments*.

---

## 5. Pyramids vs tombs — same engine, two differences

A tomb is **the same site primitive** as a pyramid. They differ in exactly two
slots:

| slot                 | pyramid                          | tomb                                   |
|----------------------|----------------------------------|----------------------------------------|
| **entry / outer seal** | solve the exterior seal puzzle | spend **4 map pieces** (the map-piece gate *is* the tomb's outer seal) |
| **critical-path payload** | the **mosaic piece**       | the **tomb-key** (the ward key that lights dormant branches elsewhere) |

Everything else — node types, seeded assembly, budgets-plus-pins authoring, the
validator forward pass, the fog/dot UX — is shared. The artifact collection
(currently pure collectibles with unused effect fields) finds its home in **tomb
side-rooms**, scattered across branches, the best locked behind later keys.

---

## 6. Difficulty & authoring (hand-tuned, like today)

Difficulty is **authored per site**, exactly as the game tunes it now (pyramid
height, number ranges, when multiplication enters, when exterior hieroglyph
stones appear). **No generated difficulty curve.** The structural/spatial side
is authored the *same way*: new fields on the existing per-step config object.

Each expedition is a **linear, ordered list** of site configs. A config carries
the math knobs it already has **plus** spatial fields:

```
SiteConfig {
  // existing math knobs
  height, numberRange, operations, exteriorHieroglyphStones, ...

  // new spatial knobs
  floors            // 1 for early stone pyramids
  allowedNodeTypes
  maxBranchFactor   // 0 = linear
  gates             // none | seal-only | seal+ward
  puzzleBudget      // count of puzzle nodes (a difficulty lever distinct from per-puzzle band)
  puzzlePlacement   // bias toward critical path vs optional branches
  rewards { ... }   // see §7
}
```

**Puzzle placement is its own lever.** Two late pyramids with identical math
bands feel different if one puts three puzzles on the spine and the other hides
two in optional branches. Make spine-vs-branch puzzle density an explicit field,
not an accident of layout. **Spine = puzzle-dense; free-click exploration lives
in side branches.**

**Staggered ramps (sawtooth, not one ramp):** structural complexity and math
difficulty must not climb in lockstep. **Every new structural verb debuts in
easy-math territory** — the first pyramid that forks has trivial arithmetic; the
first gate's key sits in plain sight; the first second-floor is shallow. Early
pyramids *are* the tutorial, diegetically — no separate onboarding screen.

---

## 7. The three reward economies (three scopes)

These are **not a list** — they are three economies at three scopes, each with
its own placement rule and invariant.

| reward         | scope   | frequency                  | function                         |
|----------------|---------|----------------------------|----------------------------------|
| **hieroglyph** | room    | several per site, common   | currency → opens tomb **doors**  |
| **map piece**  | journey | **exactly one** per expedition, in one authored pyramid | discovers a tomb (4 → a tier's tomb) |
| **mosaic piece**| game   | **one per pyramid**, guaranteed | capstone picture; index = pyramid position |

- **Mosaic placement = depth scales with the pyramid's own difficulty.** Right
  by the entrance in a one-floor stone pyramid; behind the deepest ward in a
  late one — so the finished picture reads as a record of mastery. **Piece index
  = pyramid index**, so a half-built mosaic is a to-do list disguised as art, and
  the completed picture is the natural home for the game's real ending.
- **"Chance" to find a map piece = authored, deterministic.** The *opportunity*
  is placed in one pyramid per journey (fixed per seed); it is **not** a random
  drop. No slot-machine shape — this was a hard line throughout.
- **Tomb keys flow** per the §15 open decision (recommended: from *later* tombs,
  to keep early tombs alive all game).

**The dependency chain (and its deadlock risk):** hieroglyphs open tombs → tombs
give tomb-keys → tomb-keys are wards gating deep branches → deep branches hide
mosaic pieces. The capstone runs through every other system (good), so two
ordering rules are load-bearing — see §10 and §11.

---

## 8. Gates: seals vs wards · floors as zones

Two gate types, split along intra-site vs meta-progression:

- **Seal** — needs a **chest key from inside this site**. Solvable in one visit,
  fully local.
- **Ward** — needs a **tomb-key from outside**. Forces a *deliberately
  unfinished* descent and a later revisit. This is what makes a site
  **non-linear in time** and knits the whole journey into one connected space.

**Ward etiquette:**
- A ward must **announce itself at a fork** (silhouette: "tomb-warded door that
  way") so committing to that branch is an informed choice, never an ambush.
- **Critical path = openable now; optional branches = openable eventually.** A
  ward may gate an *optional* branch; the **critical path must always be
  completable with keys available by this point in the journey.**

**Floor = the natural boundary for everything.** A `stairhead` enters a new,
self-contained zone that is simultaneously:
- a **math-band boundary** (deeper = harder; the ward's tomb-tier *is* the gate
  on the lower floor's band — the tomb-key acts as a **difficulty certificate**),
- a **dependency firewall** (carry-forward never crosses it),
- the natural **anchor for a ward** (dormant lower floors).

This is what makes **dormant content** work: an early pyramid is a 60-second
clear on first contact, but holds a hidden lower floor behind a ward that only
opens much later. Early pyramids aren't spent — they're **dormant**, holding
late-game content. Same move on the reward layer: tombs are dormant vaults, not
one-shot loot piles.

---

## 9. The generator (assembler, not designer)

The generator's job is **small and trustworthy**: given an authored config, it
**assembles** a layout; the **seed only decides cosmetic variation** within
authored bounds (which corridor curves where, where a chest sits) — **never**
anything that changes difficulty.

> **Authored constraints, seeded decoration.**

**Authoring mode: budgets-plus-pins, with a generate → test → steer loop.**

1. Author in **budgets**: "3 puzzles, 1 gate, 1 mosaic piece, band X."
2. Seed assembles a candidate.
3. **Validator** (§12) runs automatically — bad seeds are discarded by the
   machine, not caught by eye.
4. When a passing candidate is *wrong* (gate before key, mosaic one room off the
   entrance, two hard puzzles bunched on the spine), **pin** the one node that's
   wrong and let the seed fill the rest around it.

A config thus reads as **budgets + a short pin list**. Stone pyramids need zero
pins; gnarly late ones maybe three or four. Authoring effort scales with how
much each site actually needs steering.

**Solvable-by-construction technique:** generate a reachability order first (a
spanning tree from the entrance), then place each lock on an edge and drop its
key anywhere in the already-reachable subtree.

**Cost to handle:** a pin can fight a budget (pin the mosaic deep and the
remaining puzzles may not fit within reachability). A pinned generate may
therefore **fail validation** — and the loop must **explain the rejection
legibly** ("pinned piece at depth 5 leaves no completable arrangement of 3
puzzles"), never a silent re-roll.

**Dev-loop requirements:**
- The **seed is visible** in the dev view.
- "**Pin this node, keep this seed, regenerate the rest**" is a **one-action
  loop.** This tight loop is the whole ballgame.

---

## 10. The validator (forward pass over a linear journey)

Because the expedition is a **linear ordered list**, every cross-site fact is a
**prefix computation**: walk the list once, front to back, carrying state. By
pyramid N you know exactly which tombs are openable (map pieces + hieroglyphs
from sites 1..N−1, via the 4-pieces-per-tomb rule). No DAG, no constraint
solver — a forward scan.

**Per-site invariants** (run on every generated candidate, incl. pinned variants):

- **Completable** — the critical path is openable with keys available by this
  site's journey position. (A *warded-optional* branch may be incompletable in
  isolation; a *warded-critical* path may not.)
- **Key-before-gate reachability** — every seal's chest key is reachable before
  its locked edge.
- **No all-bland fork** — at least one branch-end of every fork is a treasure, a
  gate, or a special chamber (stops forks feeling like a tax).
- **Carry-forward never crosses a stairhead.**

**Journey-level invariants** (the forward pass):

- **Map piece:** exactly one `true` across the journey; that pyramid's piece is
  **seal-reachable only** (never behind a ward pointing at its own tier). This
  pyramid is **load-bearing for its entire tier** — give it the strictest
  validation and its own test fixture.
- **Ward satisfiability:** at site N, every ward points at a tomb whose
  discovery + opening is satisfiable within prefix 1..N (or, for an *optional*
  ward, by journey's end).
- **Mosaic coverage:** every index 1..N present exactly once; each piece's depth
  is legal given the keys available when that pyramid is encountered.

These are **three linear scans** — squarely in TDD/property-test territory.
Property-test the generator against this list; **a seed that fails is discarded
by the machine.**

---

## 11. Tree vs graph · shortcuts

- **Mostly-tree** is the baseline: trivial to generate, guarantee-solvable, lays
  out cleanly on a tapering floor grid.
- A **few opened gates may reconnect branches** (Metroid-style shortcuts) — feels
  great, but makes solvability + layout meaningfully harder. **Mostly-tree with a
  couple of shortcut-gates** is the sweet spot.

---

## 12. Save model

Position-independent by design, so resume + fast-travel are nearly free:

```
SaveState {
  seed            // regenerates every layout deterministically
  solvedEdges     // keyed PER SITE (see open decision §15)
  inventory       // journey-global: keys, hieroglyphs, map pieces, mosaic
  position        // current site + current node (for resume + explorer dot)
}
```

Everything else regenerates — a few hundred bytes, survives a closed tab, can't
desync. **A half-descended pyramid resumes on exactly the right stair.**

**Open requirement for fast-travel (§13):** `solvedEdges` must be **site-
addressable**, not scoped to the current descent, and `inventory` must be
journey-global. Confirm the save shape supports this *before* building the
journey-hub UI.

---

## 13. UX

**Build target — NOT Phaser.** A turn-based, instant-travel node map is an
**SVG/DOM + CSS** job: nodes & corridors as SVG, fog as a CSS mask/opacity
transition, graph state in React. Crisper on retina, lighter on a phone,
accessible, far simpler. Save the engine for SpeedLazer. Lay chambers on a
**grid** (trivial deterministic layout, thumb-sized touch targets, reads as a
tomb floor plan; taper per floor so descent visibly narrows the pyramid).

**Three cell states** (fog is the anticipation engine):
- `fogged` — unknown
- `revealed-unreachable` — visible through a locked gate, can't reach yet (the
  hook: a treasure glinting behind a jackal gate sends you hunting the key)
- `reachable` — tap to clear

**Reveal grammar (consistent, no spoilers):** you always see **exactly one
node-type ahead** — a solve reveals the next node's *type*; a fork shows
*silhouettes* at branch-ends (gate / treasure / more corridor), never the
specifics, until you arrive.

**Instant travel, but not instant to the eye.** Input = tap a chamber.
- The **explorer dot is a follower, not a vehicle** — you never steer it; it
  *reflects* the tap by gliding the corridor route (~250ms). Tap again mid-glide
  → snap. Never block interaction on the animation.
- The dot is the **camera anchor / wayfinding** when the viewport pans (you can't
  fit a whole floor at thumb-size). This is its real justification.
- **Opening extends from where the dot is** — solve the node you're standing on,
  the corridor extends to the next POI; exploration feels directional and causal.
- On a stairhead the dot drops to the stairhead below and the camera follows
  down — a floor change is a *move*, not a cut.

**The map is the progress bar.** Fog burning back = the revelation reward.
Percent-revealed is the completion meter; no separate bar needed.

**Journey map = the same primitive, one zoom out.** Sites (pyramids + tombs) as
POIs along the linear path, fogged/revealed with the same dot grammar.
- **First run:** the authored linear march — only the next site is live. A
  journey is a *story*.
- **After completing a journey once:** it becomes a **hub** — fully revealed,
  every site a tap-to-enter target, **direct fast-travel to a specific tomb/
  site.** Every visit after is a *toolbox*. The completion flag is the switch;
  fast-travel can never break first-time pacing.

**"What just opened" surface (load-bearing, not polish):** when a key lands, the
player needs to know which dormant rooms — across every site — are newly
reachable.
- **v1:** a **per-journey marker/badge** in the journey list ("new paths
  reachable here"). Cheap, ships first.
- **Known next step:** tapping the badge lists *which sites* lit up ("Tomb of
  Anubis: 2 new rooms; Pyramid 3: lower floor"), ideally with a jump-back. The
  data is a **free byproduct of the validator's forward pass** — it already
  knows which wards just became satisfiable.

---

## 14. The through-line (keep this visible)

One map primitive, three nested scales; one node primitive, six configs; one
authored difficulty system with spatial fields beside math fields; one seeded
assembler under budgets-plus-pins; three reward economies at room/journey/game
scope; one forward-pass validator; dormant content as the grind-killer at every
scale. **Four mechanics? No — one idea, four times.**

---

## 15. Open decisions — resolved

1. **Tomb-key flow.** ✅ Resolved: hybrid model. Ward keys (tomb floor access)
   come from any tomb and open floors in any pyramid (WARD_MIX). Location keys
   reveal the next tomb in the same tier. See `pyramid-interior-design.md §6 & §14`.

2. **Site-addressable save state.** ✅ Resolved: `exploredSections` is keyed per
   `levelNr` (journey + pyramid index). `inventory` remains journey-global.
   Implemented in Phase 3 / Phase 10a (`useJourneys`).

3. **Shortcut gates.** ✅ Resolved: deferred indefinitely. Solvability cost
   outweighs the Metroid feel for the current content scope.

---

## 16. Suggested build order

1. **The validator first** (§10). It's the trust anchor; budgets, pins, and the
   steering loop all hang off its invariants. Property-test it against a corpus
   of generated seeds.
2. The **polymorphic node model + seeded assembler** (§2, §9) for a *single
   linear, one-floor pyramid* — no forks, no gates, one puzzle. The stone-tier
   case.
3. The **SVG/CSS map + explorer-dot UX** (§13) for that single pyramid.
4. Add **forks**, then **seals**, then **floors/stairheads**, then **wards** —
   each debuting in easy-math territory (§6).
5. **Reward economies** (§7): hieroglyph → mosaic → map piece.
6. **Tombs** as the same primitive with the two slot differences (§5).
7. The **journey map** as the same primitive one zoom out, then the
   **completion-flag hub + fast-travel** (§13).
