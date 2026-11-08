import { Router } from 'express'
import { pool } from '../db/index.js'
import { CURRENT_USER_ID } from '../currentUser.js'

const router = Router()

// Roster for one game, host first. `db` is the pool or a transaction client.
const rosterOf = async (db, game) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, us.skill
       FROM game_players p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport = $2
      WHERE p.game_id = $1
      ORDER BY (u.id = $3) DESC, p.joined_at, u.name`,
    [game.id, game.sport, game.host_id],
  )
  return rows
}

// GET /api/games?q=&sport=
// q matches the game title or the park name, case-insensitive.
router.get('/', async (req, res, next) => {
  try {
    const { q, sport } = req.query
    const { rows } = await pool.query(
      `SELECT g.id, g.sport, g.skill, g.title, g.starts_at AS "startsAt",
              g.duration_min AS "durationMin", g.max_players AS "maxPlayers",
              g.host_id AS "hostId",
              l.name AS "locationName", l.lat, l.lng,
              (SELECT count(*)::int FROM game_players p WHERE p.game_id = g.id) AS "playerCount"
         FROM games g
         JOIN locations l ON l.id = g.location_id
        WHERE ($1::text IS NULL OR g.title ILIKE '%' || $1 || '%' OR l.name ILIKE '%' || $1 || '%')
          AND ($2::text IS NULL OR g.sport = $2)
        ORDER BY g.starts_at`,
      [q || null, sport || null],
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /api/games/:id
// One game with its host, location, roster (host first) and comments (pinned first).
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.id, g.sport, g.skill, g.title, g.notes, g.status, g.starts_at AS "startsAt",
              g.duration_min AS "durationMin", g.max_players AS "maxPlayers",
              json_build_object('id', h.id, 'name', h.name, 'bio', h.bio) AS host,
              json_build_object('name', l.name, 'address', l.address, 'lat', l.lat, 'lng', l.lng) AS location
         FROM games g
         JOIN users h ON h.id = g.host_id
         JOIN locations l ON l.id = g.location_id
        WHERE g.id = $1`,
      [req.params.id],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Game not found' })
    const game = rows[0]

    const players = await rosterOf(pool, { ...game, host_id: game.host.id })
    const comments = await pool.query(
      `SELECT c.id, c.body, c.pinned, c.created_at AS "createdAt",
              json_build_object('id', u.id, 'name', u.name) AS author
         FROM comments c
         JOIN users u ON u.id = c.author_id
        WHERE c.game_id = $1
        ORDER BY c.pinned DESC, c.created_at`,
      [game.id],
    )
    res.json({ ...game, players, comments: comments.rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/games/:id/comments  { body }
// Adds a comment from the current user and returns it in the same shape as GET /:id.
router.post('/:id/comments', async (req, res, next) => {
  try {
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    if (!body) return res.status(400).json({ error: 'Comment cannot be empty' })
    if (body.length > 1000) return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' })

    const { rows } = await pool.query(
      `WITH c AS (
         INSERT INTO comments (game_id, author_id, body)
         SELECT g.id, u.id, $3 FROM games g, users u WHERE g.id = $1 AND u.id = $2
         RETURNING id, body, pinned, created_at
       )
       SELECT c.id, c.body, c.pinned, c.created_at AS "createdAt",
              json_build_object('id', u.id, 'name', u.name) AS author
         FROM c, users u
        WHERE u.id = $2`,
      [req.params.id, CURRENT_USER_ID, body],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Game not found' })
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
})

// Replies 404/403 and returns false unless the current user hosts the game.
const requireHost = async (req, res) => {
  const { rows } = await pool.query('SELECT host_id FROM games WHERE id = $1', [req.params.id])
  if (rows.length === 0) {
    res.status(404).json({ error: 'Game not found' })
    return false
  }
  if (rows[0].host_id !== CURRENT_USER_ID) {
    res.status(403).json({ error: 'Only the host can do that' })
    return false
  }
  return true
}

// PATCH /api/games/:id/comments/:commentId  { pinned }
// Host only. Pins or unpins a comment and returns it.
router.patch('/:id/comments/:commentId', async (req, res, next) => {
  try {
    if (typeof req.body?.pinned !== 'boolean') return res.status(400).json({ error: 'pinned must be true or false' })
    if (!(await requireHost(req, res))) return
    const { rows } = await pool.query(
      `WITH c AS (
         UPDATE comments SET pinned = $3 WHERE id = $2 AND game_id = $1
         RETURNING id, body, pinned, created_at, author_id
       )
       SELECT c.id, c.body, c.pinned, c.created_at AS "createdAt",
              json_build_object('id', u.id, 'name', u.name) AS author
         FROM c JOIN users u ON u.id = c.author_id`,
      [req.params.id, req.params.commentId, req.body.pinned],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// DELETE /api/games/:id/comments/:commentId
// Host only.
router.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    if (!(await requireHost(req, res))) return
    const { rowCount } = await pool.query('DELETE FROM comments WHERE id = $2 AND game_id = $1', [
      req.params.id,
      req.params.commentId,
    ])
    if (rowCount === 0) return res.status(404).json({ error: 'Comment not found' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// POST /api/games/:id/join  (also served at /participants)
// Adds the current user to the roster. Runs in a transaction that locks the game row, so two
// people can't take the last spot at once. Returns the updated roster.
router.post(['/:id/join', '/:id/participants'], async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const fail = async (status, error) => {
      await client.query('ROLLBACK')
      res.status(status).json({ error })
    }

    const { rows } = await client.query(
      'SELECT id, sport, host_id, max_players, status FROM games WHERE id = $1 FOR UPDATE',
      [req.params.id],
    )
    const game = rows[0]
    if (!game) return await fail(404, 'Game not found')

    if (game.status !== 'open') return await fail(409, 'This game has been canceled')

    const { rows: counts } = await client.query(
      `SELECT count(*)::int AS total, bool_or(user_id = $2) AS "joined"
         FROM game_players WHERE game_id = $1`,
      [game.id, CURRENT_USER_ID],
    )
    if (counts[0].joined) return await fail(409, 'You’re already in this game')
    if (counts[0].total >= game.max_players) return await fail(409, 'Sorry, this game just filled up')

    await client.query('INSERT INTO game_players (game_id, user_id) VALUES ($1, $2)', [game.id, CURRENT_USER_ID])
    const players = await rosterOf(client, game)
    await client.query('COMMIT')
    res.status(201).json({ players })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    client.release()
  }
})

// DELETE /api/games/:id/join  (also served at /participants)
// Removes the current user from the roster. The host can't leave their own game.
router.delete(['/:id/join', '/:id/participants'], async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, sport, host_id FROM games WHERE id = $1', [req.params.id])
    const game = rows[0]
    if (!game) return res.status(404).json({ error: 'Game not found' })
    if (game.host_id === CURRENT_USER_ID) return res.status(409).json({ error: 'Hosts can’t leave their own game' })

    const { rowCount } = await pool.query('DELETE FROM game_players WHERE game_id = $1 AND user_id = $2', [
      game.id,
      CURRENT_USER_ID,
    ])
    if (rowCount === 0) return res.status(409).json({ error: 'You’re not in this game' })
    res.json({ players: await rosterOf(pool, game) })
  } catch (err) {
    next(err)
  }
})

// TODO (Milestone 1): POST /

export default router
