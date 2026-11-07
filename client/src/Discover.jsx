// This is the home screen. App passes data in through these props.
// Design reference: design/HANDOFF.md and design/screens/Discover-E.dc.html
function Discover({ games, loading, error }) {
  // TODO 3: Add search state with useState('') and a labeled search input.
  // Then filter games by title and render the filtered array below.

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: 32 }}>
      <header>
        <p>pickup</p>
        <h1>Find your next game</h1>
        {/* TODO 1: Add a short description underneath the heading. */}
      </header>

      {/* TODO 4: Add sport filter buttons after search works. */}

      <section aria-labelledby="games-heading">
        <h2 id="games-heading">Upcoming games</h2>

        {loading && <p role="status">Loading games…</p>}
        {error && <p role="alert">Couldn't load games: {error}</p>}
        {!loading && !error && games.length === 0 && <p>No games found.</p>}

        {!loading && !error && (
          <ul>
            {games.map((game) => (
              <li key={game.id}>
                <h3>{game.title}</h3>
                <p>{game.sport} · {game.locationName}</p>
                {/* TODO 2: Show playerCount / maxPlayers here using game's fields.
                    Example JSX for a value: <span>{game.sport}</span>
                    After that, calculate and display the number of spots left. */}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* TODO 5: Style the list as cards using classes in index.css.
          Once one card works, extract it into a GameCard component. */}
    </main>
  )
}

export default Discover
