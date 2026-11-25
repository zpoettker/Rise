// "Morning ✓ · Workout – · Work ✓" for the All tab's tooltips: the shown
// trackers (`ids`) by name (`trackers` from getTrackers)
export const hitsDetail = (day, ids, trackers) =>
  ids.map((id) => `${trackers[id].label} ${day?.[id] ? '✓' : '–'}`).join(' · ')
