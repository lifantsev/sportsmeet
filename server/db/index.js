import pg from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy server/.env.example to server/.env.')
}

// One shared connection pool for the whole server.
// Use pool.query() for single statements, and pool.connect() + BEGIN/COMMIT
// when several writes must succeed or fail together (e.g. joining a game).
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
