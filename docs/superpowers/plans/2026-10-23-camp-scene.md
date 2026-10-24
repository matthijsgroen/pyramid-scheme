# Camp Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `CampScene` component that draws the camp for any chapter, any step counts and any container size, fully testable in Storybook before integration.

**Architecture:** A pure `layoutCamp()` turns (container size, insets, chapter, step counts, catalogue) into placed pieces, glows, pyramids and the horizon. `CampScene` measures its container, calls it, and renders HTML layers positioned with CSS. The spot/step/piece catalogue is data; tests use a made-up catalogue.

**Tech Stack:** React, TypeScript, Tailwind + plain CSS, Vitest + Testing Library (jsdom), Storybook (react-vite), react-i18next.

**Spec:** `docs/superpowers/specs/2026-10-23-camp-scene-design.md`. Reference layout: the `layout()` function in the [Kamp scène prototype](https://claude.ai/artifact/ASVzctuASBaLPYP3fopob5).

## Global Constraints

- Chapters are `Difficulty` (`src/data/difficultyLevels.ts`); camp.md's "beginner" is `starter`.
- No placeholders in the game: a spot with 0 steps, or of a later chapter, is not drawn.
- No baked light: every glow comes from code.
- An occupied spot is never cropped, and nothing occupied sits inside the top/bottom insets.
- Same spots in the same order on every device; only spacing differs.
- Every glow holds still under `prefers-reduced-motion: reduce`.
- The component takes props only: no game-state hooks, no storage, no `env()` reads.
- Starting numbers (units of object size `u`): spacing 1.15–2.3; row gap 0.75–5 (back gap ×0.85); depth 0.78 / 0.89 / 1; spread 0.88 / 0.95 / 1; min sky 1.7; far sand ≥ 0.5; bottom pad 0.35; camera height 4.2 / 4.8 / 5.4 / 6.0 / 6.6; frame side margin 0.65; lowest horizon 0.27 of the inset-free height.
- No tests pin the authored catalogue (`feedback_no_tests_on_authored_content`); tests use a made-up catalogue.
- No duration assertions; count calls instead.
- Comments say what holds and why, never history.

## Review Focus

1. **Zero-size container on the first render** (before the `ResizeObserver` fires): the scene renders nothing and does not throw. Test in Task 3.
2. **Insets larger than the container** (a landscape phone with a big bottom inset): the layout clamps to a minimum content height and does not return NaN or negative sizes. Test in Task 2.
3. **Step count above what the chapter allows, or negative**: clamped to 0..available. Test in Task 2.
4. **Extreme aspect ratios** (ultrawide 1600×700, narrow 320×900): the frame fits, spacing stays within bounds, no overlap. Test in Task 2.
5. **Chapter goes down** (a story switching wizard→starter): later-chapter spots disappear, and nothing stale stays on screen. Test in Task 3.

---

## File Structure

- `src/ui/atoms/campScene/campTypes.ts`: the catalogue types and the `CampLayout` result type.
- `src/ui/atoms/campScene/campCatalogue.ts`: the authored data (12 spots, steps, pieces, fixed objects, lights).
- `src/ui/atoms/campScene/campLayout.ts`: `layoutCamp()` and `CAMP_LAYOUT_PARAMS`. Pure.
- `src/ui/atoms/campScene/campLayout.spec.ts`
- `src/ui/atoms/CampScene.tsx`: the component. An **atom**: it renders no other `src/ui` component (`docs/instructions/storybook.md`). The spec says organism; the repo's tier rule wins, and the spec gets fixed in Task 1.
- `src/ui/atoms/CampScene.css`: glow keyframes and the reduced-motion rule.
- `src/ui/atoms/CampScene.spec.tsx`
- `src/ui/atoms/CampScene.stories.tsx`
- `public/locales/{en,nl}/common.json`: `camp.entrance.*` keys.
- `src/assets/camp/`: empty for now; art lands here later.

---

### Task 1: Catalogue types and data

**Files:**

- Create: `src/ui/atoms/campScene/campTypes.ts`, `src/ui/atoms/campScene/campCatalogue.ts`
- Modify: `docs/superpowers/specs/2026-10-23-camp-scene-design.md` (organism → atom, path `src/ui/atoms/CampScene.tsx`)

**Interfaces:**

- Produces:

```ts
export type CampRow = 0 | 1 | 2 // back, middle, front
export type CampSpotId =
  | "fire"
  | "sleeping"
  | "water"
  | "cooking"
  | "donkey"
  | "camel"
  | "mapTable"
  | "palmGarden"
  | "ibisPond"
  | "lookout"
  | "godStatues"
  | "starCanopy"
export type CampLight = {
  dx: number
  dy: number
  radius: number
  color: string
  mode: "flicker" | "breathe"
  strength: number
}
export type CampPiece = {
  id: string
  art?: string
  dx: number
  dy: number
  width: number
  height: number
  replaces?: string[]
  light?: CampLight
}
export type CampStep = { chapter: Difficulty; pieces: CampPiece[] }
export type CampSpot = { id: CampSpotId; row: CampRow; slot: number; steps: CampStep[] }
export type CampFixedId = "chest" | "window" | "campfire"
export type CampFixed = { id: CampFixedId; row: CampRow; slot: number; piece: CampPiece }
export type CampCatalogue = { spots: CampSpot[]; fixed: CampFixed[] }
export const CAMP_CATALOGUE: CampCatalogue
```

`dx`, `dy`, `width`, `height` and `radius` are in object-size units, relative to the spot's anchor (bottom-centre).

- [ ] **Step 1: Write `campTypes.ts`** with the types above.
- [ ] **Step 2: Write `CAMP_CATALOGUE`.** Spots, rows and slots come from the spec's slot table; steps in order come from `docs/game-design/camp.md` "Camp loot" (one piece per step, `art` undefined). Fixed objects: chest (front, −1), window (back, +1), campfire (middle, 0) with a flicker light (radius 2.1, strength 0.75). The fire pit's "fire" step carries a bigger light (radius 2.9), the clay oven, fire bowl and signal fire carry their own small lights, and the window and chest carry breathe lights. Take the values from the prototype's `layout()`. The sleeping place's tent `replaces` the windbreak.
- [ ] **Step 3: Fix the spec's tier.** Change it to atom at `src/ui/atoms/CampScene.tsx`.
- [ ] **Step 4: `yarn check-types`.** Expected: no errors.
- [ ] **Step 5: Commit** `feat: camp scene catalogue`

### Task 2: `layoutCamp()`

**Files:**

- Create: `src/ui/atoms/campScene/campLayout.ts`, `src/ui/atoms/campScene/campLayout.spec.ts`

**Interfaces:**

- Consumes: Task 1 types.
- Produces:

```ts
export type CampLayoutInput = {
  width: number
  height: number
  insets: { top: number; bottom: number }
  chapter: Difficulty
  steps: Partial<Record<CampSpotId, number>>
  catalogue: CampCatalogue
}
export type PlacedPiece = {
  key: string
  spot: CampSpotId | CampFixedId
  piece: CampPiece
  x: number
  y: number
  scale: number
} // px, anchor bottom-centre; scale = u × depth
export type PlacedGlow = {
  key: string
  x: number
  y: number
  radius: number
  color: string
  mode: "flicker" | "breathe"
  strength: number
}
export type PlacedPyramid = { x: number; height: number; golden: boolean }
export type CampLayout = {
  unit: number
  spacing: number
  rowGap: number
  horizon: number
  frame: { x: number; y: number; width: number; height: number }
  pieces: PlacedPiece[] // sorted back to front by y
  glows: PlacedGlow[]
  pyramids: PlacedPyramid[]
}
export const CAMP_LAYOUT_PARAMS: {/* the Global Constraints numbers */}
export const layoutCamp: (input: CampLayoutInput) => CampLayout | null // null when width or height ≤ 0
export const fullSteps: (catalogue: CampCatalogue, chapter: Difficulty) => Record<CampSpotId, number> // every step up to and including chapter
```

The algorithm is the prototype's `layout()`, with insets: `Hc = height − top − bottom`, clamped to a minimum of `1u`-worth so it is never ≤ 0. `u = min(Hc / max(cameraHeight[chapter], minHeight), width / (span × spacingMin + 1.3))`. Spacing and row gap are solved from what is left and clamped. The horizon is `min(naturalHorizon, top + max(Hc × 0.27, skyMin × u))`. Pyramid `i` sits at `frame.x + frame.width × (0.1 + 0.2i)`, with height `(0.55 + 0.22i)u`; pyramid 4 is golden. A step count is clamped to `0..steps available up to chapter`. The pieces of steps `1..n` are drawn, minus those listed in a later piece's `replaces`.

- [ ] **Step 1: Write the failing tests** against a made-up two-row catalogue built in the spec file (spots in two chapters, one piece with `replaces`, one piece with a light):
  - `it("returns null for a zero-size container")`
  - `it("draws no spot with zero steps and no spot of a later chapter")`
  - `it("clamps step counts to what the chapter allows")`: steps `{a: 99}` at its chapter equals full; `{a: -3}` draws nothing.
  - `it("hides a piece a later step replaces")`
  - `it("keeps every piece inside the container and outside the insets")`: for sizes `[390×844, 820×1180, 1000×836, 1600×700, 320×900]` × every chapter, each piece's box (`x ± width×scale/2`, `y − height×scale .. y`) lies within `[0,width] × [top, height−bottom]`.
  - `it("keeps spacing within its bounds and never overlaps a row")`: same sweep. `spacing ∈ [1.15, 2.3]`, and neighbours in a row are at least `scale` apart.
  - `it("keeps the horizon at or above 27% of the inset-free height")`
  - `it("keeps each spot's left-to-right order when the chapter rises")`
  - `it("zooms out as the chapter rises")`: `unit` is non-increasing from starter to wizard at 390×844 and at 1000×836.
  - `it("gives one pyramid per chapter, the fifth golden")`
  - `it("survives insets larger than the container")`: 400×300 with insets 200/200 returns finite, positive numbers.
  - `it("fills a chapter with every step up to it")`: `fullSteps` on the made-up catalogue.
- [ ] **Step 2: `yarn test src/ui/atoms/campScene/campLayout.spec.ts`.** Expected: FAIL (module missing).
- [ ] **Step 3: Implement `layoutCamp`.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: camp scene layout`

### Task 3: `CampScene` component

**Files:**

- Create: `src/ui/atoms/CampScene.tsx`, `src/ui/atoms/CampScene.css`, `src/ui/atoms/CampScene.spec.tsx`
- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json`

**Interfaces:**

- Consumes: `layoutCamp`, `CAMP_CATALOGUE`, Task 1 types.
- Produces:

```ts
export type CampEntrance = { badge?: number; onOpen: () => void }
export type CampSceneProps = {
  chapter: Difficulty
  steps: Partial<Record<CampSpotId, number>>
  insets?: { top: number; bottom: number } // default 0/0
  entrances?: { chest?: CampEntrance; window?: CampEntrance & { label?: string }; mapTable?: CampEntrance }
  catalogue?: CampCatalogue // default CAMP_CATALOGUE; tests pass a made-up one
  className?: string
}
export const CampScene: (props: CampSceneProps) => JSX.Element
```

Layers, back to front: sky (CSS gradient, stars, moon, purple haze at the horizon), pyramids, ground with two dune strips, pieces, a night tint (`mix-blend-mode: multiply`), glows (radial gradients, `mix-blend-mode: screen`), entrance buttons. A piece with `art` renders an `<img alt="">`; one without renders a stand-in box carrying the piece id as text. Entrances are real `<button>`s at least 44×44 px, with a visible label (`t("camp.entrance.collection")`, `camp.entrance.mosaic`, `camp.entrance.journeys`) and a badge when one is given. The map-table entrance shows only when the map table has ≥ 1 step. Size comes from a `ResizeObserver` on the root; before the first measurement nothing but the sky renders.

Glow motion is CSS only: `.camp-glow--flicker` runs two keyframe animations with unrelated durations on scale and opacity; `.camp-glow--breathe` runs one slow one. `@media (prefers-reduced-motion: reduce)` sets `animation: none` on both.

- [ ] **Step 1: Write the failing tests** (jsdom; stub `ResizeObserver` to report a fixed size; `t` is the identity mock the suite already uses):
  - `it("renders only the sky before it has been measured")`
  - `it("opens the collection from the chest")`: click the button named `camp.entrance.collection`; `onOpen` is called once.
  - `it("shows a badge only when one is given")`
  - `it("offers the journeys entrance only once the map table stands")`: absent at `mapTable: 0`, present at `mapTable: 1`.
  - `it("draws a stand-in naming a piece without art")`
  - `it("drops later-chapter spots when the chapter goes down")`: rerender wizard → starter with a full-wizard `steps`; a wizard-only piece's stand-in is gone.
- [ ] **Step 2: `yarn test src/ui/atoms/CampScene.spec.tsx`.** Expected: FAIL.
- [ ] **Step 3: Implement `CampScene`, the CSS and the locale keys.** en: Collection / Mosaic / All journeys. nl: Verzameling / Mozaïek / Alle reizen.
- [ ] **Step 4: Run the tests again, plus `yarn test src/i18n/keys.spec.ts`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: camp scene component`

### Task 4: Stories

**Files:**

- Create: `src/ui/atoms/CampScene.stories.tsx`

**Interfaces:**

- Consumes: `CampScene`, `CAMP_CATALOGUE`.

Fixtures are step counts only. "Full up to chapter X" is `fullSteps(CAMP_CATALOGUE, X)` from Task 2, so stories neither copy authored numbers nor hold logic of their own. Container sizes come from a decorator wrapping the scene in a fixed `width × height` box. `layout: "fullscreen"`.

- [ ] **Step 1: Write the stories:**
  - `Playground`: controls for `chapter` (select) and each spot's step count; insets 56/96.
  - `StarterEmpty`, `StarterFull`, `JuniorFull`, `ExpertFull`, `MasterFull`, `WizardFull`.
  - `PartlyBuilt`: expert, with a handful of spots part-way.
  - `Phone` 390×844, `Tablet` 820×1180, `DesktopPane` 1000×836, `Ultrawide` 1600×700, all `WizardFull`.
  - `WithBadges`: chest badge 3, window label "61/252".
- [ ] **Step 2: `yarn build-storybook`.** Expected: builds without errors. Then open `yarn storybook`, look at each story at phone and desktop sizes, and screenshot `Phone` and `DesktopPane` (`feedback_verify_by_looking`).
- [ ] **Step 3: `yarn lint && yarn check-types`.** Expected: clean.
- [ ] **Step 4: Commit** `feat: camp scene stories`

---

## Not in this plan

- Art generation and import (`src/assets/camp/`, `art/masters/camp/`): a separate art brief. The catalogue's `art` fields fill in as pieces land.
- The rule that no stand-in ships to players: it belongs to the integration plan, which wires the scene into the home screen.
- HUD, "Op pad", "Alle reizen", unpacking.

---

## Added 2026-10-23: art as one image per spot per step

Decided with the designer after the plan was written: each step of a spot is ONE image of the whole spot
at that step, painted as an edit chain from the final state (`docs/game-design/camp-art-prompts.md`), and
each step's image replaces the previous one in the scene.

### Task 5: Catalogue: one image per step, several lights per piece

**Files:**

- Modify: `src/ui/atoms/campScene/campTypes.ts`, `campCatalogue.ts`, `campLayout.ts`, `campLayout.spec.ts`, `src/ui/atoms/CampScene.tsx` (only if it reads `art`/`light`), `docs/superpowers/specs/2026-10-23-camp-scene-design.md` ("Steps are pieces" section)

**Interfaces:**

- Changes: `CampPiece.light?: CampLight` becomes `lights?: CampLight[]`. `CampPiece.art` is removed: the art file is `src/assets/camp/<piece id>.webp`, looked up by piece id.
- Unchanged: `layoutCamp`, `fullSteps` and every `Placed*` type.

Catalogue rules:

- Every spot step is one piece, with `dx = dy = 0` and `width = height = 1`: a square frame anchored bottom-centre. It `replaces` the previous step's piece id.
- The fire pit's first step also replaces `campfire`.
- Lights move onto every step that shows their source:
  - fire pit: a fire glow on every step (radius 2.1 on step 1, 2.9 from step 2), plus the clay oven light from its step on and the fire bowl light on the last step;
  - lookout: the signal fire light on its last step;
  - window: two breathe lights, blue (1.1, 0.55) and warm (0.9, 0.5, raised half an object);
  - chest: one breathe light.
- The fixed pieces keep their sizes.

- [ ] **Step 1: Update the tests to `lights`** and add:
  - `it("draws only the latest step of a spot when each step replaces the one before")`
  - `it("keeps every light of a piece that carries several")`
    Both use the made-up catalogue.
- [ ] **Step 2: Run them, expect FAIL.** Then change the types, the layout and the catalogue. Make the component look art up by piece id.
- [ ] **Step 3: `yarn test src/ui/atoms`, `yarn check-types`, `yarn lint`, `yarn build-storybook`.** Expected: green.
- [ ] **Step 4: Rewrite the spec's "Steps are pieces" section** to describe the per-step image model.
- [ ] **Step 5: Commit** `feat: camp steps are whole-spot images`

### Task 6: `yarn import-camp` and the camp queue in `yarn repaint`

**Files:**

- Create: `scripts/importCamp.ts`, `scripts/importCamp.spec.ts`
- Modify: `scripts/repaintPrompt.ts`, `scripts/repaintQueue.ts` (or a sibling `campPrompts.ts` parser), `scripts/repaintQueue.spec.ts` or a new `campPrompts.spec.ts`, `package.json` (`"import-camp": "tsx scripts/importCamp.ts"`)

**Interfaces:**

- `yarn import-camp <file> --name=<piece> [--key=#ff00ff|none] [--tolerance=60] [--size=768]`. It:
  - writes the master to `art/masters/camp/<name>.webp` (webp quality 92, original resolution);
  - keys the background with `keyOut` from `scripts/keyOut.ts`, skipped when `--key=none`;
  - resizes to fit `size × size`, keeping the aspect ratio. **No trim**: every step of a spot has to share one frame;
  - writes `src/assets/camp/<name>.webp`.
- `parseCamp(md: string): Entry[]` (the `Entry` type from `scripts/repaintQueue.ts`), reading `docs/game-design/camp-art-prompts.md`:

  - **Key and title:** each `### n.` or `#### n.` heading holding a `` `camp/<id>` `` key is one entry. The title is the heading's text.
  - **Prompt:** the entry's blockquote, with `[preamble]` replaced by §0's first blockquote and `[edit]` by its second, and bold markers stripped.
  - **Attachments:** the backticked `art/…` paths on the `Attach:` line.
  - **Files:** `out` is `src/assets/camp/<id>.webp` and `master` is `art/masters/camp/<id>.webp`. `drawn` means `out` exists.
  - **Import command:** `` `yarn import-camp <file> --name=<id>` ``, plus `--key=none` when the entry says "Import with `--key=none`".
  - **Wiring:** `repaintPrompt.ts` adds these entries to its list, and `"camp"` joins `TIERS` (sorted after `default`).

- [ ] **Step 1: Write the failing tests:**
  - `importCamp.spec.ts` — `it("keys the magenta out and keeps the canvas")`: build a 400×400 magenta PNG with a 100×100 red square in sharp, import it to a temp dir, and check that the corners have alpha 0, the centre is opaque and the output is 400×400.
  - parser spec — `it("composes a camp entry from its preamble and edit preamble")`, on a made-up markdown with one final and one edit entry: the prompts carry the preambles, the attachments are parsed, and `out`/`importedBy` are right.
- [ ] **Step 2: Run, expect FAIL. Implement. Run, expect PASS.**
- [ ] **Step 3: Check it end to end.** Run `yarn repaint camp/chest --check` and expect the prompt line count and two attachments, the master marked MISSING (it is not drawn yet). Then `yarn lint`, `yarn check-types`.
- [ ] **Step 4: Commit** `feat: import-camp and the camp repaint queue`

---

## Added 2026-10-23: shadows

Agreed with the designer: each piece gets ONE combined shadow, pre-rendered at import, with no runtime filter.

### Task 7: Pre-rendered shadows, laid away from the fire

**Files:**

- Modify: `scripts/importCamp.ts` (+ spec), `src/ui/atoms/campScene/campLayout.ts` (+ spec), `campTypes.ts` if needed, `src/ui/atoms/CampScene.tsx`, `CampScene.css`, `docs/superpowers/specs/2026-10-23-camp-scene-design.md` (a "Shadows" section)

**Behaviour:**

- **Import.** `yarn import-camp` also writes `src/assets/camp/<name>-shadow.webp`. It is the keyed piece's alpha as a black silhouette, blurred once at import, on the same canvas and size, so it lines up with the piece frame. Scenery imports skip it: `--key=none`, `sand`, `dunes`, `pyramid`, `pyramidGold`. Re-run the import for the landed chest so it gets its shadow.
- **Layout.** `layoutCamp` gives each `PlacedPiece` a `shadow: { angle: number; length: number; strength: number }`.
  - Direction blends between two sources:
    - away from the nearest `flicker` glow, weighted by how close the piece is to it (within about 3× that glow's radius);
    - the moon direction, falling to the lower right (fixed angle), weighted by the rest.
  - Length grows with distance from the fire and is clamped.
  - Strength falls with distance: firelit pieces get a dark shadow, moonlit ones a faint one, with a floor so nothing floats.
  - A piece with no flicker glow in range gets the pure moon shadow.
- **Render.** The shadow is an `<img>` of the `-shadow` file, drawn under its piece in the same depth order. It sits at the piece's foot, flattened onto the ground (scaleY about 0.35), rotated to `angle` and stretched to `length`, with `opacity: strength`. Only `transform` and `opacity` are set; no `filter`. A piece without a shadow file gets no shadow, and stand-ins get none either.
- **Flicker.** The shadows of firelit pieces flicker their opacity only, through a CSS keyframe in step with the fire glow. Under `prefers-reduced-motion` they hold still.

- [ ] **Step 1: Write failing tests:**
  - layout, on the made-up catalogue:
    - `it("casts a firelit shadow away from the fire")`: the angle points from the glow through the piece;
    - `it("falls back to the moon shadow out of the fire's reach")`;
    - `it("darkens a shadow nearer the fire")`;
  - import: `it("writes a blurred silhouette beside the piece")`: same size as the piece, black where the piece is opaque, transparent at the corners.
- [ ] **Step 2: Implement.** Re-import the chest from `art/masters/camp/chest.webp`.
- [ ] **Step 3: Gates and a look.**
  - Run `yarn test src/ui/atoms scripts`, `yarn check-types`, `yarn lint` and `yarn build-storybook`.
  - Screenshot StarterFull on a phone viewport: the chest's shadow should point away from the fire.
- [ ] **Step 4: Measure.** Follow the recipe in `docs/instructions/map-html-port.md` on WizardFull at 390×844 with 4× CPU throttle. Compare against the commit before this task: frame time and layer count, with every piece given a shadow (temporarily copy the chest shadow to every id in a scratch run; do not commit that). Report the numbers.
- [ ] **Step 5: Commit** `feat: camp pieces cast shadows away from the fire`

---

## Added 2026-10-23: contact shadows, self-shading, two-frame fire

Agreed with the designer after the first art landed. Three changes:

- The cast silhouette is laid flat, so it cannot follow a 3/4-view object's base. It becomes a **contact shadow**.
- Pieces get **self-shading** toward and away from the fire.
- Burning pieces get an **optional second frame** for a small flicker.

### Task 8: Contact shadow, self-shade layer, two-frame fire

**Files:**

- Modify: `scripts/importCamp.ts` (+ spec), `src/ui/atoms/campScene/campLayout.ts` (+ spec), `src/ui/atoms/CampScene.tsx` (+ spec), `CampScene.css`, `docs/superpowers/specs/2026-10-23-camp-scene-design.md` ("Shadows" section), `docs/game-design/camp-art-prompts.md`

**Behaviour:**

- **Contact shadow, at import.**
  - `<name>-shadow.webp` becomes the object's **base band**, not its whole silhouette. For each column of the keyed alpha, take the lowest opaque pixel and fill upward a band of about 6% of the canvas height, following the object's own base contour. Blur it once.
  - It keeps the same canvas and size as the piece.
  - Re-import `chest` and `window` from their masters in `art/masters/camp/`.
- **Contact shadow, in the scene.**
  - The shadow is drawn exactly under its piece: same box, **no rotation, no flatten**.
  - It is translated away from the light by a small offset, about 0.06u at full fire and 0.03u under the moon, in the direction `shadow.angle`.
  - Strength and flicker work as today.
  - `PlacedShadow.length` is dropped if nothing uses it any more.
- **Self-shade layer.**
  - Each drawn piece with art, unless it burns (the same rule as the shadow), gets one overlay element in the same box. Its `mask-image` (and `-webkit-mask-image`) is the piece's own art URL, so it covers only the piece.
  - The overlay holds a `linear-gradient` along the light direction (`shadow.angle`): toward the light, a faint warm tint (fire) or nothing (moon); away from the light, a darkening of about 0.35 black at full fire.
  - Its opacity follows `shadow.strength`. Firelit pieces flicker the overlay's opacity in step with their shadow, and hold still under reduced motion.
  - Only `transform` and `opacity` are set: no `filter`, and no `mix-blend-mode` on large layers. Use a plain alpha overlay.
- **Two-frame fire.**
  - If `src/assets/camp/<id>-b.webp` exists, a piece renders both frames stacked.
  - The frames alternate with a CSS `steps()` opacity animation at about 3–4 Hz, with an irregular feel from two durations.
  - Under `prefers-reduced-motion` only frame A shows. A piece with no `-b` file is unchanged.
  - The art lookup ignores `-b` and `-shadow` files when listing pieces.
- **Prompts.**
  - Add `camp/campfire-b` to `camp-art-prompts.md` as an edit of `camp/campfire`: "Edit the second attached image: the same sticks, same size and position; repaint only the flames in a different moment of their flicker — leaning the other way, a different tongue shape. Same painting style, crisp opaque outer edge, flat #ff00ff background."
  - Write a short note that a burning step may get a `-b` entry the same way.
  - `parseCamp` must accept the `-b` key. The `[A-Za-z0-9-]` pattern already allows it; confirm with a test.

- [ ] **Step 1: Write failing tests:**
  - import: `it("builds the shadow from the object's base, not its whole silhouette")`. On a synthetic image (a tall rectangle), the shadow has alpha near the rectangle's bottom edge and none at its top.
  - layout: `it("offsets a contact shadow away from the fire")`, on the made-up catalogue.
  - component:
    - `it("stacks a second frame when a piece has one")`, with a stubbed art lookup;
    - `it("adds a self-shade overlay masked by the piece's own art")`;
    - `it("gives a burning piece neither shadow nor self-shade")`.
- [ ] **Step 2: Implement.** Then re-import `chest` and `window`.
- [ ] **Step 3: Gates and a look.**
  - Run `yarn test src/ui/atoms scripts`, `yarn check-types`, `yarn lint` (and `yarn prettier`, **never `npx prettier`**) and `yarn build-storybook`.
  - Screenshot StarterEmpty and StarterFull at 390×844. Check that the chest's shadow hugs its diagonal base, that the side away from the fire is darker, and that the window reads the same way.
- [ ] **Step 4: Commit** `feat: camp contact shadows, self-shading and two-frame fire`

---

## Added 2026-10-23: spot sizes from the impression

With the first real art in Storybook the designer saw that the scale is off. Every step image gets the same
1×1 frame, so the whole fire pit (ring, stones, oven) is squeezed into a chest-sized box. In the wizard
impression the fire pit is about twice the chest's width. The decisions:

- Each spot gets a frame size and a footprint, measured against the chest in the impression.
- Row spacing respects the footprints.
- The depth shrink is milder.
- The window is drawn at 1.0, a little above its impression size (~0.8) as the camp's landmark.

### Task 9: Spot frame size, footprint spacing, milder depth

**Measured** from the `ref-<spot>` crops: the chest in the impression is 271×226 px, and its art fills 0.83×0.76 of its frame. A spot's object width is `w/271·0.83`, its height `h/226·0.76`. The frame is `max(width, height) / 0.9`, because spot art fills about 90% of its square. These are starting values, re-measured when each spot's art lands.

| Spot       | frame | footprint |
| ---------- | ----- | --------- |
| lookout    | 2.31  | 0.87      |
| sleeping   | 1.53  | 1.38      |
| starCanopy | 1.12  | 1.01      |
| palmGarden | 2.51  | 1.07      |
| cooking    | 1.89  | 1.70      |
| fire       | 1.91  | 1.72      |
| water      | 1.21  | 0.91      |
| donkey     | 1.49  | 1.34      |
| camel      | 1.46  | 1.19      |
| ibisPond   | 2.46  | 2.21      |
| mapTable   | 1.67  | 1.50      |
| godStatues | 1.80  | 1.62      |

Fixed pieces:

| Piece    | frame | footprint | note                                                     |
| -------- | ----- | --------- | -------------------------------------------------------- |
| chest    | 1     | 0.83      | the reference                                            |
| window   | 1.0   | 0.55      | landmark, a bit above its impression size                |
| campfire | 1     | 0.45      | stands where the fire pit will; it is replaced by step 1 |

**Behaviour:**

- **Catalogue.** A spot carries its `frame` and `footprint`. Every step piece of that spot uses `width = height = frame`. A fixed piece carries its own. Light offsets stay relative to the piece and are scaled by its frame, so a glow keeps its place on a bigger image. Check this against the current light code and adjust if lights are absolute units.
- **Layout: spacing.** The unit `u` stays one object unit. Two neighbours in a row are at least `(footprintA + footprintB) / 2 · gapFactor` apart, centre to centre. `gapFactor` is about 1.0, a starting value tuned by eye. The minimum slot spacing is the largest such requirement over adjacent pairs, divided by their slot distance, in place of the fixed 1.15. Everything else (max spacing, camera, insets, horizon, no-crop sweep) is unchanged, but the no-overlap and no-crop tests use footprints and frames.
- **Layout: depth.** Depth scale changes from back/middle/front 0.78/0.89/1 to 0.9/0.95/1.
- **Tests.** The made-up catalogue gets spots with different frames and footprints:
  - `it("keeps neighbours apart by their footprints, not their frames")`
  - `it("draws a spot's image at its frame size")`

  The existing sweeps keep passing.

- [ ] **Step 1: Write the failing tests.**
- [ ] **Step 2: Implement** the catalogue, layout and spec ("Spots as anchors" and "Size and spacing" sections; the starting-numbers table).
- [ ] **Step 3: Gates and a look.**
  - Run `yarn test src/ui/atoms scripts`, `yarn check-types`, `yarn lint`, `yarn prettier` (never `npx`) and `yarn build-storybook`.
  - Screenshot StarterFull, MasterFull and WizardFull at 390×844 and 1000×836.
  - Compare chest : fire pit : window proportions against the wizard impression, and report the numbers.
- [ ] **Step 4: Commit** `feat: camp spots sized from the impression, spaced by footprint`

---

## Added 2026-10-23: the layout comes from the impression

Task 9 fixed the proportions, but its 3 rows of up to 5 spots run out of width on a portrait phone. At
wizard on 390×844, `u` falls to ~36 px while the rows stand far apart. The impression stacks its spots on
about six staggered depths, so a portrait screen fills top to bottom with large objects. Agreed with the
designer: each spot's position comes from the wizard impression, and the layout stays elastic.

### Task 10: Positions from the impression, elastic in both directions

**Positions.** Each spot's anchor (the bottom centre of its object group) is measured in the wizard
impression (1438×2576). It is given in object units (1u = 326 px, the chest being 0.83u wide in 271 px),
relative to the fire pit's anchor. x runs right and y runs down. These are starting values, tuned by eye
once art lands.

| Spot / piece | x     | y     |
| ------------ | ----- | ----- |
| lookout      | -1.62 | -1.89 |
| sleeping     | -0.57 | -2.41 |
| starCanopy   | 0.65  | -2.79 |
| palmGarden   | 1.61  | -1.62 |
| cooking      | -0.45 | -1.14 |
| fire         | 0     | 0     |
| water        | 1.10  | -0.94 |
| donkey       | -1.46 | -0.39 |
| camel        | 1.55  | 0.13  |
| ibisPond     | -0.98 | 1.83  |
| mapTable     | 0.80  | 0.92  |
| godStatues   | 1.33  | 1.87  |
| chest        | -1.52 | 0.40  |
| window       | 0.91  | -1.92 |
| campfire     | 0     | 0     |

The impression's horizon is at y = -4.07. The window's frame becomes 1.4: in the impression it is 1.35× the chest's height, and Task 9's 1.0 drew it at 1.06×. Footprints and frames are as in Task 9.

**Behaviour:**

- **Catalogue.** `row` and `slot` are replaced by `x` and `y`, in impression units. `CampRow` goes, unless something else still needs it.
- **Elastic layout.**
  - Screen position = fire anchor + (x·sx·u, y·sy·u). `sx` and `sy` are stretch factors, each clamped to a range, starting at 0.85–1.6.
  - `u` is the largest value for which the chapter's frame fits the inset-free container at the minimum stretch, capped by the chapter camera height as today.
  - Then `sx` and `sy` grow independently to use the spare width and height, up to their maxima, so a desktop pane spreads sideways and a tall phone spreads downward.
  - Depth: drawing scale = lerp(0.9, 1.0) from the farthest to the nearest anchor y. Pieces are sorted by anchor y.
- **Chapter frame.** The bounding box of the chapter's spots' frames, the fixed pieces and their positions, plus the minimum sky above. The horizon stays above the farthest frame top, with the far-sand rule.
- **Overlap rule.** At minimum stretch, no two footprints overlap where their anchors are within ~0.35u in y, that is, at about the same depth. Pieces at different depths may overlap, as in the impression (the farther one is drawn first). The tests check this rule, not the old per-row one.
- **Unchanged:** never cropped, insets, horizon floor, far sand, zoom-out per chapter (`u` non-increasing), the entrance rules from Task 9 (44×44, no overlap, labels ≥11px), shadows, glows, stories.
- **Tests.**
  - Replace the row and slot tests with a made-up catalogue in x/y.
  - `it("spreads sideways on a wide container and downward on a tall one")`
  - `it("keeps spots at the same depth from overlapping")`
  - `it("keeps every spot's relative order in x and in y as the container changes")`
- **Spec.** Rewrite "Spots as anchors" and "Size and spacing" for the impression layout, and the starting numbers.

- [ ] **Step 1: Write the failing tests.**
- [ ] **Step 2: Implement** the catalogue, layout, component (only if needed) and spec.
- [ ] **Step 3: Gates and a look.**
  - Run `yarn test src/ui/atoms scripts`, `yarn check-types`, `yarn lint`, `yarn prettier --write <files>` (never `npx`) and `yarn build-storybook`.
  - Screenshot StarterFull, MasterFull and WizardFull at 390×844, 1000×836 and 1600×700, and WizardFull at 320×640.
  - Report `u` and the chest's drawn width per size, and compare the wizard 390×844 shot side by side with the impression.
- [ ] **Step 4: Commit** `feat: camp layout from the impression, elastic both ways`

---

## Added 2026-10-23: steps fade into each other

### Task 11: Cross-fade between a spot's steps

A spot that changes step swaps one image for the next, and that reads as a flicker. The designer asked for
a fade instead.

- **Layout.** The pieces a later step replaces, within the steps the spot owns, are returned too, marked
  `visible: false` (`PlacedPiece.visible: boolean`). They have the same position and frame, no glows and
  no shadow. Visible pieces keep everything they have today.
- **Component.**
  - A spot's pieces render in step order, stacked; only the visible one has opacity 1.
  - Opacity has a CSS transition of about 400 ms, and a newly mounted visible piece starts from 0 via
    `@starting-style`, so a step that arrives fades in over the one it replaces.
  - Hidden pieces are not interactive and carry no shadow or self-shade.
  - Under `prefers-reduced-motion` there is no transition.
  - Glows and shadows follow the visible piece as today.
- **Tests.**
  - layout: `it("keeps a replaced step in place, hidden, so the scene can fade between steps")`
  - component: `it("draws a spot's earlier steps hidden under the current one")`
- **Look.** In Storybook's Playground, step the fire pit up and down. There should be no flash of empty
  ground. Screenshots can't show a fade, so check the computed styles in the DOM.

---

## Added 2026-10-23: a lighting pass so the camp sparkles like the impression

The designer finds the scene less colourful than the impressions. Five causes:

- the global blue multiply night tint greys everything;
- the `screen` glows wash out instead of saturating;
- the sand is one flat colour;
- there is almost no sparkle: no window spill, no embers, no twinkle;
- grey stand-ins remain where art is still missing.

The art stays as it is. The fix is in code, measured against the impression.

### Task 12: Lighting pass, measured against the starter impression

**Measure first, then after.** `art/masters/camp/impression-starter.webp` shows the starter camp; most starter
art has landed, the water spot is still a stand-in. Write `scripts/campLook.ts` (`yarn camp-look`). Given an
image and the horizon's share of its height, it prints for the ground area below the horizon:

- mean L\* and C\* (CIELAB);
- the share of pixels with C\* > 40;
- mean L\* and C\* inside a disc around the fire, given as x, y and r in shares of width and height.

Run it on the impression and on a 471×844 screenshot of StarterFull. Report both, before and after.

**Changes, each a starting value tuned by eye and by the numbers:**

1. **Night.** Drop the global multiply tint over the camp. The night lives in:
   - the sky;
   - a vignette darkening the outer edge of the ground (radial, about 0.35 at the corners);
   - a slight cool tone on far ground toward the horizon.

   The camp area keeps its colour.

2. **Firelight that saturates.** The fire's glow becomes two layers:
   - a large warm pool using `mix-blend-mode: soft-light` or `overlay` (whichever reads closer to the impression), radius about 1.5× today's, which raises the warmth and chroma of the sand and of pieces;
   - a small bright core that keeps `screen`.

   The window and the chest get the same treatment at their own colour: a blue-gold pool on the sand in front of the window, gold for the chest. Keep the flicker and breathe animations, and keep reduced-motion behaviour.

3. **Sand.** The ground becomes a gradient: warm ochre near the camp's centre, darker and cooler toward the edges and horizon. It still gives way to `sand.webp` when that art exists. In that case the gradient is laid over the texture as a tint.
4. **Sparkle**, cheap and CSS only:
   - a handful of embers rising from each burning piece (small dots, `transform` and `opacity` keyframes, staggered);
   - a few stars that twinkle;
   - none of it under reduced motion.

   Count elements: at most about 8 embers per fire and 10 twinkling stars.

5. **No `filter`** on large layers. Blend modes only on the glow layers, as today. Check that paint and frame time stay as Task 7 measured them, by one quick measurement on WizardFull at 390×844.

- [ ] **Step 1:** write `yarn camp-look` and a small spec for it on a synthetic image (known colours give known L\*/C\*). Measure the impression and the current StarterFull.
- [ ] **Step 2:** implement 1–4, iterating with screenshots and `camp-look` until the camp area's mean C\* and the fire disc's L\*/C\* come close to the impression's. Report the gap left.
- [ ] **Step 3: Gates.**
  - Run `yarn test src/ui/atoms scripts`, `yarn check-types`, `yarn lint` and `yarn prettier --write <files>`.
  - Run `yarn build-storybook`.
  - Save side-by-side screenshots of StarterFull and WizardFull with their impressions.
- [ ] **Step 4: Commit** `feat: camp lighting that sparkles like the impression`
