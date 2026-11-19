import { useEffect, useRef, useState } from 'react'

// [ref, width]: the width of the element `ref` is attached to, kept up to
// date as it resizes (0 until it's measured)
export function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}
