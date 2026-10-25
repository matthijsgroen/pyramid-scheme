// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import type { NewChapterScreenProps } from "./NewChapterScreen"
import { NewChapterScreen } from "./NewChapterScreen"

afterEach(cleanup)

const props: NewChapterScreenProps = {
  title: "A new pyramid",
  subtitle: "New chapter",
  body: "Made-up text",
  journeyName: "Made-up valley",
  journeyNote: "First one",
  setOffLabel: "Set off",
  closeLabel: "Later",
  onClose: () => {},
}
const chapter = (extra: Partial<NewChapterScreenProps> = {}) => render(<NewChapterScreen {...props} {...extra} />)

describe("NewChapterScreen", () => {
  it("set off and close call their handlers", () => {
    const onSetOff = vi.fn()
    const onClose = vi.fn()
    chapter({ onSetOff, onClose })
    fireEvent.click(screen.getByText("Set off"))
    fireEvent.click(screen.getByText("Later"))
    expect(onSetOff).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("without a journey there is no set off button", () => {
    chapter({ journeyName: undefined })
    expect(screen.queryByText("Set off")).toBeNull()
    expect(screen.getByText("Later")).toBeTruthy()
  })
})
