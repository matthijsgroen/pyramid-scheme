// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { parseLock } from "@/game/lockNotation"
import { walkFloorLock } from "@/game/floorLockWalk"
import { PLAYGROUND_JOURNEY, carvePlayground, defaultBinding, playgroundFloor } from "./lockPlayground"
import { assemblePlayedFloor } from "./useAssembledFloor"
import { LockPlayground } from "./lockPlayground.testing"
import "@/mods/registerModApps"

// jsdom has no layout, so the map's scroll-to-explorer has nothing to call.
beforeAll(() => {
  Element.prototype.scrollTo = () => {}
})

afterEach(cleanup)

const LEVER = "in -[L]- out\nL toggle @in\nin *\nout *"

describe("the playground's floor", () => {
  it("frees every region and binds the realisations it is given", () => {
    const config = playgroundFloor(parseLock(LEVER, "lever").lock, { toggle: "handle" })
    const lock = config.locks![0].lock
    expect(Object.values(lock.regions)).toEqual([{ takes: "free" }, { takes: "free" }])
    expect(config.realisations).toEqual({ toggle: "handle" })
    expect(config.pathPuzzles).toBe(0)
  })

  it("carves a floor whose lock walks sound, the same grid every time it is carved at that seed", () => {
    const config = playgroundFloor(parseLock(LEVER, "lever").lock, defaultBinding())
    const carved = carvePlayground(config)
    if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
    expect(walkFloorLock(carved.grid)?.sound).toBe(true)
    const again = assemblePlayedFloor(PLAYGROUND_JOURNEY, config, carved.seed, 0)
    expect(again.success && again.grid).toEqual(carved.grid)
    expect(carvePlayground(config)).toEqual(carved)
  })
})

describe("LockPlayground", () => {
  it("lists every lock it is given and draws the first one's floor", async () => {
    const { container } = render(<LockPlayground locks={{ lever: LEVER, second: LEVER }} />)
    expect(screen.getByRole("option", { name: "lever" })).toBeTruthy()
    expect(screen.getByRole("option", { name: "second" })).toBeTruthy()
    await waitFor(() => expect(container.querySelector("[data-explorer]")).not.toBeNull())
  })

  it("says why a lock does not parse instead of drawing a floor", () => {
    const { container } = render(<LockPlayground locks={{ broken: "in -[L]- out\nL lever @nowhere" }} />)
    expect(container.querySelector("[data-playground-refused]")?.textContent).toMatch(/line/)
    expect(container.querySelector("[data-explorer]")).toBeNull()
  })
})
