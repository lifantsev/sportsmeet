import 'dotenv/config'
import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { findOrCreateGoogleUser } from '../services/users.js'

const router = Router()
const clientID = process.env.GOOGLE_CLIENT_ID
const allowedOrigin = process.env.ALLOWED_ORIGINS
if (!clientID) throw new Error('GOOGLE_CLIENT_ID is not set in .env')
if (!allowedOrigin) throw new Error('ALLOWED_ORIGINS is not set in .env')
const googleClient = new OAuth2Client(clientID)

router.post('/google', async(req, res) => {
    // TODO: verify the credential with Google and start a session
    
    // 1. Forgery checks        -> 403 on failure
    if (!req.is('json')) return res.status(403).json({ error: 'Expected JSON body' })
    if (req.get('Origin') !== allowedOrigin) return res.status(403).json({ error: 'Origin not allowed' })

    // 2. Validate the body     -> 400 on failure
    if (req.body?.credential === null || typeof req.body.credential !== 'string') {
        return res.status(400).json({ error: 'A valid string credential is required' })
    }

    // 3. Verify with Google    -> 401 on failure
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
    
    // 4. Find or create user   -> 200 existing / 201 created / 409 email conflict
    // 5. And respond with the user
    let user, created
    try {
        const result = await findOrCreateGoogleUser({
            sub: payload.sub,
            email: payload.email,
            name: displayName
        })
        user = result.user
        created = result.created
    
        if (created) return res.status(201).json({ message: 'User created successfully', user })
        else return res.status(200).json({ message: 'User signed in successfully', user })
    } catch (err) {
        if (err.name === 'EmailConflictError') return res.status(409).json({ error: err.message })
        else return res.status(500).json({ error: 'Internal server error' })
    }
})

export default router