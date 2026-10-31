import express from 'express'
import gamesRouter from './routes/games.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/games', gamesRouter)

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
