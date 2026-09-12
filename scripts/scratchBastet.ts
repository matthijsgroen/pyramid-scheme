import { assembleFloor } from "../src/game/siteAssembler"
import { journeys } from "../src/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "../src/game/siteSeed"

const journey = journeys.find(j => j.id === "starter_3")!
const seed = persistentInteriorSeed(journey.id)
const site = journey.siteConfigs![0]
const r = assembleFloor(journey.id, site[0], floorAssemblySeed(seed, 1, 0), undefined, {
  floorRef: { journeyId: journey.id, floorIndex: 0 },
})
if (!r.success) throw new Error("assembly failed")
let n = 0
for (const [ri, row] of r.grid.cells.entries())
  for (const [ci, cell] of row.entries()) {
    if (cell.type !== "room") continue
    n++
    const c = cell as unknown as Record<string, unknown>
    console.log(
      `${String(n).padStart(2)} (${ri},${ci}) ${String(c.roomType).padEnd(9)} dirs=${[...(cell.dirs ?? [])].join("")}` +
        ` tags=${(c.tags as string[] | undefined)?.join(",") ?? "-"}` +
        ` prop=${c.decoration ?? "-"} wall=${c.wallDecoration ?? "-"}`
    )
  }
console.log(`rooms: ${n}  patron: ${r.grid.patron}`)
