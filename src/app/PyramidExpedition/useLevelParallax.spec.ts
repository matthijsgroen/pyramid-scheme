import { renderHook, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useLevelParallax } from "./useLevelParallax"

// The hook writes transforms straight onto the DOM nodes, so the spec gives it real elements and
// reads the style back — the same surface the player sees.
const mount = (startNextLevel: boolean) => {
  const container = document.createElement("div")
  const current = document.createElement("div")
  const next = document.createElement("div")
  const future = document.createElement("div")
  document.body.append(container)

  const hook = renderHook(({ transitioning }) => useLevelParallax(transitioning), {
    initialProps: { transitioning: startNextLevel },
  })
  act(() => {
    hook.result.current.scrollContainerRef.current = container
    hook.result.current.currentLevelRef.current = current
    hook.result.current.nextLevelRef.current = next
    hook.result.current.futureLevelRef.current = future
  })
  // Re-run the effect now that the refs point at real nodes.
  hook.rerender({ transitioning: !startNextLevel })
  hook.rerender({ transitioning: startNextLevel })

  const scrollTo = (left: number, top: number) => {
    container.scrollLeft = left
    container.scrollTop = top
    act(() => void container.dispatchEvent(new Event("scroll")))
  }
  return { current, next, future, scrollTo }
}

describe("useLevelParallax", () => {
  it("drifts the boards at different rates, so the pyramids ahead read as further away", () => {
    const { current, next, future, scrollTo } = mount(false)

    scrollTo(100, 0)

    // Nearest board resists the scroll, the ones behind it follow at increasing fractions.
    expect(current.style.transform).toContain("translate(-10px, 0px)")
    expect(next.style.transform).toContain("translate(50px, 0px)")
    expect(future.style.transform).toContain("translate(25px, 0px)")
  })

  it("hands the transforms over to the level transition while one is running", () => {
    const { current, next, scrollTo } = mount(true)

    scrollTo(100, 0)

    // No scroll offset at all: the transition owns these transforms mid-flight.
    expect(current.style.transform).toBe("translateX(-200%) scale(3)")
    expect(next.style.transform).toBe("translateX(0) scale(1)")
  })

  it("places the boards without waiting for the player to scroll", () => {
    const { current } = mount(false)

    expect(current.style.transform).toContain("scale(1)")
  })
})
