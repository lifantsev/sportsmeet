import { useEffect, useState } from 'react'
import SignIn from './pages/SignIn'
import Discover from './pages/Discover.jsx'

// App loads the data; Discover decides how to display it.
function App() {
  const [games, setGames] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    // TODO(discover 6): Fetch with the selected filters and page cursor once the API
    // supports them. Reset the list on filter changes.
    fetch('/api/games', { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!signal.aborted) setGames(data)
      })
      .catch((err) => {
        if (!signal.aborted) setError(err.message)
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false)
      })

    fetch('/api/auth/me', { credentials: 'include', signal })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!signal.aborted) setUser(data?.user ?? null)
      })
      .catch(() => {
        if (!signal.aborted) setUser(null)
      })
      .finally(() => {
        if (!signal.aborted) setChecking(false)
      })

    return () => controller.abort()
  }, [])

  if (checking) return <p role="status">Checking your session...</p>
  if (!user) return <SignIn onSignedIn={setUser} />
  return <Discover games={games} loading={loading} error={error} />
}

export default App
