import db from '../prisma/db.js'

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  }
}

export class EmailConflictError extends Error {
  constructor(message = 'Email already belongs to another user') {
    super(message)
    this.name = 'EmailConflictError'
  }
}

export async function findOrCreateGoogleUser({ sub, email, name }) {
  // 1. look up by googleSub
    const user = await db.User.where({ googleSub: sub }).first()
    if (user) return { user, created: false }
  // 2. if none, try to create
  try {
    const newUser = await db.User.create({ email, name, googleSub: sub })
    return { user: newUser, created: true }
  // 3. on unique-violation: re-query by sub (race) or throw EmailConflictError (email taken)
  // return { user, created }
  } catch (err) {
    if (err.sqlState !== '23505') throw err

    const user = await db.User.where({ googleSub: sub }).first()
    if (user) return { user, created: false }

    const userEmail = await db.User.where({ email }).first()
    if (userEmail) throw new EmailConflictError()

    throw err
  }
}

export async function getUserByID(id) {
  return db.User.where({ id }).first() 
}