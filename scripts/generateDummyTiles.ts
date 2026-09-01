#!/usr/bin/env node
/**
 * Writes a full placeholder tile set into src/assets/tiles/<tier>/ so the sprite renderer can be
 * built and measured before any real art exists: generated SVG, rasterised by sharp.
 *
 * The idiom is a top-down pixel dungeon: a wall owns its cells and shows a full-cell south-facing
 * FACE, with a SOLID fill where the mass is thicker than one cell; the floor stays nearly flat and
 * low-contrast (all the depth comes from faces, the silhouette outline and hard shadows); props are
 * small, bottom-anchored and dark-outlined. See docs/game-design/spritesheet-renderer-prep.md.
 *
 * Output is git-ignored. Regenerate, don't commit: yarn generate-dummy-tiles [--preview]
 */

import { mkdirSync, readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"
import { tierPalette } from "../src/app/SiteMap/tileMaterials"
import { ARCH_H, ARCH_W, SIDE_W, WALL_H } from "../src/app/SiteMap/mapScale"
import type { TierPalette } from "../src/app/SiteMap/tileMaterials"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(__dirname, "..", "src", "assets", "tiles")

// One sprite pixel per map unit: TILE is exactly mapScale.ts's CELL, so at zoom 1 the art is 1:1
// and every other crisp zoom is an integer multiple of it.
const TILE = 56
const MEGA_CELLS = 8 // repetition period of the floor and wall-face megatiles, in cells
const MEGA = TILE * MEGA_CELLS // 448
const FACE = TILE // a wall face is a full cell tall — a one-cell-thick wall is all face, no top
const SILL = 12 // threshold sill: a band on the floor, not a wall
// A wall item is painted on a cell's face band, so it is the band's shape rather than a square.
const BAND = WALL_H

// The tier materials live in src so the renderer and this generator cannot drift apart.
const PALETTES = tierPalette
type Palette = TierPalette

type Kind =
  | "rubble"
  | "pillar"
  | "pit"
  | "statue"
  | "basin"
  | "sarcophagus"
  | "chestProp"
  | "offeringTable"
  | "jarRack"
  | "brazier"
  | "lamp"
  | "hanging"
  | "shelf"
  | "shrine"
  | "crystal"
  | "mat"

// Every kind for every tier. A real art pass draws only what a rank's pool authors — a tier with no
// sarcophagus needs no sarcophagus — but a placeholder costs a kilobyte, and generating the lot means
// authoring a pool never waits on the generator catching up.
const ALL_KINDS: Kind[] = [
  "rubble",
  "pillar",
  "pit",
  "statue",
  "basin",
  "sarcophagus",
  "chestProp",
  "offeringTable",
  "jarRack",
  "brazier",
  "lamp",
  "hanging",
  "shelf",
  "shrine",
  "crystal",
  "mat",
]

// Deterministic jitter — the same tier always rasterises to the same bytes.
const hash = (a: number, b: number, salt: number): number => {
  let h = (a * 374761393 + b * 668265263 + salt * 2246822519) >>> 0
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// Everything lands on a 2px sub-grid: at 1:1 the art reads as pixels rather than as vector edges.
const q = (n: number): number => Math.round(n / 2) * 2

const svg = (w: number, h: number, body: string): Buffer =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`
  )

// ── Floor megatile ────────────────────────────────────────────────────────────
// Running bond at a slab size that does NOT divide the cell — 64x32 against a 56 cell — so the
// masonry only realigns with the grid at 448, the megatile's own period. A cell-sized slab is what
// makes a floor read as tiled no matter how good the art is.
//
// Kept deliberately flat: three values a step apart, a 1px joint, small scattered decals. In a
// top-down dungeon the floor recedes and the wall faces carry the depth; a floor with per-slab
// highlights and shadows reads as a stack of ledges instead.
const SLAB_W = 64
const SLAB_H = 32

const floorSvg = (tier: string): Buffer => {
  const p = PALETTES[tier]
  const parts = [`<rect width="${MEGA}" height="${MEGA}" fill="${p.slabLo}"/>`]

  for (let course = 0; course < MEGA / SLAB_H; course++) {
    const y = course * SLAB_H
    const offset = (course % 2) * (SLAB_W / 2)
    for (let i = 0; i < MEGA / SLAB_W; i++) {
      const n = hash(course, i, 1)
      const fill = n < 0.3 ? p.slabLo : n > 0.72 ? p.slabHi : p.slab
      // A slab overhanging the right edge is redrawn one period left, same fill, so the pattern's
      // seam falls inside a slab rather than between two different ones.
      for (const x of [i * SLAB_W + offset, i * SLAB_W + offset - MEGA]) {
        if (x + SLAB_W < 0) continue
        parts.push(`<rect x="${x + 1}" y="${y + 1}" width="${SLAB_W - 2}" height="${SLAB_H - 2}" fill="${fill}"/>`)
      }
    }
  }

  // Decals: chips, hairline cracks and pebbles, scattered off the cell grid.
  for (let i = 0; i < 60; i++) {
    const x = q(hash(i, 3, 7) * MEGA)
    const y = q(hash(i, 5, 8) * MEGA)
    const n = hash(i, 7, 9)
    if (n < 0.45) parts.push(`<rect x="${x}" y="${y}" width="2" height="2" fill="${p.joint}" opacity="0.5"/>`)
    else if (n < 0.8)
      parts.push(`<rect x="${x}" y="${y}" width="${q(6 + n * 12)}" height="2" fill="${p.slabLo}" opacity="0.8"/>`)
    else parts.push(`<rect x="${x}" y="${y}" width="2" height="2" fill="${p.slabHi}" opacity="0.4"/>`)
  }

  // Cross-cell features: a tiling seam or a mis-aligned pattern shows up here first.
  parts.push(
    `<path d="M ${q(MEGA * 0.05)} ${q(MEGA * 0.14)} Q ${q(MEGA * 0.4)} ${q(MEGA * 0.3)} ${q(MEGA * 0.55)} ${q(MEGA * 0.6)} T ${q(MEGA * 0.95)} ${q(MEGA * 0.9)}"
       fill="none" stroke="${p.joint}" stroke-width="2" opacity="0.8"/>`,
    `<ellipse cx="${q(MEGA * 0.28)}" cy="${q(MEGA * 0.74)}" rx="${TILE * 1.4}" ry="${TILE * 0.9}" fill="${p.accent}" opacity="0.07"/>`,
    `<ellipse cx="${q(MEGA * 0.76)}" cy="${q(MEGA * 0.24)}" rx="${TILE * 1.1}" ry="${TILE * 1.3}" fill="${p.accent}" opacity="0.06"/>`,
    // A dead-straight line: a half-pixel pattern offset shows up here as a kink.
    `<rect x="0" y="${MEGA / 2}" width="${MEGA}" height="2" fill="${p.accent}" opacity="0.14"/>`
  )

  return svg(MEGA, MEGA, parts.join(""))
}

// ── Wall top ──────────────────────────────────────────────────────────────────
// A solid fill, no art. The surface you look down onto carries no information the player acts on:
// it is the mass a passage was cut out of, and flat dark separates it from a lit floor better than
// any texture does. One token per tier instead of a megatile, a pattern and five more files.
// ── Wall face ─────────────────────────────────────────────────────────────────
// The south-facing side of the wall mass, a full cell tall, drawn on any wall cell with walkable
// floor below it. The megatile is FACE tall, so every cell row lands on the pattern's own origin
// and the cap-light / base-dark registration comes out identical on every face with no per-row
// transform. Courses are offset half a block per row and run unbroken across cell boundaries —
// the thing a per-cell wall sprite cannot do.
const wallFaceSvg = (tier: string): Buffer => {
  const p = PALETTES[tier]
  const parts: string[] = [
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0" stop-color="${p.wallTop}"/><stop offset="0.5" stop-color="${p.wall}"/>
       <stop offset="1" stop-color="${p.wallBase}"/></linearGradient></defs>`,
    `<rect width="${MEGA}" height="${FACE}" fill="url(#g)"/>`,
  ]

  const courseH = 14 // four courses to a cell-tall face
  const blockW = 28
  for (let course = 0; course * courseH < FACE; course++) {
    const y = course * courseH
    const shift = (course % 2) * (blockW / 2)
    parts.push(`<rect y="${y}" width="${MEGA}" height="1" fill="${p.joint}" opacity="0.7"/>`)
    for (let b = 0; b * blockW < MEGA + blockW; b++) {
      const x = b * blockW + shift
      parts.push(`<rect x="${x}" y="${y}" width="1" height="${courseH}" fill="${p.joint}" opacity="0.75"/>`)
      // Tier dressing lives in the wall, not in per-cell props — racks, murals, inscriptions and
      // moss all repeat on the megatile's period, which is fine for background.
      if (hash(course, b, 4) > 0.82) {
        parts.push(
          `<rect x="${x + 4}" y="${y + 3}" width="${blockW - 8}" height="${courseH - 6}" fill="${p.accent}" opacity="0.3"/>`
        )
      }
    }
  }

  parts.push(
    // The cap where the wall's top surface meets its face, and the dark it fades into at the base.
    `<rect width="${MEGA}" height="2" fill="${p.wallTop}"/>`,
    `<rect y="2" width="${MEGA}" height="2" fill="#ffffff" opacity="0.14"/>`,
    `<rect y="${FACE - 4}" width="${MEGA}" height="4" fill="${p.outline}" opacity="0.55"/>`
  )
  return svg(MEGA, FACE, parts.join(""))
}

// ── Threshold ─────────────────────────────────────────────────────────────────
// Sits on the shared edge of a gate cell and its stairhead, so a material change is an authored
// sill rather than an accidental seam.
const thresholdSvg = (tier: string): Buffer => {
  const p = PALETTES[tier]
  return svg(
    TILE,
    SILL,
    `<rect width="${TILE}" height="${SILL}" fill="${p.wallTop}"/>
     <rect width="${TILE}" height="2" fill="#ffffff" opacity="0.25"/>
     <rect y="${SILL / 2 - 1}" width="${TILE}" height="2" fill="${p.joint}" opacity="0.7"/>
     <rect y="${SILL - 2}" width="${TILE}" height="2" fill="${p.outline}" opacity="0.6"/>
     <rect x="${q(TILE * 0.2)}" y="4" width="${q(TILE * 0.6)}" height="2" fill="${p.accent}" opacity="0.7"/>`
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
// Bottom-anchored on the cell's floor line, dark-outlined, with a contact shadow: the read that makes
// an object sit ON the floor rather than float over it.
//
// A prop sprite is a cell PLUS a face band tall (56x84), because the renderer draws props after the
// walls: a statue stands IN FRONT of the wall behind it, so it may be taller than the cell it stands
// on. Short props leave the top band transparent; tall ones (a statue, a pillar, a shrine) use it, and
// that headroom is the only thing that makes them read as having height rather than as floor decals.
const PROP_H = TILE + BAND
const BASE = PROP_H - 6

const shapes: Record<Kind, (p: Palette) => string> = {
  rubble: p => `
    <rect x="14" y="${BASE - 10}" width="12" height="10" fill="${p.propDark}"/>
    <rect x="26" y="${BASE - 16}" width="16" height="16" fill="${p.prop}"/>
    <rect x="20" y="${BASE - 6}" width="10" height="6" fill="${p.prop}"/>`,
  pillar: p => `
    <rect x="20" y="${BASE - 66}" width="16" height="66" fill="${p.prop}"/>
    <rect x="16" y="${BASE - 72}" width="24" height="8" fill="${p.propDark}"/>
    <rect x="16" y="${BASE - 4}" width="24" height="4" fill="${p.propDark}"/>`,
  pit: p => `
    <rect x="10" y="${BASE - 24}" width="36" height="24" fill="${p.outline}"/>
    <rect x="10" y="${BASE - 24}" width="36" height="4" fill="${p.propDark}"/>`,
  statue: p => `
    <rect x="14" y="${BASE - 8}" width="28" height="8" fill="${p.propDark}"/>
    <rect x="20" y="${BASE - 48}" width="16" height="40" fill="${p.prop}"/>
    <rect x="22" y="${BASE - 62}" width="12" height="14" fill="${p.prop}"/>
    <rect x="19" y="${BASE - 64}" width="18" height="4" fill="${p.propDark}"/>
    <rect x="20" y="${BASE - 50}" width="16" height="3" fill="${p.accent}"/>`,
  basin: p => `
    <rect x="12" y="${BASE - 16}" width="32" height="16" fill="${p.propDark}"/>
    <rect x="16" y="${BASE - 12}" width="24" height="8" fill="${p.accent}" opacity="0.75"/>
    <rect x="24" y="${BASE - 30}" width="8" height="14" fill="${p.prop}"/>`,
  sarcophagus: p => `
    <rect x="18" y="${BASE - 52}" width="20" height="52" fill="${p.prop}"/>
    <rect x="21" y="${BASE - 48}" width="14" height="44" fill="${p.propDark}"/>
    <rect x="24" y="${BASE - 44}" width="8" height="8" fill="${p.accent}"/>`,
  chestProp: p => `
    <rect x="14" y="${BASE - 18}" width="28" height="18" fill="${p.propDark}"/>
    <rect x="14" y="${BASE - 26}" width="28" height="8" fill="${p.prop}"/>
    <rect x="26" y="${BASE - 20}" width="4" height="8" fill="${p.accent}"/>`,
  offeringTable: p => `
    <rect x="8" y="${BASE - 20}" width="40" height="5" fill="${p.prop}"/>
    <rect x="12" y="${BASE - 15}" width="5" height="15" fill="${p.propDark}"/>
    <rect x="39" y="${BASE - 15}" width="5" height="15" fill="${p.propDark}"/>
    <rect x="16" y="${BASE - 27}" width="8" height="7" fill="${p.accent}"/>
    <rect x="30" y="${BASE - 25}" width="10" height="5" fill="${p.accent}" opacity="0.8"/>`,
  jarRack: p => `
    <rect x="8" y="${BASE - 34}" width="40" height="4" fill="${p.propDark}"/>
    <rect x="8" y="${BASE - 14}" width="40" height="4" fill="${p.propDark}"/>
    ${[12, 24, 36].map(x => `<rect x="${x}" y="${BASE - 28}" width="10" height="14" fill="${p.prop}"/>`).join("")}
    ${[12, 24, 36].map(x => `<rect x="${x + 3}" y="${BASE - 31}" width="4" height="3" fill="${p.accent}"/>`).join("")}`,
  brazier: p => `
    <rect x="24" y="${BASE - 14}" width="8" height="14" fill="${p.propDark}"/>
    <rect x="16" y="${BASE - 22}" width="24" height="8" fill="${p.prop}"/>
    <rect x="22" y="${BASE - 32}" width="12" height="10" fill="${p.accent}"/>`,
  shrine: p => `
    <rect x="14" y="${BASE - 50}" width="28" height="50" fill="${p.propDark}"/>
    <path d="M 10 ${BASE - 50} L 28 ${BASE - 62} L 46 ${BASE - 50} Z" fill="${p.prop}"/>
    <rect x="20" y="${BASE - 42}" width="16" height="34" fill="${p.accent}" opacity="0.5"/>`,
  lamp: p => `
    <rect x="26" y="${BASE - 8}" width="4" height="8" fill="${p.propDark}"/>
    <rect x="20" y="${BASE - 12}" width="16" height="4" fill="${p.propDark}"/>
    <rect x="24" y="${BASE - 34}" width="8" height="22" fill="${p.prop}"/>
    <ellipse cx="28" cy="${BASE - 38}" rx="9" ry="5" fill="${p.accent}"/>`,
  hanging: p => `
    <rect x="10" y="${BASE - 44}" width="36" height="3" fill="${p.propDark}"/>
    <path d="M 12 ${BASE - 41} L 12 ${BASE - 6} Q 28 ${BASE} 44 ${BASE - 6} L 44 ${BASE - 41} Z" fill="${p.prop}"/>
    <rect x="26" y="${BASE - 41}" width="4" height="35" fill="${p.accent}" opacity="0.5"/>`,
  shelf: p => `
    <rect x="8" y="${BASE - 40}" width="40" height="4" fill="${p.propDark}"/>
    <rect x="8" y="${BASE - 22}" width="40" height="4" fill="${p.propDark}"/>
    <rect x="12" y="${BASE - 36}" width="12" height="14" fill="${p.prop}"/>
    <rect x="28" y="${BASE - 36}" width="16" height="14" fill="${p.accent}" opacity="0.8"/>
    <rect x="14" y="${BASE - 18}" width="20" height="12" fill="${p.prop}"/>`,
  crystal: p => `
    <path d="M 20 ${BASE} L 24 ${BASE - 34} L 30 ${BASE - 20} L 34 ${BASE} Z" fill="${p.accent}"/>
    <path d="M 34 ${BASE} L 38 ${BASE - 22} L 44 ${BASE} Z" fill="${p.prop}"/>
    <path d="M 10 ${BASE} L 16 ${BASE - 16} L 20 ${BASE} Z" fill="${p.prop}"/>`,
  mat: p => `
    <rect x="6" y="${BASE - 16}" width="44" height="16" fill="${p.propDark}"/>
    <rect x="10" y="${BASE - 13}" width="36" height="10" fill="${p.prop}"/>
    ${[14, 22, 30, 38].map(x => `<rect x="${x}" y="${BASE - 13}" width="2" height="10" fill="${p.propDark}"/>`).join("")}
    <rect x="6" y="${BASE - 16}" width="44" height="2" fill="${p.accent}" opacity="0.7"/>`,
}

// ── Wall items ────────────────────────────────────────────────────────────────
// Hung ON the wall, so these are drawn on the face band: TILE wide, BAND tall, and nothing touches
// the band's bottom edge — that edge is the floor line, and an item resting on it reads as standing
// in the room rather than hanging above it.
type WallKind = "niche" | "stela" | "sconce" | "veil" | "starShaft" | "wallShrine" | "tallyBoard" | "mask"

const WALL_KINDS: WallKind[] = ["niche", "stela", "sconce", "veil", "starShaft", "wallShrine", "tallyBoard", "mask"]

const H = BAND // the band, top to floor line
const wallShapes: Record<WallKind, (p: Palette) => string> = {
  niche: p => `
    <rect x="14" y="4" width="28" height="${H - 8}" fill="${p.outline}"/>
    <rect x="17" y="7" width="22" height="${H - 13}" fill="${p.propDark}"/>
    <rect x="20" y="${H - 14}" width="7" height="8" fill="${p.prop}"/>
    <rect x="29" y="${H - 12}" width="8" height="6" fill="${p.accent}"/>`,
  stela: p => `
    <rect x="18" y="6" width="20" height="${H - 10}" fill="${p.prop}"/>
    <rect x="21" y="9" width="14" height="${H - 15}" fill="${p.propDark}"/>
    <rect x="24" y="12" width="8" height="2" fill="${p.accent}"/>
    <rect x="24" y="16" width="8" height="2" fill="${p.accent}"/>`,
  sconce: p => `
    <rect x="26" y="8" width="4" height="${H - 14}" fill="${p.propDark}"/>
    <rect x="20" y="4" width="16" height="6" fill="${p.prop}"/>
    <ellipse cx="28" cy="6" rx="8" ry="4" fill="${p.accent}"/>`,
  veil: p => `
    <rect x="8" y="4" width="40" height="3" fill="${p.propDark}"/>
    <path d="M 12 7 L 12 ${H - 4} Q 28 ${H - 1} 44 ${H - 4} L 44 7 Z" fill="${p.prop}"/>
    <rect x="26" y="7" width="4" height="${H - 11}" fill="${p.accent}" opacity="0.5"/>`,
  starShaft: p => `
    <rect x="16" y="4" width="24" height="${H - 9}" fill="${p.outline}"/>
    <rect x="19" y="7" width="18" height="${H - 15}" fill="#0b0d1c"/>
    <rect x="23" y="10" width="2" height="2" fill="#ffffff"/>
    <rect x="31" y="13" width="2" height="2" fill="#ffffff"/>
    <rect x="27" y="${H - 12}" width="2" height="2" fill="${p.accent}"/>`,
  wallShrine: p => `
    <path d="M 12 10 L 28 3 L 44 10 Z" fill="${p.prop}"/>
    <rect x="16" y="10" width="24" height="${H - 15}" fill="${p.propDark}"/>
    <rect x="22" y="13" width="12" height="${H - 21}" fill="${p.accent}" opacity="0.6"/>`,
  tallyBoard: p => `
    <rect x="10" y="5" width="36" height="${H - 12}" fill="${p.prop}"/>
    ${[15, 20, 25, 33, 38].map(x => `<rect x="${x}" y="8" width="2" height="${H - 18}" fill="${p.propDark}"/>`).join("")}
    <rect x="10" y="5" width="36" height="2" fill="${p.accent}" opacity="0.6"/>`,
  mask: p => `
    <rect x="20" y="4" width="16" height="4" fill="${p.accent}"/>
    <ellipse cx="28" cy="${H / 2 + 1}" rx="10" ry="${H / 2 - 5}" fill="${p.prop}"/>
    <rect x="23" y="${H / 2 - 2}" width="4" height="2" fill="${p.outline}"/>
    <rect x="30" y="${H / 2 - 2}" width="4" height="2" fill="${p.outline}"/>`,
}

// ── Archway ───────────────────────────────────────────────────────────────────
// Stands in the band above a doorway — the gap where a passage meets a chamber — and half a band PROUD
// of it, the way a pylon gate rises above the wall it pierces. The middle stays TRANSPARENT: the floor of
// the way through shows beneath it, so the arch reads as something the player walks under. The renderer
// paints it over everything, explorer included, and fades it while the player is in the doorway.
const archSvg = (tier: string): Buffer => {
  const p = PALETTES[tier]
  // The jambs occupy the CORNER slots either side of the doorway — the wall's own thickness — so the way
  // through stays a full cell wide and a figure walks between them rather than behind them.
  const jamb = SIDE_W
  const cornice = 6 // the flared crown, full width — thin, because every pixel of it is opening lost
  const lintel = 4
  const shoulder = cornice + lintel // where the clear opening starts
  return svg(
    ARCH_W,
    ARCH_H,
    `<g stroke="${p.outline}" stroke-width="2" stroke-linejoin="round">
       <!-- cavetto cornice: the flared crown of an Egyptian gateway, oversailing the jambs it sits on -->
       <rect x="0" y="0" width="${ARCH_W}" height="${cornice}" fill="${p.wallTop}"/>
       <rect x="0" y="0" width="${ARCH_W}" height="2" fill="${p.accent}" opacity="0.6"/>
       <rect x="2" y="${cornice}" width="${ARCH_W - 4}" height="${lintel}" fill="${p.wall}"/>
       <!-- jambs, in the corners and standing all the way down onto the floor of the way through -->
       <rect x="0" y="${shoulder}" width="${jamb}" height="${ARCH_H - shoulder}" fill="${p.wall}"/>
       <rect x="${ARCH_W - jamb}" y="${shoulder}" width="${jamb}" height="${ARCH_H - shoulder}" fill="${p.wall}"/>
       <!-- the soffit: the underside of the lintel, darker, which is what makes the opening read as deep -->
       <rect x="${jamb}" y="${shoulder}" width="${ARCH_W - jamb * 2}" height="3" fill="${p.wallBase}"/>
     </g>`
  )
}

const wallItemSvg = (tier: string, kind: WallKind): Buffer => {
  const p = PALETTES[tier]
  return svg(TILE, BAND, `<g stroke="${p.outline}" stroke-width="2" stroke-linejoin="round">${wallShapes[kind](p)}</g>`)
}

const propSvg = (tier: string, kind: Kind): Buffer => {
  const p = PALETTES[tier]
  // A brazier is the tier's light source, so it carries its own glow — in this idiom the lighting
  // is a sprite halo, not a shader.
  const glow =
    kind === "brazier"
      ? `<defs><radialGradient id="glow"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.5"/>
           <stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient></defs>
         <circle cx="28" cy="${BASE - 26}" r="26" fill="url(#glow)"/>`
      : ""
  return svg(
    TILE,
    PROP_H,
    `${glow}
     <rect x="12" y="${BASE - 2}" width="32" height="4" fill="${p.outline}" opacity="0.4"/>
     <g stroke="${p.outline}" stroke-width="2" stroke-linejoin="round">${shapes[kind](p)}</g>`
  )
}

// ── The explorer ──────────────────────────────────────────────────────────────
// One person walking down five ranks of tomb, so this art lives in tiles/default/ and is NOT per tier:
// a rank dresses the place, never the player. Three facings — south (met face on), north (walking away),
// east (profile); west is east mirrored by the renderer, which is why there is no fourth file.
//
// Bottom-anchored like a prop, with its own palette rather than a tier's: the explorer has to read
// against limestone and against black granite alike, so it is light linen and dark hair either way.
const CHAR_W = 40
const CHAR_H = 48
const SKIN = "#c98a52"
const LINEN = "#e8e2d0"
const HAIR = "#1b1712"
const SASH = "#c8a33c"
const INK = "#120f0b"

const explorerSvg = (facing: "s" | "n" | "e"): Buffer => {
  const feet = CHAR_H - 2
  const body = `
    <rect x="12" y="${feet - 26}" width="16" height="20" fill="${LINEN}"/>
    <rect x="12" y="${feet - 14}" width="16" height="3" fill="${SASH}"/>
    <rect x="14" y="${feet - 6}" width="4" height="6" fill="${SKIN}"/>
    <rect x="22" y="${feet - 6}" width="4" height="6" fill="${SKIN}"/>`
  const head = `<rect x="14" y="${feet - 40}" width="12" height="14" fill="${SKIN}"/>`
  const hairCap = `<rect x="13" y="${feet - 42}" width="14" height="7" fill="${HAIR}"/>`
  const face =
    facing === "s"
      ? `<rect x="16" y="${feet - 33}" width="2" height="2" fill="${INK}"/>
         <rect x="22" y="${feet - 33}" width="2" height="2" fill="${INK}"/>`
      : facing === "e"
        ? `<rect x="26" y="${feet - 33}" width="3" height="3" fill="${SKIN}"/>
           <rect x="23" y="${feet - 33}" width="2" height="2" fill="${INK}"/>`
        : "" // walking away: the back of a head has no face on it
  const arms =
    facing === "e"
      ? `<rect x="26" y="${feet - 24}" width="4" height="12" fill="${SKIN}"/>`
      : `<rect x="8" y="${feet - 24}" width="4" height="12" fill="${SKIN}"/>
         <rect x="28" y="${feet - 24}" width="4" height="12" fill="${SKIN}"/>`
  return svg(
    CHAR_W,
    CHAR_H,
    `<ellipse cx="20" cy="${feet}" rx="12" ry="3" fill="${INK}" opacity="0.35"/>
     <g stroke="${INK}" stroke-width="2" stroke-linejoin="round">
       ${arms}${body}${head}${hairCap}
     </g>
     ${facing === "n" ? `<rect x="13" y="${feet - 36}" width="14" height="4" fill="${HAIR}"/>` : ""}
     ${face}`
  )
}

// ── Write ─────────────────────────────────────────────────────────────────────

const write = async (tier: string, name: string, data: Buffer, w: number, h: number): Promise<void> => {
  const dir = join(OUT_ROOT, tier)
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${name}.png`)
  await sharp(data).png({ compressionLevel: 9 }).toFile(file)
  const meta = await sharp(file).metadata()
  if (meta.width !== w || meta.height !== h) {
    throw new Error(`${tier}/${name}.png rasterised to ${meta.width}x${meta.height}, expected ${w}x${h}`)
  }
}

// ── Preview ───────────────────────────────────────────────────────────────────
// A dry run of the renderer, not a swatch sheet: a hand-written plan, drawn with the same
// world-aligned `<pattern>` fills the renderer will use, and the same wall rules — a wall cell
// shows its FACE when the cell below it is walkable, otherwise its TOP.
//
// `#` wall/void, `.` corridor, `R` room (props allowed), `T` corridor with a threshold sill.
const PLAN = [
  "##########", //
  "##......##",
  "##.####.##",
  "##.#RR#.##",
  "##.#RR#.##",
  "##T####.##",
  "##......##",
  "##########",
]

const PROP_AT: Record<string, Kind> = {
  "1,3": "brazier",
  "1,6": "jarRack",
  "3,4": "statue",
  "4,5": "chestProp",
  "6,7": "chestProp",
  "6,4": "rubble",
  "6,6": "pillar",
}

const preview = async (tiers: string[]): Promise<string> => {
  const rows = PLAN.length
  const cols = PLAN[0].length
  const pw = TILE * cols
  const ph = TILE * rows
  const at = (r: number, c: number): string => PLAN[r]?.[c] ?? "#"
  const walkable = (r: number, c: number): boolean => at(r, c) !== "#"
  // A wall is the void the maze leaves next to a passage. Void further out than that is unlit
  // stone the map draws nothing for.
  const isWall = (r: number, c: number): boolean => {
    if (walkable(r, c)) return false
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) if (walkable(r + dr, c + dc)) return true
    }
    return false
  }

  const uri = (file: string): string => `data:image/png;base64,${readFileSync(file).toString("base64")}`

  const panels = tiers.map((tier, i) => {
    const p = PALETTES[tier]
    const dir = join(OUT_ROOT, tier)
    const ox = i * pw
    const defs = [
      `<pattern id="floor-${tier}" x="${ox}" width="${MEGA}" height="${MEGA}" patternUnits="userSpaceOnUse">
         <image href="${uri(join(dir, "floor.png"))}" width="${MEGA}" height="${MEGA}"/></pattern>`,
      `<pattern id="face-${tier}" x="${ox}" width="${MEGA}" height="${FACE}" patternUnits="userSpaceOnUse">
           <image href="${uri(join(dir, "wall-face.png"))}" width="${MEGA}" height="${FACE}"/></pattern>`,
    ].join("")

    const floors: string[] = []
    const tops: string[] = []
    const faces: string[] = []
    const props: string[] = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * TILE
        const y = r * TILE
        if (walkable(r, c)) {
          floors.push(`<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="url(#floor-${tier})"/>`)
          if (at(r, c) === "T") {
            faces.push(
              `<image href="${uri(join(dir, "threshold.png"))}" x="${x}" y="${y}" width="${TILE}" height="${SILL}"/>`
            )
          }
          const prop = PROP_AT[`${r},${c}`]
          if (prop && ALL_KINDS.includes(prop)) {
            props.push(
              // Drawn on the cell's floor line with the band's headroom above it, exactly as the renderer does.
              `<image href="${uri(join(dir, `${prop}.png`))}" x="${x}" y="${y - BAND}" width="${TILE}" height="${PROP_H}"/>`
            )
          }
          continue
        }
        if (!isWall(r, c)) continue
        // Face where there is floor below to look at it from, top surface otherwise. A one-cell-thick
        // wall is therefore all face, which is what makes it read as a wall rather than a ledge.
        if (walkable(r + 1, c)) {
          faces.push(
            `<rect x="${x}" y="${y}" width="${TILE}" height="${FACE}" fill="url(#face-${tier})"/>`,
            // The hard shadow the wall throws on the floor in front of it — in this idiom that
            // shadow, not the floor shading, is what puts the wall above the ground.
            `<rect x="${x}" y="${y + FACE}" width="${TILE}" height="6" fill="${p.outline}" opacity="0.45"/>`
          )
        } else {
          tops.push(`<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="${p.wallBase}"/>`)
        }
        // The wall silhouette is outlined in near-black wherever it meets floor. It is what stops
        // a wall mass and a lit floor of similar value from blurring into each other.
        if (walkable(r - 1, c)) faces.push(`<rect x="${x}" y="${y}" width="${TILE}" height="2" fill="${p.outline}"/>`)
        if (walkable(r, c - 1)) faces.push(`<rect x="${x}" y="${y}" width="2" height="${TILE}" fill="${p.outline}"/>`)
        if (walkable(r, c + 1)) {
          faces.push(`<rect x="${x + TILE - 2}" y="${y}" width="2" height="${TILE}" fill="${p.outline}"/>`)
        }
      }
    }
    return `<defs>${defs}</defs>${floors.join("")}${tops.join("")}${faces.join("")}${props.join("")}`
  })

  const file = join(OUT_ROOT, "preview.png")
  await sharp(svg(pw * tiers.length, ph, `<rect width="100%" height="100%" fill="#0b0b0e"/>${panels.join("")}`))
    .png()
    .toFile(file)
  return file
}

const main = async (): Promise<void> => {
  const tiers = Object.keys(PALETTES)
  let count = 0
  for (const tier of tiers) {
    await write(tier, "floor", floorSvg(tier), MEGA, MEGA)
    await write(tier, "wall-face", wallFaceSvg(tier), MEGA, FACE)
    await write(tier, "threshold", thresholdSvg(tier), TILE, SILL)
    for (const kind of ALL_KINDS) await write(tier, kind, propSvg(tier, kind), TILE, PROP_H)
    for (const kind of WALL_KINDS) await write(tier, kind, wallItemSvg(tier, kind), TILE, BAND)
    await write(tier, "arch", archSvg(tier), ARCH_W, ARCH_H)
    count += 4 + ALL_KINDS.length + WALL_KINDS.length
  }
  // Shared art, written once: the explorer is not a rank.
  for (const facing of ["s", "n", "e"] as const) {
    await write("default", `explorer-${facing}`, explorerSvg(facing), CHAR_W, CHAR_H)
    count++
  }
  console.log(`${count} dummy tiles written to src/assets/tiles/ (${tiers.length} tiers + shared)`)
  if (process.argv.includes("--preview")) console.log(`preview: ${await preview(tiers)}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
