# The torch and the flood — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Ready to run.** The spec was approved by the designer on 2026-10-09, and the designer's later decisions of the
> same day (who designed which lock; tide and sluice keep their activators on merit; the `// designed by:` line) are
> folded in below and into the spec. A task that meets something its "Check what this task stands on" step does not
> expect stops and reports; it never re-decides a ruling.

**Goal:** a torch is a core control kind of its own (`T torch @hall`, `B torch @hall lit`): the player lights it,
nothing the player does puts it out, and a region barrier (water or sand) that covers its region douses it, after
which it can be lit again. The lock walk, the floor's solver and play douse through one pure function
(`douseTorches`), so they never disagree about which torch is out. The four catalogue locks whose activators are
flames become torches; the five whose activators are taken (a key, gold, a prize) stay activators. Every `.lock`
file names its designer.

**Architecture:** `douseTorches(states, torches, covered)` in `src/game/mechanismDoors.ts` is the one rule: it turns
every lit torch that `covered` names `off`, and asks again until nothing changes. Three callers adapt their own
state to it: the lock walk (`dousedConfig` in `src/game/lockWalk.ts`, applied to the start state and after every
move, from `LockSpec.torches` that `walkSpecOf` and `floorLock` fill), and play (`douseFloor`/`withDouse` in
`mechanismDoors.ts`, applied by one hook, `useDousedJourneys`, that wraps the journeys API so every mechanism write
lands with its douses in one journeys write, and that douses on arriving). The torch kind is a core plug-in
(`src/game/mechanics/torch.ts`) that compiles to a stateful floor control with `control: "torch"`; its floor record
carries `torch: { region }` and its one move, `off` to `on`, as a placed transition. The bindings move
`activator: "torch"` to `torch: "torch"` where stoneGate stands, and the plain bake changes stoneGate's floor and
the carve ledger's hashes only.

**Tech Stack:** TypeScript, React 19 hooks, Vitest (`yarn vitest run <files>`, `yarn verify-content`),
`yarn run lock` (`scripts/lock.ts`), `yarn generate-world` (Node bake), Storybook + the Playwright browser tools for
the look.

**Spec:** `docs/superpowers/specs/2026-10-09-torch-douse-design.md` (every section; "Done when"). **Contract:**
`docs/mods/mechanic-contract.md`. **Curriculum:** `docs/game-design/lock-curriculum.md`. **Handover:**
`docs/handover-stonegate.md` ("Designer decisions to keep", "Waiting on the designer").

**Written against `cc20c4e4`** (branch `topology/mechanics`). Every path, symbol and line cited below was checked
there; line numbers drift as other work lands, so find each edit by the symbol named beside it. The two untracked
files at the repository root (`circle.lock`, `stoneGate.lock`) are the designer's scratch: never stage them. Stage
strictly by path, never `git add -A` or `git add .`. Before each task run `git status --short` and leave files you did
not touch alone.

## What was measured before writing this

**Who designed each catalogue lock** (designer, 2026-10-09). Git history cannot tell: every commit on this branch
carries the `Co-Authored-By: Claude` trailer, including the squash of #314 that added 25 of the 27 files and the
commit that added stoneGate. The designer supplied the list; task 1 writes it into the files.

| file (under `src/game/locks/`)  | designed by | header comment today                                                               |
| ------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `doubleBack.lock`               | Matthijs    | current; never touched                                                             |
| `stoneGate.lock`                | Matthijs    | "not placed yet, not buildable yet" is stale; **never touched** (for the designer) |
| `cellar.lock`                   | Claude      | current                                                                            |
| `clockwork.lock`                | Claude      | current                                                                            |
| `counterweight.lock`            | Claude      | **stale**: "not buildable yet (stones)"; stones are built                          |
| `dropHome.lock`                 | Claude      | current                                                                            |
| `keyring.lock`                  | Claude      | current                                                                            |
| `lamplighter.lock`              | Claude      | current                                                                            |
| `masonsRamp.lock`               | Claude      | **stale**: "not buildable yet (stones)"; it is unsolvable until the stone pipe     |
| `observatory.lock`              | Claude      | current                                                                            |
| `overlook.lock`                 | Claude      | current                                                                            |
| `plates.lock`                   | Claude      | current: "not buildable yet (sequence)" (`yarn run lock plates` says so)           |
| `relay.lock`                    | Claude      | current                                                                            |
| `seesaw.lock`                   | Claude      | current                                                                            |
| `sluice.lock`                   | Claude      | **stale**: "not buildable yet (region gate)"; region gates are built               |
| `tide.lock`                     | Claude      | **stale**: "not buildable yet (region gate)"                                       |
| `twoLamps.lock`                 | Claude      | current                                                                            |
| `twoStones.lock`                | Claude      | **stale**: "not buildable yet (stones)"                                            |
| `lessons/boardPicksTheWay.lock` | Claude      | current                                                                            |
| `lessons/doorWaitsForTwo.lock`  | Claude      | current                                                                            |
| `lessons/dropDown.lock`         | Claude      | current                                                                            |
| `lessons/leverOpensADoor.lock`  | Claude      | current                                                                            |
| `lessons/leverSwapsDoors.lock`  | Claude      | current                                                                            |
| `lessons/stoneOnAPlate.lock`    | Claude      | current (the handover listed it as stale; its text says nothing out of date)       |
| `lessons/tilesInOrder.lock`     | Claude      | current: "not buildable yet (sequence)"                                            |
| `lessons/torch.lock`            | Claude      | current ("lit for good": no flood stands in the lesson)                            |
| `lessons/waterMoves.lock`       | Claude      | **stale**: "not buildable yet (region gate)"                                       |

Totals: 2 designer, 25 Claude, 0 ambiguous. "Stale" was measured with `yarn run lock <name>` at `cc20c4e4`: tide,
sluice, waterMoves, twoStones and counterweight print `✓ solvable` and no "not buildable" line (`notBuildable` in
`src/game/lockWalkSpec.ts` names only `sequence`); masonsRamp prints `✗ not solvable`; plates and tilesInOrder print
`⚠ not buildable yet: sequence`.

**The migration table rechecked against authorship.** Torch: `lessons/torch` (T), `lessons/doorWaitsForTwo` (T1,
T2), `relay` (B, C), `stoneGate` (S1). Activator: `cellar` (blue), `keyring` (red, green), `tide` (K), `sluice`
(gold), `observatory` (L, K). No mismatch with the spec's rule: the five activators are a key, keys, a key, gold and
two prizes; the four torches are flames or marks with nothing taken. Eight of the nine rows rest on header text Claude
wrote; the designer ruled tide and sluice explicitly, and stoneGate (the designer's own lock) is a torch by its
placements. The spec's §3 now says the table is the designer's ruling, not a reading of Claude's comments.

`parseLock` (`src/game/lockNotation.ts`) strips `//` to the end of every line before reading it, so a comment line
changes no parse; `src/game/lockCatalogue.ts` reads the files from disk and parses them, and the carve ledger's
source fingerprint (`scripts/carveLedger.ts`) follows only `.ts`/`.tsx`/`.json` imports, so a `.lock` comment moves
no ledger hash.

`yarn run lock` (the whole catalogue) at `cc20c4e4` refuses one lock today: masonsRamp (`✗ not solvable`). Task 8
compares against a baseline, so only a refusal the migration introduces counts.

Play writes mechanism states from six places: `useSiteNavigation.ts` (a sequence tile walked over, a lever or torch
thrown on arrival, a stone lifted or set), `HandleComponent.tsx`, `TorchComponent.tsx`, `lightbeamSwitch/plugin.tsx`,
`GateFaceComponent.tsx` (a sequence reset). All of them call `journeys.setMechanismState` on the `journeys` object
`SiteMapScreen.tsx` (and the playground) hands down, which is why one wrapper over that object reaches every write.

## Decisions (settled)

Binding (designer, unless noted). Each names the task that builds it.

- **D1. The flame is a core control kind**, `flame`, two fixed states `off`/`on`; the player only lights it; it may
  start lit (`lit`); a covering region barrier douses it; it can be lit again once uncovered (spec, "The rules";
  tasks 3-7).
- **D2. One pure function**, `douseTorches` in `mechanismDoors.ts`, used by the walk, the floor's solver and play
  (spec §2; tasks 2, 4, 5, 6, 7).
- **D3. An activator is untouched**, and no flood takes a floor key back (spec "The rules"; tests in tasks 4 and 5).
- **D4. Migration:** torch — `lessons/torch` T, `lessons/doorWaitsForTwo` T1 T2, `relay` B C, `stoneGate` S1;
  activator — cellar, keyring, tide, sluice, observatory. Tide's `K` and sluice's `gold` stay activators on merit
  (designer, 2026-10-09). In a migrated file only the keyword changes (task 8).
- **D5. Authorship:** doubleBack and stoneGate are the designer's; every other `.lock` is Claude's. Every `.lock`
  under `src/game/locks/**` gets a `// designed by:` line. A stale header comment is corrected on Claude's locks
  only; the designer's two headers stay as they are (task 1).
- **D6. Bindings:** `flame: "torch"` replaces `activator: "torch"` in `dev.ts` (pyramid 12) and `expert.ts`
  (`expert_4`); the playground offers `flame: ["torch"]` and keeps `activator: ["torch"]` (task 5).
- **D7. No save migration** (spec §4): a state is filed under the mechanism's cell address and the torch's states
  are the activator's own.
- **D8. Mod off:** same carve, the torch a bare node, no region covered, nothing doused or written (spec §5; task 6).
- **D9. No new art** (spec §6).
- **D10. No unit tests on authored content.** `yarn run lock` checks the catalogue; tests use made-up locks.
- **D11. Stable world:** the plain bake changes stoneGate's floor (`expert_4` pyramid 5 floor 0), the content hash
  line, and the carve ledger's hashes, nothing else (task 8 proves it).

## Rulings made without the designer

- **Ruling: the line is `// designed by: Matthijs` or `// designed by: Claude`, as the file's first line**, above the
  existing header. — Why: one exact form a grep can count (`grep -L '^// designed by: '` lists a file missing it);
  first, so it is read before the header it qualifies. — Cost if wrong: one `sed` over 27 files.
- **Ruling: the stale headers are corrected by deleting the stale clause only**: tide, sluice, waterMoves, twoStones
  and counterweight lose "not buildable yet (…)"; masonsRamp's clause becomes "unsolvable until the stone pipe".
  Nothing else in any header changes. — Why: the designer allowed correcting stale Claude headers; a deletion
  changes the least. — Cost if wrong: six one-line edits.
- **Ruling: the floor control is the existing `StatefulControl` with `control: "torch"`**, not a new control type.
  — Why: a torch has exactly a stateful control's fields; every assembler path that seats, compiles and marks a
  stateful control then serves the torch unchanged, and `controlKindOf` answers `"torch"` by its existing
  `control.control ?? …`. — Cost if wrong: a type split later; no data changes.
- **Ruling: the torch's record carries `torch: { region }`, `placedOnly: true` and one transition `off → on` at its
  own cell**, written where its room spec is built (`controlRoomSpec`, which now takes the cell). `legalTargets`
  reads a `placedOnly` record's placed moves as all its moves, without the `initial` rule. — Why: the spec asks for a
  placed transition so that a torch that started lit can be lit again after a douse; under the `initial` rule a
  lit-start torch (`initial: "on"`, `returnsToInitial: false`) could never go back to `on`. The two existing
  `placedOnly` records (sequence, stones) both return to their initial, so the change moves nothing for them. — Cost
  if wrong: one line in `legalTargets`.
- **Ruling: play's one helper is a hook, `useDousedJourneys` (`src/app/SiteMap/useDousedJourneys.ts`), wrapping the
  journeys API** so `setMechanismState` and a new `setMechanismStates` (one journeys write of several states) both
  douse; `SiteMapScreen` and the playground hand the wrapped API to navigation and to every encounter component.
  — Why: every write in play already goes through `journeys.setMechanismState` on that one object, so no component
  changes. The spec names `useSiteNavigation.ts`/`useJourneys.ts`; `useJourneys.ts` gains the batch write,
  `useSiteNavigation.ts` writes a walk's sequence presses as one batch. — Cost if wrong: the hook moves.
- **Ruling: the arrival douse is an effect that runs on every change of the floor or its stored states**, not only
  on arrival. — Why: it is idempotent (it writes only a torch that is lit and covered), so running it more often
  costs a grid scan and writes nothing; it is the walk's douse of its start state, and it also catches any write that
  ever bypasses the helper. — Cost if wrong: narrow the effect's dependencies.
- **Ruling: walk and play are compared through `dousedConfig`, the function `movesFrom` and the walk's start state
  apply**, on `floorLock`'s spec of a carved floor. — Why: `movesFrom` is private and its other moves (walking) are
  not what the comparison is about; `dousedConfig` is exactly what it adds to every move. — Cost if wrong: export
  `movesFrom`.
- **Ruling: `douseTorches` takes `ReadonlyMap<K, string>` and a `covered` callback and returns a new `Map`**, and the
  walk lists every torch in `LockSpec.torches`, a torch no region gate covers with `coveredBy: []`. — Why: one shape
  for both callers; an empty list is never covered, so no special case. — Cost if wrong: none outside these files.
- **Ruling: the torch notation is refused by a thrown line error** ("line n: a torch is off or lit at the start:
  write B torch @hall lit"), the way "a toggle has two states" is. — Why: the spec says "refused where it is read";
  every other notation line error throws.
- **Ruling: `REALISATION_CHOICES` gains `torch: ["torch"]` in task 5**, the first task whose tests carve a torch on
  the playground floor, not in task 8. — Why: the carve refuses an unbound kind (`unboundRole`).
- **Ruling: no `CHANGELOG.md` entry.** — Why: the spec, "Not in scope": the entry comes with the first world floor
  that floods a torch; stoneGate's torch looks and plays as before. A playtest backlog entry covers the playground
  story (task 10).
- **Ruling: the curriculum's key row is taught by "— (a floor key, met in the world)"** — no lesson teaches a key.

## Global Constraints

- **PATH:** `export PATH="$HOME/.asdf/shims:$PATH"` first; `/usr/local/bin/node` is broken.
- **Shell:** the commands below are POSIX (`$(…)`, `VAR=1 cmd`, heredocs). In fish, wrap a command in `bash -c '…'`.
- **`yarn run lock`**, not `yarn lock`; vitest only as `yarn vitest run <files>`.
- **The carve ledger:** any edit to a file in the carve's source graph (`src/game/**`, `src/worldGen/**`, `src/mods/**`
  imports of `siteAssembler.ts` and friends — even a comment) moves every hash in `src/data/carveLedger.json`. Task 8's
  bake refreshes them once, hash-only, after the last such edit. If a later task or a review fix edits a carve-graph
  file after task 8, run `yarn generate-world` again and commit the ledger ("chore: refresh the carve ledger hashes").
- **Stable world:** the plain bake changes `src/data/generatedWorld.ts` in the `expert_4` pyramid 5 floor 0 config
  and the `worldContentHash` line only, and `src/data/carveLedger.json` in `"hash"` lines only. Task 8 proves both.
- **No uncommitted playtest bake:** `git status --short src/data/` prints nothing before a bake. A bake made with
  `INCLUDE_DEV=1` is never committed.
- **`.lock` files** change only by the `// designed by:` line and the stale-header deletions of task 1, and by the
  `activator` → `torch` keyword of task 8. A lock `yarn run lock` refuses after the change is renamed
  `<name>-blocked.lock` (with `git mv`) and listed in the report; it is never edited to pass.
- **Tests use made-up locks only**, never a catalogue lock's contents (D10). **Count work, never wall-clock.**
- **Comments state the current rule and why**, never history ("replaces", "used to", "now"). A test name carries the
  claim; no doc-comment block above a test. The player is "they/them".
- **Mod off = same carve, bare nodes, open corridors:** `src/mods/topology/toggleOff.verify.ts` and
  `carveNeverDependsOnAMod.verify.ts` stay green.
- **Known failures, not yours:** `src/mods/puzzleSeeds.verify.ts` may fail its 3 known tests ("the switch's three
  shapes…", "owes the switch a board…", "names the floor and the shape…"). Leave them.
- **Commits:** one short line, then the trailer lines exactly:
  ```
  git commit -m "<type(scope)>: <what changed>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
  ```

## Review Focus

1. **A torch that started lit, doused, then relit.** It must offer the light once uncovered and stay lit after; a
   record whose only move is blocked by the `initial` rule would leave it dark for good. Tests: task 5 ("a torch that
   starts lit can still be lit from off"), task 7 (the lit-start arrival case, then lit by hand).
2. **A reload between the flood and the douse.** The lever and the doused torch land in one journeys write; a save
   never holds the water in with the torch still lit. Test: task 7 ("writes the lever and the doused torch in one
   write"), counting `setJourneys` calls.
3. **A walk over several sequence tiles in one tap.** Their presses are written as one batch, douses computed after
   all of them, not each from a stale snapshot. Test: task 7 (`setMechanismStates` is one write of every entry), and
   the existing `sequenceWalk.spec.tsx` stays green.
4. **An activator, or a floor key, in a flooded hall.** Never doused. Tests: task 2 (a non-torch key is untouched),
   task 4 (an activator keeps `on` under water).
5. **The topology mod off.** No torch record survives (`degradeUnrealised` makes its room ground), no region is
   covered, nothing is written, and the carve is the same. Test: task 6.

---

### Task 1: Every lock names its designer

**Files:**

- Modify: all 27 files under `src/game/locks/` and `src/game/locks/lessons/` (one line each; six stale clauses)
- Test: none of its own. The proof is `yarn run lock` printing the same before and after, and the grep count.

**Interfaces:**

- Consumes: nothing.
- Produces: nothing later tasks read by name. Task 8 edits four of these files again (the keyword only).

- [ ] **Step 1: Check what this task stands on**

```bash
export PATH="$HOME/.asdf/shims:$PATH"
git status --short
ls src/game/locks/*.lock src/game/locks/lessons/*.lock | wc -l
grep -l '^// designed by: ' src/game/locks/*.lock src/game/locks/lessons/*.lock | wc -l
```

Expected: `git status` shows at most `?? circle.lock` and `?? stoneGate.lock` (leave them); `27`; `0`. If the count
of files is not 27, or a `-blocked.lock` exists, stop and report: the table below no longer covers the catalogue.

- [ ] **Step 2: Take the baseline**

```bash
mkdir -p /tmp/torch
yarn run lock > /tmp/torch/lock-before.txt 2>&1; echo "exit $?"
```

Expected: the output lists every lock and lesson; masonsRamp shows `✗ not solvable`. Note the exit code.

- [ ] **Step 3: Write the designer line**

```bash
cd src/game/locks
for f in doubleBack.lock stoneGate.lock; do printf '// designed by: Matthijs\n' | cat - "$f" > "$f.new" && mv "$f.new" "$f"; done
for f in cellar.lock clockwork.lock counterweight.lock dropHome.lock keyring.lock lamplighter.lock masonsRamp.lock \
  observatory.lock overlook.lock plates.lock relay.lock seesaw.lock sluice.lock tide.lock twoLamps.lock twoStones.lock \
  lessons/boardPicksTheWay.lock lessons/doorWaitsForTwo.lock lessons/dropDown.lock lessons/leverOpensADoor.lock \
  lessons/leverSwapsDoors.lock lessons/stoneOnAPlate.lock lessons/tilesInOrder.lock lessons/torch.lock \
  lessons/waterMoves.lock; do printf '// designed by: Claude\n' | cat - "$f" > "$f.new" && mv "$f.new" "$f"; done
cd -
grep -c '^// designed by: ' src/game/locks/*.lock src/game/locks/lessons/*.lock | grep -v ':1$'
grep -l '^// designed by: Matthijs' src/game/locks/*.lock src/game/locks/lessons/*.lock
```

Expected: the first grep prints nothing (every file has exactly one line); the second prints exactly
`src/game/locks/doubleBack.lock` and `src/game/locks/stoneGate.lock`.

- [ ] **Step 4: Correct the stale headers on Claude's locks**

Edit by exact text (read each file first). Only these six; doubleBack and stoneGate are never edited beyond step 3.

- `src/game/locks/tide.lock`: `// master, not buildable yet (region gate). The lever floods one hall and drains` →
  `// master. The lever floods one hall and drains`
- `src/game/locks/sluice.lock`: `// master, not buildable yet (region gate). Water moved from one room to` →
  `// master. Water moved from one room to`
- `src/game/locks/lessons/waterMoves.lock`: `// LESSON, expert, not buildable yet (region gate): one lever drains a hall.`
  → `// LESSON, expert: one lever drains a hall.`
- `src/game/locks/twoStones.lock`: `// expert, not buildable yet (stones). One stone holds the vault open while you fetch the second; then`
  → `// expert. One stone holds the vault open while you fetch the second; then`
- `src/game/locks/counterweight.lock`: `// master, not buildable yet (stones). Giza's counterweight: the zipline takes you down only empty`
  → `// master. Giza's counterweight: the zipline takes you down only empty`
- `src/game/locks/masonsRamp.lock`: `// master, not buildable yet (stones). Djoser's building site: one stone holds the chute door so the`
  → `// master, unsolvable until the stone pipe. Djoser's building site: one stone holds the chute door so the`

- [ ] **Step 5: Prove nothing parses differently**

```bash
yarn run lock > /tmp/torch/lock-after-1.txt 2>&1; echo "exit $?"
diff /tmp/torch/lock-before.txt /tmp/torch/lock-after-1.txt && echo same
yarn vitest run src/game/lockNotation.spec.ts src/app/SiteMap/lockPlayground.spec.tsx
git diff --stat
```

Expected: the same exit code as step 2; `same`; the specs pass; `git diff --stat` lists only `.lock` files under
`src/game/locks/`, 27 files, each with one insertion (six with one more changed line).

- [ ] **Step 6: Commit**

```bash
git add src/game/locks
git status --short
git commit -m "chore(locks): every lock names its designer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

`git status --short` before the commit must show only `src/game/locks/**` staged and the two root scratch files
untracked.

---

### Task 2: `douseTorches`, the one rule

**Files:**

- Create: `src/game/mechanics/torch.ts` (the torch's state names; the kind joins it in task 3)
- Modify: `src/game/mechanismDoors.ts` (a new export beside `legalTargets`, under its heading)
- Test: `src/game/douseTorches.spec.ts` (new)

**Interfaces:**

- Consumes: nothing.
- Produces: `TORCH_OFF = "off"`, `TORCH_ON = "on"`, `TORCH_STATES = ["off", "on"] as const` from
  `src/game/mechanics/torch.ts`;
  `douseTorches<K>(states: ReadonlyMap<K, string>, torches: readonly K[], covered: (states: ReadonlyMap<K, string>) => ReadonlySet<K>): Map<K, string>`
  from `src/game/mechanismDoors.ts`.

- [ ] **Step 1: Write the failing test**

`src/game/douseTorches.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { douseTorches } from "./mechanismDoors"

// The hall is covered while the lever S stands at b.
const hallCovered = (inHall: string[]) => (states: ReadonlyMap<string, string>) =>
  new Set(states.get("S") === "b" ? inHall : [])

describe("douseTorches", () => {
  it("puts out a lit torch whose region is covered", () => {
    const states = new Map([
      ["S", "b"],
      ["T", "on"],
    ])
    expect(douseTorches(states, ["T"], hallCovered(["T"])).get("T")).toBe("off")
  })

  it("leaves an unlit torch, an uncovered torch and anything that is no torch as they are", () => {
    const states = new Map([
      ["S", "b"],
      ["T", "off"],
      ["U", "on"],
      ["K", "on"],
    ])
    const covered = (s: ReadonlyMap<string, string>) => new Set(s.get("S") === "b" ? ["T", "K"] : [])
    expect(Object.fromEntries(douseTorches(states, ["T", "U"], covered))).toEqual({
      S: "b",
      T: "off",
      U: "on",
      K: "on",
    })
  })

  it("settles a chain: a torch whose dousing covers another torch's region puts that one out too", () => {
    const covered = vi.fn((s: ReadonlyMap<string, string>) => {
      const hit = new Set<string>()
      if (s.get("S") === "b") hit.add("A")
      if (s.get("A") === "off") hit.add("B")
      return hit
    })
    const states = new Map([
      ["S", "b"],
      ["A", "on"],
      ["B", "on"],
    ])
    expect(Object.fromEntries(douseTorches(states, ["A", "B"], covered))).toEqual({ S: "b", A: "off", B: "off" })
    expect(covered).toHaveBeenCalledTimes(3)
  })

  it("changes nothing on a second call, asking once", () => {
    const covered = vi.fn(hallCovered(["T"]))
    const once = douseTorches(
      new Map([
        ["S", "b"],
        ["T", "on"],
      ]),
      ["T"],
      covered
    )
    covered.mockClear()
    expect(douseTorches(once, ["T"], covered)).toEqual(once)
    expect(covered).toHaveBeenCalledTimes(1)
  })

  it("never lights a torch, and never touches the states it was handed", () => {
    expect(
      douseTorches(
        new Map([
          ["S", "a"],
          ["T", "off"],
        ]),
        ["T"],
        () => new Set(["T"])
      ).get("T")
    ).toBe("off")
    const handed = new Map([
      ["S", "b"],
      ["T", "on"],
    ])
    douseTorches(handed, ["T"], hallCovered(["T"]))
    expect(handed.get("T")).toBe("on")
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `yarn vitest run src/game/douseTorches.spec.ts`
Expected: FAIL, `douseTorches` is not exported.

- [ ] **Step 3: Write the state names and the function**

`src/game/mechanics/torch.ts`:

```ts
/** A torch is off or lit; the names are fixed, so a gate says `-[B]-` for lit and `-[B:off]-` for out. */
export const TORCH_OFF = "off"
export const TORCH_ON = "on"
export const TORCH_STATES = [TORCH_OFF, TORCH_ON] as const
```

`src/game/mechanismDoors.ts`: add `import { TORCH_OFF, TORCH_ON } from "./mechanics/torch"` to the imports, and
directly after `legalTargets`:

```ts
/**
 * THE ONE RULE FOR A FLOOD AND A TORCH, shared by the lock walk, the floor's solver and play: a lit torch in a covered
 * region is out. `covered` answers, for a set of states, which torches stand in a region a shut region gate bars;
 * every lit one it names goes `off`, and it is asked again, since a doused torch may own a region gate of its own.
 * It only ever puts torches out, so it ends, and a second call changes nothing. It never lights a torch and never
 * touches a key that is not in `torches`.
 */
export const douseTorches = <K>(
  states: ReadonlyMap<K, string>,
  torches: readonly K[],
  covered: (states: ReadonlyMap<K, string>) => ReadonlySet<K>
): Map<K, string> => {
  const next = new Map(states)
  for (;;) {
    const hit = covered(next)
    const out = torches.filter(torch => next.get(torch) === TORCH_ON && hit.has(torch))
    if (out.length === 0) return next
    for (const torch of out) next.set(torch, TORCH_OFF)
  }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `yarn vitest run src/game/douseTorches.spec.ts src/game/mechanismDoors.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/mechanics/torch.ts src/game/mechanismDoors.ts src/game/douseTorches.spec.ts
git commit -m "feat(locks): one rule douses a lit torch in a covered region" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 3: The torch in the notation, the shared Lock and the kind registry

**Files:**

- Modify: `src/game/lockAuthoring.ts` (`Torch`, `LockMechanic`, the `Activator` doc comment)
- Modify: `src/game/lockNotation.ts` (`LOCK_SYNTAX`, `Declared`, the torch line, the mechanic it builds)
- Modify: `src/game/mechanics/torch.ts` (`torchFaults`, `TORCH`)
- Modify: `src/game/mechanics/index.ts` (`CORE_MECHANICS`)
- Modify: `src/game/mechanics/toggle.ts` (the `ACTIVATOR` comment)
- Modify: `src/game/mechanics/mechanicKind.ts` (the `control` doc lists `"torch"`)
- Modify: `src/game/lockCompile.ts` (`LockFault` gains `torchStates`; the two comments naming kinds)
- Modify: `src/game/obstacles.ts` (`StatefulControl.control`, `controlKindOf`'s comment)
- Modify: `src/worldGen/serializer.ts` (`serializeControl` writes `control: "torch"`)
- Test: `src/game/lockNotation.spec.ts` (a new `describe` at the end), `src/game/mechanics/torch.spec.ts` (new)

**Interfaces:**

- Consumes: `TORCH_OFF`, `TORCH_ON`, `TORCH_STATES` (task 2).
- Produces: `type Torch = { control: "torch"; in: RegionId; starts: "off" | "on"; opens: Opens }` in `LockMechanic`;
  `TORCH: MechanicKind` (`control: "torch"`, `built: true`, `gates: "opens"`); `StatefulControl.control?: "torch"`;
  the floor control a torch compiles to:
  `{ id, control: "torch", in, states: ["off", "on"], initial, returnsToInitial: false, opens: { off, on }, encounter? }`;
  `LockFault` `{ type: "torchStates"; mechanic: string; states: string[]; starts: string }`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/lockNotation.spec.ts`:

```ts
describe("a torch line", () => {
  it("reads a torch off until lit, and one lit from the start", () => {
    const { lock } = parseLock("in -[A+B:off]- out\nA torch @in\nB torch @in lit")
    expect(lock.mechanics.A).toEqual({ control: "torch", in: "in", starts: "off", opens: { off: [], on: ["in-out"] } })
    expect(lock.mechanics.B).toEqual({ control: "torch", in: "in", starts: "on", opens: { off: ["in-out"], on: [] } })
  })

  it.each(["B torch @in burning", "B torch @in lit lit", "B torch @in off on"])("refuses %s, naming the form", line => {
    expect(() => parseLock(`in -[B]- out\n${line}`)).toThrow(
      "a torch is off or lit at the start: write B torch @in lit"
    )
  })

  it("reads an activator line as an activator", () => {
    const { lock } = parseLock("in -[T]- out\nT activator @in")
    expect(lock.mechanics.T).toEqual({
      control: "activator",
      in: "in",
      starts: "off",
      opens: { off: [], on: ["in-out"] },
    })
  })
})
```

`src/game/mechanics/torch.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { Lock } from "../lockAuthoring"
import { checkLock, compileLock } from "../lockCompile"
import { parseLock } from "../lockNotation"
import { controlKindOf, type StatefulControl } from "../obstacles"
import { resolveMechanicKind } from "./index"

const LIT = parseLock("in -[T]- out\nT torch @in lit").lock

describe("the torch kind", () => {
  it("compiles a torch into a stateful control that says it is a torch", () => {
    const result = compileLock(LIT, { torch: "torch" })
    expect(result.ok && result.fragment.controls).toEqual([
      {
        id: "T",
        control: "torch",
        in: "in",
        states: ["off", "on"],
        initial: "on",
        returnsToInitial: false,
        opens: { off: [], on: ["in-out"] },
        encounter: "torch",
      },
    ])
  })

  it("is refused unbound, by its own binding key", () => {
    const result = compileLock(LIT, { activator: "torch" })
    expect(result.ok ? [] : result.faults).toContainEqual({ type: "unboundRole", kind: "torch", mechanics: ["T"] })
  })

  it("refuses a torch whose states are not off and on, or whose start is neither", () => {
    const named: Lock = {
      ...LIT,
      mechanics: { T: { control: "torch", in: "in", starts: "lit" as "on", opens: { unlit: [], lit: ["in-out"] } } },
    }
    expect(checkLock(named)).toContainEqual({
      type: "torchStates",
      mechanic: "T",
      states: ["unlit", "lit"],
      starts: "lit",
    })
  })

  it("is the kind its floor control answers to, seated in its region", () => {
    const control: StatefulControl = {
      id: "T",
      control: "torch",
      in: "hall",
      states: ["off", "on"],
      initial: "off",
      returnsToInitial: false,
      opens: { off: [], on: [] },
    }
    expect(controlKindOf(control)).toBe("torch")
    expect(resolveMechanicKind("torch")?.seats?.(control)).toEqual([{ region: "hall", seat: "control" }])
    expect(resolveMechanicKind("activator")?.seats?.(control)).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockNotation.spec.ts src/game/mechanics/torch.spec.ts`
Expected: FAIL (`cannot read "A torch @in"`; no `torch` kind; type errors on `control: "torch"`).

- [ ] **Step 3: The shared Lock**

`src/game/lockAuthoring.ts`: the `Activator` doc comment becomes

```ts
/**
 * Two states, no way back; the second is for good. A floor key, or a prize taken once: water and sand never touch
 * it, and no flood takes a floor key back.
 */
```

and after `Activator` add

```ts
/**
 * A torch: off until the player lights it, or lit from the start (`starts: "on"`). Its states are always `off` and
 * `on`. Water or sand over its region puts it out, and it can be lit again once the region is uncovered
 * (`douseTorches`, mechanismDoors.ts). Nothing the player does puts it out.
 */
export type Torch = {
  readonly control: "torch"
  readonly in: RegionId
  readonly starts: "off" | "on"
  readonly opens: Opens
}
```

and `export type LockMechanic = Toggle | Activator | Torch | Sequence | ForkSwitch`.

- [ ] **Step 4: The notation**

`src/game/lockNotation.ts`:

1. Import `import { TORCH_STATES } from "./mechanics/torch"`.
2. In `LOCK_SYNTAX`, the line `  T1 activator @hall            off then on, for good — a torch, or a floor key`
   becomes these three lines (spacing exactly as written, the second line's description starting at column 33):

```
  T1 activator @hall            off then on, for good: a floor key, or a prize; water and sand never touch it
  T torch @hall   T torch @hall lit   off until lit, or lit from the start; water or sand over its region
                                puts it out, and it can be lit again
```

3. `Declared` gains a member:

```ts
  | { control: "torch"; in: string; states: readonly [string, string]; lit: boolean; n: number }
```

4. In the line loop, before the `toggle|activator` branch, add:

```ts
    if ((m = line.match(/^(\w+)\s+torch\s+@(\w+)((?:\s+\w+)*)$/))) {
      const words = m[3].trim().split(/\s+/).filter(Boolean)
      if (words.length > 1 || (words.length === 1 && words[0] !== "lit"))
        fail(n, `a torch is off or lit at the start: write ${m[1]} torch @${m[2]} lit`)
      declare(n, m[1], { control: "torch", in: m[2], states: TORCH_STATES, lit: words.length === 1, n })
    } else if ((m = line.match(/^(\w+)\s+(toggle|activator)\s+@(\w+)((?:\s+\w+)*)$/))) {
```

(the existing `if ((m = line.match(/^(\w+)\s+(toggle|activator)…` becomes the `else if` shown).

5. Where `mechanics[id]` is built, the final `else` branch becomes:

```ts
    } else if (what.control === "torch") {
      mechanics[id] = {
        control: "torch",
        in: what.in,
        starts: what.lit ? "on" : "off",
        opens: { off: table.off ?? [], on: table.on ?? [] },
      }
    } else {
      const [first, second] = what.states
      mechanics[id] = {
        control: what.control,
        in: what.in,
        starts: first,
        opens: { [first]: table[first] ?? [], [second]: table[second] ?? [] },
      }
    }
```

A gate term naming a torch with no state already reads `what.states[1]`, which is `on`.

- [ ] **Step 5: The kind**

`src/game/mechanics/torch.ts`, below the state names:

```ts
import type { LockFault } from "../lockCompile"
import type { LooseMechanic, MechanicKind } from "./mechanicKind"

/** A torch's states are `off` and `on`, and it starts in one of them. */
export const torchFaults = (id: string, mechanic: LooseMechanic): LockFault[] => {
  const states = Object.keys(mechanic.opens ?? {})
  const fixed = states.length === 2 && TORCH_STATES.every(state => states.includes(state))
  const starts = mechanic.starts === TORCH_OFF || mechanic.starts === TORCH_ON
  return fixed && starts ? [] : [{ type: "torchStates", mechanic: id, states, starts: mechanic.starts ?? "" }]
}

/** Off until lit, lit for as long as no flood covers its region: a stateful control that says it is a torch, so the
 * floor's solver and play know which mechanisms a flood douses. Seated like an activator, one room in its region. */
export const TORCH: MechanicKind = {
  control: "torch",
  built: true,
  gates: "opens",
  faults: torchFaults,
  compile: (id, mechanic, { name, binding }) => {
    if (mechanic.control !== "torch") return { controls: [] }
    const encounter = binding.torch
    return {
      controls: [
        {
          id: name(id),
          control: "torch",
          in: name(mechanic.in),
          states: [...TORCH_STATES],
          initial: mechanic.starts,
          returnsToInitial: false,
          opens: {
            [TORCH_OFF]: (mechanic.opens[TORCH_OFF] ?? []).map(name),
            [TORCH_ON]: (mechanic.opens[TORCH_ON] ?? []).map(name),
          },
          ...(encounter === undefined ? {} : { encounter }),
        },
      ],
    }
  },
  seats: control => (control.control === "torch" ? [{ region: control.in, seat: "control" }] : []),
}
```

(the imports go to the top of the file). `src/game/mechanics/index.ts`: `import { TORCH } from "./torch"` and
`CORE_MECHANICS` lists `TORCH` directly after `ACTIVATOR`.

`src/game/mechanics/toggle.ts`, the `ACTIVATOR` comment becomes
`/** Two states, no way back: a floor key, or a prize taken once. Water and sand never touch it. */`.
`src/game/mechanics/mechanicKind.ts`, the `control` doc becomes
`/** The \`control\` a lock names: "toggle", "activator", "torch", "sequence", "fork-switch", or "one-way". */`.

- [ ] **Step 6: The fault, the floor control and the serializer**

`src/game/lockCompile.ts`:

- in `LockFault`, after `statesNotTwo`:

```ts
  /** A torch whose states are not `off` and `on`, or whose start is neither. */
  | { type: "torchStates"; mechanic: string; states: string[]; starts: string }
```

- the `RealisationBinding` comment's kind list reads `"toggle", "activator", "torch", "sequence", …`;
- in `translate`'s comment, `- toggle / activator -> …` becomes
  `- toggle / activator / torch -> a two-state control (back and forth / no way back / lit until a flood puts it out), \`starts\` its initial state.`

`src/game/obstacles.ts`, `StatefulControl`:

```ts
  /** Absent: a toggle or an activator. `"torch"`: a torch, states `off` and `on`, which a covering region barrier
   * puts out (`douseTorches`, mechanismDoors.ts). Never another kind: those have controls of their own. */
  control?: "torch"
```

and `controlKindOf`'s comment becomes
`/** The core control kind a floor control is an instance of (src/game/mechanics): a torch says so, and an unnamed stateful one is a toggle where it returns to its start and an activator where it does not. */`.

`src/worldGen/serializer.ts`, `serializeControl`, the `parts` list gains a second entry so a torch writes its kind:

```ts
  const parts = [
    `id: ${JSON.stringify(c.id)}`,
    ...(c.control === "torch" ? [`control: "torch"`] : []),
    `in: ${JSON.stringify(c.in)}`,
```

- [ ] **Step 7: Run the tests and the types**

```bash
yarn vitest run src/game/lockNotation.spec.ts src/game/mechanics src/game/lockCompile.spec.ts src/game/obstacles.spec.ts src/worldGen/serializer.spec.ts
yarn check-types
```

Expected: PASS and exit 0. If `serializer.spec.ts` does not exist, drop it from the list. A type error elsewhere
from the wider `LockMechanic` union is fixed where it stands, without changing behaviour, and listed in the report.

- [ ] **Step 8: Commit**

```bash
git add src/game/lockAuthoring.ts src/game/lockNotation.ts src/game/lockNotation.spec.ts src/game/mechanics/torch.ts src/game/mechanics/torch.spec.ts src/game/mechanics/index.ts src/game/mechanics/toggle.ts src/game/mechanics/mechanicKind.ts src/game/lockCompile.ts src/game/obstacles.ts src/worldGen/serializer.ts
git commit -m "feat(locks): a torch is a control kind of its own" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 4: The lock walk douses

**Files:**

- Modify: `src/game/lockWalk.ts` (`LockSpec.torches`, `checkLockSpec`, `dousedConfig`, `movesFrom`, `reachableStates`)
- Modify: `src/game/lockWalkSpec.ts` (a torch's mechanism; `torches` from the expansion)
- Test: `src/game/lockWalkTorches.spec.ts` (new)

**Interfaces:**

- Consumes: `douseTorches` (task 2); `TORCH_OFF`, `TORCH_ON` (task 2); the `Torch` mechanic (task 3).
- Produces: `LockSpec.torches?: { mechanism: MechanismId; coveredBy: GateId[] }[]`;
  `dousedConfig(spec: LockSpec, config: LockConfig): LockConfig` (returns `config` itself when nothing is doused).

- [ ] **Step 1: Write the failing tests**

`src/game/lockWalkTorches.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { checkLockSpec, reachableStates, walkLock } from "./lockWalk"
import { walkSpecOf } from "./lockWalkSpec"
import { parseLock } from "./lockNotation"

const specOf = (text: string) => walkSpecOf(parseLock(text, "flood").lock)

// B burns and A does not; the door wants the opposite. Flooding the hall puts B out.
const TWO_TORCHES = `
in -- hub -- hall
hub -[A+B:off]- out
hall -[S:a]
S toggle @hub
B torch @hall lit
A torch @hall
`

describe("the lock walk with torches and a flood", () => {
  it("proves the two-torch lock: flood the hall, let the water go, light A", () => {
    expect(walkLock(specOf(TWO_TORCHES)).sound).toBe(true)
  })

  it("finds no way out when no flood can put the lit torch out", () => {
    const walked = walkLock(specOf("in -- hub -- hall\nhub -[A+B:off]- out\nB torch @hall lit\nA torch @hall"))
    expect(walked).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("starts a lit torch out when its region is covered at the start", () => {
    const found = reachableStates(
      specOf("in -- hub -- hall\nhub -[B]- out\nhall -[S:b]\nS toggle @hub\nB torch @hall lit")
    )
    expect(found !== "tooLarge" && found.order[0].config.B).toBe("off")
  })

  it("lights a doused torch again once its region is uncovered", () => {
    const found = reachableStates(specOf(TWO_TORCHES))
    expect(
      found !== "tooLarge" && found.order.some(s => s.config.S === "a" && s.config.B === "on" && s.config.A === "on")
    ).toBe(true)
    expect(
      found !== "tooLarge" && found.order.some(s => s.config.S === "b" && (s.config.A === "on" || s.config.B === "on"))
    ).toBe(false)
  })

  it("never puts out an activator under the water", () => {
    const found = reachableStates(
      specOf("in -- hub -- hall\nhub -[K]- out\nhall -[S:a]\nS toggle @hub\nK activator @hall")
    )
    expect(found !== "tooLarge" && found.order.some(s => s.config.S === "b" && s.config.K === "on")).toBe(true)
  })

  it("lists each torch with the entry hops of the region gates over its region", () => {
    const spec = specOf(TWO_TORCHES)
    expect(spec.torches?.map(t => t.mechanism).sort()).toEqual(["A", "B"])
    for (const { coveredBy } of spec.torches ?? []) {
      expect(coveredBy.length).toBeGreaterThan(0)
      for (const gate of coveredBy) expect(spec.gates[gate]).toBeDefined()
    }
  })

  it("refuses a torch the spec cannot resolve", () => {
    const spec = specOf(TWO_TORCHES)
    expect(checkLockSpec({ ...spec, torches: [{ mechanism: "Z", coveredBy: [] }] })).toBe(
      "a torch names no mechanism: Z"
    )
    expect(checkLockSpec({ ...spec, torches: [{ mechanism: "S", coveredBy: [] }] })).toBe(
      "torch S has no states off and on"
    )
    expect(checkLockSpec({ ...spec, torches: [{ mechanism: "A", coveredBy: ["nowhere"] }] })).toBe(
      "torch A is covered by no such gate: nowhere"
    )
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockWalkTorches.spec.ts`
Expected: FAIL (the first test may pass by luck of the generic branch; "starts a lit torch out", the `torches` and the
`checkLockSpec` tests fail).

- [ ] **Step 3: The walk**

`src/game/lockWalk.ts`:

1. `import { douseTorches } from "./mechanismDoors"`.
2. `LockSpec` gains, after `emptyHands`:

```ts
  /** Each torch, with the gates whose shutting covers its region (a region gate's entry hops): a lit torch in a
   * covered region is out, in every state the walk reaches (`dousedConfig`). */
  torches?: { mechanism: MechanismId; coveredBy: GateId[] }[]
```

3. In `checkLockSpec`, after the `emptyHands` loop and before `return undefined`:

```ts
for (const { mechanism, coveredBy } of spec.torches ?? []) {
  const torch = spec.mechanisms[mechanism]
  if (!torch) return `a torch names no mechanism: ${mechanism}`
  if (!torch.states.includes("off") || !torch.states.includes("on"))
    return `torch ${mechanism} has no states off and on`
  for (const gate of coveredBy) if (!spec.gates[gate]) return `torch ${mechanism} is covered by no such gate: ${gate}`
}
```

4. After `openGates`:

```ts
/** A config with every lit torch in a covered region put out (`douseTorches`, the rule play douses by): the walk's
 * start, and every state a move reaches after the entries it works. The same config when nothing is doused. */
export const dousedConfig = (spec: LockSpec, config: LockConfig): LockConfig => {
  const torches = spec.torches ?? []
  if (torches.length === 0) return config
  const covered = (states: ReadonlyMap<MechanismId, StateId>) => {
    const open = openGates(spec, Object.fromEntries(states))
    return new Set(torches.filter(({ coveredBy }) => coveredBy.some(gate => !open.has(gate))).map(t => t.mechanism))
  }
  const doused = douseTorches(
    new Map(Object.entries(config)),
    torches.map(t => t.mechanism),
    covered
  )
  return torches.every(({ mechanism }) => doused.get(mechanism) === config[mechanism])
    ? config
    : Object.fromEntries(doused)
}
```

5. `movesFrom`'s last line becomes

```ts
return moves.map(move => {
  const arrived = entering(spec, region, move)
  const config = dousedConfig(spec, arrived.config)
  return config === arrived.config ? arrived : { region: arrived.region, config }
})
```

and the comment above `movesFrom` gains one line at its end: `// Every move ends with the douse: a move, the entries its arrival works, then the torches a flood puts out.`

6. In `reachableStates`, the start config is doused:

```ts
const start: LockState = {
  region: spec.in,
  config: dousedConfig(spec, Object.fromEntries(ids.map(id => [id, spec.mechanisms[id].initial]))),
}
```

- [ ] **Step 4: The walk spec of a lock**

`src/game/lockWalkSpec.ts`:

1. `import { TORCH_OFF, TORCH_ON } from "./mechanics/torch"`.
2. In `mechanismOf`, before the generic two-state branch (`const states = Object.keys(m.opens)`):

```ts
// A torch's one move is lighting it, whatever it starts in: a lit torch put out by a flood can be lit again.
if (m.control === "torch")
  return {
    states: [TORCH_OFF, TORCH_ON],
    initial: m.starts,
    opens: { [TORCH_OFF]: opened(m.opens[TORCH_OFF]), [TORCH_ON]: opened(m.opens[TORCH_ON]) },
    transitions: [{ from: TORCH_OFF, to: TORCH_ON, at: m.in }],
  }
```

3. After `emptyHands` is computed, before the `return`:

```ts
// A region gate's hops open and shut together, so the region is covered while any of them is shut.
const torches = Object.entries(lock.mechanics).flatMap(([id, m]) =>
  m.control === "torch"
    ? [
        {
          mechanism: id,
          coveredBy: regionGates.flatMap(([gate, g]) =>
            isRegionGate(g) && g.region === m.in ? (expands.get(gate) ?? []) : []
          ),
        },
      ]
    : []
)
```

and the returned object gains `...(torches.length > 0 ? { torches } : {})`.

- [ ] **Step 5: Run the walk tests**

Run: `yarn vitest run src/game/lockWalkTorches.spec.ts src/game/lockWalk.spec.ts src/game/lockWalkSpec.spec.ts src/game/lockWalkEntries.spec.ts src/game/lockNotation.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/lockWalk.ts src/game/lockWalkSpec.ts src/game/lockWalkTorches.spec.ts
git commit -m "feat(locks): the lock walk puts out a torch the flood covers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 5: A torch on a floor, and the floor's solver

**Files:**

- Modify: `src/game/siteTypes.ts` (`MechanismRecord.torch`)
- Modify: `src/game/mechanics/torch.ts` (`torchRecord`)
- Modify: `src/game/siteAssembler.ts` (`controlRoomSpec` and its two callers)
- Modify: `src/game/mechanismDoors.ts` (`legalTargets` for a `placedOnly` record; the `isSpent` comment)
- Modify: `src/game/floorLock.ts` (`torches` from the floor)
- Modify: `src/game/floorLockWalk.ts` (`levelOf` keeps the torches of its level)
- Modify: `src/app/SiteMap/playgroundCarve.testing.ts` (`REALISATION_CHOICES.torch`)
- Test: `src/app/SiteMap/torchFlood.spec.ts` (new; tasks 6 and 7 add to it)

**Interfaces:**

- Consumes: the `TORCH` kind and its floor control (task 3); `LockSpec.torches` and the walk's douse (task 4).
- Produces: `MechanismRecord.torch?: { region: string }` (the namespaced region the torch stands in, the same name a
  region barrier door's `regionBarrier.region` carries);
  `torchRecord(record: MechanismRecord, region: string, home: readonly [number, number]): MechanismRecord`;
  `floorLock(grid).torches` keyed by `floorLock`'s mechanism ids (`obstacle r,c`);
  `REALISATION_CHOICES.torch = ["torch"]`.

- [ ] **Step 1: Write the failing tests**

`src/app/SiteMap/torchFlood.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { parseLock } from "@/game/lockNotation"
import { floorLock } from "@/game/floorLock"
import { walkFloorLock } from "@/game/floorLockWalk"
import { legalTargets } from "@/game/mechanismDoors"
import type { FloorGrid, RoomCell } from "@/game/siteTypes"
import { carvePlayground, defaultBinding, playgroundFloor } from "./playgroundCarve.testing"

// A made-up lock, the puzzle the design is for: B burns and A does not, the door wants the opposite.
const TWO_TORCHES = `
in -- hub -- hall
hub -[A+B:off]- out
hall -[S:a]
S toggle @hub
B torch @hall lit
A torch @hall
in ?
hub ?
hall ?
out ?
`

const carved = (text: string) => {
  const config = playgroundFloor(parseLock(text, "flood").lock, defaultBinding())
  const found = carvePlayground(config)
  if (!found.found) throw new Error(JSON.stringify(found.reasons))
  return { config, ...found }
}

const homeOf = (grid: FloorGrid, id: string): { at: [number, number]; cell: RoomCell } => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.mechanism && cell.mechanismId === `flood.${id}`) return { at: [r, c], cell }
    }
  throw new Error(`no ${id} on the floor`)
}

describe("a torch on a floor", () => {
  const { grid } = carved(TWO_TORCHES)

  it("carries the region it stands in and one move, off to on, made where it stands", () => {
    const { at, cell } = homeOf(grid, "B")
    expect(cell.mechanism?.torch).toEqual({ region: "flood.hall" })
    expect(cell.mechanism?.placedOnly).toBe(true)
    expect(cell.mechanism?.transitions).toEqual([{ from: "off", to: "on", at }])
  })

  it("a torch that starts lit can still be lit from off, and a lit one offers nothing", () => {
    const record = homeOf(grid, "B").cell.mechanism!
    expect(record.initial).toBe("on")
    expect(legalTargets(record, "off")).toEqual(["on"])
    expect(legalTargets(record, "on")).toEqual([])
  })

  it("an activator's record carries no torch", () => {
    const { grid: keyFloor } = carved(
      "in -- hub -- hall\nhub -[K]- out\nhall -[S:a]\nS toggle @hub\nK activator @hall\nin ?\nhub ?\nhall ?\nout ?"
    )
    expect(homeOf(keyFloor, "K").cell.mechanism?.torch).toBeUndefined()
  })

  it("the floor's solver lists both torches, covered by the hall's barrier doors, and walks the floor sound", () => {
    const spec = floorLock(grid)!
    expect(spec.torches).toHaveLength(2)
    for (const { coveredBy } of spec.torches!) expect(coveredBy.length).toBeGreaterThan(0)
    expect(walkFloorLock(grid)?.sound).toBe(true)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/torchFlood.spec.ts`
Expected: FAIL: the carve refuses the lock (`unboundRole` for `torch`) until step 3; after it, the record has no
`torch`.

- [ ] **Step 3: Bind the torch on the playground**

`src/app/SiteMap/playgroundCarve.testing.ts`, `REALISATION_CHOICES`: add `torch: ["torch"],` after
`activator: ["torch"],` (the activator line stays).

- [ ] **Step 4: The record**

`src/game/siteTypes.ts`, `MechanismRecord`, after `placedOnly`:

```ts
  /** A TORCH, and the region it stands in (the floor's own name, namespaced as a region barrier's door names it): a
   * covering region barrier puts it out (`douseFloor`, mechanismDoors.ts). Absent on every other mechanism, an
   * activator included. */
  torch?: { region: string }
```

`src/game/mechanics/torch.ts`, add `import type { MechanismRecord } from "../siteTypes"` and:

```ts
/** A torch's floor record: the region it stands in, and its one move, off to on, made where it stands. Placed, so it
 * can be lit again after a flood whatever it started in. */
export const torchRecord = (
  record: MechanismRecord,
  region: string,
  home: readonly [number, number]
): MechanismRecord => ({
  ...record,
  torch: { region },
  placedOnly: true,
  transitions: [{ from: TORCH_OFF, to: TORCH_ON, at: home }],
})
```

`src/game/siteAssembler.ts`: import `torchRecord` from `"./mechanics/torch"`; `controlRoomSpec` becomes

```ts
const controlRoomSpec = (
  control: StatefulControl,
  record: MechanismRecord,
  at: readonly [number, number]
): RoomSpec => ({
  roomType: "encounter",
  ...mechanismRoom(resolveEncounter(control.encounter, DEFAULT_CONTROL_ROLE)),
  mechanism: control.control === "torch" ? torchRecord(record, control.in, at) : record,
  mechanismId: control.id,
})
```

and its two callers pass the cell: `controlRoomSpec(control, record, [r, c])` (the main-path one, beside
`controlAtIndex`) and `controlRoomSpec(control, record, cells[seatIndex])` (the chain one).

`src/game/mechanismDoors.ts`, `legalTargets`'s return becomes

```ts
// A mechanism that places every move has exactly the moves it places; the rule about its start is for the rest.
return states.filter(to => to !== from && (placedOnly ? placed.has(to) : returnsToInitial || to !== initial))
```

and the comment on `isSpent` reads "Of the contract's kinds that is an activator once used (a thrown one-way switch,
a taken key) or a torch while it burns, and nothing else: …" with the rest unchanged.

- [ ] **Step 5: The floor's solver**

`src/game/floorLock.ts`, inside `floorLock`:

1. Beside `gatesByKeyId`, declare
   `/** The gates of every region barrier's doors, by the region they bar: what covers a torch there. */`
   `const barrierGates = new Map<string, GateId[]>()`.
2. In the door loop, right after `gates[gateId] = { from: beside, to: doorRegion, owners: [] }`:

```ts
if (cell.type === "room" && cell.regionBarrier)
  barrierGates.set(cell.regionBarrier.region, [...(barrierGates.get(cell.regionBarrier.region) ?? []), gateId])
```

3. Before the mechanisms loop, `const torches: NonNullable<LockSpec["torches"]> = []`; inside it, after
   `mechanisms[id] = { … }`:

```ts
if (record.torch) torches.push({ mechanism: id, coveredBy: barrierGates.get(record.torch.region) ?? [] })
```

4. The returned object gains `...(torches.length > 0 ? { torches } : {})`.

`src/game/floorLockWalk.ts`, `levelOf`, beside `emptyHands`:

```ts
// A torch is walked in the level its mechanism is; a covering gate that is ground at this level stands open.
const torches = (lock.torches ?? [])
  .filter(({ mechanism }) => Object.hasOwn(mechanisms, mechanism))
  .map(({ mechanism, coveredBy }) => ({ mechanism, coveredBy: coveredBy.filter(gate => Object.hasOwn(gates, gate)) }))
```

and the returned spec gains `...(torches.length > 0 ? { torches } : {})`.

- [ ] **Step 6: Run the tests**

```bash
yarn vitest run src/app/SiteMap/torchFlood.spec.ts src/game/floorLock.spec.ts src/game/floorLocks.spec.ts src/game/mechanismDoors.spec.ts src/app/state/remoteMechanismState.spec.ts src/app/SiteMap/sequenceWalk.spec.tsx src/game/weightsPlates.spec.ts
yarn check-types
```

Expected: PASS and exit 0. If `carvePlayground` refuses the two-torch lock, stop and report its reasons verbatim:
the lock is made up, but the bench floor must carve it for tasks 6, 7 and 9.

- [ ] **Step 7: Commit**

```bash
git add src/game/siteTypes.ts src/game/mechanics/torch.ts src/game/siteAssembler.ts src/game/mechanismDoors.ts src/game/floorLock.ts src/game/floorLockWalk.ts src/app/SiteMap/playgroundCarve.testing.ts src/app/SiteMap/torchFlood.spec.ts
git commit -m "feat(locks): a torch's floor record, and the floor's solver douses" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 6: The floor's douse, the same as the walk's, and nothing with the mod off

**Files:**

- Modify: `src/game/mechanismDoors.ts` (`floorTorches`, `douseFloor`, `withDouse`)
- Test: `src/app/SiteMap/torchFlood.spec.ts` (two `describe`s added)

**Interfaces:**

- Consumes: `douseTorches` (task 2); `MechanismRecord.torch` (task 5); `dousedConfig` (task 4); `floorLock` (task 5).
- Produces:
  - `floorTorches(grid: FloorGrid, floor: number): { address: string; at: readonly [number, number]; region: string; initial: string }[]`
  - `douseFloor(grid: FloorGrid, floor: number, stored: ReadonlyMap<string, string>, heldKeys?: ReadonlySet<string>): Map<string, string>`
    — the writes: every torch whose doused state differs from the state it stands in now (stored, else initial).
  - `withDouse(grid: FloorGrid, floor: number, stored: ReadonlyMap<string, string>, moves: ReadonlyMap<string, string>, heldKeys?: ReadonlySet<string>): Map<string, string>`
    — `moves` plus the douses they cause, one map to write at once.

- [ ] **Step 1: Write the failing tests**

Add to the imports of `src/app/SiteMap/torchFlood.spec.ts`:

```ts
import { cellAddress } from "@/game/cellAddress"
import { dousedConfig, reachableStates } from "@/game/lockWalk"
import { assembleFloor } from "@/game/siteAssembler"
import { douseFloor, floorTorches, withDouse } from "@/game/mechanismDoors"
import { dirsOf, TOPOLOGY_OFF, TOPOLOGY_ON } from "@/game/testSupport/modOff"
import { PLAYGROUND_JOURNEY } from "./playgroundCarve.testing"
```

(merge `PLAYGROUND_JOURNEY` into the existing `./playgroundCarve.testing` import). Append:

```ts
describe("the floor's douse and the walk's", () => {
  const { grid } = carved(TWO_TORCHES)
  const spec = floorLock(grid)!
  const address = (id: string) => cellAddress(grid, 0, ...homeOf(grid, id).at)!
  const walkId = (id: string) => {
    const [r, c] = homeOf(grid, id).at
    return Object.keys(spec.mechanisms).find(m => m.endsWith(` ${r},${c}`))!
  }

  it("leave the same torch states after every move of the same sequence", () => {
    const found = reachableStates(spec)
    if (found === "tooLarge") throw new Error("too large")
    let config = found.order[0].config
    let states = new Map<string, string>()
    states = new Map([...states, ...douseFloor(grid, 0, states)])
    const torchStates = () => ({
      walk: [config[walkId("A")], config[walkId("B")]],
      play: ["A", "B"].map(id => states.get(address(id)) ?? homeOf(grid, id).cell.mechanism!.initial),
    })
    expect(torchStates().walk).toEqual(torchStates().play)
    for (const [id, to] of [
      ["S", "b"],
      ["S", "a"],
      ["A", "on"],
      ["B", "on"],
      ["S", "b"],
    ] as const) {
      config = dousedConfig(spec, { ...config, [walkId(id)]: to })
      states = new Map([...states, ...withDouse(grid, 0, states, new Map([[address(id), to]]))])
      expect(torchStates().walk, `${id} to ${to}`).toEqual(torchStates().play)
    }
    expect(torchStates().play).toEqual(["off", "off"])
  })

  it("lists every torch on the floor, and douses nothing while the hall is dry", () => {
    expect(
      floorTorches(grid, 0)
        .map(t => t.address)
        .sort()
    ).toEqual([address("A"), address("B")].sort())
    expect(douseFloor(grid, 0, new Map())).toEqual(new Map())
  })

  it("writes a move and the douse it causes together", () => {
    expect(withDouse(grid, 0, new Map(), new Map([[address("S"), "b"]]))).toEqual(
      new Map([
        [address("S"), "b"],
        [address("B"), "off"],
      ])
    )
  })
})

describe("the torch and the flood with the topology mod off", () => {
  const { config, seed, grid } = carved(TWO_TORCHES)

  it("carves the same walls, with no torch to douse and nothing to write", () => {
    const on = assembleFloor(PLAYGROUND_JOURNEY, config, seed, TOPOLOGY_ON.resolveEncounter, {
      floorRef: { journeyId: PLAYGROUND_JOURNEY, floorIndex: 0 },
    })
    const off = assembleFloor(PLAYGROUND_JOURNEY, config, seed, TOPOLOGY_OFF.resolveEncounter, {
      floorRef: { journeyId: PLAYGROUND_JOURNEY, floorIndex: 0 },
      resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
      resolveRegionBarrier: TOPOLOGY_OFF.resolveRegionBarrier,
      resolvePassage: TOPOLOGY_OFF.resolvePassage,
    })
    if (!on.success || !off.success) throw new Error("the floor does not assemble at the carved seed")
    expect(dirsOf(off.grid)).toBe(dirsOf(on.grid))
    expect(dirsOf(on.grid)).toBe(dirsOf(grid))
    expect(floorTorches(off.grid, 0)).toEqual([])
    expect(douseFloor(off.grid, 0, new Map([[cellAddress(grid, 0, ...homeOf(grid, "S").at)!, "b"]]))).toEqual(new Map())
  })
})
```

If `dirsOf(on.grid)` differs from `dirsOf(grid)` (the playground carve passes the registry's key requirements and
board indexes), drop that one assertion and say so in the report: the claim is on against off at one seed.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/torchFlood.spec.ts`
Expected: FAIL, `douseFloor`/`floorTorches`/`withDouse` are not exported.

- [ ] **Step 3: The floor's douse**

`src/game/mechanismDoors.ts`, after `douseTorches`:

```ts
/** Every torch on a floor: the address its state is filed under, its home cell, its region and its start. */
export const floorTorches = (
  grid: FloorGrid,
  floor: number
): { address: string; at: readonly [number, number]; region: string; initial: string }[] => {
  const torches: { address: string; at: readonly [number, number]; region: string; initial: string }[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.mechanism?.torch) continue
      const address = cellAddress(grid, floor, r, c)
      if (address)
        torches.push({ address, at: [r, c], region: cell.mechanism.torch.region, initial: cell.mechanism.initial })
    }
  return torches
}

/**
 * WHAT A FLOOD PUTS OUT ON A FLOOR, as the writes that say so: every torch whose doused state differs from the state
 * it stands in (stored, else its start). A region is covered while one of its barrier's doors is shut
 * (`openDoorsFor`); with no barrier realised there is no door, so nothing is covered.
 */
export const douseFloor = (
  grid: FloorGrid,
  floor: number,
  stored: ReadonlyMap<string, string>,
  heldKeys: ReadonlySet<string> = NO_KEYS
): Map<string, string> => {
  const torches = floorTorches(grid, floor)
  if (torches.length === 0) return new Map()
  const barrierKeys = new Map<string, Set<string>>()
  for (const row of grid.cells)
    for (const cell of row)
      if (cell.type === "room" && cell.regionBarrier && cell.requiredKeyId)
        barrierKeys.set(
          cell.regionBarrier.region,
          (barrierKeys.get(cell.regionBarrier.region) ?? new Set()).add(cell.requiredKeyId)
        )
  const now = new Map(stored)
  for (const torch of torches)
    now.set(torch.address, storedAtCell(grid, floor, torch.at[0], torch.at[1], stored) ?? torch.initial)
  const covered = (states: ReadonlyMap<string, string>) => {
    const open = openDoorsFor(grid, floor, states, heldKeys)
    return new Set(
      torches
        .filter(torch => [...(barrierKeys.get(torch.region) ?? [])].some(key => !open.has(key)))
        .map(torch => torch.address)
    )
  }
  const doused = douseTorches(
    now,
    torches.map(torch => torch.address),
    covered
  )
  return new Map(
    torches.filter(t => doused.get(t.address) !== now.get(t.address)).map(t => [t.address, doused.get(t.address)!])
  )
}

/** A move (or several) and every douse it causes, as one set of writes. */
export const withDouse = (
  grid: FloorGrid,
  floor: number,
  stored: ReadonlyMap<string, string>,
  moves: ReadonlyMap<string, string>,
  heldKeys: ReadonlySet<string> = NO_KEYS
): Map<string, string> => {
  const after = new Map([...stored, ...moves])
  return new Map([...moves, ...douseFloor(grid, floor, after, heldKeys)])
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `yarn vitest run src/app/SiteMap/torchFlood.spec.ts src/game/mechanismDoors.spec.ts src/game/douseTorches.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/mechanismDoors.ts src/app/SiteMap/torchFlood.spec.ts
git commit -m "feat(locks): a floor douses its torches by the walk's rule" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 7: Play writes a move and its douses in one write, and douses on arriving

**Files:**

- Modify: `src/app/state/useJourneys.ts` (`setMechanismStates` on `JourneyAPI` and `createJourneysV3Api`)
- Create: `src/app/SiteMap/useDousedJourneys.ts`
- Modify: `src/app/SiteMap/useAssembledFloor.ts` (returns `baseGrid` and `heldKeys`)
- Modify: `src/app/SiteMap/SiteMapScreen.tsx` (wires the hook)
- Modify: `src/app/SiteMap/lockPlayground.testing.tsx` (wires the hook)
- Modify: `src/app/SiteMap/useSiteNavigation.ts` (`walkTo` writes its presses in one batch)
- Modify: any spec that builds a `JourneyAPI` by hand and fails type-checking (add `setMechanismStates: vi.fn()`)
- Test: `src/app/SiteMap/useDousedJourneys.spec.ts` (new)

**Interfaces:**

- Consumes: `withDouse`, `douseFloor` (task 6); the playground carve (task 5). The spec below carries its own copy
  of the made-up lock and the `homeOf` helper (a spec never imports another spec).
- Produces: `JourneyAPI.setMechanismStates(writes: ReadonlyMap<string, string>): void` (one journeys write);
  `useDousedJourneys({ journeys, journeyId, floor, currentFloor, heldKeys }): JourneyAPI`;
  `useAssembledFloor(…)` also returns `baseGrid: FloorGrid | null` and `heldKeys: ReadonlySet<string>`.

- [ ] **Step 1: Write the failing tests**

`src/app/SiteMap/useDousedJourneys.spec.ts`:

```ts
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { cellAddress } from "@/game/cellAddress"
import { parseLock } from "@/game/lockNotation"
import { legalTargets } from "@/game/mechanismDoors"
import type { FloorGrid, RoomCell } from "@/game/siteTypes"
import { carvePlayground, defaultBinding, PLAYGROUND_JOURNEY, playgroundFloor } from "./playgroundCarve.testing"
import { useDousedJourneys } from "./useDousedJourneys"

const TWO_TORCHES =
  "in -- hub -- hall\nhub -[A+B:off]- out\nhall -[S:a]\nS toggle @hub\nB torch @hall lit\nA torch @hall\nin ?\nhub ?\nhall ?\nout ?"
// The hall starts flooded: S at a keeps it covered until thrown to b.
const FLOODED_AT_START =
  "in -- hub -- hall\nhub -[B]- out\nhall -[S:b]\nS toggle @hub\nB torch @hall lit\nin ?\nhub ?\nhall ?\nout ?"

const carvedGrid = (text: string): FloorGrid => {
  const found = carvePlayground(playgroundFloor(parseLock(text, "flood").lock, defaultBinding()))
  if (!found.found) throw new Error(JSON.stringify(found.reasons))
  return found.grid
}
const homeOf = (grid: FloorGrid, id: string): { at: [number, number]; cell: RoomCell } => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.mechanism && cell.mechanismId === `flood.${id}`) return { at: [r, c], cell }
    }
  throw new Error(`no ${id} on the floor`)
}

// One journey's save, counting every journeys write, the way remoteMechanismState.spec keeps one.
const store = () => {
  let docs: StoredJourneyStateV3[] = [
    {
      journeyId: PLAYGROUND_JOURNEY,
      levelNr: 1,
      completionCount: 0,
      active: true,
      exploredSections: {},
      position: null,
      interiorLevelNr: null,
    },
  ]
  let writes = 0
  const api = (): JourneyAPI =>
    createJourneysV3Api({
      journeys: docs,
      setJourneys: updater => {
        writes++
        docs = typeof updater === "function" ? updater(docs) : updater
      },
      journeyData: [{ id: PLAYGROUND_JOURNEY, exterior: "pyramid", levelCount: 1 } as TranslatedJourney],
    }) as JourneyAPI
  return { api, writes: () => writes }
}

const NO_KEYS: ReadonlySet<string> = new Set()
const mount = (grid: FloorGrid, save: ReturnType<typeof store>) =>
  renderHook(
    ({ journeys }) =>
      useDousedJourneys({ journeys, journeyId: PLAYGROUND_JOURNEY, floor: grid, currentFloor: 0, heldKeys: NO_KEYS }),
    { initialProps: { journeys: save.api() } }
  )

describe("play's douse", () => {
  const grid = carvedGrid(TWO_TORCHES)
  const address = (id: string) => cellAddress(grid, 0, ...homeOf(grid, id).at)!

  it("writes nothing on arriving while the hall is dry", () => {
    const save = store()
    mount(grid, save)
    expect(save.writes()).toBe(0)
  })

  it("writes the lever and the doused torch in one write, and a reload reads both", () => {
    const save = store()
    const { result } = mount(grid, save)
    act(() => result.current.setMechanismState(address("S"), "b"))
    expect(save.writes()).toBe(1)
    const reloaded = save.api().getMechanismStates(PLAYGROUND_JOURNEY)
    expect(reloaded.get(address("S"))).toBe("b")
    expect(reloaded.get(address("B"))).toBe("off")
  })

  it("offers the light once the water goes, and keeps the torch lit when lit", () => {
    const save = store()
    const { result, rerender } = mount(grid, save)
    act(() => result.current.setMechanismState(address("S"), "b"))
    rerender({ journeys: save.api() })
    act(() => result.current.setMechanismState(address("S"), "a"))
    rerender({ journeys: save.api() })
    expect(legalTargets(homeOf(grid, "B").cell.mechanism!, "off")).toEqual(["on"])
    act(() => result.current.setMechanismState(address("B"), "on"))
    rerender({ journeys: save.api() })
    expect(save.api().getMechanismStates(PLAYGROUND_JOURNEY).get(address("B"))).toBe("on")
  })

  it("writes several states in one write", () => {
    const save = store()
    const { result } = mount(grid, save)
    act(() =>
      result.current.setMechanismStates(
        new Map([
          [address("S"), "b"],
          [address("A"), "on"],
        ])
      )
    )
    expect(save.writes()).toBe(1)
    expect(save.api().getMechanismStates(PLAYGROUND_JOURNEY).get(address("A"))).toBe("off")
  })
})

describe("arriving on a floor whose hall starts flooded", () => {
  const grid = carvedGrid(FLOODED_AT_START)
  const address = (id: string) => cellAddress(grid, 0, ...homeOf(grid, id).at)!

  it("writes the lit torch out, and it stays out once the water goes, until lit", () => {
    const save = store()
    const { result, rerender } = mount(grid, save)
    expect(save.writes()).toBe(1)
    expect(save.api().getMechanismStates(PLAYGROUND_JOURNEY).get(address("B"))).toBe("off")
    rerender({ journeys: save.api() })
    expect(save.writes()).toBe(1)
    act(() => result.current.setMechanismState(address("S"), "b"))
    rerender({ journeys: save.api() })
    expect(save.api().getMechanismStates(PLAYGROUND_JOURNEY).get(address("B"))).toBe("off")
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/useDousedJourneys.spec.ts`
Expected: FAIL, `./useDousedJourneys` does not exist.

- [ ] **Step 3: One journeys write of several states**

`src/app/state/useJourneys.ts`:

- `JourneyAPI`, after `setMechanismState`:

```ts
  /** Several mechanisms' new states in one write, so a move and what it causes are saved together. */
  setMechanismStates: (writes: ReadonlyMap<string, string>) => void
```

- in `createJourneysV3Api`, `setMechanismState` and the new one:

```ts
const setMechanismStates = (writes: ReadonlyMap<string, string>) => {
  if (!activeJourneyId || writes.size === 0) return
  const entries = [...writes].map(([address, stateId]) => [atLevel(address), stateId] as const)
  setJourneys(prev =>
    prev.map(j => {
      if (j.journeyId !== activeJourneyId) return j
      if (entries.every(([at, stateId]) => j.mechanismStates?.[at] === stateId)) return j
      return { ...j, mechanismStates: { ...(j.mechanismStates ?? {}), ...Object.fromEntries(entries) } }
    })
  )
}

const setMechanismState = (address: string, stateId: string) => setMechanismStates(new Map([[address, stateId]]))
```

- the returned object lists `setMechanismStates` beside `setMechanismState`.

- [ ] **Step 4: The hook**

`src/app/SiteMap/useDousedJourneys.ts`:

```ts
import { useEffect, useMemo } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { douseFloor, withDouse } from "@/game/mechanismDoors"
import type { FloorGrid } from "@/game/siteTypes"
import { useMechanismStates } from "./useMechanismStates"

/**
 * THE JOURNEYS API AS A FLOOR HANDS IT DOWN: every mechanism write lands with the torches it puts out, in one journeys
 * write, so a reload never finds the water in with the torch still lit. On the floor's arrival (and whenever its
 * states change) a lit torch a flood covers is written out, which is the walk's douse of its start state: without
 * the write, a lit-start torch would come back lit once the water went, with nobody having lit it.
 */
export const useDousedJourneys = ({
  journeys,
  journeyId,
  floor,
  currentFloor,
  heldKeys,
}: {
  journeys: JourneyAPI
  journeyId: string
  /** The floor as carved, before any state opens a door: its barrier doors are what cover a region. */
  floor: FloorGrid | null
  currentFloor: number
  heldKeys: ReadonlySet<string>
}): JourneyAPI => {
  const stored = useMechanismStates(journeys, journeyId)
  useEffect(() => {
    if (!floor) return
    const writes = douseFloor(floor, currentFloor, stored, heldKeys)
    if (writes.size > 0) journeys.setMechanismStates(writes)
  }, [floor, currentFloor, stored, heldKeys, journeys])
  return useMemo(() => {
    if (!floor) return journeys
    const write = (moves: ReadonlyMap<string, string>) =>
      journeys.setMechanismStates(
        withDouse(floor, currentFloor, journeys.getMechanismStates(journeyId), moves, heldKeys)
      )
    return {
      ...journeys,
      setMechanismState: (address: string, stateId: string) => write(new Map([[address, stateId]])),
      setMechanismStates: write,
    }
  }, [journeys, journeyId, floor, currentFloor, heldKeys])
}
```

- [ ] **Step 5: Hand the floor out, and wire the hook**

`src/app/SiteMap/useAssembledFloor.ts`: the return type gains

```ts
/** The floor as carved, before any mechanism state opens a door: what the douse reads (useDousedJourneys). */
baseGrid: FloorGrid | null
/** The floor keys held here, as `openDoorsFor` reads them. */
heldKeys: ReadonlySet<string>
```

and the final `return` adds `baseGrid, heldKeys`.

`src/app/SiteMap/SiteMapScreen.tsx`: take `baseGrid` and `heldKeys` from `useAssembledFloor(…)`, then directly after
it:

```ts
// Every mechanism write on this floor goes through here, so a flood's douse is saved with the move that caused it.
const floorJourneys = useDousedJourneys({ journeys, journeyId, floor: baseGrid, currentFloor, heldKeys })
```

and pass `floorJourneys` (instead of `journeys`) to `useEncounter({ journeys: … })`, to
`useSiteNavigation({ journeys: … })` and to `<ActiveEncounterComponent journeys={…} />`. Every other use of
`journeys` stays.

`src/app/SiteMap/lockPlayground.testing.tsx`: the same three hand-overs, with
`useDousedJourneys({ journeys, journeyId: PLAYGROUND_JOURNEY, floor: baseGrid, currentFloor: 0, heldKeys })`, taking
`baseGrid` and `heldKeys` from its `useAssembledFloor` call; the `<Board journeys={…} />` gets `floorJourneys`.

`src/app/SiteMap/useSiteNavigation.ts`, `walkTo`: the loop becomes one batch:

```ts
const presses = walkPresses(
  grid,
  currentFloor,
  findPath(grid, explorerPos, [r, c]),
  journeys.getMechanismStates(journeyId)
)
// One write for the whole walk, so the douse reads every tile it worked.
if (presses.length > 0) journeys.setMechanismStates(new Map(presses.map(press => [press.address, press.state])))
```

- [ ] **Step 6: Run the tests and the types**

```bash
yarn check-types
yarn vitest run src/app/SiteMap/useDousedJourneys.spec.ts src/app/SiteMap/torchFlood.spec.ts src/app/state src/app/SiteMap/useSiteNavigation.spec.ts src/app/SiteMap/sequenceWalk.spec.tsx src/app/SiteMap/lockPlayground.spec.tsx src/app/SiteMap/devFloorPlaytest.spec.tsx src/mods/topology/app
```

Expected: PASS and exit 0. Where `check-types` names a spec that builds a `JourneyAPI` by hand (for example
`useSiteNavigation.spec.ts`, `tapAdmission.spec.ts`, `oneWayPrompt.spec.tsx`, `narrowPassage.spec.tsx`,
`GateFaceMixedDoor.spec.tsx`, `forkSwitchBoard.spec.tsx`), add `setMechanismStates: vi.fn(),` beside its
`setMechanismState`. A spec that asserted a sequence tile's write through `setMechanismState` now reads
`setMechanismStates` with a one-entry map; change only that assertion, and list it.

- [ ] **Step 7: Commit**

```bash
git add src/app/state/useJourneys.ts src/app/SiteMap/useDousedJourneys.ts src/app/SiteMap/useDousedJourneys.spec.ts src/app/SiteMap/useAssembledFloor.ts src/app/SiteMap/SiteMapScreen.tsx src/app/SiteMap/lockPlayground.testing.tsx src/app/SiteMap/useSiteNavigation.ts
git add <each spec step 6 touched, by path>
git commit -m "feat(map): a flood puts out a torch in play, saved with the move" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 8: Four locks become torches; the bindings; the bake

**Files:**

- Modify: `src/game/locks/lessons/torch.lock`, `src/game/locks/lessons/doorWaitsForTwo.lock`,
  `src/game/locks/relay.lock`, `src/game/locks/stoneGate.lock` (the keyword only)
- Modify: `src/worldGen/spec/dev.ts`, `src/worldGen/spec/expert.ts` (the binding; dev's comment)
- Modify: the comments that call the activator "the torch": `src/mods/topology/index.ts`,
  `src/mods/topology/game/torch/meta.ts`, and whatever step 4's grep finds in `src/`
- Modify: `src/data/generatedWorld.ts`, `src/data/carveLedger.json` (the plain bake)
- Test: none of its own. The proof is `yarn run lock` against task 1's baseline, the floor-by-floor bake diff and
  `yarn verify-content`.

**Interfaces:**

- Consumes: every earlier task.
- Produces: the shipped world's stoneGate with `S1: { control: "torch", … }` and `realisations: { …, torch: "torch", … }`.

- [ ] **Step 1: Check what this task stands on**

```bash
git status --short
git status --short src/data/
grep -n '^[A-Za-z0-9_]* activator' src/game/locks/lessons/torch.lock src/game/locks/lessons/doorWaitsForTwo.lock src/game/locks/relay.lock src/game/locks/stoneGate.lock
```

Expected: no uncommitted file under `src/data/`; the grep prints exactly six lines: `T activator @alcove`,
`T1 activator @a`, `T2 activator @b`, `B activator @r2`, `C activator @r3`, `S1 activator @hall5` — six mechanic
lines in four files. Anything else: stop and report.

- [ ] **Step 2: The keyword**

```bash
sed -i '' -E 's/^(T) activator (@alcove)$/\1 torch \2/' src/game/locks/lessons/torch.lock
sed -i '' -E 's/^(T[12]) activator (@[ab])$/\1 torch \2/' src/game/locks/lessons/doorWaitsForTwo.lock
sed -i '' -E 's/^([BC]) activator (@r[23])$/\1 torch \2/' src/game/locks/relay.lock
sed -i '' -E 's/^(S1) activator (@hall5)$/\1 torch \2/' src/game/locks/stoneGate.lock
git diff --stat src/game/locks
git diff -U0 src/game/locks | grep '^[-+][^-+]'
```

Expected: four files, six lines changed; every `-` line ends `activator @…` and its `+` line is the same with
`torch`. Nothing else in any of the four files moved.

- [ ] **Step 3: The catalogue sweep**

```bash
yarn run lock > /tmp/torch/lock-after-8.txt 2>&1; echo "exit $?"
diff /tmp/torch/lock-before.txt /tmp/torch/lock-after-8.txt
```

Expected: the same exit code as task 1 step 2, and either no difference or only the drawing of a migrated torch (a
mark that names `T`, `B`, `C`, `S1` the same way). Any new `✗` line: rename that file
`git mv src/game/locks/<path>.lock src/game/locks/<path>-blocked.lock`, list it in the report, and if a world spec
reads it (`catalogueLock("<name>")` in `src/worldGen/spec/`), stop and report rather than bake: the bake would fail by
name.

- [ ] **Step 4: The bindings and the comments**

`src/worldGen/spec/expert.ts`, the stoneGate rule:
`realisations: { weights: "stonePlate", activator: "torch", unladen: "narrowPassage" }` →
`realisations: { weights: "stonePlate", torch: "torch", unladen: "narrowPassage" }`.

`src/worldGen/spec/dev.ts`, pyramid 12: the same binding change, and the comment
`// Bound at the pyramid: the stones are stone plates, the activator a torch, empty hands a narrow passage.` →
`// Bound at the pyramid: the stones are stone plates, the torch the standing torch, empty hands a narrow passage.`

`src/mods/topology/index.ts`: "the handle and torch dress a toggle and an activator" → "the handle dresses a toggle,
the torch a torch and an activator".

`src/mods/topology/game/torch/meta.ts`, the comment above `TORCH_META`:

```ts
// THE STANDING TORCH dresses two control kinds: the torch (off until lit; water or sand over its region puts it out)
// and the activator (off then on for good). States `off` and `on`, asked for by `encounter: "torch"`. A family of its
// own only because the arrival prompt's words belong to the family: lighting is not throwing.
```

Then:

```bash
grep -rn activator src | grep -v -e '\.spec\.' -e '\.verify\.' -e 'src/data/' -e 'src/game/locks/'
```

Read each hit. A comment that still calls the activator "the torch" (or a torch an activator) is rewritten to say
what holds (an activator is a floor key or a prize taken once; a torch is the `torch` kind); code that means the
activator kind stays. Test fixtures (`src/game/testSupport/*`) stay as they are. Keep the list of every file this task
touches for the report.

```bash
yarn check-types
yarn vitest run src/worldGen src/game/mechanics src/mods/topology/index.spec.ts
```

Expected: exit 0 and PASS.

- [ ] **Step 5: Take the bake's baseline**

```bash
git show HEAD:src/data/generatedWorld.ts > /tmp/torch/before.ts
cat > /tmp/torch/floorDiff.ts <<EOF
import { generatedWorldConfigs as before } from "/tmp/torch/before"
import { generatedWorldConfigs as after } from "$PWD/src/data/generatedWorld"
const moved: string[] = []
for (const j of new Set([...Object.keys(before), ...Object.keys(after)])) {
  const a = before[j] ?? [], b = after[j] ?? []
  for (let p = 0; p < Math.max(a.length, b.length); p++)
    for (let f = 0; f < Math.max(a[p]?.length ?? 0, b[p]?.length ?? 0); f++)
      if (JSON.stringify(a[p]?.[f]) !== JSON.stringify(b[p]?.[f])) moved.push(\`\${j} pyramid \${p + 1} floor \${f}\`)
}
console.log(moved.length ? moved.join("\n") : "no floor moved")
EOF
yarn tsx /tmp/torch/floorDiff.ts
```

Expected: `no floor moved`.

- [ ] **Step 6: Bake the plain world**

Run: `git status --short src/data/` — expected: nothing. Then, in the background (every ledgered floor is searched
again because the carve's sources moved, so this takes far longer than a bake with a fresh ledger):

```bash
yarn generate-world > /tmp/torch/bake.log 2>&1; echo "exit $?" >> /tmp/torch/bake.log
tail -30 /tmp/torch/bake.log
```

Expected: `exit 0`; no `✗` line; `Lock sweep:` walks every floor that authors a mechanism with no strand.

- [ ] **Step 7: Prove only stoneGate's floor and the ledger's hashes moved**

```bash
yarn tsx /tmp/torch/floorDiff.ts
git diff --stat src/data/
git diff -U0 src/data/generatedWorld.ts | grep -E '^[-+]' | grep -v '^[-+]{3}'
git diff -U0 src/data/carveLedger.json | grep -E '^[-+] ' | grep -v '"hash":'
```

Expected:

- the script prints exactly `expert_4 pyramid 5 floor 0`;
- `git diff --stat` lists `src/data/generatedWorld.ts` and `src/data/carveLedger.json` only;
- the generatedWorld diff is S1's mechanic line (`control: "activator"` → `control: "torch"`), the stoneGate binding
  line (`activator: "torch"` → `torch: "torch"`) and the `worldContentHash` line: no `seed`, `packing` or wall moved;
- the last command prints nothing (every ledger change is a `"hash"` line).

If any other floor moved, a seed or packing changed, or a ledger `refusal` changed, restore the bake
(`git checkout -- src/data/`), stop and report what moved.

- [ ] **Step 8: The content sweeps**

Run: `yarn verify-content 2>&1 | tee /tmp/torch/verify.log | grep -E "×|Test Files|Tests "`

Expected: only the three known `src/mods/puzzleSeeds.verify.ts` failures (or none). `toggleOff.verify.ts` and
`carveNeverDependsOnAMod.verify.ts` pass. Any other failure: stop and report it.

- [ ] **Step 9: Commit**

```bash
git add src/game/locks/lessons/torch.lock src/game/locks/lessons/doorWaitsForTwo.lock src/game/locks/relay.lock src/game/locks/stoneGate.lock src/worldGen/spec/dev.ts src/worldGen/spec/expert.ts src/mods/topology/index.ts src/mods/topology/game/torch/meta.ts src/data/generatedWorld.ts src/data/carveLedger.json
git add <each file step 4's grep led you to edit, by path; any -blocked rename>
git status --short
git commit -m "feat(locks): four locks light torches, stoneGate's among them" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 9: The playground story, seen

**Files:**

- Modify: `src/app/SiteMap/LockPlayground.stories.tsx` (one story)

**Interfaces:**

- Consumes: the whole play path (tasks 3-8).
- Produces: the story `TorchAndFlood` (`topology-lock-playground--torch-and-flood`).

- [ ] **Step 1: The story**

`src/app/SiteMap/LockPlayground.stories.tsx`, after `Tide`:

```ts
// A made-up lock for the torch and the flood: B burns and A does not, and the door wants the opposite. Throw S and
// the hall floods, putting B out; throw it back, light A, and the door opens. Lighting A first costs nothing: the
// flood puts both out.
export const TorchAndFlood: Story = {
  args: {
    locks: {
      torchAndFlood:
        "in -- hub -- hall\nhub -[A+B:off]- out\nhall -[S:a]\nS toggle @hub\nB torch @hall lit\nA torch @hall\nin ?\nhub ?\nhall ?\nout ?",
    },
    initial: "torchAndFlood",
  },
}
```

Run: `yarn vitest run src/app/SiteMap/lockPlayground.spec.tsx` and `yarn check-types` — PASS, exit 0.

- [ ] **Step 2: Play it and look**

`git status --short src/data/` must print nothing. Start Storybook on a spare port (6006 is the designer's):

```bash
yarn storybook -p 6117 --ci > /tmp/torch/storybook.log 2>&1 &
until curl -sf http://localhost:6117/index.json > /tmp/torch/index.json; do sleep 3; done
grep -o '"id":"[^"]*torch-and-flood"' /tmp/torch/index.json
```

With the Playwright browser tools (`mcp__playwright__browser_navigate`, `browser_snapshot`, `browser_click`,
`browser_take_screenshot`), open `http://localhost:6117/iframe.html?id=<the id>&viewMode=story` and wait for the
explorer (`[data-explorer]`) and "walks sound" in the header. Then play:

1. Tap the lever's room in `hub` and take its prompt; the hall floods. Screenshot
   `/tmp/torch/1-flooded.png`: water over the hall; the header's state line (`data-playground-states`) shows S at
   `b` and B at `off`.
2. Tap the lever again and take the prompt; the water goes. Screenshot `/tmp/torch/2-drained.png`: the hall is
   ground again, B stands unlit (it offers to be lit), A unlit.
3. Tap A's room and take "light"; walk to the door to `out`: it stands open. Screenshot `/tmp/torch/3-open.png`.

Read each screenshot back and describe it in the report, with the states line each time. If a tap lands nowhere,
use `browser_snapshot` to find the room, or click the explorer path step by step. Then stop Storybook (`kill %1`).

- [ ] **Step 3: Commit**

```bash
git add src/app/SiteMap/LockPlayground.stories.tsx
git commit -m "feat(playground): a story for the torch and the flood" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 10: The contract, the curriculum, the handover; the whole gate; push

**Files:**

- Modify: `docs/mods/mechanic-contract.md`
- Modify: `docs/game-design/lock-curriculum.md`
- Modify: `docs/handover-stonegate.md`
- Modify: `docs/playtest-backlog.md`

**Interfaces:** none.

Prettier reflows markdown tables: edit table rows by line and read the file back after each edit.

- [ ] **Step 1: The contract** (`docs/mods/mechanic-contract.md`, present tense, edits by exact text)

1. "## 2. The controls" table: the `activator` row becomes
   `| **activator**   | two, no way back                    | a floor key, or a prize taken once; water and sand never touch it |`
   and a row after it:
   `| **torch**       | two, \`off\` and \`on\` | lit by the player; put out by a region barrier covering its region; lit again once uncovered; see §3.3 |`
2. The floor-key paragraph becomes: "A **floor key is an activator.** The solver already models it as
   `absent -> held` with no return; the player works it by taking it from a chest. It can therefore own gates and
   take part in conditions like any other control."
3. "## 3. Effects": "Four torches opening one gate is four activators owning one gate with `and`." → "Four torches
   opening one gate is four torches owning one gate with `and`."
4. After "### 3.2 Stones on plates" (before "### Impassable regions"), a new section:

```markdown
### 3.3 Torches and floods

- A **torch** (`control: "torch"`) has two fixed states, `off` and `on`. The player's one move is to light it,
  standing in its region. Nothing the player does puts it out. It may start lit (`B torch @hall lit`); a lit torch
  offers no move until something douses it.
- A **region barrier** (water or sand) always covers its whole region. A region is **covered** while a region gate
  barring it is shut: its owners, folded by its mode, do not open it. A region no region gate bars is never
  covered; an edge gate covers nothing.
- **A lit torch in a covered region is doused**: it goes to `off`, whatever it started as, and every door it held
  open on its own shuts with it. **A doused torch can be lit again** once its region is uncovered; while covered it
  cannot be reached.
- **An activator is untouched**: no flood changes an activator, and no flood takes a floor key back.
- **One rule, one function**: `douseTorches` (`src/game/mechanismDoors.ts`). The lock walk douses its start state
  and every state a move reaches, after the entries it works (`dousedConfig`, `lockWalk.ts`); the floor's solver
  lists each torch with the gates of its region's barrier doors (`floorLock`); play writes a move and every douse it
  causes in one journeys write, and douses on arriving (`useDousedJourneys`).
- **With the topology mod off** a torch's room is a bare node and a region barrier is plain ground at its door, so
  no region is ever covered and nothing is doused or written; turning the mod back on finds the stored states as
  they were.
```

5. "## 6. What a mechanic declares": under `mechanic torch`, `control    activator` → `control    torch`.
6. "### Mechanics, one small example each": the **activator** paragraph, its `brazier` example and the sentence after
   it become

````markdown
**activator** — two states, no way back. A floor key, or a prize taken once.

**torch** — `off` and `on`, lit by the player, put out by a flood over its region (§3.3).

```json
"brazier": { "control": "torch", "in": "hall", "starts": "off",
             "opens": { "off": [], "on": ["hall-vault"] } }
```

Four of them on one door is four torches and the default `and`:
````

(the `hall-vault` example below it stays). 7. "## 8. Settled, and still open": "The four controls plus one-way." → "The five controls (toggle, activator, torch,
sequence, fork-switch) plus one-way and the stones." and after "A floor key is an activator." add "A flood puts out
a torch and never an activator."

Read the file back; the numbering of §3's subsections is 3.1, 3.2, 3.3.

- [ ] **Step 2: The curriculum** (`docs/game-design/lock-curriculum.md`, "What each lock leans on")

The row `| torch or key (activator, once) | \`torch\` | cellar, keyring, relay, observatory, sluice, tide |` becomes two
rows:

```markdown
| torch (lit by the player, put out by a flood) | `torch` | relay, stoneGate |
| key or prize (activator, once) | — (a floor key, met in the world) | cellar, keyring, observatory, sluice, tide |
```

Read the table back after prettier (`yarn prettier --write docs/game-design/lock-curriculum.md`).

- [ ] **Step 3: The handover and the backlog**

`docs/handover-stonegate.md`:

- "Designer decisions to keep": after "Header comments in `.lock` files are the designer's text." replace that
  sentence with: "Every `.lock` file names its designer on its first line (`// designed by: Matthijs` or
  `// designed by: Claude`). The designer's headers (doubleBack, stoneGate) are their text; a stale header on a lock
  Claude designed may be corrected." and add a bullet: "- **The torch is a control kind of its own** (2026-10-09): a
  flood douses it; an activator is a floor key or a prize and no flood touches it. Plan:
  `docs/superpowers/plans/2026-10-09-torch-douse.md`."
- "Waiting on the designer", "Unanswered": delete the bullet "correct the stale header comments in
  `waterMoves`/`sluice`/`tide`/`stoneOnAPlate`/`twoStones` `.lock` files? …" (answered: Claude's locks, corrected in
  task 1; stoneOnAPlate's was current). Keep the stoneGate header bullet.

`docs/playtest-backlog.md`, at the top below the intro paragraph:

```markdown
## The torch and the flood

- **Storybook, Topology/Lock playground → Torch and flood.** Flood the hall: does the lit torch go out where you
  can see it? Drain it: does the torch read as unlit and offer to be lit? Light A and leave: does the door's face
  show the flame it wants and the one it wants out?
```

- [ ] **Step 4: Commit the docs**

```bash
git add docs/mods/mechanic-contract.md docs/game-design/lock-curriculum.md docs/handover-stonegate.md docs/playtest-backlog.md
git commit -m "docs: the torch and the flood, in the contract and the curriculum" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 5: The whole gate in a clean worktree**

```bash
git worktree add /tmp/torch-gate HEAD && cd /tmp/torch-gate && yarn install --immutable && yarn verify && yarn verify-content && yarn build
```

Expected: all pass but the three known `puzzleSeeds.verify.ts` failures. `yarn verify` (lint, types, unit, betterer)
is required, not only `verify-content`. If `lint --fix` rewrote a file, copy the change back, commit it ("style:
lint") in the real worktree, and run the gate again. If betterer reports moved line positions, run
`yarn betterer:update` in the real worktree and commit `.betterer.results` ("chore: refresh the betterer line
positions"). If a lint or betterer fix edits a carve-graph file, re-run task 8 step 6-7 and commit the ledger. Then
`cd -`, `git worktree remove /tmp/torch-gate`, `git push`, and check `gh pr checks` if a PR exists for the branch.

- [ ] **Step 6: The report**

List every file the branch touched since `cc20c4e4` (`git diff --stat cc20c4e4..HEAD`), any lock renamed
`-blocked`, the three screenshots' descriptions, and any assertion a task dropped and why.

---

## Open after

- **stoneGate's header** still says "not placed yet, not buildable yet". It is the designer's text; the handover
  asks them.
- **The lesson for a flood and a torch.** No lesson teaches that water puts a torch out; the curriculum's torch row
  is taught by `lessons/torch` alone. The designer places the first torch-and-flood lock (spec, "Not in scope": no
  world floor floods a torch yet), and the changelog entry comes with it.
- **The torch-and-flood fixtures** live twice (`torchFlood.spec.ts`, `useDousedJourneys.spec.ts`); move them to one
  `*.testing.ts` if a third spec needs them.
- **`lessons/torch`'s header** says "lit for good": true of the lesson, which has no flood; revisit if a flood lesson
  joins it.

## Self-review notes

- **Spec §1** (notation, `LOCK_SYNTAX`, the shared Lock, `torchStates`, the kind, the floor control and record):
  tasks 3 and 5. **The contract text:** task 10. **The curriculum split:** task 10.
- **Spec §2** (covered; `douseTorches`; the walk, the floor's solver, play; arrival writes): tasks 2, 4, 5, 6, 7.
- **Spec §3** (the migration table, bindings, comments, the bake changing stoneGate only): task 8; the playground
  binding: task 5. **§4** no save migration: D7, nothing to build. **§5** mod off: task 6. **§6** art: nothing to
  draw; the look in task 9. **§7** proof: the walk tests (task 4), the notation tests (task 3), walk and play agree
  (task 6), play (task 7), mod off (task 6), the catalogue sweep (task 8), the story (task 9).
- **Designer decisions after the spec:** authorship lines and stale Claude headers (task 1; table above); tide and
  sluice stay activators (D4); the torch list rechecked against authorship (above, no mismatch).
- **Review Focus → tests:** 1 task 5 ("a torch that starts lit can still be lit from off") and task 7 (the flooded
  start); 2 task 7 ("one write", counted); 3 task 7 ("several states in one write") and `sequenceWalk.spec.tsx`; 4
  tasks 2 and 4; 5 task 6.
- **Type consistency:** `douseTorches` (task 2) is called by `dousedConfig` (task 4) and `douseFloor` (task 6);
  `TORCH_OFF`/`TORCH_ON`/`TORCH_STATES` (task 2) by tasks 3, 4, 5; `MechanismRecord.torch` and `torchRecord` (task 5)
  by `floorLock` (task 5) and `floorTorches` (task 6); `withDouse`/`douseFloor` (task 6) by `useDousedJourneys`
  (task 7); `setMechanismStates` (task 7) by the hook and `useSiteNavigation`.
