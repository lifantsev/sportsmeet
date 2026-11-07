import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const UCLA = [34.0689, -118.4452]

const SPORT_COLORS = {
  Basketball: '#7A4A1E',
  Soccer: '#22663F',
  'Beach volleyball': '#24598C',
  Tennis: '#2F62B0',
  Ultimate: '#22594A',
  Spikeball: '#7A5A0C',
}

function MapPage() {
  const [games, setGames] = useState([])

  useEffect(() => {
    fetch('/api/games')
      .then((res) => res.json())
      .then(setGames)
  }, [])

  return (
    <MapContainer center={UCLA} zoom={14} style={{ height: '80vh', borderRadius: 28 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {games.map((game) => (
        <CircleMarker
          key={game.id}
          center={[game.lat, game.lng]}
          radius={12}
          pathOptions={{ color: SPORT_COLORS[game.sport] ?? '#121316', fillOpacity: 0.85 }}
        >
          <Popup>
            <strong>{game.title}</strong>
            <br />
            {game.locationName} · {game.playerCount}/{game.maxPlayers}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

export default MapPage