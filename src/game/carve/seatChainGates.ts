import { seamIndexFor, seatBarrierRun } from "../obstacles"
import { regionOfStep } from "../regions"
import { gateAtCell, keyOf } from "./derive"
import { pass } from "./state"

/**
 * WHERE EACH OFF-ROUTE GATE STANDS ON ITS CHAIN, by the chain's index and the cell along it. A lock laid its
 * gates where they stand. Otherwise an off-route obstacle seats on its chain's own step list the identical way
 * a main-path one seats on `stepRegion` — the same `seamIndexFor`, asked of the regions the chain's component
 * deals across its cells — prefixed with the chain's own mouth (the on-route region a chain cell never itself
 * carries, a cell being main path or side path but never both) so a gate at the mouth's own boundary asks the
 * same question as one further in. `cellIndex` is one less than the step `seamIndexFor` answers, since the
 * mouth is a virtual step ahead of `cells[0]`.
 *
 * A run's gates stand in the order stated: the one nearest the mouth on the seam, the rest on later cells of the
 * far region, never on the chain's end room, which is reserved. A run its chain is too short to seat is noted
 * (`runShort`, the first only) and the attempt goes on: whether it fails is `checkChainsSeated`'s call, and a
 * wider chain may seat it.
 */
export const seatChainGates = pass("seatChainGates", ["keys", "lay"], ["chainGates"], (prep, state) => {
  const { chainRegionsBySectionIdx } = prep.layout
  const { offRouteRuns } = prep.obstacles
  const laid = state.lay?.laid
  const gateAt = gateAtCell(state.lay)
  const at = new Map<string, { idx: number; cellIndex: number }>()
  let runShort: { between: [string, string]; barriers: string[] } | undefined
  for (const { cells, idx, parentIdx, laid: laidChain } of state.keys.chains) {
    if (laid && laidChain) {
      cells.forEach((cell, step) => {
        const gate = gateAt.get(keyOf(cell))
        if (gate !== undefined) at.set(gate, { idx, cellIndex: step })
      })
      continue
    }
    const chainRecord = parentIdx === undefined ? chainRegionsBySectionIdx.get(idx) : undefined
    if (!chainRecord) continue
    const extendedStepRegion = [chainRecord.mouth, ...regionOfStep(chainRecord.regions, cells.length)]
    for (const run of offRouteRuns) {
      if (run.gates.some(gate => at.has(gate.id))) continue
      const taken = new Set([...at.values()].filter(loc => loc.idx === idx).map(loc => loc.cellIndex))
      const steps = seatBarrierRun(
        extendedStepRegion,
        run.between,
        run.gates.length,
        step => step - 1 < cells.length - 1 && !taken.has(step - 1)
      )
      if (!steps) {
        if (seamIndexFor(extendedStepRegion, run.between) !== undefined && !runShort)
          runShort = { between: [run.between[0], run.between[1]], barriers: run.gates.map(gate => gate.id) }
        continue
      }
      run.gates.forEach((gate, i) => at.set(gate.id, { idx, cellIndex: steps[i] - 1 }))
    }
  }
  state.chainGates = runShort ? { at, runShort } : { at }
})
