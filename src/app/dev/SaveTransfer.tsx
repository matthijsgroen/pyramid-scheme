import { useState, type FC } from "react"
import { readGameData, writeGameData } from "@/support/useGameStorage"
import { SaveTransferPanel } from "@/ui/molecules/SaveTransferPanel"

const asKb = (text: string) => `${Math.round(new Blob([text]).size / 1024)} kB`

// Carrying a real save off the device that made it. A save written by a phone is the only thing that
// can answer whether a change survives one, so this hands it over as text (clipboard, falling back to
// the box when the clipboard is refused) and takes one back. Replacing reloads the page: the hooks
// already mounted hold the state they last rendered, so what is on screen would otherwise be a lie.
export const SaveTransfer: FC = () => {
  const [status, setStatus] = useState<string>()

  const copy = async () => {
    const text = JSON.stringify(await readGameData())
    try {
      await navigator.clipboard.writeText(text)
      setStatus(`copied ${asKb(text)} — paste it into the same box on the other device`)
    } catch {
      setStatus(`clipboard refused; ${asKb(text)} is in the box, select it by hand`)
    }
  }

  const paste = async (text: string) => {
    if (!text.trim()) return setStatus("nothing pasted")
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      return setStatus("that is not a save (could not read it as JSON)")
    }
    if (!window.confirm(`Replace this device's save with ${Object.keys(data).length} pasted entries?`)) return
    await writeGameData(data)
    window.location.reload()
  }

  return (
    <SaveTransferPanel
      labels={{
        title: "Carry a save between devices",
        copy: "Copy this save",
        paste: "Replace with pasted save",
        placeholder: "paste a save here",
      }}
      status={status}
      onCopy={copy}
      onPaste={paste}
    />
  )
}
