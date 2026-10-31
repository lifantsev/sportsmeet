// Recreates the tables and loads the mock data from design/sample-data.json.
// Usage: npm run db:reset
import { readFile } from 'node:fs/promises'
import { pool } from './index.js'

const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
const data = JSON.parse(
  await readFile(new URL('../../design/sample-data.json', import.meta.url), 'utf8'),
)

const client = await pool.connect()
try {
  await client.query('BEGIN')
  await client.query(schema)

  for (const u of data.users) {
    const home = u.homeLocation ?? {}
    await client.query(
      `INSERT INTO users (id, name, bio, home_label, home_lat, home_lng)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [u.id, u.name, u.bio ?? '', home.label, home.lat, home.lng],
    )
    for (const s of u.sports ?? []) {
      await client.query(
        'INSERT INTO user_sports (user_id, sport, skill) VALUES ($1, $2, $3)',
        [u.id, s.sport, s.skill],
      )
    }
  }

  for (const l of data.locations) {
    await client.query(
      'INSERT INTO locations (id, name, address, lat, lng) VALUES ($1, $2, $3, $4, $5)',
      [l.id, l.name, l.address, l.lat, l.lng],
    )
  }

  for (const g of data.games) {
    await client.query(
      `INSERT INTO games (id, sport, skill, title, location_id, starts_at,
                          duration_min, max_players, notes, host_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [g.id, g.sport, g.skill, g.title, g.locationId, g.startsAt,
        g.durationMin, g.maxPlayers, g.notes ?? '', g.hostId],
    )
    for (const userId of g.playerIds) {
      await client.query(
        'INSERT INTO game_players (game_id, user_id) VALUES ($1, $2)',
        [g.id, userId],
      )
    }
  }

  for (const c of data.comments) {
    await client.query(
      `INSERT INTO comments (id, game_id, author_id, body, pinned, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [c.id, c.gameId, c.authorId, c.body, c.pinned, c.createdAt],
    )
  }

  await client.query('COMMIT')
  console.log(
    `Loaded ${data.users.length} users, ${data.locations.length} locations, ` +
      `${data.games.length} games, ${data.comments.length} comments.`,
  )
} catch (err) {
  await client.query('ROLLBACK')
  throw err
} finally {
  client.release()
  await pool.end()
}
