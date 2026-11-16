export const HIT_FILLS = [null, 'bg-accent-200', 'bg-accent-300', 'bg-accent-400', 'bg-accent-500']
export const MISS_FILL = 'bg-miss'
export const HEATMAP_MISS_FILL = 'bg-miss-dark'

// Hits are shaded by their level (1–4); late, partial and missed days get a
// muted tan; rest, pending and untracked days stay blank.
export function dayFill(day) {
  if (day?.status === 'hit') return HIT_FILLS[day.level]
  if (day?.status === 'late' || day?.status === 'partial' || day?.status === 'missed') {
    return MISS_FILL
  }
  return null
}
