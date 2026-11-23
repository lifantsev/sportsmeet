import 'dotenv/config'
import session from 'express-session'
import pgSession from 'connect-pg-simple'
import pg from 'pg'

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) throw new Error("SESSION_SECRET is not set in .env")

const pgStore = pgSession(session)
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

export const sessionMiddleware = session({
    store: new pgStore({ 
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    name: 'sportsmeet.sid',
    secret: sessionSecret,
    saveUninitialized: false,
    resave: false,
    cookie: {
        httpOnly: true,
        secure: false, // Set to false b/c using http://localhost for dev
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
})
