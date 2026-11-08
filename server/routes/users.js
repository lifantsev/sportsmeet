import { Router } from 'express'
import { pool } from '../db/index.js'
import { CURRENT_USER_ID } from '../currentUser.js'

const router = Router()

// GET /api/users/me
router.get('/me', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.bio,
              CASE WHEN u.home_lat IS NULL THEN NULL
                   ELSE json_build_object('label', u.home_label, 'lat', u.home_lat, 'lng', u.home_lng)
              END AS "homeLocation",
              COALESCE((SELECT json_agg(json_build_object('sport', s.sport, 'skill', s.skill))
                          FROM user_sports s WHERE s.user_id = u.id), '[]'::json) AS sports
         FROM users u
        WHERE u.id = $1`,
      [CURRENT_USER_ID],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

export default router
