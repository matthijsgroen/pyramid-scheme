import { useEffect, useMemo, useState, type FC } from "react"
import { parseLock } from "@/game/lockNotation"
import { notBuildable } from "@/game/lockWalkSpec"
import { walkFloorLock } from "@/game/floorLockWalk"
import { getOwnedKeys } from "@/game/gridNavigation"
import type { AssemblerReason, FloorConfig, FloorGrid } from "@/game/siteTypes"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { useProgression } from "@/app/state/useProgression"
import { useInventory } from "@/app/Inventory/useInventory"
import { PuzzleRoomContext } from "@/mods/core/app/puzzleState"
import { EncounterModal } from "./EncounterModal"
import { SiteMapView } from "./SiteMapView"
import { useAssembledFloor } from "./useAssembledFloor"
import { useEncounter } from "./useEncounter"
import { useMechanismStates } from "./useMechanismStates"
import { useNoticeLabel, usePromptLabel } from "./usePromptLabel"
import { useSiteNavigation } from "./useSiteNavigation"
import { useCrossing } from "./useCrossing"
import {
  PLAYGROUND_JOURNEY,
  REALISATION_CHOICES,
  carveStep,
  defaultBinding,
  playgroundFloor,
} from "./playgroundCarve.testing"

// THE LOCK PLAYGROUND: any lock, carved and played with the game's own navigation, prompts and encounter screens
// over a journey kept in memory. Nothing here decides what a move does; it only wires the hooks the site map uses.

const freshDoc = (journeyId: string): StoredJourneyStateV3 => ({
  journeyId,
  levelNr: 1,
  completionCount: 0,
  active: true,
  exploredSections: {},
  exploredCells: {},
  position: null,
  positionKey: null,
  standingKey: null,
  interiorLevelNr: null,
  mechanismStates: {},
})

const journeyData = (id: string): TranslatedJourney =>
  ({
    id,
    exterior: "pyramid",
    difficulty: "starter",
    levelCount: 1,
    journeyLength: "short",
    name: id,
    lengthLabel: "short",
  }) as TranslatedJourney

/** One journey's save, in memory: what the playground plays into, and what `reset` empties. */
// eslint-disable-next-line react-refresh/only-export-components -- a hook exported so harness specs share the in-memory save
export const useMemoryJourneys = (journeyId: string) => {
  const [docs, setDocs] = useState<StoredJourneyStateV3[]>(() => [freshDoc(journeyId)])
  const journeys = useMemo(
    () =>
      ({
        ...createJourneysV3Api({ journeys: docs, setJourneys: setDocs, journeyData: [journeyData(journeyId)] }),
        getPurchasedShopSlots: () => new Set<string>(),
        getSkippedConsumables: () => new Set<string>(),
      }) as unknown as JourneyAPI,
    [docs, journeyId]
  )
  return { journeys, doc: docs[0], reset: () => setDocs([freshDoc(journeyId)]) }
}

type Carving =
  | { status: "carving"; tried: number }
  | { status: "found"; seed: number; base: FloorGrid }
  | { status: "refused"; reasons: AssemblerReason[] }

/** The search of `carvePlayground` (through `carveStep`), one seed per task so the page stays responsive and a lock
 * picked meanwhile cancels it: one seed of a lock the bench floor cannot hold takes seconds. Exported for its spec. */
// eslint-disable-next-line react-refresh/only-export-components -- a hook exported so its spec can drive the search
export const useCarving = (config: FloorConfig | null): Carving | null => {
  const [carving, setCarving] = useState<{ config: FloorConfig; state: Carving } | null>(null)
  useEffect(() => {
    if (!config) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = (seed: number, reasons: AssemblerReason[]) => {
      const step = carveStep(config, seed, reasons)
      if (step.status === "found") return setCarving({ config, state: { status: "found", seed, base: step.grid } })
      if (step.status === "refused") return setCarving({ config, state: step })
      setCarving({ config, state: { status: "carving", tried: step.tried } })
      timer = setTimeout(() => run(seed + 1, step.reasons), 0)
    }
    timer = setTimeout(() => run(0, []), 0)
    return () => clearTimeout(timer)
  }, [config])
  return config && carving?.config === config ? carving.state : null
}

const PlayedFloor: FC<{ config: FloorConfig; seed: number; base: FloorGrid }> = ({ config, seed, base }) => {
  const { journeys, doc, reset } = useMemoryJourneys(PLAYGROUND_JOURNEY)
  const progression = useProgression()
  const inventory = useInventory()
  const mechanismStates = useMechanismStates(journeys, PLAYGROUND_JOURNEY)
  const { grid, explorerPos, openGateKeys } = useAssembledFloor(
    PLAYGROUND_JOURNEY,
    config,
    seed,
    0,
    journeys.getExploredCells(PLAYGROUND_JOURNEY),
    doc.positionKey,
    0,
    undefined,
    undefined,
    mechanismStates,
    doc.standingKey
  )
  const ownedKeys = useMemo(() => new Set([...(grid ? getOwnedKeys(grid) : []), ...openGateKeys]), [grid, openGateKeys])
  const encounter = useEncounter({
    journeys,
    journeyId: PLAYGROUND_JOURNEY,
    levelNr: 1,
    currentFloor: 0,
    difficulty: config.difficulty,
    grid,
    ownedKeys,
    onReward: () => {},
  })
  const { ride, squeeze, playTraversal } = useCrossing()
  const { onCellClick, prompt, notice, explorerHidden } = useSiteNavigation({
    journeys,
    journeyId: PLAYGROUND_JOURNEY,
    siteConfig: [config],
    seed,
    currentFloor: 0,
    grid,
    explorerPos,
    onEncounter: encounter.open,
    onSkippedConsumable: () => {},
    onExitReached: () => {},
    playTraversal,
  })
  const promptLabel = usePromptLabel()
  const noticeLabel = useNoticeLabel()
  // The walk reads the floor as carved: the playing grid has its open doors taken out, which no walk can read.
  const walk = useMemo(() => walkFloorLock(base), [base])
  if (!grid) return <p data-playground-refused="">the floor does not assemble</p>
  const Board = encounter.family?.Component ?? null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 text-sm text-white/80">
        <button type="button" onClick={reset}>
          Start again
        </button>
        <span>seed {seed}</span>
        <span>{walk ? (walk.sound ? "walks sound" : "does not walk sound") : "no lock walk"}</span>
        <span data-playground-states="">{JSON.stringify(doc.mechanismStates ?? {})}</span>
      </div>
      <div className="relative h-160 w-full">
        <SiteMapView
          grid={grid}
          onCellClick={onCellClick}
          explorerPos={explorerPos}
          explorerHidden={explorerHidden}
          ride={ride}
          squeeze={squeeze}
          currentFloor={0}
          ownedKeys={ownedKeys}
          mechanismStates={mechanismStates}
          prompt={prompt && { label: promptLabel(prompt), at: prompt.at, onTake: prompt.take }}
          notice={notice && { label: noticeLabel, at: notice.at }}
          className="size-full"
        />
      </div>
      {encounter.isOpen && Board && encounter.ctx && (
        <EncounterModal difficulty={encounter.ctx.difficulty}>
          <PuzzleRoomContext value={encounter.roomKey}>
            <Board
              puzzle={encounter.puzzle}
              ctx={encounter.ctx}
              progression={progression}
              journeys={journeys}
              inventory={inventory}
              applyReward={() => {}}
              onSolved={encounter.solved}
              onCancel={encounter.cancel}
            />
          </PuzzleRoomContext>
        </EncounterModal>
      )}
    </div>
  )
}

/** Pick a lock and a realisation per control kind; the floor carves and plays as the game would. */
export const LockPlayground: FC<{ locks: Readonly<Record<string, string>>; initial?: string }> = ({
  locks,
  initial,
}) => {
  const names = useMemo(() => Object.keys(locks).sort(), [locks])
  const [name, setName] = useState(initial && initial in locks ? initial : names[0])
  const [binding, setBinding] = useState(defaultBinding)
  const parsed = useMemo(() => {
    try {
      return { ok: true as const, ...parseLock(locks[name], name) }
    } catch (error) {
      return { ok: false as const, message: (error as Error).message }
    }
  }, [locks, name])
  const config = useMemo(() => (parsed.ok ? playgroundFloor(parsed.lock, binding) : null), [parsed, binding])
  const unbuilt = useMemo(() => (parsed.ok ? [...parsed.drafts, ...notBuildable(parsed.lock)] : []), [parsed])
  // A lock the engine cannot build is not carved: its search does not end in a time worth waiting for.
  const carved = useCarving(unbuilt.length > 0 ? null : config)
  const refusal = !parsed.ok
    ? parsed.message
    : parsed.refused.length > 0
      ? parsed.refused.join("; ")
      : carved?.status === "refused"
        ? JSON.stringify(carved.reasons)
        : undefined
  return (
    <div className="flex h-(--screen-height) flex-col gap-2 overflow-auto bg-neutral-900 p-4 text-white">
      <div className="flex flex-wrap gap-4 text-sm">
        <label>
          lock{" "}
          <select value={name} onChange={e => setName(e.target.value)} className="text-black">
            {names.map(n => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {Object.entries(REALISATION_CHOICES).map(([kind, choices]) => (
          <label key={kind}>
            {kind}{" "}
            <select
              value={binding[kind]}
              onChange={e => setBinding(b => ({ ...b, [kind]: e.target.value }))}
              className="text-black"
            >
              {choices.map(choice => (
                <option key={choice}>{choice}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {unbuilt.length > 0 && <p className="text-xs text-amber-300">not buildable yet: {unbuilt.join(", ")}</p>}
      {carved?.status === "carving" && <p className="text-xs text-white/60">carving, {carved.tried} seeds tried</p>}
      {refusal !== undefined ? (
        <pre data-playground-refused="" className="text-xs whitespace-pre-wrap text-red-300">
          {refusal}
        </pre>
      ) : (
        carved?.status === "found" &&
        config && (
          <PlayedFloor
            key={`${name}|${JSON.stringify(binding)}`}
            config={config}
            seed={carved.seed}
            base={carved.base}
          />
        )
      )}
    </div>
  )
}
