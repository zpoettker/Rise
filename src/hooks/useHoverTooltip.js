import { useRef, useState } from 'react'

// Positions a tooltip above the hovered element, relative to the container `ref`.
export function useHoverTooltip() {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)

  const show = (event, content) => {
    const box = ref.current.getBoundingClientRect()
    const target = event.currentTarget.getBoundingClientRect()
    setTip({
      content,
      x: target.left + target.width / 2 - box.left,
      y: target.top - box.top,
    })
  }

  return { ref, tip, show, hide: () => setTip(null) }
}
