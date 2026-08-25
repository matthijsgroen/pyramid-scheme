import type { FamilyMeta } from "@/game/families/familyMeta"

export const CROCODILE_META: FamilyMeta = {
  id: "crocodile",
  // Trap-owned because a bite spends health, and health is trap state. A puzzle-mod family reaching
  // into `useTrapProgress` would couple two mods that are meant to toggle apart.
  ownerMod: "trap",
  // Its own "capstone" role — a main-path finale, never drawn into the general "tomb-puzzle" pool
  // alongside tableau. A tomb floor's last room is authored with the "capstone" role.
  //
  // Deliberately NOT tagged "trap": placeEncounters turns a trap-tagged encounter into
  // `section.sealed = true`, a STRUCTURAL field, so the tag would reshape the corridors of every
  // tomb floor that authors a capstone (world-spec-stability.md). The mod it belongs to is what
  // gives it health — the tag is not.
  tags: ["capstone"],
  minTier: "junior", // starter tombs author no capstone at all
  icon: "🐊",
  color: "green",
  rewardPriority: 0, // the tomb's treasure follows directly after — that's its payoff, not this pool
  // No `seedable`: the seed lists exist for generators that are expensive to run on a phone, and this
  // one draws a handful of formulas and walks a sorted pool (crocodile.md §3). It builds live on every
  // open, as every family did before there were lists — an artifact bucket would cost a build step to
  // save a millisecond. `gradeCrossing` is still the acceptance gate, it is just applied where the
  // board is built rather than offline.
}
