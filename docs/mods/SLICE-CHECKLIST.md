# Slice checklist

Copy this per mod. A slice is a single mod taken fully to the target shape
(`TARGET.md`). Do each step as its own commit — do not let scope grow
un-landed (that was the failure mode being corrected).

The exit criterion is the **toggle-off proof**, not a green suite. A passing
test suite only proves output is unchanged; it does not prove the boundary is
real.

## Steps

- [ ] **1. DSL authoring.** Move every placement site this mod needs into the
      world DSL as authored slots. Delete any auto-distributor / target-chasing
      generator for this mod (`computeMosaicPaths`, `emit<X>` capability flags,
      auto-carve loops). Core must no longer hold a per-mod target number.
- [ ] **2. Generic placement.** Core's placement pass fills the authored slots
      by reading the *registered* currency — no hardcoded mod id in core. Hard-
      fail the build if capped demand > authored slots, with a message naming
      the shortfall so the author knows to add DSL slots.
- [ ] **3. Descriptor.** `src/mods/<name>/index.ts` exports the mod descriptor
      with only the fields this mod uses. Add it to `registeredMods`. Add any
      new descriptor field here (not before a mod needs it).
- [ ] **4. File moves + state.** Move the mod's game/app code under
      `src/mods/<name>/`. Extract mod-specific runtime state into a
      `use<Name>Progress` hook backed by `useModState`; remove those fields
      from the shared `ProgressionState`/`ProgressionAPI`. (Ledger-backed
      counts stay in the ledger — no extraction needed.)
- [ ] **5. TOGGLE-OFF PROOF (the gate).** Remove the mod from `registeredMods`.
      Then:
      - [ ] `yarn generate-world` succeeds — that currency's authored slots
            fall through to filler, other currencies' counts unchanged.
      - [ ] The app builds and runs without the mod's screen/components.
      - [ ] `grep -rn "<modId>\|<CurrencyId>\|<familyIds>" src/core src/worldGen`
            (whatever is still core) returns nothing. Core does not name the mod.
      - Re-add the mod when the proof passes. The removal is the *test*, not
            the shipped state.

## Anti-patterns that fail the slice

- Marking done because `yarn test` / count assertions pass. Output-preservation
  is not the gate.
- Core keeping a mod-specific number "for now" (a `WORLD_TARGETS.<x>Rewards`,
  an `emit<X>` flag). Rule 2 says delete it, don't defer it.
- A generator inventing side-paths/topology to hit a target. Author it in the
  DSL; hard-fail if authored supply is short.
- Growing descriptor fields for mods that don't exist yet.
