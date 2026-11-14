import { Router } from 'express'
import db from '../prisma/db.js'
const router = Router()

async function getuser(idStr, include) {
    const id = Number(idStr)

    let user
    if (include === '')         [user] = await db.User.where({id}).all()
    else if (include === 'all') [user] = await db.User.where({id}).include('ownedGames').include('joinedGames').all()
    else                        [user] = await db.User.where({id}).include(include).all()

    if (!user) return null

    return user
}

router.param('id', async (req, res, next, idStr) => {
    try {
        req.user = await getuser(idStr, '')
        if (!req.user) return res.status(404).json({ error: "No user with id "+id+" exists" })
        next()
    } catch (err) { next(err) }
})

router.param('id_owned', async (req, res, next, idStr) => {
    try {
        req.user = await getuser(idStr, 'ownedGames')
        if (!req.user) return res.status(404).json({ error: "No user with id "+id+" exists" })
        next()
    } catch (err) { next(err) }
})

router.param('id_joined', async (req, res, next, idStr) => {
    try {
        req.user = await getuser(idStr, 'joinedGames')
        if (!req.user) return res.status(404).json({ error: "No user with id "+id+" exists" })
        next()
    } catch (err) { next(err) }
})

router.param('id_all', async (req, res, next, idStr) => {
    try {
        req.user = await getuser(idStr, 'all')
        if (!req.user) return res.status(404).json({ error: "No user with id "+id+" exists" })
        next()
    } catch (err) { next(err) }
})

///////////
// WRITE //
///////////
router.post('/', async (req, res, next) => {
    const { email, name } = req.body

    if (!email) return res.status(400).json({ error: 'Email is required to create a user'})
    if (!name) return res.status(400).json({ error: 'Name is required to create a user'})

    const user = await db.User.create({ email, name })

    res.status(201).json(user)
})

router.delete('/:id', async (req, res, next) => {
    await db.User.delete({id: req.user.id})
    res.status(200).json({ message: `User ${req.user.id} successfully deleted` })
})

//////////
// READ //
//////////
router.get('/:id_owned/games/owned', async (req, res, next) => {
    res.json(req.user.ownedGames)
})

router.get('/:id_joined/games/joined', async (req, res, next) => {
    const gamePromises = req.user.joinedGames.map(async p => {
        const [game] = await db.Game.where({id: p.gameId}).all()
        return game
    })
    res.json(await Promise.all(gamePromises))
})

router.get('/:id_all/games', async (req, res, next) => {
    const joinedGamePromises = req.user.joinedGames.map(async p => {
        const [game] = await db.Game.where({id: p.gameId}).all()
        return game
    })

    res.json({
        owned: req.user.ownedGames,
        joined: await Promise.all(joinedGamePromises),
    })
})

router.get('/:id', async (req, res, next) => {
    res.json(req.user)
})

router.get('/', async (req, res, next) => {
    res.json(await db.User.all())
})

export default router
