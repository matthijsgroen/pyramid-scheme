import { describe, expect, it } from "vitest"
import { modScreens, registerModScreen } from "./screenRegistry"

const Screen = () => null
const Replacement = () => null

describe("screenRegistry", () => {
  // A mod registers its screen as a module side effect, so a hot reload (or a module reached through
  // two paths) evaluates that registration again. Appending gave two screens with one id, which React
  // reports as "two children with the same key, mosaic".
  it("keeps one screen per id, and takes the newest component for it", () => {
    registerModScreen({ id: "test-screen", Component: Screen })
    registerModScreen({ id: "test-screen", Component: Replacement })

    const mine = modScreens().filter(({ id }) => id === "test-screen")

    expect(mine).toHaveLength(1)
    expect(mine[0].Component).toBe(Replacement)
  })
})
