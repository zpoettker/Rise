import { useLoginData } from './hooks/useLoginData'
import { toDateKey } from './lib/logins'

function App() {
  const [state] = useLoginData()
  const today = state.entries[toDateKey(new Date())]

  return (
    <main className="min-h-svh grid place-items-center bg-amber-50 text-amber-900">
      <div className="text-center">
        <h1 className="text-4xl font-semibold">Good morning ☀️</h1>
        <p className="mt-2 text-amber-700">
          {today ? `Logged on at ${today.time}` : 'Weekend, not tracked'}
        </p>
      </div>
    </main>
  )
}

export default App
