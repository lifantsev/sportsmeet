import { Router } from 'express'
import db from '../prisma/db.js'
const router = Router()

async function getgame(idStr, include) {
    const id = Number(idStr)

    let game
    if (include != '') [game] = await db.Game.where({id}).include(include).all()
    else               [game] = await db.Game.where({id}).all()

    if (!game) return null

    return game
}

router.param('id', async (req, res, next, idStr) => {
    try {
        const game = await getgame(idStr, '')
        if (!game) return res.status(404).json({ error: "No game with id "+id+" exists" })
        req.game = game
        next()
    } catch (err) { next(err) }
})

router.param('id_part', async (req, res, next, idStr) => {
    try {
        const game = await getgame(idStr, 'participants')
        if (!game) return res.status(404).json({ error: "No game with id "+id+" exists" })
        req.game = game
        next()
    } catch (err) { next(err) }
})

router.param('id_own', async (req, res, next, idStr) => {
    try {
        const game = await getgame(idStr, 'owner')
        if (!game) return res.status(404).json({ error: "No game with id "+id+" exists" })
        req.game = game
        next()
    } catch (err) { next(err) }
})

///////////
// WRITE //
///////////
router.post('/:id/participants', async (req, res, next) => {
    const { userId } = req.body
    if (!userId) 
        return res.status(400).json({ error: 'Required field `userId` is missing'})

    const [user] = await db.User.where({id: Number(userId)}).include('ownedGames').include('joinedGames').all()
    if (!user)
        return res.status(404).json({ error: "Invalid userId. User with id "+userId+" doesn't exist" })

    console.log(req.game.id)
    console.log(user)
    if (user.joinedGames.some(g => g.gameId == req.game.id).length > 0)
        return res.status(409).json({ error: "User is already participating in this game" })

    if (user.ownedGames.some(g => g.id == req.game.id).length > 0)
        return res.status(409).json({ error: "User owns this game, cannot join as a participant" })

    const participation = await db.GameParticipant.create({ userId: user.id, gameId: req.game.id })
    res.status(201).json(participation)
})

router.post('/', async (req, res, next) => {
    const { sport, place, time, ownerId } = req.body
    if (!sport || !place || !time || !ownerId) 
        return res.status(400).json({ error: 'One of required fields for game creation is missing: sport, place, time, ownerId'})

    const parsedTime = new Date(time)
    if (isNaN(parsedTime.getTime()))
        return res.status(400).json({ error: 'Invalid time format. Use ISO 8601 (ie 2026-11-20T17:30:00Z)' })

    const [owner] = await db.User.where({id: ownerId}).all()
    if (!owner)
        return res.status(404).json({ error: "Invalid ownerId. User with id "+ownerId+" doesn't exist" })

    const game = await db.Game.create({ sport, place, time: parsedTime, ownerId: Number(ownerId) })

    res.status(201).json(game)
})

//////////
// READ //
//////////
router.get('/:id_part/participants', async (req, res, next) => {
    res.json(await Promise.all(req.game.participants.map(async p => 
        (await db.User.where({id: p.userId}).all())[0])))
})

router.get('/:id_own/owner', async (req, res, next) => {
    res.json(req.game.owner)
})

router.get('/:id', async (req, res, next) => {
    res.json(req.game)
})

router.get('/', async (req, res, next) => {
    res.json(await db.Game.all())
})

export default router
