import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// The mechanism path of core: how a control's room is made, how a door gets its face, how a room is
// drawn. Families arrive here as data from the resolver and the registry; the one catalogue that may name
// them is encounterFallback.ts, for callers with no registry.
const MECHANISM_PATH = [
  "src/game/siteAssembler.ts",
  "src/game/gateFace.ts",
  "src/game/mechanismDoors.ts",
  "src/app/SiteMap/nodeKinds.ts",
  "src/app/SiteMap/nodeShapes.tsx",
  "src/app/SiteMap/SiteMapView.tsx",
  "src/app/SiteMap/useAssembledFloor.ts",
]

const MECHANISM_FAMILY_IDS = ["torch", "handle", "gate-face", "lightbeamSwitch", "HANDLE_FAMILY", "GATE_FACE_FAMILY"]

const codeOf = (path: string) =>
  readFileSync(path, "utf8")
    .split("\n")
    .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n")

describe("core names no mechanism family", () => {
  it.each(MECHANISM_PATH)("%s holds no mechanism family id in code", path => {
    const code = codeOf(path)
    // "handle" is also the lever marker's shape name, which nodeKinds and nodeShapes own.
    const shapeVocabulary = path.endsWith("nodeKinds.ts") || path.endsWith("nodeShapes.tsx")
    const named = MECHANISM_FAMILY_IDS.filter(id => {
      if (id === "handle" && shapeVocabulary) return false
      return new RegExp(/^[A-Z_]+$/.test(id) ? `\\b${id}\\b` : `["'\`]${id}["'\`]`).test(code)
    })
    expect(named).toEqual([])
  })
})
