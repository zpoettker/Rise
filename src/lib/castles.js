import { toDateKey } from './logins'
import { getWorkDays, getWorkRecords, goalOn, isWorkDay, workStart } from './work'

// Castle builder: every day the work goal is met lays one brick. Bricks fill
// a castle's outline from the bottom row up, left to right; once it's
// complete the next castle starts. Designs are drawn row by row, top to
// bottom, one character per brick width: '#' is wall, '.' is open space.
// Bricks are laid in a running bond: every other row is shifted by half a
// brick, with half-bricks at the ends so the outline stays straight. After
// the last design they repeat with a number ("The Watchtower II").
export const CASTLES = [
  {
    name: 'The Watchtower',
    rows: ['#.#.#', '#####', '##.##', '#####', '#####', '##.##'],
  },
  {
    name: 'The Gatehouse',
    rows: ['#.#...#.#', '###...###', '###.#.###', '#########', '##.###.##', '###...###', '###...###'],
  },
  {
    name: 'The Keep',
    rows: [
      '#.#.....#.#',
      '###.....###',
      '###.#.#.###',
      '###########',
      '##.#####.##',
      '###########',
      '####...####',
      '####...####',
    ],
  },
  {
    name: 'The Castle',
    rows: [
      '#.#...#.#...#.#',
      '###...###...###',
      '###...###...###',
      '###.#.###.#.###',
      '###############',
      '##.###.#.###.##',
      '###############',
      '######...######',
      '######...######',
    ],
  },
  {
    name: 'The Citadel',
    rows: [
      '#.#.....#.#.....#.#',
      '###.....###.....###',
      '###.....###.....###',
      '###.#.#.###.#.#.###',
      '###################',
      '##.###.#####.###.##',
      '###################',
      '###################',
      '########...########',
      '########...########',
    ],
  },
]

// Brick slots in build order (bottom row first, left to right), measured in
// half-brick units: { row, col, span } where span is 2 (a brick) or 1 (a
// half-brick at an edge or beside an opening). The top row is never shifted,
// so battlements stay whole.
export function castleBricks(design) {
  const { rows } = design
  const bricks = []
  for (let row = rows.length - 1; row >= 0; row--) {
    const cells = [...rows[row]].flatMap((c) => [c, c]) // each brick width is two halves
    const shift = row % 2 // rows alternate, counting from the top
    let col = 0
    while (col < cells.length) {
      // a brick normally covers two halves; shifted rows start with one
      const span = col === 0 && shift ? 1 : Math.min(2, cells.length - col)
      const wall = []
      for (let i = col; i < col + span; i++) if (cells[i] === '#') wall.push(i)
      if (wall.length) bricks.push({ row, col: wall[0], span: wall.length })
      col += span
    }
  }
  return bricks
}

const ROMAN = ['', '', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X']

// The nth castle (0-based): its design, name and brick slots
export function castleAt(n) {
  const design = CASTLES[n % CASTLES.length]
  const round = Math.floor(n / CASTLES.length) + 1
  return {
    n,
    name: design.name + (ROMAN[round] ?? ` ${round}`),
    rows: design.rows,
    bricks: castleBricks(design),
  }
}

// Where the building stands: the castles finished so far (each with the day
// its last brick went in), the one under construction with the date of each
// brick laid, and today's part in it. Today counts as soon as its goal is met,
// including time on a running timer. On the day a castle is finished it stays
// on show, complete; the next one starts after that.
export function getCastleProgress(state, today = new Date(), now = Date.now()) {
  const todayKey = toDateKey(today)
  const start = workStart(state)
  const past = start
    ? getWorkDays(state, start, today).filter((d) => d.status === 'hit' && d.date < todayKey)
    : []
  const { todayMinutes } = getWorkRecords(state, today, now)
  const todayGoal = goalOn(state.settings, today)
  const todayMet = todayMinutes >= todayGoal
  const dates = past.map((d) => d.date)
  if (todayMet) dates.push(todayKey)

  const completed = []
  let used = 0
  let n = 0
  while (dates.length - used >= castleAt(n).bricks.length) {
    const castle = castleAt(n)
    const size = castle.bricks.length
    completed.push({ ...castle, laid: size, dates: dates.slice(used, used + size), finishedOn: dates[used + size - 1] })
    used += size
    n += 1
  }

  // a castle finished today stays up today, complete
  const justFinished = completed.at(-1)?.finishedOn === todayKey && used === dates.length
  const current = justFinished
    ? completed.pop()
    : { ...castleAt(n), laid: dates.length - used, dates: dates.slice(used) }

  // the castles still to come in this round of designs (at least the next one)
  const roundEnd = (Math.floor(current.n / CASTLES.length) + 1) * CASTLES.length
  const locked = []
  for (let i = current.n + 1; i < Math.max(roundEnd, current.n + 2); i++) locked.push(castleAt(i))

  return {
    completed,
    current,
    locked,
    justFinished,
    todayMet,
    todayLeft: Math.max(0, todayGoal - todayMinutes),
    todayTracked: isWorkDay(today, state.settings),
    totalBricks: dates.length,
  }
}
