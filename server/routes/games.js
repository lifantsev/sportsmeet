import { Router } from 'express'
import { pool } from '../db/index.js'

const router = Router()

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

// TODO (Milestone 1): GET /:id, POST /, POST /:id/join, DELETE /:id/join

export default router
