import { Fragment, useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api, gameUrl } from './api.js'
import { EditGameDialog, RemovePlayerDialog } from './HostTools.jsx'

// Game detail page (design/screens/Game.dc.html).
// Loads the game from GET /api/games/:id and the viewer from GET /api/users/me.
// The join/leave handlers below are still local stand-ins for the real endpoints.

const TZ = 'America/Los_Angeles'
const AVATARS = [
  ['#E3E9F5', '#2F62B0'],
  ['#F3E6D8', '#7A4A1E'],
  ['#E0F0E6', '#22663F'],
  ['#EEE6F7', '#5B3B8C'],
  ['#F7E3E6', '#9A2F45'],
  ['#E6EEF2', '#2D5A70'],
]
const SPORT_TINTS = {
  Basketball: ['#F3E6D8', '#7A4A1E'],
  Soccer: ['#E0F0E6', '#22663F'],
  'Beach Volleyball': ['#E3EEF7', '#24598C'],
  Tennis: ['#E3E9F5', '#2F62B0'],
  Ultimate: ['#DDEEE8', '#22594A'],
  Spikeball: ['#FBF0D4', '#7A5A0C'],
}

const SPORT_EMOJI = {
  Basketball: '🏀',
  Soccer: '⚽',
  'Beach volleyball': '🏐',
  Tennis: '🎾',
  Ultimate: '🥏',
  Spikeball: '🥎',
}

const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const avatarColors = (userId) =>
  AVATARS[[...userId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATARS.length]

const fmt = (date, opts) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts }).format(date)

function whenText(startsAt, durationMin, now) {
  const start = new Date(startsAt)
  const end = new Date(start.getTime() + durationMin * 60000)
  const day = { weekday: 'short', month: 'short', day: 'numeric' }
  const time = { hour: 'numeric', minute: '2-digit' }
  const isToday = fmt(start, { dateStyle: 'short' }) === fmt(now, { dateStyle: 'short' })
  const startTime = fmt(start, time)
  const endTime = fmt(end, time)
  // "6:30 PM" + "8:30 PM" -> "6:30–8:30 PM" when both are in the same half of the day
  const range =
    startTime.slice(-2) === endTime.slice(-2)
      ? `${startTime.slice(0, -3)}–${endTime}`
      : `${startTime}–${endTime}`
  return `${isToday ? 'Today, ' : ''}${fmt(start, day)} · ${range}`
}

function startsInText(startsAt, now) {
  const mins = Math.round((new Date(startsAt) - now) / 60000)
  if (mins < 0 || mins > 60) return null
  return mins <= 1 ? 'Starting now' : `Starts in ${mins} min`
}

// Opens Google Calendar with the game pre-filled as a new event.
function calendarUrl(game) {
  const start = new Date(game.startsAt)
  const end = new Date(start.getTime() + game.durationMin * 60000)
  const stamp = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: game.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: game.notes,
    location: [game.location.name, game.location.address].filter(Boolean).join(', '),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function distanceMi(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

function ago(iso, now) {
  const mins = Math.max(0, Math.round((now - new Date(iso)) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

// Both resolve to { players }: the roster after the change, straight from the server.
const joinGame = (gameId) => api('POST', `${gameUrl(gameId)}/join`)
const leaveGame = (gameId) => api('DELETE', `${gameUrl(gameId)}/join`)

// Comment calls. Each resolves to the saved comment (delete resolves to null).
// Anyone can post, reply and edit their own; the host can pin; the author or the host can delete.
const postComment = (gameId, body, parentId) => api('POST', `${gameUrl(gameId)}/comments`, { body, parentId })
const updateComment = (gameId, commentId, fields) => api('PATCH', `${gameUrl(gameId)}/comments/${commentId}`, fields)
const deleteComment = (gameId, commentId) => api('DELETE', `${gameUrl(gameId)}/comments/${commentId}`)

// Pinned comments first, then oldest to newest (matches the server's order).
const sortComments = (list) => [...list].sort((a, b) => b.pinned - a.pinned || new Date(a.createdAt) - new Date(b.createdAt))

function Avatar({ userId, name, size = 38, you = false }) {
  const [bg, fg] = you ? ['#121316', '#FFFFFF'] : avatarColors(userId)
  return (
    <span
      style={{
        flex: 'none',
        width: size,
        height: size,
        borderRadius: 999,
        background: bg,
        color: fg,
        display: 'grid',
        placeItems: 'center',
        fontSize: size > 40 ? 17 : 13,
        fontWeight: 700,
      }}
    >
      {initials(name)}
    </span>
  )
}

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
}

function InfoTile({ label, value, icon }) {
  return (
    <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', padding: 14, borderRadius: 18 }}>
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'var(--fill)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          {icon}
        </svg>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
        <strong style={{ fontSize: 16, color: 'var(--ink)' }}>{value}</strong>
      </span>
    </div>
  )
}

function Pill({ children }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 36,
        padding: '0 14px',
        borderRadius: 999,
        background: 'rgba(18,19,22,0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  )
}

const directionsUrl = ({ lat, lng }) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

// Pin colors per sport, same as the Map page.
const SPORT_COLORS = {
  Basketball: '#7A4A1E',
  Soccer: '#22663F',
  'Beach volleyball': '#24598C',
  Tennis: '#2F62B0',
  Ultimate: '#22594A',
  Spikeball: '#7A5A0C',
}

// Static map preview like the Map page's, but with no controls or panning so it can sit inside a link.
function MapPreview({ lat, lng, sport }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      style={{ height: 170, cursor: 'pointer' }}
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      touchZoom={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      boxZoom={false}
      keyboard={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker center={[lat, lng]} radius={12} pathOptions={{ color: SPORT_COLORS[sport] ?? '#121316', fillOpacity: 0.85, interactive: false }} />
    </MapContainer>
  )
}

const fetchJson = async (url) => {
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function Message({ title, children }) {
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: 32 }}>
      <h1>{title}</h1>
      <p>{children}</p>
      <p>
        <a href="/">Back to all games</a>
      </p>
    </main>
  )
}

export default function GameDetails({ gameId }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchJson(`/api/games/${encodeURIComponent(gameId)}`), fetchJson('/api/users/me')])
      .then(([game, me]) => !cancelled && setState({ status: game && me ? 'ready' : 'missing', game, me }))
      .catch((err) => !cancelled && setState({ status: 'error', message: err.message }))
    return () => {
      cancelled = true
    }
  }, [gameId])

  if (state.status === 'loading') return <Message title="Loading game…" />
  if (state.status === 'missing') return <Message title="Game not found" />
  if (state.status === 'error') return <Message title="We couldn’t load this game">{state.message}</Message>
  return <GameView game={state.game} me={state.me} />
}

const actionButton = {
  padding: 0,
  border: 0,
  background: 'transparent',
  color: 'var(--muted)',
  font: "600 13px 'Schibsted Grotesk', system-ui, sans-serif",
  cursor: 'pointer',
}

// One comment or reply, with its Reply / Edit / Pin / Delete actions and the inline edit and reply form.
function CommentItem({ comment, isReply = false, replyCount = 0, me, host, now, onPin, onEdit, onReply, onDelete }) {
  const [mode, setMode] = useState(null) // 'edit' | 'reply' | null
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const { author } = comment
  const isAuthor = author.id === me.id
  const isHost = me.id === host.id
  const byHost = author.id === host.id

  const open = (next) => {
    setMode(next)
    setDraft(next === 'edit' ? comment.body : '')
    setError(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    setError(null)
    try {
      await (mode === 'edit' ? onEdit(comment, body) : onReply(comment, body))
      setMode(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, padding: isReply ? '14px 18px 14px 66px' : 18, background: comment.pinned || byHost ? 'var(--muted-3)' : 'transparent', borderLeft: `4px solid ${byHost ? 'var(--accent)' : 'transparent'}`, borderBottom: '1px solid var(--border)' }}>
      <Avatar userId={author.id} name={author.name} size={isReply ? 30 : 36} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <strong style={{ color: 'var(--ink)' }}>{author.name}</strong>
          {author.id === host.id && (
            <span style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--ink)', color: '#fff', fontSize: 11, fontWeight: 700 }}>Host</span>
          )}
          {comment.pinned && <span style={{ color: 'var(--accent)', fontWeight: 600 }}><span aria-hidden="true">📌 </span>Pinned</span>}
          <span style={{ color: 'var(--muted)' }}>
            {ago(comment.createdAt, now)}
            {comment.editedAt && ' · edited'}
          </span>
        </span>

        {mode === 'edit' ? null : (
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{comment.body}</p>
        )}

        {mode ? (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 4px 14px', borderRadius: 999, background: 'var(--fill)' }}>
              <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                {mode === 'edit' ? 'Edit comment' : `Reply to ${author.name}`}
              </span>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                autoFocus
                placeholder={mode === 'edit' ? 'Edit your comment' : `Reply to ${author.name}`}
                style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none', color: 'var(--ink)', font: "400 15px 'Schibsted Grotesk', system-ui, sans-serif" }}
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                style={{ height: 34, padding: '0 16px', borderRadius: 999, border: 0, background: 'var(--ink)', color: '#fff', font: "600 13px 'Schibsted Grotesk', system-ui, sans-serif", cursor: busy || !draft.trim() ? 'default' : 'pointer', opacity: busy || !draft.trim() ? 0.45 : 1 }}
              >
                {busy ? 'Saving…' : mode === 'edit' ? 'Save' : 'Reply'}
              </button>
              <button type="button" onClick={() => setMode(null)} style={{ ...actionButton, padding: '0 10px' }}>
                Cancel
              </button>
            </label>
            {error && <p role="alert" style={{ margin: '0 14px', fontSize: 13, fontWeight: 600, color: 'var(--error)' }}>{error}</p>}
          </form>
        ) : confirmingDelete ? (
          <div role="alert" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 12px', marginTop: 2, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {replyCount > 0 ? `Delete this comment and its ${replyCount === 1 ? 'reply' : `${replyCount} replies`}?` : 'Delete this comment?'}
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(false)
                onDelete(comment)
              }}
              style={{ height: 28, padding: '0 14px', borderRadius: 999, border: 0, background: 'var(--error)', color: '#fff', font: "600 13px 'Schibsted Grotesk', system-ui, sans-serif", cursor: 'pointer' }}
            >
              Confirm delete
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} style={actionButton}>
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 2 }}>
            <button type="button" onClick={() => open('reply')} aria-label={`Reply to ${author.name}`} style={actionButton}>Reply</button>
            {isAuthor && <button type="button" onClick={() => open('edit')} aria-label="Edit your comment" style={actionButton}>Edit</button>}
            {isHost && !isReply && (
              <button type="button" onClick={() => onPin(comment)} style={actionButton}>
                {comment.pinned ? 'Unpin' : '📌 Pin'}
              </button>
            )}
            {(isAuthor || isHost) && (
              <button type="button" onClick={() => setConfirmingDelete(true)} aria-label={`Delete comment by ${author.name}`} style={{ ...actionButton, color: 'var(--error)' }}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function GameView({ game: initialGame, me }) {
  const [game, setGame] = useState(initialGame)
  const [dialog, setDialog] = useState(null) // { type: 'edit' } | { type: 'remove', player }
  const [players, setPlayers] = useState(initialGame.players)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const [now] = useState(() => new Date())
  const { location, host } = game
  const isHost = me.id === host.id
  const [comments, setComments] = useState(initialGame.comments)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [commentError, setCommentError] = useState(null)
  const count = players.length
  const spotsLeft = game.maxPlayers - count
  const isFull = spotsLeft <= 0
  const joined = players.some((p) => p.id === me.id)
  const startsIn = startsInText(game.startsAt, now)
  const [sportBg, sportFg] = SPORT_TINTS[game.sport] ?? SPORT_TINTS.Basketball
  const miles = me.homeLocation ? distanceMi(me.homeLocation, location) : null
  const startClock = fmt(new Date(game.startsAt), { hour: 'numeric', minute: '2-digit' }).replace(' PM', '').replace(' AM', '')

  const submitComment = async (event) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || posting) return
    setPosting(true)
    setCommentError(null)
    try {
      const saved = await postComment(game.id, body)
      setComments((list) => sortComments([...list, saved]))
      setDraft('')
    } catch (err) {
      setCommentError(err.message)
    } finally {
      setPosting(false)
    }
  }

  const togglePin = async (comment) => {
    setCommentError(null)
    try {
      const saved = await updateComment(game.id, comment.id, { pinned: !comment.pinned })
      setComments((list) => sortComments(list.map((c) => (c.id === saved.id ? saved : c))))
    } catch (err) {
      setCommentError(err.message)
    }
  }

  const removeComment = async (comment) => {
    setCommentError(null)
    try {
      await deleteComment(game.id, comment.id)
      setComments((list) => list.filter((c) => c.id !== comment.id && c.parentId !== comment.id))
    } catch (err) {
      setCommentError(err.message)
    }
  }

  // These two throw on failure so the comment's own form can show the error.
  const editComment = async (comment, body) => {
    const saved = await updateComment(game.id, comment.id, { body })
    setComments((list) => list.map((c) => (c.id === saved.id ? saved : c)))
  }

  // Replies attach to the top-level comment, so replying to a reply joins the same thread.
  const addReply = async (comment, body) => {
    const saved = await postComment(game.id, body, comment.parentId ?? comment.id)
    setComments((list) => sortComments([...list, saved]))
  }

  const commentActions = { me, host, now, onPin: togglePin, onEdit: editComment, onReply: addReply, onDelete: removeComment }

  const toggle = async () => {
    setBusy(true)
    setNotice(null)
    try {
      if (joined) {
        setPlayers((await leaveGame(game.id)).players)
        setNotice({ kind: 'info', text: 'You left the game.' })
      } else {
        setPlayers((await joinGame(game.id)).players)
        setNotice({ kind: 'success', text: `✅ You’re in. See you at ${startClock}.` })
      }
    } catch (err) {
      setNotice({ kind: 'error', text: err.message || 'Something went wrong. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const leftText = isFull ? 'Full' : spotsLeft === 1 ? '1 spot left' : `${spotsLeft} spots left`
  const isCanceled = game.status === 'canceled'
  const buttonDisabled = busy || isHost || ((isFull || isCanceled) && !joined)
  const buttonLabel = isHost ? 'You’re hosting' : joined ? 'Leave game' : isCanceled ? 'Game canceled' : isFull ? 'Game full' : 'Join game'
  const noticeColor = notice?.kind === 'success' ? 'var(--success)' : notice?.kind === 'error' ? 'var(--error)' : 'var(--muted)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <nav aria-label="Primary" style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="/" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.05em', textDecoration: 'none', color: 'var(--ink)' }}>
            pickup
          </a>
          <span style={{ marginLeft: 'auto' }}>
            <Avatar userId={me.id} name={me.name} size={44} />
          </span>
        </nav>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px 96px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <a href="/" style={{ alignSelf: 'flex-start', fontSize: 15, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none' }}>
          ← All games
        </a>

        {/* Placeholder for the shared Court component */}
        <div style={{ position: 'relative', height: 320, borderRadius: 30, overflow: 'hidden', background: sportBg, color: sportFg }}>
          {startsIn && (
            <span style={{ position: 'absolute', left: 22, top: 22, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 999, background: 'var(--ink)', color: '#fff', fontSize: 14, fontWeight: 600 }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--live)' }} />
              {startsIn}
            </span>
          )}
          <div style={{ position: 'absolute', left: 22, bottom: 22, display: 'flex', gap: 8 }}>
            <Pill>
              <span aria-hidden="true" style={{ marginRight: 7 }}>{SPORT_EMOJI[game.sport] ?? '🏅'}</span>
              {game.sport}
            </Pill>
            <Pill>{game.skill}</Pill>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 32 }}>
          <div style={{ flex: '999 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 36 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 400, letterSpacing: '0.01em', textWrap: 'balance' }}>{game.title}</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 12 }}>
                <InfoTile
                  label="When"
                  value={whenText(game.startsAt, game.durationMin, now)}
                  icon={<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>}
                />
                <InfoTile
                  label="Where"
                  value={`${location.name}${miles != null ? ` · ${miles.toFixed(1)} mi` : ''}`}
                  icon={<><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>}
                />
              </div>
            </div>

            {game.notes && (
              <section aria-labelledby="about" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 id="about" style={{ fontSize: 20, fontWeight: 400, letterSpacing: '0.02em' }}>About this game</h2>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: 'var(--text-2)', maxWidth: 680 }}>{game.notes}</p>
              </section>
            )}

            <section aria-labelledby="roster" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <h2 id="roster" style={{ fontSize: 20, fontWeight: 400, letterSpacing: '0.02em' }}>Players</h2>
                <span style={{ fontSize: 15, color: 'var(--muted)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{count}/{game.maxPlayers}</strong> joined
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(190px, 100%), 1fr))', gap: 10 }}>
                {players.map((player) => {
                  const isYou = player.id === me.id
                  return (
                    <div key={player.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 16, borderColor: isYou ? 'var(--ink)' : 'var(--border)' }}>
                      <Avatar userId={player.id} name={player.name} you={isYou} />
                      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{isYou ? 'You' : player.name}</strong>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{player.id === host.id ? 'Host' : player.skill ?? game.skill}</span>
                      </span>
                      {isHost && !isYou && (
                        <button
                          type="button"
                          onClick={() => setDialog({ type: 'remove', player })}
                          aria-label={`Remove ${player.name}`}
                          style={{ ...actionButton, marginLeft: 'auto', color: 'var(--error)' }}
                        >
                          Remove
                        </button>
                      )}
                      {isYou && !isHost && (
                        <button
                          type="button"
                          onClick={toggle}
                          disabled={busy}
                          aria-label="Leave game"
                          title="Leave game"
                          style={{
                            marginLeft: 'auto',
                            flex: 'none',
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            border: 0,
                            background: 'var(--fill)',
                            color: 'var(--ink)',
                            font: '600 16px/1 system-ui, sans-serif',
                            cursor: busy ? 'default' : 'pointer',
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
                {Array.from({ length: Math.max(0, spotsLeft) }, (_, i) => (
                  <button
                    key={`open-${i}`}
                    type="button"
                    onClick={toggle}
                    disabled={busy || joined || isCanceled}
                    aria-label={joined ? 'Open spot' : 'Join this open spot'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 16,
                      border: '1.5px dashed #CFCFD5',
                      background: 'transparent',
                      color: '#7C7F87',
                      font: 'inherit',
                      textAlign: 'left',
                      cursor: busy || joined ? 'default' : 'pointer',
                    }}
                  >
                    <span style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--fill)', display: 'grid', placeItems: 'center', fontSize: 18 }}>+</span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>Open spot</span>
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="thread" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 id="thread" style={{ fontSize: 20, fontWeight: 400, letterSpacing: '0.02em' }}>Updates &amp; comments</h2>
              <div style={{ ...card, borderRadius: 22, overflow: 'hidden' }}>
                {comments.length === 0 && (
                  <p style={{ margin: 0, padding: '28px 18px', textAlign: 'center', fontSize: 16, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                    <span aria-hidden="true" style={{ display: 'block', fontSize: 28, marginBottom: 6 }}>💬</span>
                    There’s nothing here yet. Start the conversation!
                  </p>
                )}
                {comments
                  .filter((c) => !c.parentId)
                  .map((c) => (
                    <Fragment key={c.id}>
                      <CommentItem comment={c} replyCount={comments.filter((r) => r.parentId === c.id).length} {...commentActions} />
                      {comments
                        .filter((r) => r.parentId === c.id)
                        .map((r) => (
                          <CommentItem key={r.id} comment={r} isReply {...commentActions} />
                        ))}
                    </Fragment>
                  ))}
                <form onSubmit={submitComment} style={{ padding: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px 6px 16px', borderRadius: 999, background: 'var(--fill)' }}>
                    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Comment</span>
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={1000}
                      placeholder="Add a comment for the group"
                      style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none', color: 'var(--ink)', font: "400 15px 'Schibsted Grotesk', system-ui, sans-serif" }}
                    />
                    <button
                      type="submit"
                      disabled={posting || !draft.trim()}
                      style={{
                        height: 40,
                        padding: '0 18px',
                        borderRadius: 999,
                        border: 0,
                        background: 'var(--ink)',
                        color: '#fff',
                        font: "600 14px 'Schibsted Grotesk', system-ui, sans-serif",
                        cursor: posting || !draft.trim() ? 'default' : 'pointer',
                        opacity: posting || !draft.trim() ? 0.45 : 1,
                      }}
                    >
                      {posting ? 'Posting…' : 'Post'}
                    </button>
                  </label>
                  {commentError && (
                    <p role="alert" style={{ margin: '8px 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--error)' }}>{commentError}</p>
                  )}
                </form>
              </div>
            </section>
          </div>

          <aside style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16, padding: 24, borderRadius: 26, boxShadow: '0 10px 30px rgba(18,19,22,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 44, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--ink)' }}>
                  {count}
                  <span style={{ fontSize: 24, color: '#7C7F87' }}>/{game.maxPlayers}</span>
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: isFull ? 'var(--error)' : 'var(--accent)' }}>{leftText}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: '#EFEFF2' }}>
                <div style={{ width: `${Math.min(100, (count / game.maxPlayers) * 100)}%`, height: 8, borderRadius: 999, background: 'var(--ink)' }} />
              </div>
              <p role="status" style={{ margin: 0, minHeight: 22, fontSize: 15, fontWeight: 600, color: noticeColor }}>
                {notice?.text ?? (isCanceled ? 'This game was canceled.' : isFull && !joined ? 'This game is full.' : '')}
              </p>
              <button
                type="button"
                onClick={toggle}
                disabled={buttonDisabled}
                style={{
                  height: 56,
                  borderRadius: 999,
                  border: '1.5px solid var(--ink)',
                  background: joined ? 'var(--surface)' : 'var(--ink)',
                  color: joined ? 'var(--ink)' : '#fff',
                  font: "700 17px 'Schibsted Grotesk', system-ui, sans-serif",
                  cursor: buttonDisabled ? 'not-allowed' : 'pointer',
                  opacity: buttonDisabled ? 0.45 : 1,
                }}
              >
                {busy ? 'Working…' : buttonLabel}
              </button>
              {isHost && (
                <button
                  type="button"
                  onClick={() => setDialog({ type: 'edit' })}
                  style={{ height: 46, borderRadius: 999, border: '1px solid var(--border-2)', background: 'var(--surface)', color: 'var(--ink)', font: "600 14px 'Schibsted Grotesk', system-ui, sans-serif", cursor: 'pointer' }}
                >
                  Edit game
                </button>
              )}
            </div>

            <div style={{ ...card, borderRadius: 26, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', isolation: 'isolate' }}>
                <a href={directionsUrl(location)} target="_blank" rel="noreferrer" aria-label={`Get directions to ${location.name}`} style={{ display: 'block' }}>
                  <MapPreview key={location.id} lat={location.lat} lng={location.lng} sport={game.sport} />
                </a>
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                  style={{ position: 'absolute', right: 0, bottom: 0, zIndex: 1000, padding: '1px 6px', fontSize: 10, color: '#333', background: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}
                >
                  © OpenStreetMap
                </a>
              </div>
              <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <strong style={{ fontSize: 17, color: 'var(--ink)' }}>{location.name}</strong>
                {location.address && <span style={{ fontSize: 14, color: 'var(--muted)' }}>{location.address}</span>}
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                  <a
                    href={directionsUrl(location)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    Get directions
                  </a>
                  <a
                    href={calendarUrl(game)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    Add to calendar
                  </a>
                </div>
              </div>
            </div>

            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRadius: 26 }}>
              <Avatar userId={host.id} name={host.name} size={52} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Hosted by</span>
                <strong style={{ fontSize: 17, color: 'var(--ink)' }}>{host.name}</strong>
                {host.bio && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{host.bio}</span>}
              </span>
            </div>
          </aside>
        </div>
      </main>

      {dialog?.type === 'remove' && (
        <RemovePlayerDialog gameId={game.id} player={dialog.player} onClose={() => setDialog(null)} onRemoved={setPlayers} />
      )}
      {dialog?.type === 'edit' && (
        <EditGameDialog
          game={game}
          playerCount={players.length}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            setGame(saved)
            setPlayers(saved.players)
          }}
        />
      )}
    </div>
  )
}
