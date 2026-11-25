import { useEffect, useState } from 'react'
import { api, gameUrl } from './api.js'

// Pop-ups for the game's host: removing a player (with a message) and editing the game.

const SPORTS = ['Basketball', 'Soccer', 'Beach volleyball', 'Tennis', 'Ultimate', 'Spikeball']
const SKILLS = ['All levels', 'Beginner', 'Intermediate', 'Advanced']

const font = "'Schibsted Grotesk', system-ui, sans-serif"
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
const inputStyle = {
  height: 44,
  padding: '0 14px',
  borderRadius: 'var(--radius-input)',
  border: '1px solid var(--input-border)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  font: `400 15px ${font}`,
}
const primaryButton = (color) => ({
  height: 44,
  padding: '0 22px',
  borderRadius: 999,
  border: 0,
  background: color,
  color: '#fff',
  font: `700 15px ${font}`,
  cursor: 'pointer',
})
const cancelButton = {
  height: 44,
  padding: '0 18px',
  borderRadius: 999,
  border: '1px solid var(--border-2)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  font: `600 15px ${font}`,
  cursor: 'pointer',
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'auto', padding: 24, borderRadius: 22, background: 'var(--surface)', boxShadow: 'var(--shadow-float)' }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 400, letterSpacing: '0.02em', marginBottom: 16 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

// Removes a player and sends them the host's message. Calls onRemoved with the new roster.
export function RemovePlayerDialog({ gameId, player, onClose, onRemoved }) {
  const [message, setMessage] = useState(`Hi ${player.name.split(' ')[0]}, I need to free up your spot in this game. Sorry about that!`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { players } = await api('DELETE', `${gameUrl(gameId)}/players/${encodeURIComponent(player.id)}`, { message })
      onRemoved(players)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title={`Remove ${player.name}?`} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={labelStyle}>
          Message to {player.name}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            rows={4}
            style={{ ...inputStyle, height: 'auto', padding: 14, lineHeight: 1.5, resize: 'vertical' }}
          />
        </label>
        {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--error)' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" onClick={onClose} style={cancelButton}>Cancel</button>
          <button type="submit" disabled={busy} style={{ ...primaryButton('var(--error)'), opacity: busy ? 0.5 : 1 }}>
            {busy ? 'Removing…' : 'Remove and send message'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// <input type="datetime-local"> wants local time as "YYYY-MM-DDTHH:mm".
const toLocalInput = (iso) => {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Edits the game's sport, skill level, location, player limit and start time. Calls onSaved with the updated game.
export function EditGameDialog({ game, playerCount, onClose, onSaved }) {
  const [sport, setSport] = useState(game.sport)
  const [skill, setSkill] = useState(game.skill)
  const [locationId, setLocationId] = useState(game.location.id)
  const [maxPlayers, setMaxPlayers] = useState(game.maxPlayers)
  const [startsAt, setStartsAt] = useState(toLocalInput(game.startsAt))
  const [locations, setLocations] = useState([game.location])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api('GET', '/api/locations')
      .then(setLocations)
      .catch(() => setError('Couldn’t load the list of locations.'))
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const saved = await api('PATCH', gameUrl(game.id), {
        sport,
        skill,
        locationId,
        maxPlayers: Number(maxPlayers),
        startsAt: new Date(startsAt).toISOString(),
      })
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="Edit game" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={labelStyle}>
          Sport
          <select value={sport} onChange={(e) => setSport(e.target.value)} style={inputStyle}>
            {SPORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Skill level
          <select value={skill} onChange={(e) => setSkill(e.target.value)} style={inputStyle}>
            {SKILLS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Location
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={inputStyle}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Start time
          <input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Max players (currently {playerCount} joined)
          <input
            type="number"
            required
            min={Math.max(2, playerCount)}
            max={30}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            style={inputStyle}
          />
        </label>
        {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--error)' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" onClick={onClose} style={cancelButton}>Cancel</button>
          <button type="submit" disabled={busy} style={{ ...primaryButton('var(--ink)'), opacity: busy ? 0.5 : 1 }}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
