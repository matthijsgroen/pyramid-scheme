import { use, useCallback, useMemo, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { findPath, getCell } from "@/game/gridNavigation"
import { getPuzzlePlugin } from "@/game/puzzles/puzzleRegistry"
import { hashString } from "@/support/hashString"
import { useTimeout } from "@/support/useTimeout"
import type { SiteConfig, TreasureReward } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { SiteMapView } from "./SiteMapView"
import { useAssembledFloor, encodeEdge, decodeEdge } from "./useAssembledFloor"
import { ChestRewardFlow } from "./ChestRewardFlow"
import { hieroglyphCategory } from "./hieroglyphCategory"
import { TrapEncounter } from "@/app/TrapFamilies/TrapEncounter"
import { TrapWarningScreen } from "./TrapWarningScreen"
import { useJourneys } from "@/app/state/useJourneys"
import { useProgression } from "@/app/state/useProgression"
import { useDetector } from "@/app/state/useDetector"
import { useInventory } from "@/app/Inventory/useInventory"
import { FezContext } from "@/app/fez/context"
import { DevelopContext } from "@/contexts/DevelopMode"
import { allItems, getInventoryItemById } from "@/data/inventory"
import { CONSUMABLE_PRICES, CONSUMABLE_STOCK_PER_VISIT } from "@/data/shopPricing"
import { ALL_SELLABLES, getSellableById, sellValueForItemId } from "@/data/sellables"
import { EntranceTransitionOverlay } from "@/ui/atoms/EntranceTransitionOverlay"
import { HealthDisplay } from "@/ui/atoms/HealthDisplay"
import { ConsumableBar } from "@/ui/atoms/ConsumableBar"
import { ShopBalance } from "@/ui/atoms/ShopBalance"
import { DetectorPanel } from "@/ui/atoms/DetectorPanel"
import { BackButton } from "@/ui/atoms/BackButton"
import { FloorBadge } from "@/ui/atoms/FloorBadge"
import { SiteHudBar } from "@/ui/atoms/SiteHudBar"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { FezShop } from "@/ui/organisms/FezShop"
// Side-effect: registers puzzle plugins
import "@/app/PuzzleFamilies/Sumplete/plugin"
import "@/app/PuzzleFamilies/Tableau/plugin"
import "@/app/PuzzleFamilies/Crocodile/plugin"

type Props = {
  journeyId: string
  siteConfig: SiteConfig
  seed: number
  onSiteComplete: () => void
  onCancel: () => void
  /** Called when a puzzle room is tapped on a non-sumplete floor. Return null to use default SumpleteBoard. */
  renderPuzzle?: (floor: number, onSolved: () => void, onCancel: () => void) => ReactNode
}

const CONSUMABLE_ICONS = { bandage: "🩹", oil: "🫙", trapTool: "🔧" } as const

type TFn = (key: string, opts?: Record<string, unknown>) => string

// Shops only ever relocate one of these three reward types (SHOP_PLAN.md's 13 rare slots) —
// narrower than ChestRewardFlow's full reward-type switch, which also covers consumable/money/sellable.
const rareItemDisplay = (
  reward: TreasureReward,
  t: TFn
): { itemName: string; itemDescription?: string; icon: string } => {
  if (reward.type === "hieroglyphFragment") {
    const item = getInventoryItemById(reward.hieroglyphId)
    const name = item
      ? t(`${hieroglyphCategory(reward.hieroglyphId)}.${reward.hieroglyphId}.name`, {
          ns: "inventory",
          defaultValue: item.name,
        })
      : t("chest.hieroglyphFragment")
    return { itemName: `${name} — ${t("chest.hieroglyphFragment")}`, icon: item?.symbol ?? "𓂀" }
  }
  if (reward.type === "mapPiece") {
    return { itemName: t("chest.mapPiece"), itemDescription: t("chest.mapPieceDescription"), icon: "📜" }
  }
  if (reward.type === "mosaicPiece") {
    return { itemName: t("chest.mosaicPiece"), itemDescription: t("chest.mosaicPieceDescription"), icon: "🟦" }
  }
  return { itemName: reward.type, icon: "🔷" }
}

export const SiteMapScreen = ({ journeyId, siteConfig, seed, onSiteComplete, onCancel, renderPuzzle }: Props) => {
  const { t } = useTranslation(["common", "inventory", "sellables"])
  const fez = use(FezContext)
  const { isDevelopMode } = use(DevelopContext)
  const journeys = useJourneys()
  const progression = useProgression()
  const inventory = useInventory()
  const detector = useDetector(progression, journeys)
  const allEdges = journeys.getExploredSections(journeyId)
  const journeyState = journeys.getJourney(journeyId)
  const wardKeys = progression.tombKeyIds

  const [currentFloor, setCurrentFloor] = useState(() => {
    const pos = journeyState?.position
    if (!pos) return 0
    const [floor] = decodeEdge(pos)
    return Math.min(floor, siteConfig.length - 1)
  })
  const floorConfig = siteConfig[Math.min(currentFloor, siteConfig.length - 1)]

  const { grid, explorerPos } = useAssembledFloor(
    journeyId,
    floorConfig,
    seed,
    currentFloor,
    allEdges,
    wardKeys,
    journeyState?.position,
    progression.perks.detectionLevel
  )
  const pendingConsumableCells = useMemo(() => {
    const prefix = `${currentFloor}:`
    const result = new Set<string>()
    for (const edgeId of journeys.getSkippedConsumables(journeyId)) {
      if (edgeId.startsWith(prefix)) result.add(edgeId.slice(prefix.length))
    }
    return result
  }, [journeys, journeyId, currentFloor])

  const [activePuzzlePos, setActivePuzzlePos] = useState<readonly [number, number] | null>(null)
  const [trapWarningPos, setTrapWarningPos] = useState<readonly [number, number] | null>(null)
  const [activeTrapPos, setActiveTrapPos] = useState<readonly [number, number] | null>(null)
  const [puzzleSolved, setPuzzleSolved] = useState(false)
  const [pendingReward, setPendingReward] = useState<{
    reward: TreasureReward
    consumableFull?: boolean
    onCollect: () => void
  } | null>(null)
  const [activeShop, setActiveShop] = useState<{
    edgeId: string
    reward: TreasureReward
    price: number
    purchased: boolean
  } | null>(null)
  const [shopStock, setShopStock] = useState({
    bandage: CONSUMABLE_STOCK_PER_VISIT,
    oil: CONSUMABLE_STOCK_PER_VISIT,
    trapTool: CONSUMABLE_STOCK_PER_VISIT,
  })
  const [exiting, setExiting] = useState(false)

  const [scheduleArrival] = useTimeout()
  const [schedulePuzzle, cancelPuzzle] = useTimeout()

  const puzzlePlugin = useMemo(() => {
    if (!activePuzzlePos || !grid) return null
    const cell = getCell(grid, activePuzzlePos[0], activePuzzlePos[1])
    const family = cell?.type === "room" ? (cell.family ?? "sumplete") : "sumplete"
    return getPuzzlePlugin(family) ?? null
  }, [activePuzzlePos, grid])

  const useRenderPuzzleFallback = activePuzzlePos != null && puzzlePlugin == null && renderPuzzle != null

  const activePuzzle = useMemo(() => {
    if (!activePuzzlePos || !puzzlePlugin) return null
    const edgeId = encodeEdge(currentFloor, activePuzzlePos[0], activePuzzlePos[1])
    return puzzlePlugin.generate(hashString(journeyId + edgeId), { difficulty: floorConfig.difficulty })
  }, [activePuzzlePos, puzzlePlugin, journeyId, currentFloor, floorConfig.difficulty])

  // Shared by both the treasure-room claim flow and puzzle-solve rewards below — the
  // "apply this reward to game state" half, kept separate from the surrounding
  // pack-full/dedup checks (those differ per entry point: fragments dedup by
  // inventory-as-truth, only treasure rooms carry them).
  const applyReward = useCallback(
    (reward: TreasureReward) => {
      if (reward.type === "hieroglyphFragment") progression.addFragment(reward.hieroglyphId, reward.pieceIndex)
      else if (reward.type === "mapPiece") {
        progression.collectMapPiece(reward.tombId)
        progression.markMapPieceFound(journeyId)
      } else if (reward.type === "tombKey") {
        progression.addTombKey(reward.keyId)
        progression.applyTreasurePerk(reward.keyId)
      } else if (reward.type === "mosaicPiece") progression.collectMosaicPiece()
      else if (reward.type === "consumable") progression.addConsumable(reward.consumable)
      else if (reward.type === "money") progression.addMoney(reward.amount)
      else if (reward.type === "sellable") inventory.addItem(reward.itemId, 1)
    },
    [progression, journeyId, inventory]
  )

  const openShop = useCallback(
    (edgeId: string, reward: TreasureReward, price: number, resetStock: boolean) => {
      if (resetStock) {
        setShopStock({
          bandage: CONSUMABLE_STOCK_PER_VISIT,
          oil: CONSUMABLE_STOCK_PER_VISIT,
          trapTool: CONSUMABLE_STOCK_PER_VISIT,
        })
      }
      const purchased = journeys.hasPurchasedShop(journeyId, edgeId)
      fez.showConversation("shopArrival", () => setActiveShop({ edgeId, reward, price, purchased }))
    },
    [fez, journeys, journeyId]
  )

  const handleShopBuyRare = useCallback(() => {
    setActiveShop(current => {
      if (!current || current.purchased) return current
      if (!progression.spendMoney(current.price)) return current
      applyReward(current.reward)
      journeys.markShopPurchased(current.edgeId)
      return { ...current, purchased: true }
    })
  }, [progression, applyReward, journeys])

  const handleShopBuyConsumable = useCallback(
    (type: keyof typeof CONSUMABLE_PRICES) => {
      if (shopStock[type] <= 0) return
      if (!progression.spendMoney(CONSUMABLE_PRICES[type])) return
      const added = progression.addConsumable(type)
      if (!added) {
        progression.addMoney(CONSUMABLE_PRICES[type]) // pack was full — refund
        return
      }
      setShopStock(prev => ({ ...prev, [type]: prev[type] - 1 }))
    },
    [progression, shopStock]
  )

  const handleShopBuy = useCallback(
    (id: string) => {
      if (id === "rare") handleShopBuyRare()
      else if (id === "bandage" || id === "oil" || id === "trapTool") handleShopBuyConsumable(id)
    },
    [handleShopBuyRare, handleShopBuyConsumable]
  )

  const handleShopSell = useCallback(
    (id: string) => {
      const value = sellValueForItemId(id)
      if (value <= 0) return
      inventory.removeItem(id, 1)
      progression.addMoney(value)
    },
    [inventory, progression]
  )

  const handlePuzzleSolved = useCallback(() => {
    if (!activePuzzlePos || !grid) return
    const [row, col] = activePuzzlePos
    const edgeId = encodeEdge(currentFloor, row, col)
    const cell = getCell(grid, row, col)
    const sectionHash = cell && cell.type !== "empty" ? (cell.sectionHash ?? "") : ""
    journeys.markCellExplored(sectionHash, edgeId)
    setActivePuzzlePos(null)
    setPuzzleSolved(false)

    const reward = cell?.type === "room" ? cell.reward : undefined
    if (!reward) return
    const packFull = reward.type === "consumable" && progression.isConsumablePackFull()
    if (packFull) {
      journeys.markConsumableSkipped(edgeId)
      setPendingReward({ reward, consumableFull: true, onCollect: () => {} })
      return
    }
    setPendingReward({ reward, onCollect: () => applyReward(reward) })
  }, [activePuzzlePos, grid, journeys, currentFloor, progression, applyReward])

  const handlePuzzleComplete = useCallback(() => {
    schedulePuzzle(800, () => {
      setPuzzleSolved(true)
      schedulePuzzle(1500, handlePuzzleSolved)
    })
  }, [handlePuzzleSolved, schedulePuzzle])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!grid) return
      const cell = getCell(grid, row, col)
      if (!cell || cell.type === "empty") return
      if (cell.state !== "reachable" && cell.state !== "completed") return

      const edgeId = encodeEdge(currentFloor, row, col)
      const sectionHash = cell.sectionHash ?? ""

      // Completed cells: just reposition the player, unless it's a chest we couldn't fit before —
      // offer it again, showing whether there's room for it now or still not.
      if (cell.state === "completed") {
        // Stock only refreshes on a genuine re-entry (the player was elsewhere before this
        // click) — otherwise dismissing the shop and clicking the same room again while still
        // standing in it would refill consumable stock for free, indefinitely.
        const alreadyStandingHere = explorerPos[0] === row && explorerPos[1] === col
        journeys.updatePosition(journeyId, edgeId)
        if (cell.type === "room" && cell.reward && cell.shopPrice != null) {
          const reward = cell.reward
          const price = cell.shopPrice
          scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
            openShop(edgeId, reward, price, !alreadyStandingHere)
          )
          return
        }
        if (
          cell.type === "room" &&
          cell.reward?.type === "consumable" &&
          journeys.getSkippedConsumables(journeyId).has(edgeId)
        ) {
          const reward = cell.reward
          scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () => {
            if (progression.isConsumablePackFull()) {
              setPendingReward({ reward, consumableFull: true, onCollect: () => {} })
              return
            }
            setPendingReward({
              reward,
              onCollect: () => {
                progression.addConsumable(reward.consumable)
                journeys.clearConsumableSkipped(edgeId)
              },
            })
          })
        }
        return
      }

      if (cell.type === "corridor") {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
        return
      }

      if (cell.type !== "room") return

      if (cell.roomType === "entrance") {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "trap") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
          setTrapWarningPos([row, col])
        )
      } else if (cell.roomType === "puzzle") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
          setActivePuzzlePos([row, col])
        )
      } else if (cell.roomType === "fork") {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "stairhead") {
        journeys.markCellExplored(sectionHash, edgeId)
        if (cell.stairId) {
          // Find the peer stairhead across floors and teleport there
          const stairId = cell.stairId
          for (let fi = 0; fi < siteConfig.length; fi++) {
            if (fi === currentFloor) continue
            const result = assembleFloor(journeyId, siteConfig[fi], seed + fi)
            if (!result.success) continue
            const peerPos = result.grid.staircases[stairId]
            if (peerPos) {
              journeys.updatePosition(journeyId, encodeEdge(fi, peerPos[0], peerPos[1]))
              setCurrentFloor(fi)
              break
            }
          }
        } else {
          journeys.updatePosition(journeyId, edgeId)
          setCurrentFloor(f => f + 1)
        }
      } else if (cell.roomType === "exit") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
          setExiting(true)
        )
      } else if (cell.roomType === "treasure") {
        // Always mark the room explored so corridors past it keep unfolding, even if a consumable
        // reward inside can't be picked up right now — that's tracked separately below.
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
        if (cell.reward && cell.shopPrice != null) {
          const reward = cell.reward
          const price = cell.shopPrice
          // Reaching a shop room via the "reachable" state always means arriving fresh —
          // the player can't already be standing on a cell that isn't yet "completed".
          scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () =>
            openShop(edgeId, reward, price, true)
          )
        } else if (cell.reward) {
          const reward = cell.reward
          // Inventory-as-truth: fragment already collected → skip overlay
          const alreadyCollected =
            reward.type === "hieroglyphFragment" && progression.hasFragment(reward.hieroglyphId, reward.pieceIndex)
          if (!alreadyCollected) {
            // Consumables need a room check up front: a full pack leaves the reward for a later visit
            // instead of silently losing it.
            const packFull = reward.type === "consumable" && progression.isConsumablePackFull()
            scheduleArrival(Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100, () => {
              if (packFull) {
                journeys.markConsumableSkipped(edgeId)
                setPendingReward({ reward, consumableFull: true, onCollect: () => {} })
                return
              }
              setPendingReward({ reward, onCollect: () => applyReward(reward) })
            })
          }
        }
      }
    },
    [
      grid,
      journeys,
      journeyId,
      currentFloor,
      progression,
      explorerPos,
      scheduleArrival,
      seed,
      siteConfig,
      applyReward,
      openShop,
    ]
  )

  const ActivePuzzleComponent = puzzlePlugin?.Component ?? null

  if (!grid) {
    return <div className="p-4 text-red-400">Site layout unavailable.</div>
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center">
      <BackButton onClick={onCancel} label={t("ui.back")} />
      {currentFloor > 0 && <FloorBadge label={t("ui.floor", { number: currentFloor + 1 })} />}
      <div className="relative h-screen w-screen">
        <SiteMapView
          grid={grid}
          onCellClick={handleCellClick}
          explorerPos={explorerPos}
          pendingCells={pendingConsumableCells}
          className="h-full w-full"
        />
      </div>
      <SiteHudBar>
        {(progression.perks.compassLevel > 0 ||
          progression.perks.consumableDetectorLevel > 0 ||
          progression.perks.detectionLevel > 0) && (
          <DetectorPanel
            activeDetector={detector.activeDetector}
            compassLevel={progression.perks.compassLevel}
            consumableDetectorLevel={progression.perks.consumableDetectorLevel}
            detectionLevel={progression.perks.detectionLevel}
            compassTarget={detector.compassTarget}
            compassResults={detector.compassResults}
            consumableResults={detector.consumableResults}
            onSetDetector={detector.setDetector}
            onSetCompassTarget={detector.setCompassTarget}
            availableHieroglyphs={[]}
          />
        )}
        <div className="flex items-center gap-4">
          <HealthDisplay currentHealth={progression.currentHealth} maxHealth={progression.maxHealth} />
          <ConsumableBar consumables={progression.consumables} />
          <ShopBalance amount={progression.money} label={t("money.label")} />
          {isDevelopMode && <DeveloperButton onClick={() => progression.addMoney(1000)} label="+1000 Coins" />}
          {isDevelopMode && (
            <DeveloperButton
              onClick={() => {
                ALL_SELLABLES.slice(0, 5).forEach(item => inventory.addItem(item.id, 1))
                inventory.addItem(ALL_SELLABLES[0].id, 1) // second copy, to see the ×N badge
              }}
              label="+Junk"
            />
          )}
          {isDevelopMode && (
            <DeveloperButton
              onClick={() => allItems.forEach(item => inventory.addItem(item.id, 20))}
              label="+Hieroglyphs"
            />
          )}
        </div>
      </SiteHudBar>
      {exiting && <EntranceTransitionOverlay origin="50% 50%" onComplete={onSiteComplete} />}
      {useRenderPuzzleFallback && renderPuzzle!(currentFloor, handlePuzzleSolved, () => setActivePuzzlePos(null))}
      {!!activePuzzle && ActivePuzzleComponent && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="relative flex flex-col items-center gap-4 rounded-lg border border-amber-900 bg-stone-900 p-4">
            <ActivePuzzleComponent
              puzzle={activePuzzle}
              settings={{ difficulty: floorConfig.difficulty }}
              onSolved={handlePuzzleComplete}
            />
            {!puzzleSolved && (
              <button
                onClick={() => {
                  cancelPuzzle()
                  setActivePuzzlePos(null)
                }}
                className="text-sm text-stone-400 hover:text-stone-200"
              >
                {t("ui.cancel")}
              </button>
            )}
            {puzzleSolved && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-stone-900/90">
                <p className="font-pyramid text-xl text-amber-300">{t("ui.puzzleCompleted")}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {trapWarningPos && (
        <TrapWarningScreen
          currentHealth={progression.currentHealth}
          maxHealth={progression.maxHealth}
          canAttempt={progression.canAttemptTrap()}
          trapToolCount={progression.consumables.trapTool}
          onAttempt={() => {
            setActiveTrapPos(trapWarningPos)
            setTrapWarningPos(null)
          }}
          onTurnAround={() => setTrapWarningPos(null)}
          onDisable={() => {
            const [tr, tc] = trapWarningPos
            const edgeId = encodeEdge(currentFloor, tr, tc)
            const trapCell = grid && getCell(grid, tr, tc)
            const trapSectionHash = trapCell && trapCell.type !== "empty" ? (trapCell.sectionHash ?? "") : ""
            progression.useConsumable("trapTool")
            journeys.markTrapDisabled(trapSectionHash, edgeId)
            setTrapWarningPos(null)
          }}
        />
      )}
      {activeTrapPos && (
        <TrapEncounter
          family="arithmetic-reflex"
          seed={hashString(journeyId + encodeEdge(currentFloor, activeTrapPos[0], activeTrapPos[1]))}
          difficulty={floorConfig.difficulty}
          trapInsightStacks={progression.perks.trapInsightStacks}
          onPass={() => {
            const [tr, tc] = activeTrapPos
            const edgeId = encodeEdge(currentFloor, tr, tc)
            const trapCell = grid && getCell(grid, tr, tc)
            const trapSectionHash = trapCell && trapCell.type !== "empty" ? (trapCell.sectionHash ?? "") : ""
            journeys.markCellExplored(trapSectionHash, edgeId)
            setActiveTrapPos(null)
          }}
          onFail={() => {
            progression.takeTrapDamage(progression.perks.armorStacks)
            setActiveTrapPos(null)
          }}
        />
      )}
      <ChestRewardFlow
        pendingReward={pendingReward}
        hieroglyphProgress={progression.hieroglyphProgress}
        onDismiss={() => setPendingReward(null)}
      />
      {activeShop && (
        <FezShop
          isOpen
          title={t("shop.title")}
          balance={progression.money}
          balanceLabel={t("money.label")}
          dismissLabel={t("shop.dismiss")}
          buyLabel={t("shop.buy")}
          soldOutLabel={t("shop.soldOut")}
          sellLabel={t("shop.sell")}
          rareItemsLabel={t("shop.rareItems")}
          suppliesLabel={t("shop.supplies")}
          sellSectionLabel={t("shop.sellSection")}
          rareItems={[
            {
              id: "rare",
              ...rareItemDisplay(activeShop.reward, t),
              price: activeShop.price,
              affordable: progression.money >= activeShop.price,
              soldOut: activeShop.purchased,
              featured: true,
            },
          ]}
          consumables={(Object.keys(CONSUMABLE_ICONS) as (keyof typeof CONSUMABLE_PRICES)[]).map(type => ({
            id: type,
            itemName: t(`chest.consumable.${type}`),
            icon: CONSUMABLE_ICONS[type],
            price: CONSUMABLE_PRICES[type],
            affordable: progression.money >= CONSUMABLE_PRICES[type],
            soldOut: shopStock[type] <= 0,
          }))}
          sellables={Object.entries(inventory.inventory).flatMap(([id, count]) => {
            const item = getSellableById(id)
            if (!item || !count) return []
            return [
              {
                id,
                itemName: t(`${id}.name`, { ns: "sellables" }),
                itemDescription: t(`${id}.description`, { ns: "sellables" }),
                icon: item.symbol,
                sellValue: sellValueForItemId(id),
                ownedCount: count,
              },
            ]
          })}
          onBuy={handleShopBuy}
          onSell={handleShopSell}
          onDismiss={() => setActiveShop(null)}
        />
      )}
    </div>
  )
}
