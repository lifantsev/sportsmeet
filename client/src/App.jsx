import { useEffect, useState } from 'react'
import SignIn from './pages/SignIn'

// Placeholder page that proves the client can reach the API.
// Replace with the real Discover page (design/screens/Discover-E.dc.html).
function App() {
  const [games, setGames] = useState([])
  const [error, setError] = useState(null)

  const [user, setUser] = useState(null) 
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/games')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setGames)
      .catch((err) => setError(err.message))
    
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  if (checking) return <p>Checking your session...</p>
  if (user) return <p>Signed in as {user.name}</p>
  return <SignIn onSignedIn={setUser} />
  /*
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-0.05em' }}>pickup</h1>
      {error && <p style={{ color: 'var(--error)' }}>Couldn't load games: {error}</p>}
      <ul>
        {games.map((game) => (
          <li key={game.id}>
            <strong>{game.title}</strong> · {game.sport} · {game.locationName} ·{' '}
            {game.playerCount}/{game.maxPlayers}
          </li>
        ))}
      </ul>
    </main>
    
  )
  */
    
}

export default App
