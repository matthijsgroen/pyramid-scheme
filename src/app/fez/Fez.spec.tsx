// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"

// A two-hander whose FIRST line is the explorer's — the case the portrait got wrong.
const WRITTEN = new Set([
  "arrival.starter_1.1.explorer",
  "arrival.starter_1.2.fez",
  "excited.1.fez",
  "calm.1.fez",
  "undrawn.1.ipi",
  "worried.1.fez",
  "pointWorried.1.fez",
  "faceless.1.ipi",
])

// Made-up lines, so no authored expression is pinned here.
vi.mock("./storyPoses", () => ({
  storyExpression: (key: string) =>
    (
      ({
        "excited.1.fez": { pose: "pointUp" },
        "undrawn.1.ipi": { pose: "pointUp" },
        "worried.1.fez": { pose: "default", face: "worried" },
        "pointWorried.1.fez": { pose: "pointUp", face: "worried" },
        "faceless.1.ipi": { pose: "default", face: "worried" },
      }) as Record<string, { pose: string; face?: string }>
    )[key] ?? { pose: "default" },
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { exists: (key: string) => WRITTEN.has(key) },
  }),
}))

const { Fez } = await import("./Fez")

describe("who slides in", () => {
  it("is whoever speaks first, before any line is showing", () => {
    // The portrait animates in ahead of the first bubble. Reading the line at index 0 fell off the
    // start of the list and defaulted to Fez, so he appeared with an empty bubble and vanished as
    // the explorer arrived on the other side of the screen.
    render(<Fez conversation="arrival.starter_1" onComplete={() => {}} />)

    expect(screen.getByRole("img").getAttribute("alt")).toMatch(/explorer/i)
  })

  it("says nothing until there is something to say", () => {
    render(<Fez conversation="arrival.starter_1" onComplete={() => {}} />)

    // The bubble exists for the animation but is transparent until a line is current.
    expect(document.querySelector(".opacity-0")).toBeTruthy()
  })
})

describe("facing", () => {
  it("mirrors the explorer on the right, so he faces the speaker on the left", () => {
    render(<Fez conversation="arrival.starter_1" onComplete={() => {}} />)

    expect(screen.getByRole("img").parentElement?.classList).toContain("-scale-x-100")
  })

  it("draws Fez as painted, already facing right from the left side", () => {
    render(<Fez conversation="levelCompleted" onComplete={() => {}} />)

    expect(screen.getByRole("img").parentElement?.classList).not.toContain("-scale-x-100")
  })

  it("swaps in a new portrait when the speaker changes, so the mirroring never animates", () => {
    vi.useFakeTimers()
    const { container } = render(<Fez conversation="arrival.starter_1" onComplete={() => {}} />)
    for (let i = 0; i < 20; i++) act(() => void vi.advanceTimersByTime(100))
    const explorer = screen.getByRole("img")

    fireEvent.click(container.firstElementChild as HTMLElement)
    for (let i = 0; i < 20; i++) act(() => void vi.advanceTimersByTime(100))
    vi.useRealTimers()

    expect(screen.getByRole("img").getAttribute("alt")).not.toMatch(/explorer/i)
    expect(explorer.isConnected).toBe(false)
  })
})

describe("where the conversation stands", () => {
  it.each(["arrival.starter_1", "levelCompleted"])(
    "puts %s in the centred column the game's panels share, not in the screen's corners",
    conversation => {
      render(<Fez conversation={conversation} onComplete={() => {}} />)

      const column = screen.getByRole("img").closest(".max-w-md")
      expect(column?.classList).toContain("mx-auto")
    }
  )
})

describe("a story line's expression", () => {
  const portrait = (conversation: string) => {
    render(<Fez conversation={conversation} onComplete={() => {}} />)
    return screen.getByRole("img").getAttribute("src") ?? ""
  }

  it("draws the pose the line asks for", () => {
    expect(portrait("excited")).toMatch(/fez-pose-point/)
  })

  it("draws the default for a line that asks for none", () => {
    expect(portrait("calm")).toMatch(/\/fez-250/)
  })

  it("falls back to the speaker's default when nobody has drawn that pose for them", () => {
    expect(portrait("undrawn")).toMatch(/ghost-ipi/)
  })
})

describe("a face over the pose", () => {
  const drawn = (conversation: string) => {
    render(<Fez conversation={conversation} onComplete={() => {}} />)
    const figure = screen.getByRole("img")
    return { figure, face: figure.parentElement?.querySelector<HTMLImageElement>("img[data-face]") }
  }

  it("is laid in the same box as the figure, so every transform moves both", () => {
    const { figure, face } = drawn("worried")

    expect(figure.getAttribute("src")).toMatch(/\/fez-250/)
    expect(face?.getAttribute("src")).toMatch(/fez-face-worried/)
    expect(face?.parentElement).toBe(figure.parentElement)
    expect(face?.classList).toContain("inset-0")
  })

  it("sits on a stacking pose as well as the default", () => {
    const { figure, face } = drawn("pointWorried")

    expect(figure.getAttribute("src")).toMatch(/fez-pose-point/)
    expect(face?.getAttribute("src")).toMatch(/fez-face-worried/)
  })

  it("is left off for a speaker nobody has painted it for", () => {
    expect(drawn("faceless").face).toBeNull()
  })

  it("is absent on a line that asks for none", () => {
    expect(drawn("calm").face).toBeNull()
  })
})
