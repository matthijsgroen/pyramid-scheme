# Camp palette

The colours of the UI around the camp (HUD, popups, the desktop side panel, cards, haul rows, badges). They are
Tailwind v4 theme colours in `src/index.css` (`@theme`), so each is a class: `bg-parchment-100`,
`text-ink-600`, `border-ochre-500`, with opacity modifiers (`bg-night-800/90`). The Storybook page
**Design/CampPalette** (`src/ui/principles/CampPalette.stories.tsx`) lays them over the starter camp, with the
contrast of every pairing below and the camp components that wear them.

## Where the colours come from

Sampled from the camp art (k-means over opaque pixels of `src/assets/camp/*.webp`, the scene's CSS sky and sand)
and the starter rank in [visual-direction.md](../game-design/visual-direction.md): limestone and whitewashed
mudbrick ground, red ochre and terracotta, a turquoise faience accent, under a night sky.

| Ramp      | Job                          | In the art                                                                                                 |
| --------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| parchment | panels, cards, chips, rules  | tent and pavilion canvas `#F7D2A7` `#F2D7AB` `#F1D9B1` `#D0AD87`, a cooler limestone than the canvas       |
| ink       | text, outlines               | tent and pavilion shadows `#421C11` `#3D2723`, palm trunk `#3D2C22`                                        |
| ochre     | primary buttons, NEW, badges | campfire `#C9541D` `#B32F16`, reed mat `#D58B56` `#B8633E`, pavilion trim `#9A4F29`, tent shadow `#451D19` |
| faience   | selected, info               | stained glass `#306980`, caravan banner `#35555A`, oasis water `#80B1D9`                                   |
| night     | HUD, dark screens            | sky `#0F1733` `#1F2B5C`, star cloth `#475481` `#2D2F53`                                                    |
| ember     | glow, focus, coins           | fire `#FCC276`, sparks `#FFD27A`, window amber `#EAB54B`, focus ring `#E0B33F`                             |

## The colours

| Token         | Hex       | Job                                |
| ------------- | --------- | ---------------------------------- |
| parchment-50  | `#FFF8EA` | raised card, text on accent        |
| parchment-100 | `#F4EAD5` | panel, popup                       |
| parchment-200 | `#E9DCBF` | chip, inset row, tab track         |
| parchment-300 | `#D6C4A0` | rule, card border                  |
| parchment-400 | `#B8A584` | dashed placeholder border          |
| ink-500       | `#7B5B3A` | muted icon                         |
| ink-600       | `#5C4A36` | label, secondary text              |
| ink-700       | `#4A3B2A` | body text, empty notes             |
| ink-800       | `#3A2E22` | spare step between body and text   |
| ink-900       | `#2B2118` | text, outline                      |
| ochre-100     | `#F5D9C7` | tint                               |
| ochre-300     | `#D58B56` | ochre on night                     |
| ochre-400     | `#C25E30` | bright accent                      |
| ochre-500     | `#A3401A` | accent: primary button, NEW, badge |
| ochre-600     | `#8A3515` | accent hover                       |
| ochre-700     | `#6E2A12` | accent pressed, ochre text on tint |
| ochre-800     | `#451D19` | deepest                            |
| faience-100   | `#CDE8E4` | tint                               |
| faience-300   | `#7FC4C0` | faience on night                   |
| faience-500   | `#2E8A88` | faience fill, large shapes         |
| faience-600   | `#23706F` | faience fill under light text      |
| faience-700   | `#1C5A5C` | selected, faience text             |
| night-200     | `#C9CFE2` | text on night                      |
| night-600     | `#475481` | raised surface on night            |
| night-700     | `#3A4566` | surface on night                   |
| night-800     | `#27304A` | HUD, dark panel                    |
| night-900     | `#1B2236` | coming-home screen                 |
| night-950     | `#0F1733` | the sky's top                      |
| ember-200     | `#FFE3A8` | glow tint                          |
| ember-300     | `#FFD27A` | ember on night                     |
| ember-400     | `#EAB54B` | amber                              |
| ember-500     | `#E0A526` | coins, focus ring                  |
| ember-600     | `#B87F14` | deep amber                         |
| ember-700     | `#855A0C` | deepest                            |

### By job

| Token               | Is                                                                               |
| ------------------- | -------------------------------------------------------------------------------- |
| `camp-paper`        | parchment-100                                                                    |
| `camp-card`         | parchment-50                                                                     |
| `camp-chip`         | parchment-200                                                                    |
| `camp-rule`         | parchment-300                                                                    |
| `camp-dashed`       | parchment-400                                                                    |
| `camp-ink`          | ink-900                                                                          |
| `camp-ink-soft`     | ink-700                                                                          |
| `camp-label`        | ink-600                                                                          |
| `camp-muted`        | ink-500                                                                          |
| `camp-accent`       | ochre-500                                                                        |
| `camp-accent-hover` | ochre-600                                                                        |
| `camp-on-accent`    | parchment-50                                                                     |
| `camp-select`       | faience-700                                                                      |
| `camp-night`        | night-800                                                                        |
| `camp-night-deep`   | night-900                                                                        |
| `camp-on-night`     | night-200                                                                        |
| `camp-glow`         | ember-500                                                                        |
| `camp-glass`        | warm tint `#EFD9B0` at 55%, where the backdrop blurs (16px) and saturates (160%) |
| `camp-glass-solid`  | the same tint at 92%, where it cannot                                            |
| `camp-glass-edge`   | white at 45%, the 1px edge that catches the light                                |

## The sketches' hex and its token

The [camp sketches](camp-sketches/README.md) write hex; the camp UI writes the token each one maps to:

| Hex       | Token                 | Where                                                          |
| --------- | --------------------- | -------------------------------------------------------------- |
| `#FFF8EA` | parchment-50          | cards, text on accent                                          |
| `#F4EAD5` | parchment-100         | popup and side panel (`/95`, `/80`), HUD text                  |
| `#E9DCBF` | parchment-200         | chips, hint row, tab track, progress track                     |
| `#D6C4A0` | parchment-300         | popup header rule, haul row border                             |
| `#C9B48E` | parchment-300 (shift) | TierHeader rule                                                |
| `#B8A584` | parchment-400         | dashed placeholders                                            |
| `#7B5B3A` | ink-500               | JourneyRow icon fill                                           |
| `#5C4A36` | ink-600               | labels, notes                                                  |
| `#4A3B2A` | ink-700               | body text                                                      |
| `#2B2118` | ink-900               | text, outlines                                                 |
| `#A3401A` | ochre-500             | primary buttons, NEW, badges, notice dot                       |
| `#8A3515` | ochre-600             | button hover                                                   |
| `#27304A` | night-800             | HUD, camp background, coming-home card                         |
| `#1B2236` | night-900             | coming-home screen                                             |
| `#C9CFE2` | night-200             | text on night                                                  |
| `#D9CFB8` | parchment-200 (shift) | coming-home text on night                                      |
| `#3F6B2E` | none                  | JourneyRow's done check keeps it; a green outside this palette |

## Deliberate shifts

- **`#D9CFB8` → parchment-200 `#E9DCBF`.** The coming-home screen's text on night was a greyed parchment of its
  own; the chip colour is near it, reads 11.6:1 on night-900 against 10.2, and leaves one warm text colour on
  dark.
- **`#C9B48E` → parchment-300 `#D6C4A0`.** TierHeader's hairline joins the popup's rule: one rule colour.
- **Faience is the starter accent.** The sketches had no turquoise, though the starter rank's accent is turquoise faience. The
  art's blues lean lapis (stained glass `#306980`, window `#367FB1`); faience is pushed greener (hue ~180°) to
  stand apart from the night sky (hue ~225°). It fills the selected tab (ink-900 in the sketches) and the dot of an
  info hint that is not "new" (ochre in the sketches), so ochre stays for NEW and the one thing to press.
- **Ember is new as a ramp.** Coins (`#E0A526`) and the scene's focus ring (`#E0B33F`) were one-offs; ember-500
  takes both.
- Every other value is the sketches' hex unchanged.

## Contrast

WCAG ratios; body text needs 4.5:1, large text, badges and icons 3:1.

| Pairing                               | Ratio | Needs |
| ------------------------------------- | ----- | ----- |
| ink-900 on parchment-100              | 13.18 | 4.5   |
| ink-900 on parchment-50               | 14.90 | 4.5   |
| ink-700 on parchment-100              | 9.01  | 4.5   |
| ink-700 on parchment-50               | 10.19 | 4.5   |
| ink-600 on parchment-100              | 7.06  | 4.5   |
| ink-600 on parchment-200              | 6.21  | 4.5   |
| ink-500 on parchment-100              | 5.17  | 3     |
| ink-500 on parchment-200              | 4.55  | 3     |
| parchment-50 on ochre-500             | 6.01  | 4.5   |
| parchment-50 on ochre-600             | 7.64  | 4.5   |
| parchment-50 on ochre-400             | 4.02  | 3     |
| ochre-500 on parchment-50             | 6.01  | 4.5   |
| ochre-500 on parchment-100            | 5.32  | 4.5   |
| faience-700 on parchment-100          | 6.59  | 4.5   |
| faience-700 on parchment-200          | 5.80  | 4.5   |
| parchment-50 on faience-700           | 7.45  | 4.5   |
| parchment-50 on faience-600           | 5.49  | 4.5   |
| parchment-50 on faience-500           | 3.89  | 3     |
| parchment-100 on night-800            | 10.93 | 4.5   |
| night-200 on night-800                | 8.40  | 4.5   |
| night-200 on night-600                | 4.73  | 4.5   |
| parchment-200 on night-900            | 11.63 | 4.5   |
| ember-300 on night-900                | 11.10 | 4.5   |
| faience-300 on night-900              | 7.95  | 4.5   |
| ink-900 on ember-500                  | 7.18  | 4.5   |
| ink-600 on glass over the sky's top   | 4.67  | 4.5   |
| ochre-500 on glass over the sky's top | 3.51  | 3     |

The glass rows are the worst case: `camp-glass` over flat night-950 mixes to `#C6C0B5`. Over the sand it mixes to
`#E4D3BB` (ink-600 at 5.76). Faience-600 text on parchment-200 is 4.27, short of 4.5, so faience text is
faience-700; faience-600 is for fills.

Rules and dashed borders are decoration, not text: parchment-300 on parchment-50 is 1.6:1, parchment-400 on
parchment-100 2.0:1. A dashed "not held" border that has to read on its own would need a darker step (`#8C7350`
reaches 3.75:1).

The glass is the designer's choice (C in the `GlassVariants` story, 2026-10-28): a warm, see-through tint the fire and
sand glow through. Over the night sky its mixed colour sits darker than the contrast rows above assume; the designer
judged the text readable there.
