import { describe, expect, it } from "vitest"
import { floorLock } from "@/game/floorLock"
import { walkLock } from "@/game/lockWalk"
import { walkSpecOf } from "@/game/lockWalkSpec"
import { parseLock } from "@/game/lockNotation"
import { carvePlayground, defaultBinding, playgroundFloor } from "./playgroundCarve"
import "@/mods/registerModApps"

const verdicts = (text: string) => {
  const { lock } = parseLock(text)
  const found = carvePlayground(playgroundFloor(lock, defaultBinding()))
  if (!found.found) throw new Error(JSON.stringify(found.reasons))
  return { lock: walkLock(walkSpecOf(lock)).sound, floor: walkLock(floorLock(found.grid)!).sound }
}

describe("a sequence carved on the playground walks to the same verdict on the floor as in the lock", () => {
  it("sound, where each tile is walked to in its turn", () => {
    expect(verdicts("in -- a\nin -- b\nin -[P]- out\nP sequence a b reset in-out\nin ?\na ?\nb ?\nout ?")).toEqual({
      lock: true,
      floor: true,
    })
  })

  it("refused, where the way to the first tile crosses the second", () => {
    expect(
      verdicts("in -- mid\nmid -- far\nin -[P]- out\nP sequence far mid reset in-out\nin ?\nmid ?\nfar ?\nout ?")
    ).toEqual({ lock: false, floor: false })
  })
})
