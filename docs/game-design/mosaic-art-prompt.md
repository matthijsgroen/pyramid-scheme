# mosaic-art-prompt.md

Image-generation prompts for the five-panel mosaic (see `story-and-time-brainstorm.md` §3).
Written for Gemini's image generation, but nothing here is model-specific except the workflow notes.

**Why the constraints are so fussy:** the output has to survive `scripts/traceMask.ts`, which converts a
grayscale mask into piece polygons — **bright pixels = cell interior, dark pixels = lead line**,
`THRESHOLD = 128`, and any region under `MIN_PIXELS = 40` is discarded. The number of traced regions *is*
the number of collectible pieces. So: heavy black leading, no dark cell fills, no soft edges.

---

## Workflow

1. **Generate the whole window first** (§"Full window" below) for composition, palette and coherence.
2. **Then regenerate each register separately** at frieze aspect for detail, matching the palette from
   step 1 — five wide images beat one tall image for per-scene quality.
3. **Derive the mask, don't generate it.** Desaturate the final artwork and threshold it: the black leading
   becomes the dark lines, the cells become bright. Generating a separate "line only" image will not
   register pixel-perfect with the colour art.
4. **Count regions, then tune.** Trace, count pieces per band, compare against that tier's free-slot
   supply. If a band yields too many pieces, raise `MIN_PIXELS` or re-prompt with "fewer, larger cells".
   Piece count is a tracing dial, not an art constraint.
5. **Do not let the model draw hieroglyphs.** It produces convincing-looking nonsense, and this game's
   glyph set is meaningful — anyone who reads it will see gibberish. Ask for plain carved marks and, if the
   scribe's papyrus should show real glyphs (panel 2), overlay them from the game's own set afterwards.

---

## Shared style block

Prepend this to every scene prompt.

```
Ancient Egyptian scene rendered as a STAINED-GLASS WINDOW panel.

Style:
- Flat, fully saturated colour cells with NO gradients, NO airbrushing, NO soft shading inside a cell.
- Every cell is separated by THICK, PURE BLACK lead lines, 6-10 px wide at 1372 px width, continuous and
  fully closing every cell. No gaps, no lines that stop mid-air, no floating shapes.
- Hard edges only. No blur, no glow, no bloom, no drop shadows, no anti-aliased fringes.
- Colour palette: lapis blue, turquoise, ochre, deep red, warm gold, sand cream, malachite green.
- IMPORTANT: no cell may be black, near-black, deep navy or dark brown — dark fills are read as lead
  lines by the tracer and would disappear. Keep every fill mid-tone or lighter.
- Roughly 60-90 distinct colour cells in this panel, none smaller than about 1% of the panel height.
- Figures drawn in Egyptian tomb-painting convention: profile faces, frontal shoulders, flat perspective,
  figures standing on a common ground line.
- No text, no lettering, no hieroglyphic writing, no numerals anywhere in the image. Where inscription is
  implied, use simple abstract carved marks.
- No modern objects, no signatures, no frames, no borders outside the leadwork itself.
```

## Full window

```
[shared style block]

Composition: a single tall stained-glass window, portrait, aspect ratio 7:12.

The window is divided into FIVE horizontal registers of equal height, stacked like the registers of an
Egyptian tomb wall, each register a self-contained scene reading left to right, separated by a thick
black lead band.

Presiding over the whole window, drawn large and spanning the registers behind them: ANUBIS, a
jackal-headed figure in profile, standing calm and upright, one hand extended as though steadying a
balance. He is the frame the five scenes sit inside — the scenes overlay him, he is not a sixth scene.

Register 1 (top): night. A cat stands in a mud-brick doorway, back arched, facing a snake retreating into
the dark. Behind her, sleeping figures. A bowl set on the step.
Register 2: a seated scribe, cross-legged, palette on his knee, reed pen in hand. Behind him an
ibis-headed figure leans in, one hand steadying the scribe's wrist, teaching him.
Register 3: dawn inside a great colonnaded hall. Two enormous columns; a shaft of pale gold light runs the
length of the hall and lands on a small golden shrine. Priests stand aside, one holding a censer.
Register 4: a seated king with GREEN skin, body wrapped, crook and flail crossed on his chest. Green
barley shoots grow out of the wrappings. Behind him, a flooded dark field.
Register 5 (bottom): a great balance with a human heart in one pan and a single ostrich feather in the
other, the beam level. A jackal-headed figure steadies the beam; an ibis-headed scribe waits beside it. A
doorway of pale light behind them.
```

## Per-register prompts

Each at frieze aspect — roughly 2.9:1 (1372 × 470 at full resolution).

### 1 — The Guardian at the Door

```
[shared style block]

Composition: a wide horizontal frieze, aspect ratio 2.9:1.

Night. Centre: a mud-brick doorway of a small house. A cat stands squarely in the doorway, back arched,
tail up, staring down a snake that is coiling away to the right into darkness. To the left, inside the
house, two sleeping figures wrapped on a low bed. On the step in the foreground, a shallow bowl of milk.
A few stars as small pale cells in the dark blue sky above the roofline.

Mood: quiet, protective, the danger already retreating.
```

### 2 — The First Lesson

```
[shared style block]

Composition: a wide horizontal frieze, aspect ratio 2.9:1.

Interior, daylight. Centre-right: a young scribe sits cross-legged on the ground, a rectangular wooden
palette resting on one knee, a thin reed pen in his right hand, an unrolled sheet of pale papyrus across
his lap. Behind and above him, leaning in: a standing figure with the head of an ibis — long curved dark
beak — its left hand gently steadying the scribe's writing wrist. Its posture is patient, instructive, not
commanding. To the left, two more blank papyrus rolls and a water pot.

The papyrus must carry only simple abstract carved marks, NOT hieroglyphic writing.

Mood: patient teaching, a hand being guided.
```

### 3 — Letting the Sun In

```
[shared style block]

Composition: a wide horizontal frieze, aspect ratio 2.9:1.

Dawn inside an enormous temple hall. Two colossal columns dominate left and right, their capitals
suggested as flat stylised palm shapes. Between them, running from the left edge to the far centre-right,
a straight shaft of pale gold light — rendered as flat gold cells, not a glow — which lands on a small
golden shrine standing at the end of the hall. Two priests in white kilts stand aside from the light, one
holding a censer with a small flame. Above the far doorway, a red sun disc sits exactly centred between
the columns.

Mood: deliberate, engineered, the light arriving exactly where it was meant to.
```

### 4 — The Green King

```
[shared style block]

Composition: a wide horizontal frieze, aspect ratio 2.9:1.

Centre: a king seated on a low block throne, in profile, his SKIN FLAT GREEN, his body wrapped tight in
pale linen from the chest down. He holds a crook and a flail crossed over his chest, and wears a tall
white crown with a feather at each side. Growing directly out of the linen wrappings across his lap: five
or six upright green barley shoots with heavy seed heads. Behind him, a dark flooded field divided into
flat rectangles of deep blue water and green shoots, with a horizontal flood line running the width of the
panel.

Mood: still, patient, something alive coming out of something dead.
```

### 5 — The Feather and the Heart

```
[shared style block]

Composition: a wide horizontal frieze, aspect ratio 2.9:1.

Centre: a large upright balance scale with a tall central post and a horizontal beam that is exactly
LEVEL. In the left pan, a single red human heart. In the right pan, one white ostrich feather. To the left
of the scale, a jackal-headed figure in profile reaches out one hand to steady the beam. To the right, an
ibis-headed figure stands ready, palette in hand. Behind the scale, a tall open doorway filled with flat
pale gold light. The floor is a row of flat stone cells running the width of the panel.

Mood: solemn, balanced, a verdict about to be given and it is a good one.
```

---

## After generation

- Trace, then check each band's region count against that tier's free-slot supply.
- Re-prompt with "fewer, larger cells" (or raise `MIN_PIXELS`) rather than re-authoring a scene.
- Watch specifically for: dark cell fills (they vanish into the leading), lead lines that don't close a
  cell (two cells merge into one giant piece), and cells under the minimum size (silently dropped).
