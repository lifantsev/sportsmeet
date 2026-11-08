import { useEffect, useState } from 'react'
import GameCard from './GameCard.jsx'
import FilterBar from './FilterBar.jsx'
import CalendarBar from './CalendarBar.jsx'

// This is the home screen. App passes data in through these props.
// Design reference: design/HANDOFF.md and design/screens/Discover-E.dc.html
function Discover({ games, loading, error }) {

    const today = new Date()
    const [search, setSearch] = useState('')
    const [onlyJoinable, setOnlyJoinable] = useState(false)
    const [sportFilter, setSportFilter] = useState(() => new Set())
    const [dateFilter, setDateFilter] = useState(today.toDateString())

  

    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() + index)
      return date
    })

    function toggleDateFilter(date){
      setDateFilter(date.toDateString())
    }
    
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
    <main style={{ maxWidth: 1280, gap: 32,  margin: '32px auto', padding: 32, display: 'flex', flexDirection: 'column'}}>
      <header>
        <h2 style = {{fontFamily: 'system-ui'}}>pickup</h2>
        <h1>Find your next game</h1>
        {/* TODO 1: Add a short description underneath the heading. */}
        <p>Search for games below:</p>
      </header>

      <CalendarBar dateFilter={dateFilter} toggleDateFilter={toggleDateFilter} dates = {dates}></CalendarBar>

      <FilterBar
        sportFilter={sportFilter}
        toggleSport={toggleSport}
        onlyJoinable={onlyJoinable}
        onToggleJoinable={() => setOnlyJoinable((previous) => !previous)}
      />



     

      <section className = 'card-section' aria-labelledby="games-heading">
        <h2 id="games-heading">Upcoming games</h2>

        {loading && <p role="status">Loading games…</p>}
        {error && <p role="alert">Couldn't load games: {error}</p>}
        {!loading && !error && games.length === 0 && <p>No games found.</p>}

        {!loading && !error && (
          <ul class='game-list'>
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
                  
                let matchesDate = true
                const startDate = new Date(game.startsAt)
                if (startDate.toDateString() != dateFilter){
                  matchesDate = false
                }

                
                return joinable && matchesSport && matchesDate

                
            }).map((game) => {
              
  
              
              return (<li key={game.id}>
                <GameCard game={game}/>
              </li>
              )
            })}
          </ul>
        )}
      </section>

     
      

      
    </main>
  )
}

export default Discover
