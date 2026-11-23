import 'dotenv/config'
import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { findOrCreateGoogleUser, getUserByID, publicUser } from '../services/users.js'

const router = Router()
const clientID = process.env.GOOGLE_CLIENT_ID
const allowedOrigin = process.env.ALLOWED_ORIGINS
if (!clientID) throw new Error('GOOGLE_CLIENT_ID is not set in .env')
if (!allowedOrigin) throw new Error('ALLOWED_ORIGINS is not set in .env')
const googleClient = new OAuth2Client(clientID)

// Session helpers
const regenerate = (req) => 
    new Promise((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve()))
const save = (req) => 
    new Promise((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve(err)))
const destroy = (req) => 
    new Promise((resolve, reject) => req.session.destroy((err) => err ? reject(err) : resolve(err)))

// Middleware for forgery checks on login, logout
function requireSameOrigin(req, res, next) {
    if (!req.is('json')) return res.status(403).json({ error: 'Expected JSON body' })
    if (req.get('Origin') !== allowedOrigin) return res.status(403).json({ error: 'Origin not allowed' })
    next()
}

router.post('/google', requireSameOrigin, async(req, res) => {
    // Validate the body     -> 400 on failure
    if (typeof req.body?.credential !== 'string' || !req.body.credential.trim()) {
        return res.status(400).json({ error: 'A valid string credential is required' })
    }

    // Verify with Google    -> 401 on failure
    let payload, displayName
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: req.body.credential,
            audience: clientID
        })
        payload = ticket.getPayload()
        displayName = payload.name?.trim() || payload.email.split('@')[0]
    } catch (err) {
        return res.status(401).json({ error: 'Invalid Google credential' })
    }
    
    // Find or create user   -> 200 existing / 201 created / 409 email conflict
    // And respond with the user
    let user, created
    try {
        const result = await findOrCreateGoogleUser({
            sub: payload.sub,
            email: payload.email,
            name: displayName
        })
        user = result.user
        created = result.created
        
        // Start a session for the user
        await regenerate(req)
        req.session.userId = user.id
        await save(req)
    
        if (created) return res.status(201).json({ message: 'User created successfully', user: publicUser(user) })
        else return res.status(200).json({ message: 'User signed in successfully', user: publicUser(user) })
    } catch (err) {
        if (err.name === 'EmailConflictError') return res.status(409).json({ error: err.message })
        else return res.status(500).json({ error: 'Internal server error' })
    }
})

router.get('/me', async(req, res) => {
    // Return the currently signed-in user, if any
    const userID = req.session?.userId
    // If no session or user, return 401
    if (!userID) return res.status(401).json({ error: 'Not signed in' })
    
    const user = await getUserByID(userID)
    if (!user) {
        // Session points to a non-existent user
        await destroy(req)
        res.clearCookie('sportsmeet.sid')
        return res.status(401).json({ error: 'User not found' })
    }

    res.set('Cache-Control', 'no-store')
    return res.status(200).json({ user: publicUser(user) })
})

router.post('/logout', requireSameOrigin, async(req, res) => {
    // Log out the current user by destroying the session
    try {
        await destroy(req)
    } catch {
        return res.status(500).json({ error: 'Internal server error' })
    }
    res.clearCookie('sportsmeet.sid', { path: '/' })
    return res.status(204).end()
})

export default router