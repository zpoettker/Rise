import { useEffect, useState } from 'react'

const TAB_KEY = 'rise:tab'
const TABS = ['morning', 'workout', 'work', 'custom', 'all']

function loadTab() {
  try {
    const saved = localStorage.getItem(TAB_KEY)
    return TABS.includes(saved) ? saved : 'morning'
  } catch {
    return 'morning'
  }
}

// The selected tracker tab, remembered per browser. It also themes the whole
// page: <html data-tracker> swaps the accent colour (morning keeps the default gold).
// A tab that's been hidden (`enabled` = the shown trackers) falls back to the
// first shown one; All is always there.
export function useTrackerTab(enabled) {
  const [picked, setTab] = useState(loadTab)
  const tab = picked === 'all' || enabled.includes(picked) ? picked : enabled[0]

  useEffect(() => {
    const root = document.documentElement
    if (tab !== 'morning') root.dataset.tracker = tab
    else delete root.dataset.tracker
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      // not remembering the tab is fine
    }
  }, [tab])

  return [tab, setTab]
}
