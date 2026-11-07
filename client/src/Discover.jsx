import { useEffect, useState } from 'react'
import GameCard from './GameCard.jsx'
// This is the home screen. App passes data in through these props.
// Design reference: design/HANDOFF.md and design/screens/Discover-E.dc.html
function Discover({ games, loading, error }) {
    const [search, setSearch] = useState('')
    const [onlyJoinable, setOnlyJoinable] = useState(false)
    const [sportFilter, setSportFilter] = useState(() => new Set())
    
    function toggleSport(sport){
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

    

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: 32 }}>
      <header>
        <p>pickup</p>
        <h1>Find your next game</h1>
        {/* TODO 1: Add a short description underneath the heading. */}
        <p>Search for games below:</p>
      </header>

    <div class="filter-button-container">
      <button

          onClick={() => {
            setOnlyJoinable(!onlyJoinable)
            
          }}
          aria-pressed={onlyJoinable}
          className = {onlyJoinable ? "filter-button active" : "filter-button"}
          >
          Only Joinable Games
      </button>

      <button

          onClick={() => {
            toggleSport("Soccer")
        
          }}
          aria-pressed={sportFilter.has("Soccer")}
          className = {sportFilter.has("Soccer") ? "filter-button active" : "filter-button"}
          >
          Soccer
      </button>

      <button

          onClick={() => {
            toggleSport("Basketball")
          
          }}
          aria-pressed={sportFilter.has("Basketball")}
          className = {sportFilter.has("Basketball") ? "filter-button active" : "filter-button"}
          >
          Basketball
      </button>

      <button

          onClick={() => {
            toggleSport("Beach volleyball")
          
          }}
          aria-pressed={sportFilter.has("Beach volleyball")}
          className = {sportFilter.has("Beach volleyball") ? "filter-button active" : "filter-button"}
          >
          Beach volleyball
      </button>
    </div>



     

      <section aria-labelledby="games-heading">
        <h2 id="games-heading">Upcoming games</h2>

        {loading && <p role="status">Loading games…</p>}
        {error && <p role="alert">Couldn't load games: {error}</p>}
        {!loading && !error && games.length === 0 && <p>No games found.</p>}

        {!loading && !error && (
          <ul>
            {games.filter((game) => {
                
                let joinable = true
                if (onlyJoinable){
                    joinable = game.playerCount < game.maxPlayers;
                }
                
                let matchesSport = true
                if (sportFilter.size != 0){
                  if (!sportFilter.has(game.sport)){
                    matchesSport = false
                  }
                }
                  

                
                return joinable && matchesSport

                
            }).map((game) => {
              
              
              
              return (<li key={game.id}>
                <GameCard game={game}/>
              </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* TODO 5: Style the list as cards using classes in index.css.
          Once one card works, extract it into a GameCard component. */}
    </main>
  )
}

export default Discover
