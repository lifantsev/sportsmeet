import express from 'express'
import gamesRouter from './routes/games.js'
import usersRouter from './routes/users.js'
import db from './prisma/db.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

app.get('/health', (req, res) => {
    res.json({ ok: true })
})

app.use('/games', gamesRouter)
app.use('/users', usersRouter)

app.put('/resetdb', async (req, res, next) => {
    try {
        await db.orm.public.GameParticipant.where({}).deleteAll()
        await db.orm.public.Game.where({}).deleteAll()
        await db.orm.public.User.where({}).deleteAll()

        const alice = await db.orm.public.User.create({
            email: 'alice@sportsmeet.test',
            name: 'Alice Organizer'
        })

        const bob = await db.orm.public.User.create({
            email: 'bob@sportsmeet.test',
            name: 'Bob Player'
        })

        const game = await db.orm.public.Game.create({
            sport: 'soccer',
            place: 'IM Field',
            time: new Date('2026-11-20T17:30:00Z'),
            ownerId: alice.id,
        })

        await db.orm.public.GameParticipant.create({
            userId: bob.id,
            gameId: game.id,
        })

        res.json({
            success: true,
            message: 'Database reset and seeded successfully',
        })
    } catch (err) {
        next(err)
    }
})

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
})
