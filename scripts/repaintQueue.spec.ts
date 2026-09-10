import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * STATUES ARE THE EXCEPTION, and only statues — the rule the queue's own preamble states, and the one
 * that lapses whenever entries are written in bulk.
 *
 * Every other scaffold hands over the object's real silhouette, so its prompt ends "keep every edge,
 * every proportion and every silhouette exactly as in the reference". A figure's cannot: boxes do not
 * describe a carved contour, so a statue's scaffold is an ENVELOPE and its prompt has to release the
 * contour and cut INWARD, or the mask clips whatever the generator adds.
 *
 * It lapsed on six of seven patron statues in one sitting. They were written from the landed tiles they
 * vary rather than from `master/statue`, inherited the strict sentence with everything else, and the
 * first roll off one came back — in the author's words — "super blocky", which is exactly what telling a
 * generator to keep every edge of a box buys.
 *
 * A statue entry must therefore CARVE and must not KEEP, and the two are checked separately because
 * having neither is as wrong as having both.
 */
const QUEUE = join(__dirname, "..", "docs", "instructions", "repaint-queue.md")

const STRICT = "Keep every edge, every proportion and every silhouette exactly as in the reference image"
const PAINTED_SHADOW = "The shadow at its foot is part of the picture"

/** One block per `### \`tier/name\`` heading, which is how `repaintPrompt.ts` reads the file too. */
const entries = readFileSync(QUEUE, "utf8")
  .split(/^### /m)
  .slice(1)
  .flatMap(block => {
    const key = /^`([a-z]+\/[A-Za-z0-9-]+)`/.exec(block)?.[1]
    return key ? [{ key, block }] : []
  })

const statues = entries.filter(e => e.key.split("/")[1].startsWith("statue"))

describe("the repaint queue's statue entries", () => {
  it("has some to check", () => {
    expect(statues.length).toBeGreaterThan(0)
  })

  it.each(statues.map(s => s.key))("%s releases the contour and cuts inward", key => {
    const { block } = statues.find(s => s.key === key)!
    expect(block).toMatch(/INWARD/)
  })

  it.each(statues.map(s => s.key))("%s does not also demand every edge be kept", key => {
    const { block } = statues.find(s => s.key === key)!
    expect(block).not.toContain(STRICT)
  })

  /**
   * The envelope block ends "nothing is added below the plinth either — no ground, no shadow, no floor",
   * and the shared shadow line asks for one at the object's foot. Both in the same prompt is a straight
   * contradiction, and the rendered seat supplies that shadow anyway.
   */
  it.each(statues.map(s => s.key))("%s does not ask for a painted shadow as well", key => {
    const { block } = statues.find(s => s.key === key)!
    expect(block).not.toContain(PAINTED_SHADOW)
  })
})

/**
 * The converse, and the exceptions are the interesting half.
 *
 * "Keep every edge" is owed by an entry that HANDS OVER A SILHOUETTE — one whose import line cuts the
 * return to a rendered mask. Two kinds of entry do not:
 *
 * - **Flat things** — the tally boards, the stelae, the condition sprites. There is no mesh
 *   and no mask: Step 0 sends a slab straight to the generator and its own outline becomes the tile.
 *   There is no reference silhouette to hold the paint to, so the prompt says "draw it square on and
 *   flat" instead.
 * - **Scatter** — the rubble piles and spills. The mask holds the shape whatever the paint does, so
 *   these say the opposite in as many words: the arrangement need not match the reference. The
 *   merchant's spill came back as forty of its own fragments against a modelled fourteen and the tile
 *   was fine.
 * - **Mats**, which are masked and still exempt. A mat is a rectangle lying on the floor and under this
 *   projection it has no silhouette at all — `prim_mat` records that its identity is entirely PAINT, so
 *   nothing about its outline is worth holding and the prompt says "fill the whole shape to its edges"
 *   instead.
 *
 * So the check is on masked entries that are none of those, and it is the one that would have caught
 * the six patron statues from the other direction had they not been statues.
 */
const holdsItsShape = (block: string) =>
  /--mask=/.test(block) &&
  !/need not match the reference/.test(block) &&
  !/Fill the whole shape to its edges/.test(block)

describe("the repaint queue's other entries", () => {
  it.each(entries.filter(e => !e.key.split("/")[1].startsWith("statue") && holdsItsShape(e.block)).map(e => e.key))(
    "%s holds the paint to the reference",
    key => {
      const { block } = entries.find(e => e.key === key)!
      expect(block).toContain(STRICT)
    }
  )
})
