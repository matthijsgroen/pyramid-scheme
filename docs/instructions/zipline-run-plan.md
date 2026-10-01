# A zipline is a run, not a cell — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** a one-way drop declares the space it needs, the carve reserves a run of cells for it, and the art spans that run so the pit crosses the corridor instead of sitting beside the path.

**Why, measured.** `dropEast.png` is 112x168 and its pit occupies **rows 128-147, columns 46-95** — about 20 rows by 50 columns, so **2.5 times wider than it is tall**. The art only fills rows 96-166 at all; the top 96 rows are empty. Rendered at today's `DROP_W = 84` the pit covers roughly **27%** of the corridor's thickness, leaving lit floor below it, which is why it reads as a pit you could step around rather than an opening across the way.

A drop is a multi-cell feature that had been squeezed into one cell. **The owner settled its size by measurement 2026-10-01**: he marked the corridor floor's top and bottom on the master, which fixed 530px = one cell = 56 units, i.e. 9.464 px per unit. At that scale the art is 170 x 81 units — **2.76 cells** — so the run is **3 cells** (`ONE_WAY_RUN_CELLS`), and the tile is imported tight to its own ink at 2px per unit with no dead air. The earlier 5.6-cell figure came from scaling the art until the pit spanned the corridor, which was compensating for a frame that was 61% empty.

**Ruled out:** drawing the sprite across neighbouring cells via `nodeSpritesFor`'s existing `footprint` without changing the carve. Those neighbours are walkable corridor, so it would paint a pit over floor the player can stand on — worse than today.

**Scope, decided by the owner:** the one-way only. Gates and other obstacle kinds keep their current placement. Generalising `requires` to every obstacle kind is the same idea one level up and belongs with the container work (`docs/instructions/container-ports-plan.md`).

## Global Constraints

- `yarn check-types` is the truth. **IDE diagnostics in this repo have been wrong on EVERY occasion.** Ignore them; run the command.
- `yarn eslint <paths>` only. **NEVER `yarn lint --fix <path>`** — it does not scope and rewrites the repo.
- **NEVER `git add` / `git commit` / `git stash` / `git checkout`.** The controlling session commits.
- **NEVER `pkill` or `killall`.** Other worktrees and the owner's playtest run servers here. Kill only a PID you started.
- **NEVER run `yarn generate-world` or `INCLUDE_DEV=1 yarn generate-world`.** `yarn validate-world` is safe with the flag. `md5 -q src/data/generatedWorld.ts` must stay `84c181cda6e3c04fe64ed6d93b4e6f19`.
- **Every task here changes carve behaviour, so every task captures a CARVE BASELINE first** — assemble every shipped floor at its real seed via `allFloors()`, reduce each cell to its `dirs`, diff before against after — and reports the diff. The shipped world authors no `oneWays` and carves **zero** one-way mouths (measured over all 206 floors), so **the diff must be EMPTY throughout**. A non-empty diff means a task reached a floor a player already has.
- `src/game/` is the domain layer: no React, no `src/app/`.
- Comments state CURRENT state and why, never history.
- **Tests assert EVERY element of a collection, never a representative one.**
- **Every refusal is watched failing** — break the thing it guards, quote the red output.
- **Test mechanics, not content.** Hand-built fixtures per mechanic (`src/app/SiteMap/floorFixtures.testing.ts`); the lock sweep in `validate-world` is where content is checked.

**THE RULE:** the builder may refuse, but it may never decide quietly.

---

### Task 1: A one-way asks for room, and the carve gives it

**What to build.** A one-way declares how many cells it needs, and the carve reserves a contiguous run of them between the departure and the landing. Treat it as a placement constraint like `forks`: when no run of that length fits, the attempt is re-seeded, and after the attempt budget the floor is **refused by name** — never silently placed shorter, never placed somewhere else.

**Design judgement this task owns** (state what you chose and why):
- **Where the length comes from.** The art's proportions give ~6 cells for `dropEast`. Decide whether that is a constant stated once with the measurement behind it, or an authored field. Prefer the constant until a second value is actually needed — but say what would force the authored form, because `dropNorth`/`dropSouth` are unpainted and may not share the proportion.
- **What the run's cells ARE.** Today the mouth is a corridor with `dirs.size === 1` pointing at the landing. A run of N needs a shape that keeps the one-way property end to end: enterable only from the departure end, leaving only at the landing end, and not crossable from the landing side beyond standing on it.

**Verify:** a fixture floor carves with a run of the declared length; the refusal fires when no run fits, watched failing; carve baseline EMPTY across all shipped floors.

---

### Task 2: Everything that knew a mouth was one cell

Five consumers key off the drop being a single stub. Find them all before changing any — `grep` for `isOneWayMouth` and `oneWayMouthDir` — and handle each explicitly:

- **`isOneWayMouth` / `oneWayMouthDir`** (`src/game/gridNavigation.ts`) define a mouth AS a one-direction corridor whose landing names no way back. With a run, the mouth is one END of the run. These were tightened today so an incidental dead-end stub is no longer mistaken for a mouth — **do not lose that**, and keep its tests passing.
- **`walkableFrom` / `findPath`** admit the adjacent mouth through `walkableDirsFrom`. Decide what a player may do on a run: stand on its near end only, or walk along it. **Whatever you choose, crossing must remain impossible**, and that must be asserted as a whole walkable set, not an absence.
- **`revealOneWayMouth`** lifts the mouth out of fog and stops. Decide what a run reveals.
- **The barred arrow** (`OneWayMouthArrow`) draws where the player stands, pointing onward.
- **`floorLock`** derives one-ways by flooding the assembled grid. **It must see a run as ONE edge, not N** — if it sees N, the compiled lock stops matching the authored one, which is lock criterion 1's gap arriving by a new route. Assert the compiled `LockSpec` has exactly one `oneWay` for one authored drop.

**Verify:** `INCLUDE_DEV=1 yarn validate-world` valid, lock sweep unchanged; `doubleBack` still walks sound and still strands the player when its second drop is removed, which is the property that makes it `doubleBack`.

---

### Task 3: The art spans the run

`DROP_W`/`DROP_H` (`src/app/SiteMap/mapScale.ts`) size the sprite to one cell today. Size it to the run, keeping the tile's aspect, and anchor it so the pit sits across the corridor rather than above its floor line.

Re-import from the high-res master if the new size needs the pixels — `art/masters/props/expert/dropEast.webp`, recipe at `art/rebuild.sh:1201`. `scripts/importTile.ts` has no size flag; output size comes from the slot (`prop` = 56x84 units x `SPRITE_SCALE`, env-only, default 2). If a bigger tile needs a flag, add one and update `rebuild.sh` to what you actually ran.

**Verify by looking, not only by test.** Screenshot `app-sitemap-sitemapview--drop-east-at-landing` and `--drop-east-on-mouth` and say whether the pit now reaches both walls of the passage. The map runs a `requestAnimationFrame` loop, so neutralise `window.requestAnimationFrame` before screenshotting or the capture times out. Update `dropArt.spec.ts`'s size literals, and keep them literal so a future change is a visible diff.

---

### Task 4: The criteria say what a drop is

`docs/mods/floor-topology-design.md` carries three acceptance-criteria sets. A drop occupying a run is a statement about floor shape, and the criteria should say so — what a one-way requires, that the carve must honour it, and what refuses when it cannot. Add it where it belongs and audit it like its neighbours. Current state only.
