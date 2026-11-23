// Temporary mock data for the map until the server has a Location model.
// Replace getGames() / getLocations() with fetch calls once the API returns
// game locations with lat/lng.
import data from './sample-data.json'

// The sample games were written for the week of Oct 30. Move them so the
// first sample day is today, keeping each game's local start time.
const dayShift = (() => {
  const sampleDay = new Date(data.now)
  sampleDay.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today - sampleDay) / 86_400_000)
})()

function shiftDate(iso) {
  const date = new Date(iso)
  date.setDate(date.getDate() + dayShift)
  return date
}

const me = data.users.find((u) => u.id === data.currentUserId)

export const home = { lat: me.homeLocation.lat, lng: me.homeLocation.lng }

export function getLocations() {
  return data.locations
}

export function getGames() {
  return data.games.map((g) => ({
    id: g.id,
    sport: g.sport,
    skill: g.skill,
    title: g.title,
    locationId: g.locationId,
    startsAt: shiftDate(g.startsAt),
    maxPlayers: g.maxPlayers,
    playerCount: g.playerIds.length,
  }))
}
