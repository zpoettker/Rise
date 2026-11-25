import { CUSTOM_COLORS } from '../../lib/customConfig'

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

// Points the accent scale inside [data-tracker='custom'] at the custom
// tracker's chosen colour, the same way index.css does for the built-in ones.
export function CustomTheme({ custom }) {
  if (!custom) return null
  const scale = CUSTOM_COLORS[custom.color].scale
  const vars = STEPS.map((step, i) => `--color-accent-${step}: ${scale[i]};`).join(' ')
  return (
    <style>{`[data-tracker='custom'] { ${vars} --glow-strong: ${scale[1]}; --glow-soft: ${scale[0]}; }`}</style>
  )
}
