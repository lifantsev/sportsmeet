import db from './prisma/db.js'

// Fallback for development: the seeded sample user, used when nobody is signed in so the page can
// be tried without Google sign-in. Seeded by `npm run db:seed`.
export const CURRENT_USER_EMAIL = 'sophia@sportsmeet.test'

// The id of the user making this request: the signed-in user (req.session.userId, set by
// routes/auth.js) or else the sample user. Null if neither exists (the database isn't seeded).
export async function currentUserId(req) {
  if (req?.session?.userId) return req.session.userId
  const user = await db.User.where({ email: CURRENT_USER_EMAIL }).first()
  return user?.id ?? null
}
