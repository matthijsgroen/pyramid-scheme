# The torch and the flood: design

A gate can want one torch lit and another out, `-[A+B:off]-`, while the floor starts the other way round: B
burns, A does not. The explorer can light a torch and never put one out. Water or sand can: a region barrier
that covers a torch's region douses it, and once the barrier is gone the torch can be lit again. So the
player floods B's hall, lets the water go, and lights A.

Settled with the designer on 2026-10-09. This is a design, not a plan: it says what holds and what proves
it, and leaves the code to the implementer. The lock model is in `docs/mods/mechanic-contract.md`; the
tool side is `src/game/lockNotation.ts`, `src/game/lockWalkSpec.ts` and `src/game/lockWalk.ts`.

## The rules, in one place

- A **torch** is a core control kind of its own, `torch`, beside `activator`. It has two fixed states,
  `off` and `on`.
- The player's one move with a torch is to **light it**: `off` to `on`, standing in its region. Nothing the
  player does puts a torch out.
- A torch **may start lit**. A lit torch offers no move until something douses it.
- A **region barrier** (water or sand: one core region gate, two realisations) always covers its whole
  region. A region is **covered** while a region gate barring it is shut.
- **A lit torch in a covered region is doused**: it goes to `off`, whatever it started as. Every door it held
  open on its own shuts with it.
- **A doused torch can be lit again** once its region is uncovered. While its region is covered it cannot be
  reached, so it cannot be lit.
- An **`activator` is untouched**: one-shot, off then on for good, the floor key's control. No flood ever
  changes an activator, and no flood ever takes a floor key back.
- **One rule, one function.** The lock walk, the floor's solver and play all douse through the same pure
  core function, so they cannot disagree about which torch is out.

## 1. The notation and the contract

### Writing a torch

```
A torch @hall                 a torch, off until the player lights it
B torch @hall lit             a torch burning from the start
```

The trailing word **`lit`** marks a torch that starts lit, the way `stone` marks a plate that starts with a
stone (`p plate @hall stone`). Three reasons for this form:

- **The states are fixed, so there is nothing to name.** A toggle or an activator line may end in two state
  names (`sluice toggle @hall dry wet`); a torch's states are always `off` and `on`, so the free slot after
  `@region` is used for the one fact about it that varies, as it is on a plate.
- **It says what the player sees, not a state id.** A lit torch is the thing on the floor; `on` is the name a
  gate term uses. Gates keep that name: `-[B]-` is open while B is `on`, `-[B:off]-` while B is `off`, the same
  terms an activator takes today.
- **No new punctuation.** Every control line in the notation is `id kind @region` plus words.

A torch line with any other trailing word, or with more than one, is refused where it is read, naming the
form: `a torch is off or lit at the start: write B torch @hall lit`. A torch that starts lit and that nothing
can douse is allowed; it is a lit torch the player never touches, and the walk judges any gate it holds.

### LOCK_SYNTAX

`LOCK_SYNTAX` gains one line and the activator line loses the torch:

```
  T1 activator @hall            off then on, for good: a floor key, or a prize; water and sand never touch it
  T torch @hall   T torch @hall lit   off until lit, or lit from the start; water or sand over its region
                                puts it out, and it can be lit again
```

### The shared Lock

A torch mechanic is `{ control: "torch", in: RegionId, starts: "off" | "on", opens: { off: BarrierId[], on: BarrierId[] } }`: the toggle's shape with its state names fixed. `lit` in the notation is `starts: "on"`. A
torch whose `opens` names other states, or whose `starts` is neither, is refused by the kind's own fault
(`torchStates`), beside `statesNotTwo` and `startsNotAState`. Every rule that holds for any mechanic holds for
a torch: it owns the gates it opens, it may not stand in a region it bars (`mechanicStandsInBarredRegion`),
and it takes part in `+` and `|` conditions like any owner.

### The kind

`torch` is a core plug-in in `src/game/mechanics`, registered with the others: `built: true`, gates by
`opens`, seated like an activator (one control node in its region). Its compiled floor control says it is a
torch (as a fork-switch, a sequence and the stones say what they are), so `controlKindOf` answers `torch`
and the record on the floor tells play and the floor's solver which mechanisms douse. Its record lists its
one move, `off` to `on`, as its placed transition (`placedOnly`), so `legalTargets` answers `on` from `off`
whether the torch started lit or not, and `isSpent` is true exactly while it burns. The record also carries
the region its torch stands in, which the floor's solver and play read to know what covers it.

A torch is told from an activator by its kind and nothing else: never by its realisation, because the same
torch art dresses both (below).

### The contract text

`docs/mods/mechanic-contract.md` changes in these places, in present tense:

- **"The controls" table:** a `torch` row (two states, lit by the player, put out by a covering region
  barrier, lit again once uncovered) and the `activator` row reads "two, no way back: a floor key, or a prize
  taken once; water and sand never touch it".
- **The floor-key paragraph** keeps "a floor key is an activator" and drops "the only difference from a torch".
- **"Effects":** "Four torches opening one gate is four torches owning one gate with `and`."
- **A new section beside "Stones on plates", "Torches and floods"**, carrying "The rules, in one place" above,
  the definition of covered (section 2), the shared function's name and its three callers, and the mod-off
  behaviour (section 5).
- **"What a mechanic declares":** `mechanic torch` reads `control torch`.
- **"Mechanics, one small example each":** the `brazier` example becomes a torch (`"control": "torch"`,
  `"starts": "off"`, states `off`/`on`), and a sentence says an activator is the floor key's control.
- **"Settled, and still open":** the controls list includes the torch.

`docs/game-design/lock-curriculum.md` splits its "torch or key (activator, once)" row into a torch row and a
key row, each naming the locks the migration below gives it.

## 2. The douse rule

### Covered

A region R is **covered** in a state when **some region gate barring R is shut** in that state: its owners,
folded by its mode (`doorOpen`), do not open it. A region no region gate bars is never covered. An edge gate,
shut or open, covers nothing.

- **In the lock walk.** `walkSpecOf` expands a region gate `g` on R into one entry hop per connection into R,
  `g@<connection>`. Every hop of `g` carries `g`'s owners and mode, and every state that opens `g` opens all
  its hops (`opened`), so a gate's hops are open or shut together. R is covered under `config` when a hop of
  any region gate on R is missing from `openGates(spec, config)`.
- **On a floor.** A region barrier's doors are the room cells whose `regionBarrier.region` is R, each
  carrying the barrier's gate key as `requiredKeyId`. R is covered when one of those gate keys is missing from
  `openDoorsFor(grid, floor, positions, heldKeys)`. The torch's region is the `region` its home cell carries;
  both names are the floor's own, namespaced alike.

A torch and the barrier that covers it are always in one lock: a region gate names a region of its own lock,
and a torch stands in a region of its own. So the rule never reaches across a nesting.

### The function

One pure function in `src/game/mechanismDoors.ts`, beside `legalTargets`, under the same heading: the one
rule shared by the solver and play. Call it `douseTorches`. It takes:

- the states, keyed however the caller keys them (mechanism ids in the walk, cell addresses in play);
- the torches, each as the key its state is filed under;
- a question: under these states, which torches stand in a covered region.

It returns the states with every torch that is `on` and covered set to `off`, and asks again until nothing
changes. The repeat is for chains: a torch may own a region gate, so dousing one can cover another's region.
It always ends, because it only ever turns torches off, and it is idempotent. It never turns a torch on and
never touches a mechanism that is not a torch.

### Where it runs

- **The lock walk** (`src/game/lockWalk.ts`). `LockSpec` gains `torches?: { mechanism: MechanismId; coveredBy: GateId[] }[]`: each torch mechanism and the gates whose shutting covers its region. `checkLockSpec` refuses
  a torch naming no mechanism, a mechanism without the states `off` and `on`, and a `coveredBy` gate that does
  not exist. The walk applies `douseTorches` to the start state and to every state `movesFrom` returns, after
  `entering`: a move, then the entries its arrival works, then the douse. `walkSpecOf` fills `torches` from
  the expansion it already builds (`expands`), and compiles a torch's one transition `off` to `on` at its
  region, whatever it starts in.
- **The floor's solver** (`src/game/floorLock.ts`, `src/game/floorLockWalk.ts`). `floorLock` fills `torches`
  from the floor: every mechanism record that is a torch, with the gates of the region-barrier doors on its
  home cell's region. `floorLockWalk` keeps each torch in the level it composes, as it keeps `emptyHands`; it
  walks through `reachableStates` and `walkLock`, so it douses wherever the lock walk does.
- **Play** (`src/app/SiteMap/useSiteNavigation.ts`, `src/app/state/useJourneys.ts`). Every write of a
  mechanism state (a lever thrown, a torch lit, a stone lifted or set down, a sequence tile stepped on, a fork
  board routed) goes through one helper that applies `douseTorches` to the floor's states after the move and
  writes the move and every douse together, in one journeys write of several states. A reload therefore never
  finds the water in without the torch out. Arriving on a floor applies the same douse to the states it reads
  and writes what changes, which is the walk's douse of its start state.

Arriving must write rather than only read. Take a torch that starts lit in a region covered at the start: read
without writing, it shows `off`, but its stored state is still absent, so once the water goes the read falls
back to its start and it is lit again with nobody having lit it. Written, it stays out until the player lights
it.

Play offers no light in a covered region, which the walk agrees with: there the move would be a step that
the douse undoes at once, and no player can stand in a covered region to make it. The player is never inside a
region as it is covered either, since the control that covers it may not stand in it.

## 3. Migration

### Telling a torch from a key

Today every activator is drawn by the torch family, because the activator kind has no other realisation, so
no binding tells a torch from a key. The lock's own words do: **an activator stays an activator where its
lock's header comment or its row in `lock-curriculum.md` names it as something taken (a key, gold, a prize);
every other activator is a torch.** By that rule:

| lock                           | ids        | becomes   | because                                               |
| ------------------------------ | ---------- | --------- | ----------------------------------------------------- |
| `lessons/torch.lock`           | T          | **torch** | "a torch, lit for good"                               |
| `lessons/doorWaitsForTwo.lock` | T1, T2     | **torch** | marks on a door, nothing taken                        |
| `relay.lock`                   | B, C       | **torch** | "the drop home opens only once the last torch is lit" |
| `stoneGate.lock`               | S1         | **torch** | nothing taken; its placements bind it to the torch    |
| `cellar.lock`                  | blue       | activator | "a cell that holds its own key"                       |
| `keyring.lock`                 | red, green | activator | "a key chain"                                         |
| `tide.lock`                    | K          | activator | "carry the key home"                                  |
| `sluice.lock`                  | gold       | activator | "drain the hall for the gold"                         |
| `observatory.lock`             | L, K       | activator | "two prizes"                                          |

In each torch row the keyword on the mechanic's line changes from `activator` to `torch` and nothing else
changes in the file: no id, no gate, no comment, no blank line. No migrated torch starts lit, so none gains
`lit`.

### Bindings

The torch kind's binding key is `torch`, and its realisation is the existing torch family, also named `torch`
(`TORCH_META`, topology mod): `realisations: { torch: "torch" }`. The same family keeps dressing the activator,
which stays exactly as it is.

- `src/worldGen/spec/dev.ts` (pyramid 12, stoneGate) and `src/worldGen/spec/expert.ts` (`expert_4`, the last
  pyramid, stoneGate): `activator: "torch"` becomes `torch: "torch"`. stoneGate holds no activator after the
  migration, so neither binding keeps an activator entry.
- `src/app/SiteMap/playgroundCarve.testing.ts`: `REALISATION_CHOICES` gains `torch: ["torch"]` and keeps
  `activator: ["torch"]`, so a key-activator lock still binds in the playground.
- Test fixtures that bind an activator for a made-up lock stay as they are; any that mean a torch move to the
  torch kind with their lock.

The comments that call the activator "the torch" are rewritten to say what holds now: the activator kind
(`src/game/mechanics/toggle.ts`), `src/game/lockAuthoring.ts`, `src/game/lockCompile.ts`,
`src/mods/topology/index.ts` ("the handle and torch dress a toggle, a torch and an activator"), and
`TORCH_META`'s own comment. The implementer finds the rest with `grep -rn activator src docs` and lists in the
PR description **every file the migration touches**.

### The bake

The world is re-baked. stoneGate on `expert_4` is the only placed floor with a migrated lock, so the bake
changes there and nowhere else: its spec carries `control: "torch"` and the `torch` binding, its torch record
says it is a torch, and the carve ledger's hashes for it are refreshed. The carve itself, its walls, nodes and
seed, is the same: the kind changes no seat and no space. Before the bake, capture the baked world; after it,
diff, and every floor but stoneGate's is byte-identical.

## 4. Save

**No migration and no backfill.** A mechanism's state is filed under `xmech:<mechanism id>` (`cellSlot.ts`),
which names neither the kind nor the family, and a torch's states are the activator's own, `off` and `on`. A
save that holds S1 lit holds `on` under the same address before and after.

Where it could matter, it does not reach a player: stoneGate's placement on `expert_4` is unreleased (it ships
in the same release as this), and pyramid 12 is a dev floor. And no migrated lock has a region barrier, so no
stored lit torch can stand in a covered region after the upgrade; the arrival douse would put one out if it
did, which is the rule, not a migration.

## 5. With the topology mod off

Control kinds are core and realisations are mods (`docs/mods/TARGET.md`). With the topology mod off the carve
is the same, with bare nodes and open corridors:

- A torch's room is a bare node, and a door only torches held stands open, as for any unrealised control.
- A region barrier is plain ground at its door, so **no region is ever covered** and the douse never fires.
- `douseTorches` still runs on every write and on arrival; on such a floor it finds no covered region and
  changes nothing, so the stored torch states are left exactly as they were, and turning the mod back on
  finds them there.

The torch and the region barriers are realised by the same mod, so a floor never has one realised and the
other bare; an unbound role is refused by name (`unboundRole`) as it is today.

## 6. Art and play

- **No new art.** A doused torch is a torch in `off` and draws as the unlit torch; its light around it goes
  out with it, since the torchlight reads the state. The cover over a region is already drawn by the region
  barrier.
- A covered region conceals what was explored in it (`mechanic-contract.md`, "Impassable regions"), so the
  player sees a doused torch once the water or sand has gone: unlit, offering to be lit, the way an unlit
  torch always does.
- A lit-start torch draws lit and offers nothing, as a lit torch does today.
- A door's face shows a torch term as it shows an activator's: a flame for `-[A]-`, wanting the torch out for
  `-[B:off]-`, each marked once its owner agrees.

## 7. Proof

- **No new walk refusal.** The existing walk proves a lock with torches: `unsolvable`, `strands` and the
  rest read the douse through the states it produces. A lock whose torch can be put out by a flood with no way
  to relight what the gate needs strands, and is refused as any strand is.
- **Catalogue sweep.** After the migration `yarn lock` walks the whole catalogue, lessons included. Any lock
  or lesson it now refuses is renamed `<name>-blocked.lock`, never edited beyond the keyword, and listed in the
  PR description. None is expected: the douse only acts where a region gate bars a torch's region, and no
  migrated lock has a region gate, while sluice, tide and waterMoves, which have them, keep their activators
  and their toggles. A lock renamed this way that a world spec places would fail the bake by name
  (`catalogueLock`), which is why it is listed.
- **Tests use made-up locks only**, never a catalogue lock's contents, and count work rather than time:
  - `douseTorches`: a lit torch in a covered region goes `off`; an unlit one, an uncovered one and a
    non-torch are untouched; a chain (a torch owning another torch's region gate) settles; a second call
    changes nothing.
  - the walk: the two-torch lock below is sound; the same lock without S and its region gate is `unsolvable`; a
    torch starting lit in a region covered at the start is `off` in the start state; an activator in a covered
    region keeps `on`.
  - the notation: `lit` reads as `starts: "on"`; any other trailing word is refused with the form; an
    activator line reads as before.
  - walk and play agree: the same sequence of moves on a carved made-up floor, made through `movesFrom` and
    through play's write helper, leaves the same torch states at every step.
  - play: throwing the lever that covers a lit torch writes the lever and the doused torch in one write; a
    reload reads both; uncovering offers the light; a lit-start torch in a region covered at the start is
    written `off` on arrival and stays `off` once uncovered until lit.
  - mod off: the carve is identical and no torch state is written.
- **The playground.** `src/app/SiteMap/LockPlayground.stories.tsx` gains a story with a made-up lock, the
  puzzle this design is for:

  ```
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
  ```

  B burns and A does not; the door wants the opposite. Throw S and the hall floods, putting B out; throw it
  back, light A, and the door opens. Lighting A first costs nothing: the flood puts both out. The
  story is checked by screenshots of the flooded hall and of the hall after the water goes, with B unlit.

## Done when

- [ ] `B torch @hall lit` and `A torch @hall` parse into torch mechanics; `LOCK_SYNTAX` carries the torch
      line and the activator line without the torch.
- [ ] The `torch` kind is registered in core, compiles to a control that says it is a torch, and its record's
      one move is `off` to `on` whatever it starts in.
- [ ] `douseTorches` stands in `mechanismDoors.ts` beside `legalTargets`, and the lock walk, `floorLock` and play
      all douse through it.
- [ ] The lock walk douses the start state and every state a move reaches, after the entries it works.
- [ ] Play writes a move and its douses in one write, and douses on arriving on a floor.
- [ ] An activator, and a floor key, are never doused.
- [ ] The four torch locks of the migration table carry `torch`, and nothing else in them changed; the world
      specs and the playground bind `torch: "torch"`; the PR lists every touched file.
- [ ] `yarn lock` passes the catalogue, with any refused file renamed `-blocked` and listed.
- [ ] The re-bake changes stoneGate's floor and no other; its walls are unchanged.
- [ ] With the topology mod off the carve is identical and nothing is doused.
- [ ] `mechanic-contract.md` and `lock-curriculum.md` say what this design says.
- [ ] The playground story plays the two-torch lock to the end, seen in screenshots.

## Not in scope

Putting a torch out by hand; a torch carried from its place; anything but a region barrier dousing a torch
(wind, a dropped stone); dousing an activator or a floor key; new art for a doused or smoking torch; placing a
torch-and-flood lock on a world floor. The changelog gains an entry with the first world floor that floods a
torch, since until then no player meets it.
