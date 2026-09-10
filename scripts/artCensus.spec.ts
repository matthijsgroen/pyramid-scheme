import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * The census cannot import `tileAssets.ts` — that module pulls in the app's PNG imports, which tsx
 * cannot resolve — so it keeps its own copy of the five kinds a patron can dress. A copied list drifts,
 * and a census counting against a stale copy is precisely the failure the census exists to prevent:
 * it would keep reporting complete while a kind nobody had counted went unpainted. That is not
 * hypothetical here. `PATRONS` itself grew from seven gods to nine because two journeys named Thoth and
 * Osiris and the design's original list did not have them.
 *
 * Both lists are read out of the SOURCE rather than imported, for the same PNG reason.
 */
const sourceOf = (path: string) => readFileSync(join(__dirname, "..", path), "utf8")

const setLiteral = (source: string, after: string): string[] => {
  const at = source.indexOf(after)
  if (at < 0) throw new Error(`"${after}" is no longer in the source — the census's copy cannot be checked`)
  const open = source.indexOf("[", at)
  const close = source.indexOf("]", open)
  return [...source.slice(open + 1, close).matchAll(/"([^"]+)"/g)].map(m => m[1]).sort()
}

describe("art-census's copy of the patron kinds", () => {
  it("matches the set the resolver actually reads", () => {
    const census = setLiteral(sourceOf("scripts/artCensus.ts"), "const PATRON_KINDS")
    const resolver = setLiteral(sourceOf("src/app/SiteMap/tileAssets.ts"), "const PATRON_KINDS")
    expect(census).toEqual(resolver)
    expect(census.length).toBeGreaterThan(0)
  })
})
