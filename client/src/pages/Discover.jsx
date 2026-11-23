import { useState } from 'react'
import GameCard from '../GameCard.jsx'
import FilterBar from '../FilterBar.jsx'
import CalendarBar from '../CalendarBar.jsx'

// App passes in games. Discover owns the calendar and filters.
function Discover({ games, loading, error }) {
  const [dates] = useState(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() + index)
      return date
    })
  })
  const [onlyJoinable, setOnlyJoinable] = useState(false)
  const [sportFilter, setSportFilter] = useState(() => new Set())
  const [dateFilter, setDateFilter] = useState(() => dates[0].toDateString())

  function toggleDateFilter(date) {
    setDateFilter(date.toDateString())
  }

  function toggleSport(sport) {
    setSportFilter((previous) => {
      const next = new Set(previous)
      if (next.has(sport)) {
        next.delete(sport)
      } else {
        next.add(sport)
      }
      return next
    })
  }

  const selectedSports = new Set(Array.from(sportFilter, (sport) => sport.toLowerCase()))
  const visibleGames = games.filter((game) => {
    const startDate = new Date(game.time ?? game.startsAt)
    const matchesSport = selectedSports.size === 0 || selectedSports.has(game.sport.trim().toLowerCase())
    const joinable = Number.isFinite(game.maxPlayers) && Number.isFinite(game.playerCount) &&
      game.playerCount < game.maxPlayers

    return startDate.toDateString() === dateFilter && matchesSport && (!onlyJoinable || joinable)
  })

  return (
    <main className="discover-page" style={{ maxWidth: 1280, gap: 32, margin: '48px auto', padding: 32, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontFamily: 'system-ui' }}>pickup</h2>
        <h1 style={{ fontStyle: 'italic' }}>Discover</h1>
      </header>

      <CalendarBar dateFilter={dateFilter} toggleDateFilter={toggleDateFilter} dates={dates} />

      <FilterBar
        sportFilter={sportFilter}
        toggleSport={toggleSport}
        onlyJoinable={onlyJoinable}
        onToggleJoinable={() => setOnlyJoinable((previous) => !previous)}
      />

      <section className="card-section" aria-labelledby="games-heading">
        <h2 id="games-heading">Upcoming games</h2>
        {loading && <p role="status">Loading games…</p>}
        {error && <p role="alert">Couldn't load games: {error}</p>}
        {!loading && !error && visibleGames.length === 0 && <p>No games found.</p>}
        {!loading && !error && visibleGames.length > 0 && (
          <ul className="game-list">
            {visibleGames.map((game) => (
              <li key={game.id}>
                <GameCard game={game} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default Discover
