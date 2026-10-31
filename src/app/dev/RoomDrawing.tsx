import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { placeBlobs } from "@/game/prefabChecks"
import type { PlaceKind, Prefab, SpecialPlace } from "@/game/prefabTypes"
import type { PaletteEntry } from "@/app/SiteMap/roomPalette"
import { copyPlace, dropKind, editPlace, isRefusal, paintCell, removePlace, setSpecial } from "./roomEditing"
import type { Edited, Refusal } from "./roomEditing"
import { PlaceInspector } from "./PlaceInspector"
import { refusalText } from "./refusalText"

/** The palette entry being dragged travels as this data type. */
export const ROOM_KIND_DRAG = "application/x-room-kind"

const TOOLS = ["select", "wall", "floor", "door", "stop", "actor", "chest", "portal", "mechanism", "erase"] as const
type Tool = (typeof TOOLS)[number] | "copy"
const SIGN = { wall: "#", floor: ".", door: "d" } as const
const PALETTE_LAYER = { floor: "prop", wall: "prop", ground: "ground", wallItem: "wallItem" } as const
const SPECIAL_LOOK: Record<SpecialPlace, string> = {
  stop: "bg-sky-500",
  actor: "bg-violet-500",
  chest: "bg-yellow-500",
  portal: "bg-teal-500",
  mechanism: "bg-rose-500",
}

type Props = {
  prefab: Prefab
  layout: number
  palette: readonly PaletteEntry[]
  /** `stroke` is true for every cell after the first of one drag, which undo takes back as one step. */
  onChange: (next: Prefab, stroke: boolean) => void
}

// The room drawn as cells: paint walls, floor and door places, set special places, drop palette kinds, and pick a
// place to set its options. Every change is a whole new prefab handed up.
export const RoomDrawing: FC<Props> = ({ prefab, layout, palette, onChange }) => {
  const { t } = useTranslation()
  const [tool, setTool] = useState<Tool>("select")
  const [copying, setCopying] = useState<string>()
  const [selected, setSelected] = useState<string>()
  const [againstWall, setAgainstWall] = useState(false)
  const [refusal, setRefusal] = useState<Refusal>()
  // A drag under way, and whether it has changed the room yet: its first change is a new undo step.
  const [stroke, setStroke] = useState<"none" | "down" | "changed">("none")
  useEffect(() => {
    const stop = () => setStroke("none")
    window.addEventListener("pointerup", stop)
    return () => window.removeEventListener("pointerup", stop)
  }, [])

  const cells = prefab.layouts[layout].cells
  const place = selected ? prefab.places[selected] : undefined
  const blobs = placeBlobs({ layout, mirrored: false, cells }, prefab)
  const whatIs = (ch: string): string => {
    if (ch === "#") return t("devRoomEditor.cellWhat.wall")
    if (ch === ".") return t("devRoomEditor.cellWhat.floor")
    if (ch === "d") return t("devRoomEditor.cellWhat.door")
    const special = prefab.specials[ch]
    const kinds = special ? t(`devRoomEditor.tool.${special}`) : (prefab.places[ch]?.kinds.join(" | ") ?? "")
    return t("devRoomEditor.cellWhat.place", { letter: ch, kinds })
  }
  const urlOf = (kind: string) => palette.find(entry => entry.kind === kind)?.url

  /** Hands up a changed room, or keeps the refusal to show; true when the room changed. */
  const take = (next: Edited, joinStroke: boolean): boolean => {
    if (isRefusal(next)) {
      setRefusal(next)
      return false
    }
    if (next === prefab) return false
    setRefusal(undefined)
    onChange(next, joinStroke)
    return true
  }
  /** Applies the tool at r,c; true when the room changed. */
  const apply = (r: number, c: number, joinStroke: boolean): boolean => {
    const ch = cells[r][c]
    if (tool === "select") {
      setSelected(ch in prefab.places ? ch : undefined)
      return false
    }
    const next =
      tool === "wall" || tool === "floor" || tool === "door"
        ? paintCell(prefab, layout, r, c, SIGN[tool])
        : tool === "erase"
          ? removePlace(prefab, layout, r, c)
          : tool === "copy"
            ? copying
              ? copyPlace(prefab, layout, r, c, copying)
              : prefab
            : setSpecial(prefab, layout, r, c, tool)
    return take(next, joinStroke)
  }
  const drop = (r: number, c: number, kind: string) => {
    const prop = palette.find(entry => entry.kind === kind)?.layer === "prop"
    take(dropKind(prefab, layout, r, c, kind as PlaceKind, againstWall && prop ? { layer: "wall" } : {}), false)
  }

  const fitting = place
    ? [
        ...new Set<PlaceKind>([
          ...place.kinds,
          ...palette
            .filter(
              entry =>
                entry.layer === PALETTE_LAYER[place.layer] && entry.cols === place.cols && entry.rows === place.rows
            )
            .map(entry => entry.kind as PlaceKind),
          ...(place.layer === "floor" && place.cols === 1 && place.rows === 1 ? (["patron"] as const) : []),
        ]),
      ]
    : []

  return (
    <section aria-label={t("devRoomEditor.drawing")} className="flex flex-col gap-2">
      <h3 className="text-xs font-bold text-white/60 uppercase">{t("devRoomEditor.drawing")}</h3>
      <div role="toolbar" className="flex flex-wrap gap-1">
        {TOOLS.map(name => (
          <button
            key={name}
            type="button"
            aria-pressed={tool === name}
            onClick={() => setTool(name)}
            className={`rounded-md border px-2 py-1 text-xs ${tool === name ? "border-red-400 bg-red-600" : "border-white/20"}`}
          >
            {t(`devRoomEditor.tool.${name}`)}
          </button>
        ))}
        {copying && (
          <button
            type="button"
            aria-pressed={tool === "copy"}
            onClick={() => setTool("copy")}
            className={`rounded-md border px-2 py-1 text-xs ${tool === "copy" ? "border-red-400 bg-red-600" : "border-white/20"}`}
          >
            {t("devRoomEditor.tool.copy", { letter: copying })}
          </button>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-white/60">
        <input type="checkbox" checked={againstWall} onChange={e => setAgainstWall(e.target.checked)} />
        {t("devRoomEditor.againstWall")}
      </label>
      <p className="text-xs text-white/60">{t("devRoomEditor.dropHint")}</p>
      <p className="text-xs text-white/60">{t("devRoomEditor.rewrites")}</p>
      <div
        className="grid w-fit touch-none gap-px bg-black select-none"
        style={{ gridTemplateColumns: `repeat(${cells[0].length}, 2rem)`, gridAutoRows: "2rem" }}
      >
        {cells.flatMap((row, r) =>
          [...row].map((ch, c) => {
            const special = prefab.specials[ch]
            const look =
              ch === "#"
                ? "bg-stone-700"
                : ch === "d"
                  ? "bg-amber-600"
                  : special
                    ? SPECIAL_LOOK[special]
                    : ch === selected
                      ? "bg-red-300 text-black"
                      : "bg-stone-300 text-black"
            return (
              <button
                key={`${r},${c}`}
                type="button"
                data-cell={`${r},${c}`}
                title={whatIs(ch)}
                aria-label={t("devRoomEditor.cell", { row: r, col: c, what: whatIs(ch) })}
                style={{ gridRow: r + 1, gridColumn: c + 1 }}
                className={`font-mono text-xs ${look}`}
                onPointerDown={e => {
                  e.currentTarget.releasePointerCapture?.(e.pointerId)
                  setStroke(apply(r, c, false) ? "changed" : "down")
                }}
                onPointerEnter={() => {
                  if (stroke === "none" || tool === "select") return
                  if (apply(r, c, stroke === "changed")) setStroke("changed")
                }}
                onClick={e => e.detail === 0 && apply(r, c, false)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  drop(r, c, e.dataTransfer.getData(ROOM_KIND_DRAG))
                }}
              >
                {ch === "." || ch === "#" ? "" : ch}
              </button>
            )
          })
        )}
        {blobs.map(blob => {
          const url = urlOf(prefab.places[blob.letter].kinds[0])
          return (
            url && (
              <img
                key={`${blob.top},${blob.left}`}
                src={url}
                alt=""
                className="pointer-events-none size-full object-contain opacity-80"
                style={{
                  gridRow: `${blob.top + 1} / span ${blob.rows}`,
                  gridColumn: `${blob.left + 1} / span ${blob.cols}`,
                }}
              />
            )
          )
        })}
      </div>
      {refusal && (
        <p role="alert" className="text-sm text-amber-300">
          ⚠ {refusalText(t, refusal)}
        </p>
      )}
      {place && (
        <PlaceInspector
          place={place}
          fitting={fitting}
          letters={Object.keys(prefab.places).filter(letter => letter !== place.letter)}
          drawn={blobs.filter(blob => blob.letter === place.letter).length}
          onChange={patch => {
            take(editPlace(prefab, place.letter, patch), false)
          }}
          onDrawAnother={() => {
            setCopying(place.letter)
            setTool("copy")
          }}
          onClose={() => setSelected(undefined)}
        />
      )}
    </section>
  )
}
