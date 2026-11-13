// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { listenForPageLayers } from "@/app/input/pageLayers"
import { press } from "@/app/input/controlsInARow.testing"
import { LootPopup } from "./LootPopup"

let stop = () => {}
beforeEach(() => {
  vi.useFakeTimers()
  stop = listenForPageLayers()
})
afterEach(() => {
  cleanup()
  stop()
  vi.useRealTimers()
})

const popup = (onDismiss: () => void) =>
  render(
    <LootPopup
      isOpen
      itemName="Made-up scarab"
      itemComponent={<span>🪲</span>}
      onDismiss={onDismiss}
      youFoundLabel="You found"
      clickToContinueLabel="Continue"
    />
  )

describe("LootPopup by keys", () => {
  it("focuses its way on once shown, and Escape takes it", () => {
    const onDismiss = vi.fn()
    popup(onDismiss)
    act(() => vi.advanceTimersByTime(800))
    expect(document.activeElement).toBe(screen.getByText("Continue"))
    press("Escape")
    act(() => vi.advanceTimersByTime(200))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
