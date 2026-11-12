import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { readGameData, writeGameData } from "@/support/useGameStorage"
import { splitChunks, joinChunks } from "./chunks"
import { drawCard, imageFromFile } from "./drawCard"
import { openSave, sealSave, VALID_FOR_MS } from "./envelope"
import { readCard } from "./readCard"
import { checkImport, trimSave } from "./trimSave"

type Json = Record<string, unknown>
type Refusal = "notACard" | "tampered" | "expired" | "future" | "otherEpoch" | "newerGame"
type Opened = { ok: true; data: Json } | { ok: false; reason: Refusal }

const CARD_FILE = "reiskaart.png"
// Far above any real save; a card claiming more is refused before it is parsed.
const MAX_JSON_LENGTH = 2_000_000
const NOT_A_CARD: Opened = { ok: false, reason: "notACard" }

/** Everything between an image file and a save this game can load; any failure on the way is no card. */
const openCard = async (file: Blob): Promise<Opened> => {
  try {
    const chunks = await readCard(await imageFromFile(file))
    const payload = chunks && joinChunks(chunks)
    if (!payload) return NOT_A_CARD
    const opened = await openSave(payload, Date.now())
    if (!opened.ok) return opened.reason === "notASave" ? NOT_A_CARD : { ok: false, reason: opened.reason }
    if (opened.json.length > MAX_JSON_LENGTH) return NOT_A_CARD
    const data: unknown = JSON.parse(opened.json)
    if (typeof data !== "object" || data === null || Array.isArray(data)) return NOT_A_CARD
    const check = checkImport(data as Json)
    return check.ok ? { ok: true, data: data as Json } : check
  } catch {
    return NOT_A_CARD
  }
}

const isCancel = (error: unknown) => (error as Error | undefined)?.name === "AbortError"

const BUTTON =
  "block w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-center font-medium text-gray-800 transition-colors hover:bg-gray-50"

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
    await writeGameData(opened.data)
    window.location.reload()
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-sm text-gray-700">{t("saveCard.explain")}</p>
      <button type="button" onClick={make} disabled={busy} className={BUTTON}>
        {t("saveCard.make")}
      </button>
      {card && (
        <div className="space-y-2">
          <img src={card.url} alt={t("saveCard.cardTitle")} className="mx-auto max-h-64 rounded shadow" />
          {canShare && (
            <button type="button" onClick={share} className={BUTTON}>
              {t("saveCard.share")}
            </button>
          )}
          <a href={card.url} download={CARD_FILE} className={BUTTON}>
            {t("saveCard.download")}
          </a>
        </div>
      )}
      <label className={BUTTON}>
        {t("saveCard.read")}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          className="sr-only"
          onChange={event => {
            void read(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </label>
      <p role="status" className="text-sm text-gray-700">
        {busy ? t("saveCard.busy") : status}
      </p>
    </div>
  )
}
