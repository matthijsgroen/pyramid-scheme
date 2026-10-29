#!/usr/bin/env tsx
/**
 * Draws a designed room written in prefabNotation.ts's notation and runs the prefab check on it.
 *
 *   yarn room                      the catalogue as one table: tier, layouts, variants, fills, faults
 *   yarn room hall                 one of them: its faults, and each variant drawn with one sample fill
 *   yarn room --new junior/hall    starts src/game/rooms/junior/hall.room with the notation as comments
 *   yarn room --help               the notation
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { fillsOf, placeBlobs, prefabFaults, variantsOf } from "../src/game/prefabChecks"
import type { Variant } from "../src/game/prefabChecks"
import { PREFAB_SYNTAX } from "../src/game/prefabNotation"
import type { Prefab } from "../src/game/prefabTypes"
import { ROOM_CATALOGUE, ROOM_ENTRIES, newRoomText } from "../src/game/roomCatalogue"
import { difficulties } from "../src/data/difficultyLevels"
import type { Difficulty } from "../src/data/difficultyLevels"

const args = process.argv.slice(2)
const newIndex = args.indexOf("--new")
const named = args.find((arg, i) => !arg.startsWith("--") && (newIndex < 0 || i !== newIndex + 1))

/** The variant's drawing with one sample fill: filled places show their letters, unfilled optional ones a dot. */
const drawVariant = (variant: Variant, prefab: Prefab): string => {
  const [fill] = fillsOf(variant, prefab)
  const grid = variant.cells.map(row => [...row])
  for (const blob of placeBlobs(variant, prefab)) {
    if (fill?.has(`${blob.top},${blob.left}`)) continue
    for (let r = blob.top; r < blob.top + blob.rows; r++)
      for (let c = blob.left; c < blob.left + blob.cols; c++) grid[r][c] = "."
  }
  return grid.map(row => row.join(" ")).join("\n")
}

const variantLabel = (variant: Variant, prefab: Prefab): string =>
  [prefab.layouts[variant.layout].name || "layout", variant.mirrored ? "mirrored" : ""].filter(Boolean).join(" ")

const report = (name: string, prefab: Prefab): boolean => {
  const faults = prefabFaults(prefab)
  const lines = [
    `## ${name}`,
    "",
    faults.length === 0 ? "every variant walks in every fill" : faults.map(f => `✗ ${f}`).join("\n"),
  ]
  for (const variant of variantsOf(prefab))
    lines.push(
      "",
      `${variantLabel(variant, prefab)} (${fillsOf(variant, prefab).length} fills)`,
      drawVariant(variant, prefab)
    )
  console.log(lines.join("\n") + "\n")
  return faults.length === 0
}

const table = (): boolean => {
  const rows = ROOM_ENTRIES.map(entry => {
    const prefab = ROOM_CATALOGUE[entry.name]
    const variants = variantsOf(prefab)
    return {
      name: `${entry.tier}/${entry.path}`,
      layouts: prefab.layouts.length,
      variants: variants.length,
      fills: variants.reduce((sum, variant) => sum + fillsOf(variant, prefab).length, 0),
      faults: prefabFaults(prefab).length,
    }
  })
  const header = ["room", "layouts", "variants", "fills", "faults"]
  const cells = [header, ...rows.map(r => [r.name, `${r.layouts}`, `${r.variants}`, `${r.fills}`, `${r.faults}`])]
  const widths = header.map((_, i) => Math.max(...cells.map(row => row[i].length)))
  console.log(
    cells
      .map(row =>
        row
          .map((cell, i) => cell.padEnd(widths[i]))
          .join("  ")
          .trimEnd()
      )
      .join("\n")
  )
  return rows.every(row => row.faults === 0)
}

if (args.includes("--help")) {
  console.log(PREFAB_SYNTAX)
} else if (newIndex >= 0) {
  const target = args[newIndex + 1] ?? ""
  const [tier, name] = target.split("/")
  if (!(difficulties as readonly string[]).includes(tier) || !name) {
    console.error(`--new takes <tier>/<name>, a tier being ${difficulties.join(", ")}`)
    process.exitCode = 1
  } else {
    const path = `src/game/rooms/${tier}/${name}.room`
    if (existsSync(path)) {
      console.error(`${path} exists already`)
      process.exitCode = 1
    } else {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, newRoomText(tier as Difficulty, name))
      console.log(`started ${path}`)
    }
  }
} else if (!named) {
  process.exitCode = table() ? 0 : 1
} else {
  const entry = ROOM_ENTRIES.find(e => e.name === named || `${e.tier}/${e.path}` === named)
  if (!entry) {
    console.error(
      `no room called ${named}; the catalogue has ${ROOM_ENTRIES.map(e => e.name).join(", ") || "no rooms yet"}`
    )
    process.exitCode = 1
  } else process.exitCode = report(entry.name, ROOM_CATALOGUE[entry.name]) ? 0 : 1
}
