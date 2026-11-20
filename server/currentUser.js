import db from './prisma/db.js'

// Stand-in for the signed-in user until Google sign-in exists. Seeded by `npm run db:seed`.
export const CURRENT_USER_EMAIL = 'sophia@sportsmeet.test'

// The current user's id, or null if the database hasn't been seeded.
export async function currentUserId() {
  const user = await db.User.where({ email: CURRENT_USER_EMAIL }).first()
  return user?.id ?? null
}
