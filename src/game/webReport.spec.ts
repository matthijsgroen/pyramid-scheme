import { describe, expect, it } from "vitest"
import { webReport } from "./webReport"
import { walkWeb } from "./webWalk"
import { plain, resolve, world } from "./webFixtures.testing"

describe("the web report", () => {
  it("passes a sound web and says where each stop landed", () => {
    const resolved = resolve(
      "[w1p1]\nsand from 50%: 100% by sun\n[w2p1]\nlever sun @end",
      world({ 1: [plain(9)], 2: [plain(3)] })
    )
    const { text, sound } = webReport(resolved, walkWeb(resolved))
    expect(sound).toBe(true)
    expect(text).toContain("✓ every pull order finishes: 1 activators, 2 reachable pull sets, each closes on all 1")
    expect(text).toContain("  from 50%         w1p1 f0 seam 3|4")
    expect(text).toContain("cheapest: 2 visits, no return")
  })

  it("fails a web with a refusal, naming its line", () => {
    const resolved = resolve("[w1p4]\nlever sun @end", world({ 1: [plain(9)] }))
    const { text, sound } = webReport(resolved, undefined)
    expect(sound).toBe(false)
    expect(text).toContain("✗ placeNotInWorld (line 1): wizard_1 has no pyramid 4")
  })

  it("fails a web whose journey floors do not walk sound", () => {
    const resolved = resolve("[w1p1]\nsand by sun\n[w2p1]\nlever sun @end", world({ 1: [plain(3)], 2: [plain(3)] }))
    const { sound } = webReport(resolved, walkWeb(resolved), { walked: 1, failures: ["wizard_1 pyramid 1 floor 0: x"] })
    expect(sound).toBe(false)
  })
})
