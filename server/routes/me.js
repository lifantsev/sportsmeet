// GET /api/users/me and GET /api/locations, used by the Game Details page.
import { Router } from 'express'
import db from '../prisma/db.js'
import { currentUserId } from '../currentUser.js'

export const usersRouter = Router()
export const locationsRouter = Router()

// GET /api/users/me
// The signed-in user (a stand-in until Google sign-in exists).
usersRouter.get('/me', async (req, res, next) => {
  try {
    const id = await currentUserId()
    const user = id && (await db.User.where({ id }).include('sports').first())
    if (!user) return res.status(404).json({ error: 'User not found. Run `npm run db:seed` in server/.' })
    res.json({
      id: user.id,
      name: user.name,
      bio: user.bio,
      homeLocation: user.homeLat == null ? null : { label: user.homeLabel, lat: user.homeLat, lng: user.homeLng },
      sports: user.sports.map((s) => ({ sport: s.sport, skill: s.skill })),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/locations
// Every place a game can be held, for the host's edit form.
locationsRouter.get('/', async (req, res, next) => {
  try {
    const rows = await db.Location.orderBy((l) => l.name.asc()).all()
    res.json(rows.map((l) => ({ id: l.id, name: l.name, address: l.address })))
  } catch (err) {
    next(err)
  }
})
