import { describe, expect, it } from "vitest"
import { prefabFaults } from "./prefabChecks"
import { ROOM_CATALOGUE, ROOM_ENTRIES } from "./roomCatalogue"

// EVERY DESIGNED ROOM PASSES ITS OWN CHECK (prefabChecks.ts): in every variant and fill the doors stay joined and
// the stop and every blocking special reachable.
describe("the room catalogue", () => {
  it("parses every room file", () => {
    expect(Object.keys(ROOM_CATALOGUE).sort()).toEqual(ROOM_ENTRIES.map(entry => entry.name).sort())
  })

  it.each(ROOM_ENTRIES.map(entry => [`${entry.tier}/${entry.path}`, entry.name]))("%s has no fault", (_, name) => {
    expect(prefabFaults(ROOM_CATALOGUE[name])).toEqual([])
  })
})
