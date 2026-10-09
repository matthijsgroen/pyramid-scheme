import { describe, expect, it } from "vitest"
import type { Alignment } from "./lockAuthoring"
import { seatItems } from "./laidFloor"

type Row = [string, number, (Alignment | undefined)[], "start" | "end" | undefined, number[]]

describe("where a corridor's items stand among its nodes", () => {
  it.each<Row>([
    ["free items leave the spare nodes after the last", 5, [undefined, undefined], undefined, [0, 1]],
    ["a junction at the end draws the items to it", 5, [undefined, undefined], "end", [3, 4]],
    ["a junction at the start keeps the items beside it", 5, [undefined, undefined], "start", [0, 1]],
    ["aligned right, the last item stands right before its region", 4, [undefined, "right"], undefined, [0, 3]],
    ["aligned left behind a junction at the end, the spare nodes go between", 5, ["left", undefined], "end", [0, 4]],
    ["centred, an item keeps a node either side", 4, ["center"], undefined, [1]],
    ["centred beside a junction, only its far side gets one", 3, ["center"], "start", [0]],
    ["two centred items fill the gap they share once", 5, ["center", "center"], undefined, [1, 3]],
    ["centring stops when the spare nodes run out", 3, ["center", "center"], undefined, [1, 2]],
    ["every gap closed, the default gap takes them anyway", 3, ["left"], "end", [2]],
    ["no spare node seats every item in order, whatever is written", 2, ["center", "right"], "start", [0, 1]],
  ])("%s", (_, k, aligns, junction, expected) => {
    expect(seatItems(k, aligns, junction)).toEqual(expected)
  })

  it("seats free items where the carve seats them now, at either junction end and at none", () => {
    const now = (k: number, m: number, end?: "start" | "end") =>
      Array.from({ length: m }, (_, j) => (end === "end" ? k - m : 0) + j)
    for (const end of [undefined, "start", "end"] as const)
      for (let m = 0; m <= 4; m++)
        for (let k = m; k <= m + 5; k++)
          expect(seatItems(k, Array<undefined>(m).fill(undefined), end), `k=${k} m=${m} ${end}`).toEqual(now(k, m, end))
  })
})
