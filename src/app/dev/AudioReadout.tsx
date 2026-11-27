import { type FC, useEffect, useState } from "react"
import { audio } from "@/app/audio/audio"
import type { AudioService } from "@/app/audio/audioService"

// Develop mode only: what the audio is doing on this device, read twice a second, to find why a sound is not heard.
export const AudioReadout: FC<{ service?: AudioService }> = ({ service = audio }) => {
  const [diagnosis, setDiagnosis] = useState(service.diagnose)
  useEffect(() => {
    const timer = setInterval(() => setDiagnosis(service.diagnose()), 500)
    return () => clearInterval(timer)
  }, [service])
  const { context, music, played, dropped, latencyMs } = diagnosis
  return (
    <p className="font-mono text-xs text-stone-300">
      audio: context {context} · music {music} · latency {latencyMs ?? "?"} ms · played {played} · dropped: no context{" "}
      {dropped.noContext}, not running {dropped.notRunning}, decoding {dropped.decoding}
    </p>
  )
}
