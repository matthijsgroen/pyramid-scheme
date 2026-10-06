import { describe, expect, it } from "vitest"
import { AMBIENCES, STRUCTURAL, dressing } from "./faces.testing"

/**
 * The two invariants that keep the role/theme contract (a room's role dresses it, a theme is only the
 * hour) holding by construction (`docs/game-design/journeys.md`).
 *
 * Nothing else notices when one breaks. The world builds, every other gate passes, and a room quietly
 * draws its default in a pyramid that was authored to look like somewhere — which is the failure the whole
 * role/theme split exists to prevent, arriving silently.
 */

describe("what a family declares it can be", () => {
  it("has families to check at all (a silent empty sweep would prove nothing)", () => {
    expect(dressing.length).toBeGreaterThan(5)
  })

  it("answers for every role it claims, and claims every role it answers for", () => {
    // A tag with no entry is a family sitting in a pool it has never been asked to justify; an entry with
    // no tag is a face nothing can ever reach — which is exactly how `logistics -> causeway` survived.
    for (const family of dressing) {
      const claimed = family.tags.filter(tag => !STRUCTURAL.has(tag)).sort()
      const answered = Object.keys(family.faces ?? {}).sort()
      expect(answered, `${family.id} answers for roles it does not claim, or misses ones it does`).toEqual(claimed)
    }
  })

  it("never names an ambience where a place belongs", () => {
    // `night` is an hour. It layers onto whichever place the role picked (`app/faceFor.ts`) and has no
    // business in a role map.
    for (const family of dressing)
      for (const [role, faces] of Object.entries(family.faces ?? {})) {
        expect(AMBIENCES.has(role), `${family.id} maps the ambience ${role} as a role`).toBe(false)
        for (const face of faces)
          expect(AMBIENCES.has(face), `${family.id} gives ${role} the ambience ${face} as a face`).toBe(false)
      }
  })

  it("offers at least one face for every role it answers", () => {
    for (const family of dressing)
      for (const [role, faces] of Object.entries(family.faces ?? {}))
        expect(faces.length, `${family.id} answers ${role} with nothing`).toBeGreaterThan(0)
  })
})
