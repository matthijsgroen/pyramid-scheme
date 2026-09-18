import { useState, type FC } from "react"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"

type SaveTransferLabels = {
  title: string
  copy: string
  paste: string
  placeholder: string
}

// The render half of the save-carrying tool: a button that hands the current save out as text, and a
// box to paste one in. Stateless by the ui/ layer rule beyond the text in the box — where the save
// comes from and what replacing it means live in src/app/dev/SaveTransfer.tsx. Loud like the rest of
// the dev tray so it can never be mistaken for shipping UI.
export const SaveTransferPanel: FC<{
  labels: SaveTransferLabels
  status?: string
  onCopy: () => void
  onPaste: (text: string) => void
}> = ({ labels, status, onCopy, onPaste }) => {
  const [text, setText] = useState("")

  return (
    <div className="mb-4 w-full rounded border-2 border-dashed border-red-500 bg-red-950/40 p-2">
      <h3 className="mb-2 text-center text-xs font-bold tracking-wide text-red-300 uppercase">{labels.title}</h3>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <DeveloperButton label={labels.copy} onClick={onCopy} />
        <DeveloperButton label={labels.paste} onClick={() => onPaste(text)} />
      </div>
      <textarea
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder={labels.placeholder}
        spellCheck={false}
        className="mt-2 h-20 w-full rounded border border-red-500/60 bg-black/40 p-1 font-mono text-[10px] text-red-100"
      />
      {status && <p className="text-center text-[10px] text-red-200">{status}</p>}
    </div>
  )
}
