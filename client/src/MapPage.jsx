import { useMemo, useState } from 'react'
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps'
import { FaClock, FaLocationArrow } from 'react-icons/fa'
import { FaLocationPin } from 'react-icons/fa6'
import { IoPerson } from 'react-icons/io5'
import { MdBarChart } from 'react-icons/md'
import { getGames, getLocations, home } from './mock/games.js'
import './MapPage.css'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID

const SPORTS = ['Soccer', 'Basketball', 'Beach volleyball']

// The next 7 days starting today, for the day strip.
function nextSevenDays() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today)
    day.setDate(today.getDate() + i)
    return day
  })
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString()
}

function dayLabel(day) {
  return day.toLocaleDateString([], { weekday: 'short', day: 'numeric' })
}

// Straight-line distance in miles (haversine formula).
function milesBetween(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

function formatMiles(miles) {
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`
}

// Fit the map around every location instead of hard-coding a zoom level.
function boundsAround(locations) {
  const lats = locations.map((l) => l.lat)
  const lngs = locations.map((l) => l.lng)
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
    padding: 60,
  }
}

function MapPage() {
  const days = useMemo(() => nextSevenDays(), [])
  const locations = useMemo(() => getLocations(), [])
  const allGames = useMemo(() => getGames(), [])

  const [query, setQuery] = useState('')
  const [day, setDay] = useState(days[0])
  const [sport, setSport] = useState(null)
  const [joinableOnly, setJoinableOnly] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState(null)

  // Every filter narrows the same list, so the markers and the game list
  // below the map always agree.
  const q = query.trim().toLowerCase()
  const games = allGames.filter((g) => {
    const location = locations.find((l) => l.id === g.locationId)
    if (!sameDay(g.startsAt, day)) return false
    if (sport && g.sport !== sport) return false
    if (joinableOnly && g.playerCount >= g.maxPlayers) return false
    if (q && !g.title.toLowerCase().includes(q) && !location.name.toLowerCase().includes(q))
      return false
    return true
  })

  const shownLocations = q
    ? locations.filter(
        (l) => l.name.toLowerCase().includes(q) || games.some((g) => g.locationId === l.id),
      )
    : locations

  const selectedLocation = locations.find((l) => l.id === selectedLocationId)
  const selectedGames = games.filter((g) => g.locationId === selectedLocationId)

  return (
    <div className="map-page">
      <header className="map-nav">
        <span className="map-wordmark">pickup</span>
        <nav>
          <a href="#">Discover</a>
          <a href="#" className="active">Map</a>
          <a href="#">Create game</a>
          <a href="#">Profile</a>
        </nav>
      </header>

      <h1 className="map-title">Map</h1>

      <label className="map-search">
        <span>Search parks and games</span>
        <input
          type="search"
          placeholder="Park name or keyword"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="map-days">
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            className={sameDay(d, day) ? 'active' : ''}
            onClick={() => setDay(d)}
          >
            {dayLabel(d)}
          </button>
        ))}
      </div>

      <div className="map-chips">
        <button
          type="button"
          className={joinableOnly ? 'active' : ''}
          aria-pressed={joinableOnly}
          onClick={() => setJoinableOnly(!joinableOnly)}
        >
          Only joinable games
        </button>
        {SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            className={sport === s ? 'active' : ''}
            aria-pressed={sport === s}
            onClick={() => setSport(sport === s ? null : s)}
          >
            {s}
          </button>
        ))}
      </div>

      {API_KEY ? (
        <APIProvider apiKey={API_KEY}>
          <Map
            className="map-canvas"
            mapId={MAP_ID}
            defaultBounds={boundsAround(locations)}
            disableDefaultUI
            zoomControl
            clickableIcons={false}
            gestureHandling="cooperative"
          >
            {shownLocations.map((location) => {
              const count = games.filter((g) => g.locationId === location.id).length
              const state =
                location.id === selectedLocationId ? 'selected' : count === 0 ? 'empty' : ''
              return (
                <AdvancedMarker
                  key={location.id}
                  position={{ lat: location.lat, lng: location.lng }}
                  title={location.name}
                  onClick={() => setSelectedLocationId(location.id)}
                >
                  <div className={`park-marker ${state}`}>
                    <span className="park-count">{count}</span>
                    <span className="park-name">{location.name}</span>
                  </div>
                </AdvancedMarker>
              )
            })}
          </Map>
        </APIProvider>
      ) : (
        <p className="map-missing-key">
          Add VITE_GOOGLE_MAPS_API_KEY and VITE_GOOGLE_MAP_ID to client/.env, then restart the
          client.
        </p>
      )}

      <p className="map-caption">
        The number on a marker is the games on {dayLabel(day)}. Select a park to see its games.
      </p>

      {selectedLocation && (
        <section className="park-games">
          <h2>{selectedLocation.name}</h2>
          <p className="park-meta">
            <FaLocationPin /> {selectedGames.length} game{selectedGames.length === 1 ? '' : 's'} on{' '}
            {dayLabel(day)} <span>|</span> {formatMiles(milesBetween(home, selectedLocation))}
          </p>

          {selectedGames.length === 0 && <p>No games here that match your filters.</p>}

          {selectedGames.map((game) => (
            <article key={game.id} className="map-game-card">
              <p className="card-sport">{game.sport}</p>
              <h3>{game.title}</h3>
              <p className="card-time">
                <FaClock />{' '}
                {game.startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="card-meta">
                <FaLocationPin /> {selectedLocation.name} <span>|</span> <FaLocationArrow />{' '}
                {formatMiles(milesBetween(home, selectedLocation))} <span>|</span> <MdBarChart />{' '}
                {game.skill}
              </p>
              <div className="card-actions">
                {/* TODO: link to the game page once routing exists */}
                <button type="button" disabled={game.playerCount >= game.maxPlayers}>
                  {game.playerCount >= game.maxPlayers ? 'Game full' : 'Join game'}
                </button>
                <span>
                  <IoPerson /> {game.playerCount} / {game.maxPlayers}
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

export default MapPage
