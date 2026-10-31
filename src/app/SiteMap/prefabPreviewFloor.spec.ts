import { describe, expect, it } from "vitest"
import { madeUpPrefab } from "./floorFixtures.testing"
import { prefabChoices, prefabPreviewFloor } from "./prefabPreviewFloor"

const roomAt = (preview: ReturnType<typeof prefabPreviewFloor>) => {
  const cell = preview.grid.cells[preview.node[0]][preview.node[1]]
  if (cell.type === "empty" || !cell.prefabRoom) throw new Error("no prefab room at the node")
  return cell.prefabRoom
}

// Doors west and east in one row and two on the north wall: the node takes the first column, the other north door is left walled.
const HALL = madeUpPrefab(`room hall
mirror
layout
# d # # # d #
# . . . . . #
d . p . s . d
# . . . . . #
# # # # # # #
p floor pillar
s stop`)

const STORE = madeUpPrefab(`room store
layout
# # # # # # # # #
d . . . . . . . d
# g . g . g . g #
# . . . s . . . #
# # # # # # # # #
gift = jarRack | basin
g floor gift 3 of 4
s stop`)

describe("prefabPreviewFloor", () => {
  it("joins four doors from a node in the middle of a wide room", () => {
    const cross = madeUpPrefab(`room cross
layout
# # # # # d # # # # #
# . . . . . . . . . #
# . . . . . . . . . #
d . . . . . . . . . d
# . . . . s . . . . #
# . . . . . . . . . #
# # # # # d # # # # #
s stop`)
    const preview = prefabPreviewFloor(cross)
    expect(Object.keys(preview.doors).sort()).toEqual(["e", "n", "s", "w"])
    expect(preview.unusedDoors).toBe(0)
  })

  it("joins every door place a straight arm reaches and walls the rest", () => {
    const preview = prefabPreviewFloor(HALL)
    expect(Object.keys(preview.doors).sort()).toEqual(["e", "n", "w"])
    expect(preview.unusedDoors).toBe(1)
    expect(roomAt(preview).blocked).toContain(`${roomAt(preview).rect.top - 1},${roomAt(preview).rect.left + 4}`)
  })

  it("gives a cell outside each door that the walk can start from", () => {
    const preview = prefabPreviewFloor(HALL)
    const west = preview.doors.w!
    const cell = preview.grid.cells[west[0]][west[1]]
    expect(cell.type).toBe("corridor")
    expect(roomAt(preview).doors).toContainEqual([west[0], west[1] + 1])
  })

  it("lays the mirrored variant the other way round", () => {
    const plain = roomAt(prefabPreviewFloor(HALL, 0))
    const mirror = roomAt(prefabPreviewFloor(HALL, 1))
    expect([plain.mirrored, mirror.mirrored]).toEqual([false, true])
    const col = (room: typeof plain) => room.stop[1] - room.rect.left
    expect(col(mirror)).toBe(plain.rect.cols - 1 - col(plain))
  })

  it("takes the fill by index, three of four gifts in each", () => {
    const fills = prefabChoices(STORE, 0).fills
    expect(fills).toBeGreaterThan(1)
    const standing = Array.from({ length: fills }, (_, k) =>
      roomAt(prefabPreviewFloor(STORE, 0, k))
        .objects.map(o => `${o.top},${o.left}`)
        .sort()
        .join("|")
    )
    expect(new Set(standing).size).toBeGreaterThan(1)
    for (const k of [0, 1]) expect(roomAt(prefabPreviewFloor(STORE, 0, k)).objects).toHaveLength(3)
  })

  it("counts the variants and the fills of the chosen one", () => {
    expect(prefabChoices(HALL, 0).variants).toBe(2)
    expect(prefabChoices(HALL, 0).fills).toBe(1)
  })
})
