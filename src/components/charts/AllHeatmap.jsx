import { getTrackers } from '../../lib/trackers'
import { Card, CardLabel } from '../ui/Card'
import { TrackerIcon } from '../ui/TrackerIcons'
import { HeatmapBody } from './YearHeatmap'

// The past year for the shown trackers in one big card: each tracker's own
// heatmap (same shading, tooltips and legend as on its tab), stacked so the
// weeks line up from top to bottom.
export function AllHeatmap({ state, today = new Date() }) {
  return (
    <Card className="space-y-6">
      <CardLabel>Past year</CardLabel>
      {state.settings.enabledTrackers
        .map((id) => getTrackers(state.settings)[id])
        .map((tracker, i) => {
          return (
            <div
              key={tracker.id}
              data-tracker={tracker.id}
              className={i ? 'border-t border-line pt-6' : ''}
            >
              <HeatmapBody
                tracker={tracker}
                state={state}
                today={today}
                title={
                  <h3 className="flex items-center gap-2 font-sans text-base font-bold text-ink">
                    <TrackerIcon
                      id={tracker.id}
                      custom={state.settings.custom}
                      className="size-5 text-accent-500"
                    />
                    {tracker.label}
                  </h3>
                }
              />
            </div>
          )
        })}
    </Card>
  )
}
