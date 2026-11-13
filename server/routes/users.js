import { Router } from 'express'

import db from '../prisma/db.js'

const router = Router()

router.get('/dump', async (req, res, next) => {
    try {
        res.json(await db.orm.public.User.all())
    } catch (err) {
        next(err)
    }
})

export default router
