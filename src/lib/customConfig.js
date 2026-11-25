// One extra tracker you set up yourself: a name, an icon, a colour and a goal,
// either every day or a number of days a week; you check days off by hand.
// Kept free of imports so saving and backups can use it (see custom.js for
// the days and stats). Settings: `settings.custom`, null until it's added.

export const MAX_CUSTOM_NAME = 20
export const CUSTOM_ICON_IDS = ['star', 'book', 'heart', 'drop', 'leaf', 'music', 'pencil', 'moon']

// 8 colours, none of them the gold / blue / green of the built-in trackers.
// Full 50–900 scales so the tab themes like the others.
export const CUSTOM_COLORS = {
  violet: {
    label: 'Violet',
    scale: [
      '#f5f1ff',
      '#ebe3ff',
      '#d6c7fe',
      '#b9a0fb',
      '#9b76f5',
      '#8257e9',
      '#6c41cf',
      '#5733a8',
      '#432a7f',
      '#2f2058',
    ],
  },
  pink: {
    label: 'Pink',
    scale: [
      '#fff1f7',
      '#ffe2ef',
      '#ffc4df',
      '#fd99c6',
      '#f66aa8',
      '#e9478d',
      '#cf3174',
      '#aa265e',
      '#82214b',
      '#5b1a36',
    ],
  },
  red: {
    label: 'Red',
    scale: [
      '#fff2f0',
      '#ffe0dc',
      '#ffbfb7',
      '#fa958c',
      '#ef6a61',
      '#dc4a42',
      '#bc3632',
      '#972b28',
      '#722422',
      '#501c1a',
    ],
  },
  coral: {
    label: 'Coral',
    scale: [
      '#fff4ee',
      '#ffe6d9',
      '#ffcab0',
      '#fda67e',
      '#f6824f',
      '#e8652f',
      '#c94f22',
      '#a23f1e',
      '#7b321c',
      '#552416',
    ],
  },
  teal: {
    label: 'Teal',
    scale: [
      '#edfbf8',
      '#d3f5ee',
      '#a6eadd',
      '#6fd8c6',
      '#3fc0ad',
      '#22a392',
      '#178477',
      '#156a60',
      '#14524b',
      '#103b36',
    ],
  },
  cyan: {
    label: 'Cyan',
    scale: [
      '#ecfbfe',
      '#d2f4fb',
      '#a5e8f6',
      '#6ad4ec',
      '#36bade',
      '#1d9cc4',
      '#167ea3',
      '#166584',
      '#164e66',
      '#123848',
    ],
  },
  indigo: {
    label: 'Indigo',
    scale: [
      '#f0f2ff',
      '#e1e5ff',
      '#c6cdfd',
      '#a1abf9',
      '#7d86f1',
      '#6366e3',
      '#5250c7',
      '#4441a0',
      '#36357a',
      '#272754',
    ],
  },
  slate: {
    label: 'Slate',
    scale: [
      '#f3f5f8',
      '#e5e9ef',
      '#cbd2dd',
      '#a7b2c3',
      '#8090a6',
      '#64748b',
      '#526074',
      '#434e5e',
      '#353e4a',
      '#262c35',
    ],
  },
}

export const DEFAULT_CUSTOM = { name: '', icon: 'star', color: 'violet', goal: 'daily', perWeek: 3 }

// The custom tracker from saved settings or a backup, or null if there isn't a
// valid one. Bad fields fall back to the defaults.
export function readCustom(saved) {
  const c = saved?.custom
  if (!c || typeof c.name !== 'string' || !c.name.trim()) return null
  const perWeek = Number.isInteger(c.perWeek) && c.perWeek >= 1 && c.perWeek <= 7
  return {
    name: c.name.trim().slice(0, MAX_CUSTOM_NAME),
    icon: CUSTOM_ICON_IDS.includes(c.icon) ? c.icon : DEFAULT_CUSTOM.icon,
    color: CUSTOM_COLORS[c.color] ? c.color : DEFAULT_CUSTOM.color,
    goal: c.goal === 'weekly' ? 'weekly' : 'daily',
    perWeek: perWeek ? c.perWeek : DEFAULT_CUSTOM.perWeek,
  }
}

// Valid checked-off days from a save or backup
export function readCustomLog(log) {
  if (!log || typeof log !== 'object') return {}
  return Object.fromEntries(
    Object.keys(log)
      .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key) && log[key] === true)
      .map((key) => [key, true]),
  )
}
