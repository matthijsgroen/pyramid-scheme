import { describe, expect, it } from "vitest"
import { prefabFaults } from "./prefabChecks"
import { roomCatalogue, roomEntries } from "./roomCatalogue"

// EVERY DESIGNED ROOM PASSES ITS OWN CHECK (prefabChecks.ts): in every variant and fill the doors stay joined and
// the stop and every blocking special reachable.
describe("the room catalogue", () => {
  it("parses every room file", () => {
    expect(Object.keys(roomCatalogue()).sort()).toEqual(
      roomEntries()
        .map(entry => entry.name)
        .sort()
    )
  })

  it.each(roomEntries().map(entry => [`${entry.tier}/${entry.path}`, entry.name]))("%s has no fault", (_, name) => {
    expect(prefabFaults(roomCatalogue()[name])).toEqual([])
  })
})
