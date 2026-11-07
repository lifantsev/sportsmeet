import { useEffect, useState } from 'react'
import MapPage from './MapPage.jsx'

// Placeholder page that proves the client can reach the API.
// Replace with the real Discover page (design/screens/Discover-E.dc.html).
function App() {
  const [games, setGames] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/games')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setGames)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-0.05em' }}>pickup</h1>
      <MapPage />
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
}

export default App
