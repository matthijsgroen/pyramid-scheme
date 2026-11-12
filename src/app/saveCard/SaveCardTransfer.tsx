import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { readGameData, writeGameData } from "@/support/useGameStorage"
import { SaveCardPanel } from "@/ui/molecules/SaveCardPanel"
import { splitChunks, joinChunks } from "./chunks"
import { drawCard, imageFromFile } from "./drawCard"
import { openSave, sealSave, VALID_FOR_MS } from "./envelope"
import { readCard } from "./readCard"
import { checkImport, expandSave, trimSave } from "./trimSave"

type Json = Record<string, unknown>
type Refusal = "notACard" | "tampered" | "expired" | "future" | "otherEpoch" | "newerGame"
type Opened = { ok: true; data: Json } | { ok: false; reason: Refusal }

const CARD_FILE = "reiskaart.png"
const NOT_A_CARD: Opened = { ok: false, reason: "notACard" }

/** Everything between an image file and a save this game can load; any failure on the way is no card. */
const openCard = async (file: Blob): Promise<Opened> => {
  try {
    const chunks = await readCard(await imageFromFile(file))
    const payload = chunks && joinChunks(chunks)
    if (!payload) return NOT_A_CARD
    const opened = await openSave(payload, Date.now())
    if (!opened.ok) return opened.reason === "notASave" ? NOT_A_CARD : { ok: false, reason: opened.reason }
    const parsed: unknown = JSON.parse(opened.json)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return NOT_A_CARD
    const data = expandSave(parsed as Json)
    const check = checkImport(data)
    return check.ok ? { ok: true, data } : check
  } catch {
    return NOT_A_CARD
  }
}

type Replaced = "replaced" | "kept" | "lost"

// The store is cleared before it is written, so a failed write can leave half a save; this device's own
// save is read first and written back then.
const replaceSave = async (data: Json): Promise<Replaced> => {
  let own: Json
  try {
    own = await readGameData()
  } catch {
    return "kept"
  }
  try {
    await writeGameData(data)
    return "replaced"
  } catch {
    try {
      await writeGameData(own)
      return "kept"
    } catch {
      return "lost"
    }
  }
}

const isCancel = (error: unknown) => (error as Error | undefined)?.name === "AbortError"

// Moving a save to another device as a picture: the save, trimmed and sealed, drawn as codes on a card
// the player shares or downloads, and read back from an image on the other device. Replacing reloads
// the page, because the mounted hooks still hold the state they last rendered.
export const SaveCardTransfer: FC = () => {
  const { t } = useTranslation("common")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string>()
  const [card, setCard] = useState<{ file: File; url: string }>()

  useEffect(() => () => card && URL.revokeObjectURL(card.url), [card])

  const refusal = (reason: Refusal) =>
    ({
      notACard: t("saveCard.refused.notACard"),
      tampered: t("saveCard.refused.tampered"),
      expired: t("saveCard.refused.expired"),
      future: t("saveCard.refused.future"),
      otherEpoch: t("saveCard.refused.otherEpoch"),
      newerGame: t("saveCard.refused.newerGame"),
    })[reason]

  const make = async () => {
    setStatus(undefined)
    setBusy(true)
    try {
      const now = Date.now()
      const sealed = await sealSave(JSON.stringify(trimSave(await readGameData())), now)
      const [transferId] = crypto.getRandomValues(new Uint16Array(1))
      const png = await drawCard(splitChunks(sealed, transferId), new Date(now + VALID_FOR_MS), t)
      const file = new File([png], CARD_FILE, { type: "image/png" })
      setCard({ file, url: URL.createObjectURL(file) })
    } catch {
      setStatus(t("saveCard.makeFailed"))
    } finally {
      setBusy(false)
    }
  }

  const canShare =
    card !== undefined &&
    typeof navigator.share === "function" &&
    (navigator.canShare?.({ files: [card.file] }) ?? true)

  const share = async () => {
    if (!card) return
    setStatus(undefined)
    try {
      await navigator.share({ files: [card.file] })
    } catch (error) {
      if (!isCancel(error)) setStatus(t("saveCard.shareFailed"))
    }
  }

  const read = async (file: File | undefined) => {
    if (!file) return
    setStatus(undefined)
    setBusy(true)
    const opened = await openCard(file)
    setBusy(false)
    if (!opened.ok) return setStatus(refusal(opened.reason))
    const journeys = Array.isArray(opened.data.journeys) ? opened.data.journeys.length : 0
    if (!window.confirm(t("saveCard.confirm", { count: journeys }))) return
    const replaced = await replaceSave(opened.data)
    if (replaced === "kept") return setStatus(t("saveCard.writeFailed"))
    if (replaced === "lost") return setStatus(t("saveCard.writeLost"))
    window.location.reload()
  }

  return (
    <SaveCardPanel
      labels={{
        explain: t("saveCard.explain"),
        make: t("saveCard.make"),
        share: t("saveCard.share"),
        download: t("saveCard.download"),
        read: t("saveCard.read"),
        cardAlt: t("saveCard.cardTitle"),
      }}
      busy={busy}
      status={busy ? t("saveCard.busy") : status}
      card={card && { url: card.url, fileName: CARD_FILE }}
      canShare={canShare}
      onMake={make}
      onShare={share}
      onRead={file => void read(file)}
    />
  )
}
