import { useCallback, useEffect, useState, type RefCallback } from "react"

export type ElementSize = { width: number; height: number }

const UNMEASURED: ElementSize = { width: 0, height: 0 }

// The size of an element, kept up to date by a ResizeObserver; zero until the first measurement. The ref is a
// callback so an element that mounts later (or is swapped) is picked up.
export const useElementSize = (): [RefCallback<HTMLElement>, ElementSize] => {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [size, setSize] = useState<ElementSize>(UNMEASURED)

  useEffect(() => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  const ref = useCallback((el: HTMLElement | null) => setElement(el), [])
  return [ref, size]
}
