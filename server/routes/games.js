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

const SPORTS = ['Basketball', 'Soccer', 'Beach volleyball', 'Tennis', 'Ultimate', 'Spikeball']
const SKILLS = ['All levels', 'Beginner', 'Intermediate', 'Advanced']

// One game with its host, location, roster (host first) and comments (pinned first), or null.
const loadGame = async (id) => {
  const { rows } = await pool.query(
    `SELECT g.id, g.sport, g.skill, g.title, g.notes, g.status, g.starts_at AS "startsAt",
            g.duration_min AS "durationMin", g.max_players AS "maxPlayers",
            json_build_object('id', h.id, 'name', h.name, 'bio', h.bio) AS host,
            json_build_object('id', l.id, 'name', l.name, 'address', l.address, 'lat', l.lat, 'lng', l.lng) AS location
       FROM games g
       JOIN users h ON h.id = g.host_id
       JOIN locations l ON l.id = g.location_id
      WHERE g.id = $1`,
    [id],
  )
  const game = rows[0]
  if (!game) return null
  const players = await rosterOf(pool, { ...game, host_id: game.host.id })
  const comments = await pool.query(`${COMMENT_SELECT} WHERE c.game_id = $1 ORDER BY c.pinned DESC, c.created_at`, [game.id])
  return { ...game, players, comments: comments.rows }
}

// GET /api/games/:id
router.get('/:id', async (req, res, next) => {
  try {
    const game = await loadGame(req.params.id)
    if (!game) return res.status(404).json({ error: 'Game not found' })
    res.json(game)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/games/:id  { sport?, skill?, locationId?, maxPlayers?, startsAt? }
// Host only. Changes the listed fields and returns the game in the same shape as GET /:id.
router.patch('/:id', async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const fail = async (status, error) => {
      await client.query('ROLLBACK')
      res.status(status).json({ error })
    }

    const { rows } = await client.query('SELECT id, host_id FROM games WHERE id = $1 FOR UPDATE', [req.params.id])
    if (rows.length === 0) return await fail(404, 'Game not found')
    if (rows[0].host_id !== CURRENT_USER_ID) return await fail(403, 'Only the host can edit this game')

    const { sport, skill, locationId, maxPlayers, startsAt } = req.body ?? {}
    const changes = {}
    if (sport !== undefined) {
      if (!SPORTS.includes(sport)) return await fail(400, 'Pick one of the listed sports')
      changes.sport = sport
    }
    if (skill !== undefined) {
      if (!SKILLS.includes(skill)) return await fail(400, 'Pick one of the listed skill levels')
      changes.skill = skill
    }
    if (locationId !== undefined) {
      const found = await client.query('SELECT 1 FROM locations WHERE id = $1', [locationId])
      if (found.rows.length === 0) return await fail(400, 'That location doesn’t exist')
      changes.location_id = locationId
    }
    if (maxPlayers !== undefined) {
      if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 30) return await fail(400, 'Players must be between 2 and 30')
      const { rows: counts } = await client.query('SELECT count(*)::int AS total FROM game_players WHERE game_id = $1', [req.params.id])
      if (maxPlayers < counts[0].total) return await fail(409, `${counts[0].total} players have already joined, so the limit can’t go lower than that`)
      changes.max_players = maxPlayers
    }
    if (startsAt !== undefined) {
      const date = new Date(startsAt)
      if (typeof startsAt !== 'string' || Number.isNaN(date.getTime())) return await fail(400, 'That start time isn’t valid')
      changes.starts_at = date.toISOString()
    }

    const columns = Object.keys(changes)
    if (columns.length === 0) return await fail(400, 'Nothing to change')
    await client.query(`UPDATE games SET ${columns.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1`, [
      req.params.id,
      ...columns.map((c) => changes[c]),
    ])
    await client.query('COMMIT')
    res.json(await loadGame(req.params.id))
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    client.release()
  }
})

// DELETE /api/games/:id/players/:userId  { message? }
// Host only. Removes a player and saves the host's message to them. Returns the new roster.
router.delete('/:id/players/:userId', async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const fail = async (status, error) => {
      await client.query('ROLLBACK')
      res.status(status).json({ error })
    }

    const { rows } = await client.query('SELECT id, sport, host_id FROM games WHERE id = $1 FOR UPDATE', [req.params.id])
    const game = rows[0]
    if (!game) return await fail(404, 'Game not found')
    if (game.host_id !== CURRENT_USER_ID) return await fail(403, 'Only the host can remove players')
    if (req.params.userId === game.host_id) return await fail(400, 'The host can’t be removed from their own game')

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (message.length > 1000) return await fail(400, 'Message is too long (max 1000 characters)')

    const { rowCount } = await client.query('DELETE FROM game_players WHERE game_id = $1 AND user_id = $2', [game.id, req.params.userId])
    if (rowCount === 0) return await fail(404, 'That player isn’t in this game')
    if (message) {
      await client.query('INSERT INTO player_messages (game_id, to_user_id, from_user_id, body) VALUES ($1, $2, $3, $4)', [
        game.id,
        req.params.userId,
        CURRENT_USER_ID,
        message,
      ])
    }
    const players = await rosterOf(client, game)
    await client.query('COMMIT')
    res.json({ players })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    client.release()
  }
})

// Comments are one level deep: top-level comments can have replies, replies can't.
const COMMENT_SELECT = `SELECT c.id, c.body, c.pinned, c.created_at AS "createdAt", c.edited_at AS "editedAt",
                               c.parent_id AS "parentId",
                               json_build_object('id', u.id, 'name', u.name) AS author
                          FROM comments c
                          JOIN users u ON u.id = c.author_id`

const commentById = async (id) => (await pool.query(`${COMMENT_SELECT} WHERE c.id = $1`, [id])).rows[0]

// Validates a comment body. Returns the trimmed text, or null after replying 400.
const cleanBody = (res, value) => {
  const body = typeof value === 'string' ? value.trim() : ''
  if (!body) {
    res.status(400).json({ error: 'Comment cannot be empty' })
    return null
  }
  if (body.length > 1000) {
    res.status(400).json({ error: 'Comment is too long (max 1000 characters)' })
    return null
  }
  return body
}

// Loads a comment plus its game's host, or replies 404 and returns null.
const findComment = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.author_id, c.parent_id, g.host_id
       FROM comments c JOIN games g ON g.id = c.game_id
      WHERE c.id = $2 AND c.game_id = $1`,
    [req.params.id, req.params.commentId],
  )
  if (rows.length === 0) res.status(404).json({ error: 'Comment not found' })
  return rows[0] ?? null
}

// POST /api/games/:id/comments  { body, parentId? }
// Adds a comment (or a reply, when parentId is given) from the current user.
router.post('/:id/comments', async (req, res, next) => {
  try {
    const body = cleanBody(res, req.body?.body)
    if (body === null) return
    const parentId = req.body?.parentId ?? null

    if (parentId !== null) {
      const { rows } = await pool.query('SELECT parent_id FROM comments WHERE id = $1 AND game_id = $2', [
        parentId,
        req.params.id,
      ])
      if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' })
      if (rows[0].parent_id !== null) return res.status(400).json({ error: 'You can only reply to a top-level comment' })
    }

    const { rows } = await pool.query(
      `INSERT INTO comments (game_id, author_id, body, parent_id)
       SELECT g.id, u.id, $3, $4 FROM games g, users u WHERE g.id = $1 AND u.id = $2
       RETURNING id`,
      [req.params.id, CURRENT_USER_ID, body, parentId],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Game not found' })
    res.status(201).json(await commentById(rows[0].id))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/games/:id/comments/:commentId  { pinned } or { body }
// { pinned }: host only, top-level comments only. { body }: the comment's author only.
router.patch('/:id/comments/:commentId', async (req, res, next) => {
  try {
    const { pinned, body } = req.body ?? {}
    if (typeof pinned !== 'boolean' && typeof body !== 'string') {
      return res.status(400).json({ error: 'Send pinned (true/false) or body (text)' })
    }
    const comment = await findComment(req, res)
    if (!comment) return

    if (typeof pinned === 'boolean') {
      if (comment.host_id !== CURRENT_USER_ID) return res.status(403).json({ error: 'Only the host can pin comments' })
      if (comment.parent_id !== null) return res.status(400).json({ error: 'Replies can’t be pinned' })
      await pool.query('UPDATE comments SET pinned = $2 WHERE id = $1', [comment.id, pinned])
    } else {
      if (comment.author_id !== CURRENT_USER_ID) return res.status(403).json({ error: 'You can only edit your own comments' })
      const text = cleanBody(res, body)
      if (text === null) return
      await pool.query('UPDATE comments SET body = $2, edited_at = now() WHERE id = $1', [comment.id, text])
    }
    res.json(await commentById(comment.id))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/games/:id/comments/:commentId
// The comment's author or the game's host. Deleting a top-level comment deletes its replies too.
router.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    const comment = await findComment(req, res)
    if (!comment) return
    if (comment.author_id !== CURRENT_USER_ID && comment.host_id !== CURRENT_USER_ID) {
      return res.status(403).json({ error: 'Only the author or the host can delete this comment' })
    }
    await pool.query('DELETE FROM comments WHERE id = $1', [comment.id])
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
