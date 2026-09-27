import { hashUnit } from "@/support/hashString"
import type { Difficulty } from "@/data/difficultyLevels"
import type { ConditionKind } from "@/game/siteTypes"
import type { Mood } from "./moodSettings"
import { CANOPY_SCALE, CHAMBER_SCALE, GROWTH_POOLS, growthTile } from "./moodSettings"
import { CELL, WALL_FACE_H, cellCenter } from "./mapScale"
import { sharedTileUrl } from "./tileAssets"
import { STANDING_RELIEF } from "./lighting"
import { OCCLUDER_FADE, Sprite } from "./htmlLayers"

// The air, drawn in three layers over the stone: what is carried on it (drift), what lives in it (life),
// and what colour it is (tint). All of it CSS-animated rather than driven from React — a mote that
// re-rendered the map every frame would cost more than everything else the map draws.
//
// The layers are split because they sit at different depths: scarabs are ON the floor and belong under the
// props and icons, while drift and tint are between the player and the world and belong over everything.
//
// DRIFT AND TINT ARE HTML, NOT SVG, and that is a performance fact rather than a taste: an SVG child gets
// no layer of its own, so 26 animated <circle>s repainted the whole map — tiles re-decoded, gradients
// re-rasterised — 60 times a second, for a measured 5% of a core on an idle map and a phone that got warm
// in the hand. A div with a transform animation is composited: the same motes cost nothing to move. They
// also no longer belong to the map's coordinate space, which is why they cross the SCREEN rather than the
// floor — ambience in front of the world, unaffected by pan and zoom.

// What the map's motion is called lives in the theme (index.css, "The map's own motion"); these are the
// hooks a test asks for, and the classes that carry the animation are alongside them at the point of use.
const MOTE_CLASS = "map-mote absolute rounded-full will-change-transform animate-map-drift motion-reduce:animate-none"

/** How many specks ride on one animated element.
 *
 * AIR IS MANY AND ELEMENTS ARE NOT FREE, and the two pull against each other. A tomb only reads as dusty
 * at a density of dozens, but a speck per div is dozens of nodes in every render of the map and dozens of
 * layers for the compositor — and the whole reason these layers are HTML is that the map got LIGHTER
 * (docs/instructions/map-rendering.md). A field of 34 one per div put 11% onto a site-map render.
 *
 * `box-shadow` is the way out: a shadow is the element's own box drawn again — offset, resized by its
 * spread, rounded the same — so one animated element carries more than one speck across the screen for
 * the cost of one. Paired, the count of nodes barely moves off what a dozen fat motes cost.
 *
 * TWO, NOT FOUR, and the number is a compromise rather than an oversight. A cluster travels as one body:
 * its specks share a crossing, a wander and a shimmer, and the wider it is spread to hide that, the more
 * of the field's placement comes from a handful of origins — at four the screen went visibly patchy. Two
 * specks a stone's throw apart is a pairing no eye picks out of a drifting field, and it still halves the
 * nodes. `drift.count` stays a number of SPECKS, because that is the number worth authoring. */
export const SPECKS = 2
const SCARAB_CLASS = "map-scarab animate-map-scurry motion-reduce:animate-none"

const rand = hashUnit

/**
 * How solid a tuft in a floor joint is drawn.
 *
 * SET AGAINST THE ZOOM IT IS SEEN AT, which is what the first number got wrong. 0.3 was chosen while the
 * tufts were still stacked against the wall band, where they were competing with the roots and wanted
 * holding back. Scattered across the paving they are 12 to 22 units on a map three thousand across, and a
 * few pixels at 30% is nothing at all: on the whole-floor view the roots and the chamber plants — both
 * solid, and the plants twice the size — carried the condition alone, and the corridors read as bare.
 *
 * They still sit under the other two, which is the point of having a number here: a tuft is a texture the
 * floor has taken on, and a root coming through brick is the thing that is meant to stop you.
 */
const TUFT_OPACITY = 0.7

/** A sprite turned about its own centre. On a div that is simply what a transform does — the
 * `transform-box` trap an SVG <image> had (it measures against the whole viewport, so a bare
 * `scaleX(-1)` mirrored each sprite across the MIDDLE OF THE MAP and moved half the growth on a floor
 * into the wrong corner) does not exist here. Kept as one helper so the rotation and the flip stay
 * described in one place. */
const turned = (degrees: number, mirrored: boolean) =>
  `rotate(${degrees.toFixed(1)}deg)${mirrored ? " scaleX(-1)" : ""}`

/**
 * The drawings one slot may use, in the pool's own order, with every member that is not on disk resolved
 * to the one that is (`GROWTH_POOLS`).
 *
 * FALLING BACK IS THE NORMAL CASE and not an error path: six of the seven members are painted after this
 * ships, so a slot is mostly its own sprite repeated and the pool fills in as each tile lands, with no
 * code change. Undefined where even the slot's own drawing is missing — a condition composed and seen as
 * a wash before anything is painted at all.
 */
const pool = (kind: ConditionKind, members: readonly (string | null)[]): string[] | undefined => {
  const fallback = sharedTileUrl(growthTile(kind, members[0]))
  if (!fallback) return undefined
  return members.map(member => sharedTileUrl(growthTile(kind, member)) ?? fallback)
}

/** Which member of a slot's pool this cell grew. Seeded off the cell's own place in the floor's fixed
 * list, as its size and its jitter already are, so a member never moves and adding a tile to the pool is
 * the only thing that reshuffles one. */
const memberAt = (length: number, siteId: string, salt: string, index: number) =>
  Math.floor(rand(siteId, salt, index) * length)

const member = (urls: string[], siteId: string, salt: string, index: number) =>
  urls[memberAt(urls.length, siteId, salt, index)]

type Props = {
  mood: Mood
  siteId: string
  /**
   * EVERY floor cell of the floor, lit or not, in a fixed order — not just the explored ones.
   *
   * A scarab picks its cell by index into this list, so the list cannot be allowed to grow: indexing the
   * LIT cells meant every reveal lengthened it and every scarab landed somewhere else, teleporting across
   * the map each time the player opened up another corridor. The beetle was always there; the player just
   * had not seen that corner yet, and that is what `isLit` is for.
   */
  floorCells: ReadonlyArray<readonly [number, number]>
  /** Cells with a wall BAND above them — void to the north. Where a root can come through. */
  wallCells?: ReadonlyArray<readonly [number, number]>
  /** A chamber's claimed floor: room for a plant that is not in the player's way. */
  chamberCells?: ReadonlyArray<readonly [number, number]>
  /** Whether the player has seen that cell yet. A scarab in the dark is simply not drawn. */
  isLit: (row: number, col: number) => boolean
  /**
   * Which half of the chamber plants to draw.
   *
   * A PLANT TALLER THAN A PERSON CANNOT BE DRAWN UNDER ONE. The growth layer sits below everything that
   * stands, which is right for a tuft and wrong for a palm: the explorer would walk in front of a tree
   * twice their height. So the tall members are drawn again, after the standing layer, and fade while
   * the player is behind them — the same bargain an archway makes (`OCCLUDER_FADE`), for the same reason:
   * a thing you can walk behind must not be a thing that hides you.
   *
   * The floor joints and the wall roots belong to the under pass only; nothing about them is tall.
   */
  canopy?: boolean
  /** Where the player is, so a canopy plant standing in front of them can get out of the way. */
  explorerPos?: readonly [number, number]
}

/**
 * What is growing on the stone, drawn with the scarabs and under everything that stands on it.
 *
 * The same trick `MapLife` uses and for the same reason: SHARED sprites in `tiles/default/`, placed by
 * index into the fixed floor-cell list, so a rank costs no files and a reveal cannot make anything jump.
 * Still rather than scurrying — a weed in a corner does not run.
 *
 * Each of the three slots draws from a POOL (`GROWTH_POOLS`), picked per cell off the same seed that
 * decides which cells grow, so a floor is a mix of plants rather than one weed repeated.
 *
 * Draws nothing until a slot's own sprite exists, which is deliberate: the condition can be authored,
 * composed and seen as a wash before a single file is painted.
 */
export const MapGrowth = ({
  mood,
  siteId,
  tier,
  floorCells,
  wallCells = [],
  chamberCells = [],
  isLit,
  canopy = false,
  explorerPos,
}: Props & { tier: Difficulty }) => {
  const g = mood.growth
  if (!g?.floor && !g?.wall && !g?.chamber) return null
  const tuft = pool(g.kind, GROWTH_POOLS.floor)
  if (!tuft) return null
  const root = pool(g.kind, GROWTH_POOLS.wall) ?? tuft
  const plant = pool(g.kind, GROWTH_POOLS.chamber) ?? tuft
  /**
   * WHICH cells grow, at a density of `per` — 1 being every one of them.
   *
   * Drawn WITHOUT REPLACEMENT, which is what a density needs and a random index cannot give: picking a
   * cell per sprite, at one sprite per cell, leaves about a third of the floor bare and stacks the rest
   * two deep. So the list is put in a fixed hash order once and the front of it is taken. Scaling the
   * density down then takes strictly fewer cells and moves none of the ones that stay, which is what
   * makes the number safe to tune.
   *
   * Each cell keeps its ORIGINAL index as the seed for its own size and jitter, so those do not move
   * either when the density changes.
   */
  const grown = (cells: ReadonlyArray<readonly [number, number]>, salt: string, per: number) => {
    if (cells.length === 0 || per <= 0) return []
    const ordered = cells
      .map((cell, index) => ({ cell, index, order: rand(siteId, salt, index) }))
      .sort((a, b) => a.order - b.order)
    // At least one, because a density that rounds to nothing still means "this is happening here" — the
    // roots are the part that says a building is losing and must not be the first thing to round away.
    return ordered.slice(0, Math.max(1, Math.round(per * cells.length)))
  }
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* ── the JOINTS: many, small, on any floor cell, and FAINT ──
          `TUFT_OPACITY`, because at one per cell and full strength they stopped being joints and started
          being a second crop of wall roots lying on the paving. Faint, they go back to being what they
          are: a texture the floor has taken on, read as ground rather than as objects standing on it, and
          told apart at a glance from the roots through the band, which stay solid because a root coming
          through brick is the thing that is supposed to stop you. */}
      {(canopy ? [] : grown(floorCells, "growth-cell", g.floor)).map(({ cell: [row, col], index: i }) => {
        if (!isLit(row, col)) return null
        const { cx, cy } = cellCenter(row, col)
        // SIZED AGAINST THE SCATTER, which is the thing on this floor that already reads. A mat or a
        // spill of rubble is drawn at a full CELL wide in a prop box (`FloorScatter`), one per cell, at
        // full strength. A tuft at 12 to 22 was a quarter of that and drawn at 30%, which is why the
        // rubble in a corridor was plain and the growth in the same corridor was not there at all.
        //
        // Half a cell to three quarters of one. Not the whole box: a weed in a joint is smaller than a
        // mat laid down on purpose, and several of them to a corridor is the look — but it has to be a
        // shape at the zoom a floor is actually read at, not a speck.
        const size = CELL * 0.5 + rand(siteId, "growth-size", i) * (CELL * 0.25)
        return (
          <Sprite
            key={`tuft-${i}`}
            url={member(tuft, siteId, "growth-kind", i)}
            stretch={false}
            // THE CONTRAST THE NIGHT TAKES OFF IT, handed back as it is to every other thing standing on
            // this floor (`STANDING_RELIEF`). A wash dims and flattens in the same stroke, and growth was
            // the one standing thing paying the second half of that — which is most of why a plant reads
            // as pasted onto the paving rather than as growing out of it. Per sprite, never on the layer:
            // a filter rasterises its subtree as one layer and this layer is the size of the map.
            filter={STANDING_RELIEF[tier]}
            // THE PLAY IS WHAT THE SIZE LEAVES, so a tuft never crosses its own cell whatever size it
            // rolled. A fixed jitter was fine while these were specks and put the big ones over the wall
            // band the moment they were sized to be seen — which the spec above catches.
            x={cx - size / 2 + (rand(siteId, "growth-x", i) - 0.5) * (CELL - size)}
            // ACROSS THE CELL, not up it. These used to be pushed toward the wall band — the thing they
            // were meant to be coming out of — which put every one of them in the cell's top third and
            // some over the band itself. On a ROOM that is invisible, because the room's own plants fill
            // the middle; on a CORRIDOR, which is most of a floor, it left the paving bare with a line of
            // green along the wall above it, and read as growth that only happens in rooms. The roots
            // through the band say "out of the wall" on their own; a tuft is in a joint, and joints are
            // everywhere.
            y={cy - size / 2 + (rand(siteId, "growth-y", i) - 0.5) * (CELL - size)}
            w={size}
            h={size}
            opacity={TUFT_OPACITY}
            // ANY angle: a tuft in a joint is seen from above and has no up. It is also what stops a
            // floor of them reading as one stamp repeated, which at this density is what they were.
            transform={turned(rand(siteId, "growth-rot", i) * 360, rand(siteId, "growth-flip", i) > 0.5)}
          />
        )
      })}
      {/* ── the WALL: roots through the band above a cell ──
          `wallCells` is only the cells with a band drawn above them (void to the north), because a root
          has to come THROUGH something the map actually draws.

          IT FILLS THE BRICK EXACTLY — under the coping, down to the floor line. Two things were wrong
          before, and they were opposite. Hanging past the bottom (the band is WALL_H and the sprite was
          34 to 52) put the overshoot in mid-air over the paving with nothing to have grown out of, so the
          whole sprite read as floating. Anchoring to the band's TOP then started it on the coping —
          `FACE_CAP` of a face is its own flat top surface, seen from above, and nothing grows out of that.
          A root that begins there is hung on the wall rather than come through it.

          So it runs the part of the band that is BRICK, and the variance it used to carry in height lives
          in the width instead. */}
      {(canopy ? [] : grown(wallCells, "growth-wall-cell", g.wall)).map(({ cell: [row, col], index: i }) => {
        if (!isLit(row, col)) return null
        const { cx, cy } = cellCenter(row, col)
        const w = 16 + rand(siteId, "growth-wall-w", i) * 18
        return (
          <Sprite
            key={`root-${i}`}
            url={member(root, siteId, "growth-wall-kind", i)}
            filter={STANDING_RELIEF[tier]}
            x={cx - w / 2 + (rand(siteId, "growth-wall-x", i) - 0.5) * (CELL * 0.6)}
            y={cy - CELL / 2 - WALL_FACE_H}
            w={w}
            h={WALL_FACE_H}
            // A LEAN, not a turn: a root hangs, so gravity decides which way is down and only the flip
            // and a few degrees either side are free.
            transform={turned(
              (rand(siteId, "growth-wall-rot", i) - 0.5) * 14,
              rand(siteId, "growth-wall-flip", i) > 0.5
            )}
          />
        )
      })}
      {/* ── the CHAMBERS: a few big ones, and only where there is room to stand ──
          Passages are excluded by construction, `chamberCells` being the claimed footprints: a plant half
          a cell across in a corridor is something the player would have to walk through. Bottom-anchored
          like a prop, so it stands on the floor instead of floating in the cell. */}
      {grown(chamberCells, "growth-plant-cell", g.chamber).map(({ cell: [row, col], index: i }) => {
        if (!isLit(row, col)) return null
        const { cx, cy } = cellCenter(row, col)
        // The member is drawn FIRST, because how big this plant is depends on which plant it is — and
        // whether it belongs to this pass at all.
        const pick = memberAt(plant.length, siteId, "growth-plant-kind", i)
        const scale = CHAMBER_SCALE[GROWTH_POOLS.chamber[pick] ?? ""] ?? 1
        if (scale >= CANOPY_SCALE !== canopy) return null
        const size = (30 + rand(siteId, "growth-plant-size", i) * 16) * scale
        // BEHIND IT MEANS ITS OWN CELL OR THE ONE BEYOND. A plant is bottom-anchored on its cell and
        // reaches up over the cell north of it, so those are the two places a player disappears.
        const behind =
          canopy && !!explorerPos && explorerPos[1] === col && (explorerPos[0] === row || explorerPos[0] === row - 1)
        return (
          <Sprite
            key={`plant-${i}`}
            url={plant[pick]}
            stretch={false}
            filter={STANDING_RELIEF[tier]}
            x={cx - size / 2 + (rand(siteId, "growth-plant-x", i) - 0.5) * (CELL * 0.4)}
            y={cy + CELL / 2 - size}
            w={size}
            h={size}
            opacity={behind ? OCCLUDER_FADE : undefined}
            // Standing, so the same small lean the roots take rather than a turn.
            transform={turned(
              (rand(siteId, "growth-plant-rot", i) - 0.5) * 10,
              rand(siteId, "growth-plant-flip", i) > 0.5
            )}
          />
        )
      })}
    </div>
  )
}

/** Scarabs: on the floor, under everything that stands on it. */
export const MapLife = ({ mood, siteId, floorCells, isLit }: Props) => {
  const url = sharedTileUrl("scarab")
  if (!mood.life || !url || floorCells.length === 0) return null
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: mood.life }, (_, i) => {
        // Each one keeps to a cell of real floor, so nothing ever scurries into the stone.
        const [row, col] = floorCells[Math.floor(rand(siteId, "scarab-cell", i) * floorCells.length)]
        if (!isLit(row, col)) return null
        const { cx, cy } = cellCenter(row, col)
        const away = rand(siteId, "scarab-dir", i) > 0.5 ? 1 : -1
        return (
          <div
            key={i}
            className={SCARAB_CLASS}
            style={
              {
                position: "absolute",
                left: cx - 7 + (rand(siteId, "scarab-x", i) - 0.5) * (CELL / 2),
                top: cy - 5 + (rand(siteId, "scarab-y", i) - 0.5) * (CELL / 2),
                width: 14,
                height: 10,
                backgroundImage: `url(${url})`,
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                "--sx": `${away * (10 + rand(siteId, "scarab-run", i) * 14)}px`,
                "--sy": `${(rand(siteId, "scarab-side", i) - 0.5) * 16}px`,
                animationDuration: `${5 + rand(siteId, "scarab-speed", i) * 6}s`,
                animationDelay: `-${rand(siteId, "scarab-phase", i) * 8}s`,
              } as React.CSSProperties
            }
          />
        )
      })}
    </div>
  )
}

/** Drift and tint: between the player and the world, so over everything the map draws — and an HTML
 * layer over the map rather than the last group inside it.
 *
 * ACROSS THE SCREEN, NOT ACROSS THE FLOOR. A mote in map space had to be placed against the floor's own
 * width and height, moved with the pan and grew with the zoom — dust the size of a chest at 5×. Air is
 * between the player and the world, so it belongs to the viewport: the layer is the size of the map's
 * window, and a floor twice the screen costs exactly the same motes as one that fits.
 *
 * Each mote is its own div with a `translate` animation, which the compositor owns — see the note at the
 * top of this file for the repaint this replaced. */
export const MapWeather = ({ mood, siteId }: Pick<Props, "mood" | "siteId">) => {
  const { drift, tint } = mood
  if (!drift && !tint) return null
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {drift &&
        Array.from({ length: Math.ceil(drift.count / SPECKS) }, (_, i) => {
          // How many of this cluster's specks are real — the last one carries the remainder.
          const riders = Math.min(SPECKS, drift.count - i * SPECKS)
          // A SPREAD, NOT A SIZE. `drift.size` is the radius the field is written around and every speck
          // takes its own fraction of it, most of them under it: `r * r` is weighted to the small end, so
          // a field is mostly the smallest specks with the occasional bigger one caught in it. Dust of one
          // size is a pattern, and the eye finds a pattern and stops seeing air.
          const spreadOf = (n: number) => 0.5 + rand(siteId, "mote-r", i * SPECKS + n) ** 2 * 1.4
          const spread = spreadOf(0)
          const size = drift.size * 2 * spread
          const wobble = rand(siteId, "mote-wd", i) > 0.5 ? 1 : -1
          return (
            <div
              key={i}
              className={MOTE_CLASS}
              style={
                {
                  left: `${rand(siteId, "mote-x", i) * 100}%`,
                  top: `${rand(siteId, "mote-y", i) * 100}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  background: drift.fill,
                  // The specks riding along (SPECKS). A shadow's SPREAD is what gives it its own size: it
                  // grows the copied box by that much on every side, so `(wanted - size) / 2` draws a speck
                  // of any size off an element of another, and the rounding is copied with the box so they
                  // stay circles.
                  boxShadow:
                    Array.from({ length: riders - 1 }, (_, n) => {
                      const k = i * SPECKS + n + 1
                      const ox = (rand(siteId, "speck-x", k) - 0.5) * 190
                      const oy = (rand(siteId, "speck-y", k) - 0.5) * 150
                      const grow = (drift.size * 2 * spreadOf(n + 1) - size) / 2
                      return `${ox.toFixed(1)}px ${oy.toFixed(1)}px 0 ${grow.toFixed(2)}px ${drift.fill}`
                    }).join(", ") || undefined,
                  // The smallest specks are barely a pixel, and a pixel at half alpha is nothing at all —
                  // so the ones under full size are drawn up to a fifth harder to stay visible against the
                  // stone. The big ones keep the field's own opacity: that is what makes fog a wash.
                  "--o": `${drift.opacity * (1 + Math.max(0, 1 - spread) * 0.2)}`,
                  // Blown across and down, at its own angle and pace — one vector for all of them reads as a
                  // sheet of rain rather than as air.
                  //
                  // NOT MUCH FURTHER THAN THIS. A mote restarts where it began rather than wrapping round,
                  // so a field that crosses much more than a phone's width is half of it sitting off the
                  // left-hand side at any moment, and the screen thins out. Pace comes from `seconds`.
                  "--dx": `${-(90 + rand(siteId, "mote-dx", i) * 240)}px`,
                  "--dy": `${(rand(siteId, "mote-dy", i) - 0.35) * 150}px`,
                  // How far off its own line the mote is pushed on the way over (index.css, `map-drift`).
                  // Either way to start with, so a field does not breathe in unison.
                  "--wob": `${wobble * (8 + rand(siteId, "mote-w", i) * 26)}px`,
                  animationDuration: `${drift.seconds * (0.55 + rand(siteId, "mote-s", i) * 0.9)}s`,
                  // Negative delay: they are already mid-crossing on the first frame, rather than all
                  // starting together in a wave.
                  animationDelay: `-${rand(siteId, "mote-d", i) * drift.seconds}s`,
                } as React.CSSProperties
              }
            />
          )
        })}
      {/* Last, so the hour lies over the motes as well as the stone. */}
      {tint && (
        <div data-map-tint="" className="absolute inset-0" style={{ background: tint.fill, opacity: tint.opacity }} />
      )}
    </div>
  )
}
