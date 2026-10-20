// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { use, useCallback, useEffect, useRef, useState, type SetStateAction } from "react"

// A made-up meeting and two made-up beats: one Fez speaks in, one the explorer carries alone.
const WRITTEN = new Set([
  "meeting.here.1.voice",
  "meeting.here.2.fez",
  "praise.1.fez",
  "musing.1.explorer",
  "chat.1.explorer",
  "chat.2.fez",
])

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { exists: (key: string) => WRITTEN.has(key) },
  }),
}))

const store: Record<string, unknown> = {}

vi.mock("@/support/useGameStorage", () => ({
  latestGameValue: (key: string) => store[key],
  useGameStorage: <T,>(key: string, initial: T) => {
    const [value, setValue] = useState<T>((store[key] as T) ?? initial)
    const first = useRef(initial)
    // Stable, as the real setter is: the companion's context is memoised on it.
    const set = useCallback(
      async (next: SetStateAction<T>) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)((store[key] as T) ?? first.current) : next
        store[key] = resolved
        setValue(resolved)
        return resolved
      },
      [key]
    )
    return [value, set, true]
  },
}))

const { FezCompanion } = await import("./FezCompanion")
const { FezContext } = await import("./context")
const { registerFezMeeting } = await import("./fezMeeting")

registerFezMeeting({ conversation: "meeting.here", journeyId: "here" })

const Ask = ({ id, story, onDone }: { id: string; story?: boolean; onDone: (r: string) => void }) => {
  const { showConversation } = use(FezContext)
  useEffect(() => showConversation(id, onDone, { story }), [id, story, onDone, showConversation])
  return null
}

const play = async (id: string, { story = false, progress = { levelNr: 1, completionCount: 0 } } = {}) => {
  const onDone = vi.fn()
  render(
    <FezCompanion journeyProgress={() => progress}>
      <Ask id={id} story={story} onDone={onDone} />
    </FezCompanion>
  )
  for (let i = 0; i < 10; i++) await act(async () => void vi.advanceTimersByTime(100))
  return onDone
}

const speakers = () => screen.queryAllByRole("img").map(img => img.getAttribute("alt") ?? "")
const heard = () => (store.conversations ?? {}) as Record<string, boolean>

beforeEach(() => {
  vi.useFakeTimers()
  for (const key of Object.keys(store)) delete store[key]
})
afterEach(() => vi.useRealTimers())

describe.each([
  ["on", true],
  ["off", false],
])("before the meeting, tutorials %s", (_, tutorialsEnabled) => {
  beforeEach(() => {
    store.tutorialsEnabled = tutorialsEnabled
  })

  it("drops a beat Fez speaks in, and leaves it unheard", async () => {
    const onDone = await play("praise", { story: true })

    expect(onDone).toHaveBeenCalledWith("unmet")
    expect(speakers()).toEqual([])
    expect(heard().praise).toBeUndefined()
  })

  it("drops a two-hander whole rather than leave the explorer talking to nobody", async () => {
    const onDone = await play("chat", { story: true })

    expect(onDone).toHaveBeenCalledWith("unmet")
    expect(speakers()).toEqual([])
  })

  it("lets the explorer speak alone", async () => {
    await play("musing", { story: true })

    expect(speakers().join()).toMatch(/explorer/i)
  })

  it("plays the meeting itself, Fez's lines and all", async () => {
    await play("meeting.here", { story: true })

    expect(speakers()).toEqual([])
    expect(screen.getByText("meeting.here.1.voice")).toBeTruthy()
  })
})

describe("a dropped beat asked for twice", () => {
  it("does not hold up what is asked after it", async () => {
    // Callers re-ask from effects, so the same beat can sit in the queue twice in a row.
    const onDone = vi.fn()
    render(
      <FezCompanion journeyProgress={() => ({ levelNr: 1, completionCount: 0 })}>
        <Ask id="praise" story onDone={onDone} />
        <Ask id="praise" story onDone={onDone} />
        <Ask id="musing" story onDone={onDone} />
      </FezCompanion>
    )
    for (let i = 0; i < 20; i++) await act(async () => void vi.advanceTimersByTime(100))

    expect(onDone.mock.calls.filter(([result]) => result === "unmet")).toHaveLength(2)
    expect(speakers().join()).toMatch(/explorer/i)
  })
})

describe("once Fez is met", () => {
  it("lets him speak after the meeting is heard", async () => {
    store.conversations = { "meeting.here": true }
    await play("praise", { story: true })

    expect(speakers().join()).toMatch(/lizard/i)
  })

  it("lets him speak in a save already past the meeting's pyramid", async () => {
    await play("praise", { story: true, progress: { levelNr: 2, completionCount: 0 } })

    expect(speakers().join()).toMatch(/lizard/i)
  })

  it("still keeps a tutorial quiet when tutorials are off", async () => {
    store.conversations = { "meeting.here": true }
    store.tutorialsEnabled = false
    const onDone = await play("praise")

    expect(onDone).toHaveBeenCalledWith("seen-earlier")
    expect(speakers()).toEqual([])
  })
})

describe("while someone is talking", () => {
  const Speaking = () => <p>{use(FezContext).speaking ? "speaking" : "quiet"}</p>

  it("says so, so a pointing hand can wait for the end of the conversation", async () => {
    const onDone = vi.fn()
    const { rerender } = render(
      <FezCompanion journeyProgress={() => ({ levelNr: 1, completionCount: 0 })}>
        <Speaking />
      </FezCompanion>
    )
    expect(screen.getByText("quiet")).toBeTruthy()

    rerender(
      <FezCompanion journeyProgress={() => ({ levelNr: 1, completionCount: 0 })}>
        <Speaking />
        <Ask id="musing" story onDone={onDone} />
      </FezCompanion>
    )
    for (let i = 0; i < 3; i++) await act(async () => void vi.advanceTimersByTime(100))

    expect(screen.getByText("speaking")).toBeTruthy()
  })
})
