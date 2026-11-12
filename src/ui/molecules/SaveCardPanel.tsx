import type { FC } from "react"

export type SaveCardLabels = {
  explain: string
  make: string
  share: string
  download: string
  read: string
  cardAlt: string
}

const BUTTON =
  "block w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-center font-medium text-gray-800 transition-colors hover:bg-gray-50"

// The travel card controls in Settings: make a card, share or download it, read one from an image.
// Stateless; where the card comes from and what reading one does live in src/app/saveCard.
export const SaveCardPanel: FC<{
  labels: SaveCardLabels
  busy: boolean
  status?: string
  card?: { url: string; fileName: string }
  canShare: boolean
  onMake: () => void
  onShare: () => void
  onRead: (file: File | undefined) => void
}> = ({ labels, busy, status, card, canShare, onMake, onShare, onRead }) => (
  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
    <p className="text-sm text-gray-700">{labels.explain}</p>
    <button type="button" onClick={onMake} disabled={busy} className={BUTTON}>
      {labels.make}
    </button>
    {card && (
      <div className="space-y-2">
        <img src={card.url} alt={labels.cardAlt} className="mx-auto max-h-64 rounded shadow" />
        {canShare && (
          <button type="button" onClick={onShare} className={BUTTON}>
            {labels.share}
          </button>
        )}
        <a href={card.url} download={card.fileName} className={BUTTON}>
          {labels.download}
        </a>
      </div>
    )}
    <label className={BUTTON}>
      {labels.read}
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        className="sr-only"
        onChange={event => {
          onRead(event.target.files?.[0])
          event.target.value = ""
        }}
      />
    </label>
    <p role="status" className="text-sm text-gray-700">
      {status}
    </p>
  </div>
)
