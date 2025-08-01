import { useMemo } from "react"

export const LevelCompletedOverlay = () => {
  // Random rotation between -20deg and +20deg
  const rotation = useMemo(() => {
    const deg = Math.random() * 40 - 20
    return `rotate(${deg}deg)`
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex animate-fade-in items-center justify-center opacity-0 delay-0">
      <span
        className="font-pyramid text-[6vw] font-extrabold text-green-400 select-none text-shadow-black text-shadow-lg"
        style={{ transform: rotation }}
      >
        Level Completed!
      </span>
    </div>
  )
}
