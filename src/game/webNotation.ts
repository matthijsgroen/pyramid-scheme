// THE WEB NOTATION: one tier's sand web as blocks of lines, each block a place in the world and every address in it
// relative to that place (docs/instructions/sand-pyramid.md). Reading only: what a place resolves to is webLine.ts's.

export const WEB_SYNTAX = `
A WEB (a .web file): blocks, each a place in the world, every line inside relative to it
  // designed by: name             a web opens with its designer
  [w3]                             a journey block: wizard_3, all its pyramids; a place may start with pM
  [w3p1]                           a pyramid block: wizard_3, pyramid 1 (its levelNr)

ACTIVATORS (each name once in the web; lever and key differ only in look)
  lever reed @60% side             at the end of the first side section hanging off the main path after 60%
  key ankh @55%                    at the main-path room nearest 55% of the line
  lever sun @end                   at the last room of the main path
  lever lotus @weighing.vault      in region vault of lock weighing on this pyramid (f1.weighing.vault on floor 1)

SAND (a pot: the Nth lever pulled, whichever, clears to the Nth stop; the last stop is 100%)
  sand by sun moon star            over this block's line, stops spaced equally: 33% 67% 100%
  sand 40% 75% 100% by sun moon star    the stops written
  sand from 50%: 75% 100% by reed ankh  the sand starts at 50%; before it the line is playable
  sand p3 by sun moon              in a journey block: over pyramid 3's line
  sand f1.s4 by sun                over one side section's own line
  sand weighing.A by moon          a lock's outside input, held once moon is taken

DOORS
  ankh opens 70%                   a door on the main-path seam nearest 70%, shut until ankh
  ankh opens side @80%             a door at the mouth of the first side section after 80%
`.slice(1)

export type WebLook = "lever" | "key"

/** Where an activator stands. `pyramid` is set only by a `pM` prefix inside a journey block. */
export type ActivatorPlace = { pyramid?: number } & (
  | { kind: "end" }
  | { kind: "room"; pct: number }
  | { kind: "side"; pct: number }
  | { kind: "region"; floor?: number; lock: string; region: string }
)

/** Where an `opens` door stands. */
export type DoorPlace = { pyramid?: number } & ({ kind: "seam"; pct: number } | { kind: "mouth"; pct: number })

/** What a `sand` line covers. */
export type SandTarget = { pyramid?: number } & (
  | { kind: "line" }
  | { kind: "section"; floor: number; address: string }
  | { kind: "input"; floor?: number; lock: string; input: string }
)

export type WebLine = { n: number; text: string } & (
  | { type: "activator"; look: WebLook; name: string; place: ActivatorPlace }
  | { type: "sand"; target: SandTarget; from?: number; stops?: number[]; levers: string[] }
  | { type: "opens"; name: string; place: DoorPlace }
)

export type WebBlock = { n: number; journey: number; pyramid?: number; lines: WebLine[] }

export type Web = { name: string; designedBy?: string; blocks: WebBlock[] }

const NAME = /^[A-Za-z]\w*$/
const PCT = /^(\d+(?:\.\d+)?)%$/

const percent = (word: string | undefined): number | undefined => {
  const m = word === undefined ? null : PCT.exec(word)
  return m ? Number(m[1]) : undefined
}

/** Reads a web. A line it cannot read throws, naming the line; whether a place exists is resolved against a world. */
export const parseWeb = (text: string, name = "web"): Web => {
  const fail = (n: number, message: string): never => {
    throw new Error(`line ${n}: ${message}`)
  }
  const designedBy = /^\s*\/\/\s*designed by:\s*(.+?)\s*$/m.exec(text)?.[1]
  const blocks: WebBlock[] = []
  text.split("\n").forEach((raw, i) => {
    const n = i + 1
    const line = raw.replace(/\/\/.*/, "").trim()
    if (line === "") return
    const heading = /^\[w(\d+)(?:p(\d+))?\]$/.exec(line)
    if (heading) {
      blocks.push({ n, journey: Number(heading[1]), pyramid: heading[2] ? Number(heading[2]) : undefined, lines: [] })
      return
    }
    if (line.startsWith("[")) fail(n, `cannot read the block "${line}": write [w3] or [w3p1]`)
    const block = blocks[blocks.length - 1] ?? fail(n, "a line stands in a block: start with [w3] or [w3p1]")
    const words = line.split(/\s+/)
    // A `pM` prefix names a pyramid of a journey block; inside a pyramid block the block is the pyramid.
    const pyramidOf = (at: number): { pyramid?: number; next: number } => {
      const m = /^p(\d+)$/.exec(words[at] ?? "")
      if (!m) return { next: at }
      if (block.pyramid !== undefined)
        fail(n, `${words[at]} names a pyramid inside the pyramid block [w${block.journey}p${block.pyramid}]`)
      return { pyramid: Number(m[1]), next: at + 1 }
    }
    const named = (word: string | undefined): string => {
      if (word === undefined || !NAME.test(word)) fail(n, `cannot read the name "${word ?? ""}"`)
      return word!
    }

    if (words[0] === "lever" || words[0] === "key") {
      const look = words[0]
      const name = named(words[1])
      const { pyramid, next } = pyramidOf(2)
      const rest = words.slice(next)
      const at = rest[0] ?? ""
      if (!at.startsWith("@"))
        fail(n, `an activator stands at a place: ${look} ${name} @end, @45%, @60% side or @lock.region`)
      const spot = at.slice(1)
      const pct = percent(spot)
      let place: ActivatorPlace
      if (spot === "end" && rest.length === 1) place = { pyramid, kind: "end" }
      else if (pct !== undefined && rest.length === 1) place = { pyramid, kind: "room", pct }
      else if (pct !== undefined && rest.length === 2 && rest[1] === "side") place = { pyramid, kind: "side", pct }
      else {
        const parts = spot.split(".")
        const floor = /^f(\d+)$/.exec(parts[0])
        const path = floor ? parts.slice(1) : parts
        if (rest.length !== 1 || path.length !== 2 || !path.every(p => NAME.test(p)))
          fail(n, `cannot read the place "${rest.join(" ")}"`)
        place = { pyramid, kind: "region", floor: floor ? Number(floor[1]) : undefined, lock: path[0], region: path[1] }
      }
      block.lines.push({ n, text: line, type: "activator", look, name, place })
      return
    }

    if (words[0] === "sand") {
      const by = words.indexOf("by")
      if (by < 0) fail(n, "a sand line names its levers after by: sand by sun moon")
      const levers = words.slice(by + 1).map(named)
      if (levers.length === 0) fail(n, "a sand line names at least one lever after by")
      const { pyramid, next } = pyramidOf(1)
      let at = next
      let target: SandTarget = { pyramid, kind: "line" }
      const address = words[at]
      if (at < by && address !== "from" && percent(address) === undefined) {
        const parts = address.split(".")
        const floor = /^f(\d+)$/.exec(parts[0])
        const path = floor ? parts.slice(1) : parts
        if (path.length === 0 || !path.every(p => /^[\w-]+$/.test(p)))
          fail(n, `cannot read the sand's place "${address}"`)
        // `fN.<name>…` is a section, or an input of a lock on floor N; which, the world says. Bare `lock.input` is an input.
        if (!floor && path.length !== 2) fail(n, `cannot read the sand's place "${address}": write f1.s4 or lock.input`)
        target = floor
          ? { pyramid, kind: "section", floor: Number(floor[1]), address: path.join(".") }
          : { pyramid, kind: "input", lock: path[0], input: path[1] }
        at++
      }
      let from: number | undefined
      if (words[at] === "from") {
        const written = words[at + 1] ?? ""
        from = percent(written.replace(/:$/, ""))
        if (from === undefined) fail(n, "the sand's start is written from 50%:")
        at += 2
      }
      const stopWords = words.slice(at, by)
      const stops = stopWords.map(word => percent(word) ?? fail(n, `cannot read the stop "${word}": write 50%`))
      block.lines.push({
        n,
        text: line,
        type: "sand",
        target,
        ...(from !== undefined ? { from } : {}),
        ...(stops.length > 0 ? { stops } : {}),
        levers,
      })
      return
    }

    if (words[1] === "opens") {
      const name = named(words[0])
      const { pyramid, next } = pyramidOf(2)
      const rest = words.slice(next)
      const pct = percent(rest[rest.length - 1]?.replace(/^@/, ""))
      let place: DoorPlace | undefined
      if (rest.length === 1 && pct !== undefined && !rest[0].startsWith("@")) place = { pyramid, kind: "seam", pct }
      if (rest.length === 2 && rest[0] === "side" && rest[1].startsWith("@") && pct !== undefined)
        place = { pyramid, kind: "mouth", pct }
      if (!place)
        fail(n, `cannot read the door "${rest.join(" ")}": write ${name} opens 70% or ${name} opens side @80%`)
      block.lines.push({ n, text: line, type: "opens", name, place: place! })
      return
    }

    fail(n, `cannot read "${line}"`)
  })
  return { name, ...(designedBy ? { designedBy } : {}), blocks }
}
