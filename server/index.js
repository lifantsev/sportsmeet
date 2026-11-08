import express from 'express'
import gamesRouter from './routes/games.js'
import usersRouter from './routes/users.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/games', gamesRouter)
app.use('/api/users', usersRouter)

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
