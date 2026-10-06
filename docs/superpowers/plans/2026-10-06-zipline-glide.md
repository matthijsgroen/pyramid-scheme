# Zipline Glide — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** taking a zipline plays a ride. The explorer's riding sprite slides from the launch to the landing,
and the player lands when the slide ends. It can be watched and tuned in Storybook.

**Architecture:** `useSiteNavigation.takeSpan` already hides the explorer, awaits `playTraversal(traversal)`
and then lands them (`src/app/SiteMap/useSiteNavigation.ts:131-151`). This plan fills that seam:
- A hook, `useZiplineRide`, turns `playTraversal` into React state: the ride in progress, and the promise
  to settle when it ends.
- A component, `ZiplineRider`, draws the riding sprite in the map's explorer layer and slides it by a CSS
  transition from the launch cell's centre to the landing's. `transitionend` settles the promise.
- `SiteMapScreen` wires the hook into navigation and the view.

Other obstacle kinds, a facing with no riding art, and `prefers-reduced-motion` all cross at once, as today.

**Tech Stack:** React, CSS transitions, Vitest with Testing Library (jsdom), Storybook.

**Spec:** `docs/superpowers/specs/2026-10-04-zipline-ride-acceptance.md` ("The ride" criteria).
**Roadmap:** `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md`, phase 7.

## Global Constraints

- **Sprite per direction:** `s` uses `explorer-zip-s`, `n` uses `explorer-zip-n`, `e` uses `explorer-zip-e`,
  and `w` uses `explorer-zip-e` mirrored with `scale(-1, 1)`. Look them up with
  `sharedTileFrames(prefix)[0]` (`src/app/SiteMap/tileAssets.ts:128`).
- **Timing:** the promise settles when the slide ends (`transitionend`). Nothing else holds a duration
  except one speed knob, `RIDE_MS_PER_CELL`.
- **Crossing at once:** under `prefers-reduced-motion: reduce`, for a kind other than `zipline`, or for a
  facing with no riding art, the crossing is instant (`Promise.resolve()`).
- **Count work, never wall-clock** in tests: fire `transitionend` by hand and assert the order of events.
- **Do not edit** `src/app/SiteMap/Zipline.stories.tsx` or `src/app/SiteMap/floorFixtures.testing.ts`.
  PR #315 changes both. The ride gets its own story file; reading from `floorFixtures` is fine.
- **Comments state the current rule and why**, never history.
- **Commits:** one short line, then a blank line, then:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW`.

## Review Focus

1. **The player taps elsewhere mid-ride.** `onCellClick` already ignores taps while `traversing.current`
   is set. The ride must not break that: keep the ride inside `playTraversal`.
2. **The floor changes or the screen unmounts mid-ride.** A dangling promise must not leave the explorer
   hidden for ever. On unmount, the rider settles the promise (task 2).
3. **`transitionend` never fires**, for example when the start and end positions are equal, or the tab is
   hidden. Add a fallback timer of (expected duration + 250ms) that settles the promise once. Tested in
   task 1 by advancing fake timers, not by measuring.
4. **The riding sprite's anchor:** it hangs from the handle. Each pose's opaque top sits at y = 7, 6 and 0
   of 140 (s, n, e). The rider is drawn `HANG` units above the walking figure's foot line, and `HANG` is a
   knob tuned in the story. The spec's top-anchoring criterion is met by drawing the sprite box's top at
   the cable line, not its feet.
5. **West mirroring:** the transform mirrors the sprite only, never the light pool. That is the same rule
   `ExplorerFigure` follows (`ExplorerDot.tsx`, around the clip `div`).

---

### Task 1: `useZiplineRide`, the ride as state

**Files:**
- Create: `src/app/SiteMap/useZiplineRide.ts`
- Create: `src/app/SiteMap/useZiplineRide.spec.ts`

**Interfaces:**
- Produces:

```ts
export type Ride = { traversal: Traversal; sprite: string; mirrored: boolean; ms: number; end: () => void }
export const RIDE_MS_PER_CELL = 90
/** `ride` is the ride in progress (or null); `playTraversal` is what useSiteNavigation awaits. */
export const useZiplineRide = (options?: { reducedMotion?: boolean }): { ride: Ride | null; playTraversal: PlayTraversal }
```

- [ ] **Step 1: Write the failing tests**

```ts
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Traversal } from "./obstacleTraversal"

const ride = (over: Partial<Traversal> = {}): Traversal => ({ kind: "zipline", from: [0, 0], to: [0, 6], dir: "e", ...over })

const hookWith = async (frames: Record<string, string[]>) => {
  vi.resetModules()
  vi.doMock("./tileAssets", async original => ({
    ...(await original<typeof import("./tileAssets")>()),
    sharedTileFrames: (prefix: string) => frames[prefix] ?? [],
  }))
  return (await import("./useZiplineRide")).useZiplineRide
}

describe("useZiplineRide", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.doUnmock("./tileAssets")
  })

  it("holds the crossing until the ride ends", async () => {
    const useZiplineRide = await hookWith({ "explorer-zip-e": ["e.png"] })
    const { result } = renderHook(() => useZiplineRide())
    let landed = false
    act(() => void result.current.playTraversal(ride()).then(() => (landed = true)))
    expect(result.current.ride).toMatchObject({ sprite: "e.png", mirrored: false })
    await act(async () => result.current.ride!.end())
    expect(landed).toBe(true)
    expect(result.current.ride).toBeNull()
  })

  it("rides west on the east sprite, mirrored", async () => {
    const useZiplineRide = await hookWith({ "explorer-zip-e": ["e.png"] })
    const { result } = renderHook(() => useZiplineRide())
    act(() => void result.current.playTraversal(ride({ dir: "w", from: [0, 6], to: [0, 0] })))
    expect(result.current.ride).toMatchObject({ sprite: "e.png", mirrored: true })
  })

  it.each([
    ["another kind of span", { "explorer-zip-e": ["e.png"] }, ride({ kind: "headwind" }), {}],
    ["a facing with no riding art", {}, ride(), {}],
    ["reduced motion", { "explorer-zip-e": ["e.png"] }, ride(), { reducedMotion: true }],
  ])("crosses at once for %s", async (_, frames, traversal, options) => {
    const useZiplineRide = await hookWith(frames)
    const { result } = renderHook(() => useZiplineRide(options))
    await act(async () => result.current.playTraversal(traversal))
    expect(result.current.ride).toBeNull()
  })

  it("ends a ride whose slide never reports its end", async () => {
    const useZiplineRide = await hookWith({ "explorer-zip-e": ["e.png"] })
    const { result } = renderHook(() => useZiplineRide())
    let landed = false
    act(() => void result.current.playTraversal(ride()).then(() => (landed = true)))
    await act(async () => vi.advanceTimersByTime(result.current.ride!.ms + 250))
    expect(landed).toBe(true)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/useZiplineRide.spec.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `src/app/SiteMap/useZiplineRide.ts`:

```ts
import { useCallback, useRef, useState } from "react"
import type { PlayTraversal, Traversal } from "./obstacleTraversal"
import { sharedTileFrames } from "./tileAssets"

/** How long the rider takes per grid cell of the run. The one duration a ride has: the slide's length is
 * the ride's, and the crossing settles when it ends. */
export const RIDE_MS_PER_CELL = 90

export type Ride = { traversal: Traversal; sprite: string; mirrored: boolean; ms: number; end: () => void }

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/**
 * A ZIPLINE TAKEN AS A RIDE: `playTraversal` holds the crossing while `ride` is drawn, and `ride.end`
 * (the slide's end, or a fallback timer when the slide never reports one) lands the player. Anything it
 * cannot draw — another kind of span, a facing with no riding art, a player who asked for less motion —
 * is crossed at once.
 */
export const useZiplineRide = ({ reducedMotion = prefersReducedMotion() }: { reducedMotion?: boolean } = {}) => {
  const [ride, setRide] = useState<Ride | null>(null)
  const ending = useRef<(() => void) | null>(null)
  const playTraversal: PlayTraversal = useCallback(
    traversal => {
      const sprite = sharedTileFrames(`explorer-zip-${traversal.dir === "w" ? "e" : traversal.dir}`)[0]
      if (traversal.kind !== "zipline" || !sprite || reducedMotion) return Promise.resolve()
      const cells = Math.abs(traversal.to[0] - traversal.from[0]) + Math.abs(traversal.to[1] - traversal.from[1])
      const ms = cells * RIDE_MS_PER_CELL
      return new Promise<void>(resolve => {
        const end = () => {
          if (ending.current !== end) return
          ending.current = null
          clearTimeout(fallback)
          setRide(null)
          resolve()
        }
        // A slide that never reports its end (a hidden tab, no distance to move) still lands the player.
        const fallback = setTimeout(end, ms + 250)
        ending.current = end
        setRide({ traversal, sprite, mirrored: traversal.dir === "w", ms, end })
      })
    },
    [reducedMotion]
  )
  return { ride, playTraversal }
}
```

Check that `Traversal.kind` for a zipline is `"zipline"`: `grep -rn "ZIPLINE_META" src` gives its `id`. If
the kind string differs, use it and fix the tests to match.

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/app/SiteMap/useZiplineRide.spec.ts && yarn tsc -b`
Expected: PASS, tsc clean.

- [ ] **Step 5: Commit** with `feat(sitemap): a zipline taken as a ride, held until the slide ends`.

---

### Task 2: `ZiplineRider`, the slide on the map

**Files:**
- Create: `src/app/SiteMap/ZiplineRider.tsx`
- Create: `src/app/SiteMap/ZiplineRider.spec.tsx`
- Modify: `src/app/SiteMap/SiteMapView.tsx` (a `ride?: Ride | null` prop, drawn where `ExplorerDot` is, at
  ~line 1723)

**Interfaces:**
- Consumes: `Ride` (task 1), `cellCenter` (`./mapScale`), `TorchGlow` (exported from `./ExplorerDot`).
- Produces: `export const ZiplineRider = ({ ride }: { ride: Ride }) => JSX.Element` and
  `export const HANG = 18`: map units the rider is lifted above the walking figure's foot line, so the
  handle meets the cable.

- [ ] **Step 1: Write the failing tests**

```tsx
// @vitest-environment jsdom
import { act, fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { cellCenter } from "./mapScale"
import type { Ride } from "./useZiplineRide"
import { ZiplineRider } from "./ZiplineRider"

const ride = (over: Partial<Ride> = {}): Ride => ({
  traversal: { kind: "zipline", from: [0, 0], to: [0, 6], dir: "e" },
  sprite: "e.png",
  mirrored: false,
  ms: 540,
  end: vi.fn(),
  ...over,
})

describe("ZiplineRider", () => {
  it("starts at the launch and slides to the landing", async () => {
    const { container } = render(<ZiplineRider ride={ride()} />)
    const rider = container.querySelector("[data-zipline-rider]") as HTMLElement
    await act(async () => new Promise(requestAnimationFrame))
    expect(rider.style.transform).toContain(`${cellCenter(0, 6).cx}px`)
  })

  it("ends the ride when the slide ends", () => {
    const r = ride()
    const { container } = render(<ZiplineRider ride={r} />)
    fireEvent.transitionEnd(container.querySelector("[data-zipline-rider]")!)
    expect(r.end).toHaveBeenCalledTimes(1)
  })

  it("ends the ride if it is taken off the map mid-slide", () => {
    const r = ride()
    render(<ZiplineRider ride={r} />).unmount()
    expect(r.end).toHaveBeenCalled()
  })

  it("mirrors the sprite, never the light, riding west", () => {
    const { container } = render(<ZiplineRider ride={ride({ mirrored: true })} />)
    expect((container.querySelector("img")!.parentElement as HTMLElement).style.transform).toContain("scaleX(-1)")
  })
})
```

If jsdom has no `requestAnimationFrame`, use `vi.useFakeTimers()` and `vi.advanceTimersToNextFrame()`, or
assert the target position on the element's `data-to` attribute instead of on the transform.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/ZiplineRider.spec.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `ZiplineRider.tsx`. Read `ExplorerFigure` in `ExplorerDot.tsx` first and
match its sizes (`CHAR_W`, `CHAR_H`, `FOOT_LIFT`), its `FIGURE_LIT` filter and its `TorchGlow`. Export any
constant you need from `ExplorerDot.tsx`, changing nothing else there.

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { CHAR_H, CHAR_W, FIGURE_LIT, FOOT_LIFT, TorchGlow } from "./ExplorerDot"
import { CELL, cellCenter } from "./mapScale"
import type { Ride } from "./useZiplineRide"

/** Map units the rider hangs above where a walking figure's feet would be: the handle meets the cable.
 * A look, tuned in the Zipline ride story. */
export const HANG = 18

/**
 * THE RIDE, DRAWN: the riding sprite hung at the launch, then slid to the landing by one CSS transition.
 * Its end is the ride's end; taken off the map mid-slide, it ends the ride rather than leave the player
 * out of sight.
 */
export const ZiplineRider = ({ ride }: { ride: Ride }) => {
  const at = (cell: readonly [number, number]) => {
    const { cx, cy } = cellCenter(cell[0], cell[1])
    return `translate(${cx}px, ${cy}px)`
  }
  const [transform, setTransform] = useState(at(ride.traversal.from))
  const end = useRef(ride.end)
  end.current = ride.end
  // Start at the launch, then move on the next frame so the browser has a start to transition from.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setTransform(at(ride.traversal.to)))
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one slide per ride
  }, [ride])
  useEffect(() => () => end.current(), [])
  return (
    <div
      data-zipline-rider=""
      data-to={`${ride.traversal.to[0]},${ride.traversal.to[1]}`}
      onTransitionEnd={() => ride.end()}
      style={{ position: "absolute", left: 0, top: 0, transform, transition: `transform ${ride.ms}ms linear` }}
    >
      <TorchGlow />
      <div
        style={{
          position: "absolute",
          left: -CHAR_W / 2,
          top: CELL / 2 - CHAR_H - FOOT_LIFT - HANG,
          width: CHAR_W,
          height: CHAR_H,
          transform: ride.mirrored ? "scaleX(-1)" : undefined,
          filter: FIGURE_LIT,
        }}
      >
        <img src={ride.sprite} width={CHAR_W} height={CHAR_H} alt="" />
      </div>
    </div>
  )
}
```

Check how `ExplorerDot` positions itself in the layer (it moves with `svgPos` from `cellCenter`), and
position the rider the same way. If ExplorerDot uses `left`/`top` rather than `transform`, follow it, and
transition those properties.

`SiteMapView.tsx`:
- Add `ride?: Ride | null` to its props.
- Where `{explorerPos && !explorerHidden && <ExplorerDot … />}` stands, add `{ride && <ZiplineRider ride={ride} />}`
  just after it. The explorer is hidden during a ride, so the two never show together.

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/app/SiteMap/ZiplineRider.spec.tsx src/app/SiteMap/useZiplineRide.spec.ts && yarn tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit** with `feat(sitemap): the zipline ride drawn as one slide on the map`.

---

### Task 3: Riding in the game

**Files:**
- Modify: `src/app/SiteMap/SiteMapScreen.tsx` (`useZiplineRide`, with `playTraversal` passed to `useSiteNavigation`
  and `ride` passed to `SiteMapView`)
- Test: `src/app/SiteMap/SiteMapScreen.spec.tsx`, or the existing navigation test that takes a zipline.
  Find it with `grep -rn "takeSpan\|playTraversal\|zipline" src/app/SiteMap/*.spec.ts*`.

- [ ] **Step 1: Write the failing test.** Extend the existing test that takes a zipline through the
screen (if one exists) to assert the order of events: hidden, then a `[data-zipline-rider]` on the map,
then after `fireEvent.transitionEnd` on it the explorer stands at the landing, with the save agreeing. If
the only zipline test is at hook level (`useSiteNavigation.spec.ts` `dropSetup`), add a screen-level one
that mounts `SiteMapScreen` on a `dropGrid` floor (`floorFixtures.testing.ts`), taps the launch, accepts
the prompt, and runs the same assertions. Never assert a duration.

- [ ] **Step 2: Run it to see it fail**

Run: `yarn vitest run <that spec>`
Expected: FAIL, no `[data-zipline-rider]`, because the ride crosses at once.

- [ ] **Step 3: Implement.** In `SiteMapScreen.tsx`:
- add `const { ride, playTraversal } = useZiplineRide()` before `useSiteNavigation`;
- pass `playTraversal` in its arguments (`NavigationArgs.playTraversal`, `useSiteNavigation.ts:35`);
- pass `ride={ride}` to `SiteMapView`.

- [ ] **Step 4: Run tests**

Run: `yarn vitest run src/app/SiteMap && yarn tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit** with `feat(sitemap): taking a zipline plays the ride`.

---

### Task 4: The ride in Storybook

**Files:**
- Create: `src/app/SiteMap/ZiplineRide.stories.tsx` (title `Topology/Zipline ride`)

- [ ] **Step 1: Build the story.** For each direction (e, w, s, n), use `dropGrid` from
`floorFixtures.testing.ts` (read it for its signature and `AXES`). Render `SiteMapView` with that grid, and
a **Ride** button that calls `playTraversal` from `useZiplineRide` with the drop's launch, landing and
direction (as `Zipline.stories.tsx` reads them: `launch` and `landing`). Then:
- show the explorer at the landing when the ride ends, and give a **Back** button that resets to the launch;
- add a range control for `HANG` (0–40) and one for ms per cell (40–300), so the designer can tune both.

`HANG` is a constant in `ZiplineRider`: for the story, thread an optional `hang` prop through
`ZiplineRider` (default `HANG`). For the speed, give `useZiplineRide` an optional `msPerCell` option
(default `RIDE_MS_PER_CELL`). Optional props that default to the constants, nothing else.

- [ ] **Step 2: Look at it.** Run `yarn storybook`, open `Topology/Zipline ride`, ride each direction, and
save a screenshot mid-ride (take it right after clicking Ride) to the workspace directory. Check that:
- the hands meet the cable line in each direction;
- west is mirrored;
- the explorer appears at the landing when the slide ends.

Report the `HANG` value that looks right per direction. Do not change the constant from one look; the
designer decides.

- [ ] **Step 3: Verify and commit**

Run: `yarn tsc -b && yarn eslint src/app/SiteMap/ZiplineRide.stories.tsx src/app/SiteMap/ZiplineRider.tsx src/app/SiteMap/useZiplineRide.ts`
Commit with `feat(sitemap): the zipline ride in Storybook, with its hang and speed to tune`.

---

## Self-review notes

- **Spec coverage** ("The ride"):
  - slide by CSS: tasks 1, 2;
  - sprite by direction and west mirrored: task 1;
  - settles on `transitionend`: tasks 1, 2;
  - lands as before: unchanged `takeSpan`, test in task 3;
  - reduced motion, no art and other kinds cross at once: task 1;
  - tests count events, not time: tasks 1–3;
  - story: task 4.
- **"The map follows the ride the same way it follows a walk":** the map scrolls to `explorerPos`, which
  changes at landing. Following mid-ride is out of scope; if the run leaves the viewport, the story shows
  it and the designer decides.
