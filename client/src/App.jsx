import { useEffect, useState } from 'react'
import Discover from './Discover.jsx'

// App loads the data; Discover decides how to display it.
function App() {
  const [games, setGames] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/games')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setGames)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return <Discover games={games} loading={loading} error={error} />
}

export default App
