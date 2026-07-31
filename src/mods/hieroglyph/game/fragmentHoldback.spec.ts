import { describe, it, expect } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { TOMB_SYMBOLS } from "@/data/tableaus"
import { HIEROGLYPH_CURRENCY } from "./hieroglyphCurrency"
import type { SiteConfig } from "@/worldGen/types"

// Invariant guard for the "turn hieroglyph collection into a hunt" fix: a hieroglyph first
// needed on its tier's tomb's 2nd+ tableau run (a non-empty `preferredWardKeys`, see
// hieroglyphCurrency.ts's preferredWardKeysFor) must have at least one of its fragments sitting
// behind one of those keys — so it can never complete purely from the open pre-tomb pyramids,
// only once the player has actually descended into that tier's own tomb.
//
// Also guards the key-diversity property from the ward-slot-cap fix: no two of one hieroglyph's
// gated fragments may sit behind the IDENTICAL ward key (that's what "one per distinct key" means
// — each held-back copy requires a different point of tomb progress, not the same gate twice).
//
// A symbol first needed on tableau run 1 (empty `preferredWardKeys`) has NO such guarantee here —
// it's only forbidden from PREFERRING a gated slot, not from ever landing in one: once its own
// tier's own tomb-key is harvested (which can happen mid-pass, before this bucket's full demand is
// satisfied), a run-1 symbol's surplus fragments may legitimately land in a now-reachable gated
// slot too. Solvability itself (this can never soft-lock the room a run-1 symbol needs to open) is
// already a separate, stronger guarantee enforced by placeFragments.ts's own winnability sweep and
// covered by reachability.spec.ts/validate.spec.ts — not re-asserted here.

// Every wardKeyId gating a section, including any it inherits from an enclosing gated section
// (mirrors slots.ts's own wardKeys accumulation for nested sideSections).
const gatedKeysOf = (
  section: { gate?: { type: string; wardKeyId?: string }; endReward?: { type: string; hieroglyphId?: string } },
  inherited: string[]
): string[] =>
  section.gate?.type === "tomb-key" && section.gate.wardKeyId ? [...inherited, section.gate.wardKeyId] : inherited

type Section = {
  gate?: { type: string; wardKeyId?: string }
  endReward?: { type: string; hieroglyphId?: string }
  sideSections?: Section[]
}

const gatedKeysByHieroglyph = (configs: Record<string, SiteConfig[]>): Record<string, string[][]> => {
  const result: Record<string, string[][]> = {}
  const visit = (section: Section, inherited: string[]) => {
    const gateKeys = gatedKeysOf(section, inherited)
    if (section.endReward?.type === "hieroglyphFragment") {
      const id = section.endReward.hieroglyphId as string
      ;(result[id] ??= []).push(gateKeys)
    }
    for (const sub of section.sideSections ?? []) visit(sub, gateKeys)
  }
  for (const siteConfigs of Object.values(configs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        for (const s of floor.sideSections) visit(s, [])
      }
    }
  }
  return result
}

describe("hieroglyph holdback (over the generated world)", () => {
  const gatedByHieroglyph = gatedKeysByHieroglyph(generatedWorldConfigs)

  for (const ids of Object.values(TOMB_SYMBOLS)) {
    for (const id of ids) {
      const demand = HIEROGLYPH_CURRENCY.demandFor(`hieroglyph:${id}`, generatedWorldConfigs)
      if (demand.preferredWardKeys.length === 0) continue
      const fragmentGateKeys = gatedByHieroglyph[id] ?? []

      it(`${id} has at least one fragment behind one of its own preferred ward keys`, () => {
        const ownGatedKeys = fragmentGateKeys.flatMap(keys => keys.filter(k => demand.preferredWardKeys.includes(k)))
        expect(
          ownGatedKeys.length,
          `${id} prefers ${demand.preferredWardKeys.join(",")} but none gate a fragment`
        ).toBeGreaterThanOrEqual(1)
      })

      it(`${id}'s gated fragments never share the identical ward key`, () => {
        const ownGatedKeys = fragmentGateKeys.flatMap(keys => keys.filter(k => demand.preferredWardKeys.includes(k)))
        expect(new Set(ownGatedKeys).size).toBe(ownGatedKeys.length)
      })
    }
  }

  // The concrete case the player originally reported: starter's two tableau-run-1 symbols
  // (Merchant/p10, Ankh/art1) must stay fully open — the tomb's own first tableau room needs them
  // to be reachable pre-tomb, so gating them would be a lockout bug, not a hunt.
  for (const id of ["p10", "art1"]) {
    it(`${id} (starter's tableau-run-1 symbol) has no gated fragments`, () => {
      const gatedCount = (gatedByHieroglyph[id] ?? []).filter(keys => keys.length > 0).length
      expect(gatedCount).toBe(0)
    })
  }
})
