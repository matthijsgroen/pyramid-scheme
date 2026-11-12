// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { listenForPageLayers } from "@/app/input/pageLayers"
import { ShopPanel } from "./ShopPanel"

let stopListening = () => {}
beforeEach(() => {
  stopListening = listenForPageLayers()
})
afterEach(() => stopListening())

describe("ShopPanel", () => {
  it("is left with Escape, the same as its leave button", () => {
    const onDismiss = vi.fn()
    render(
      <ShopPanel
        isOpen
        title="Made-up shop"
        balance={3}
        balanceLabel="Coins"
        dismissLabel="Leave"
        onDismiss={onDismiss}
      >
        <button>Buy</button>
      </ShopPanel>
    )
    fireEvent.keyDown(screen.getByText("Buy"), { code: "Escape" })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
