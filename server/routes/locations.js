import { Router } from 'express'
import { pool } from '../db/index.js'

const router = Router()

// GET /api/locations
// Every place a game can be held, for the host's edit form.
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name, address FROM locations ORDER BY name')
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

export default router
