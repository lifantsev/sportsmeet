// Clears the database and loads the mock data from design/sample-data.json.
// Usage: npm run db:seed   (the database must already have the tables: npx prisma db init)
//
// The sample data uses text ids ("u_me", "g_friday_runs"); the database uses integer ids, so
// each one is mapped to the id Postgres assigns. The first sample user is the signed-in stand-in
// (server/currentUser.js), so it gets the stand-in's email.
import { readFile } from 'node:fs/promises'
import db, { client } from '../prisma/db.js'
import { CURRENT_USER_EMAIL } from '../currentUser.js'

const data = JSON.parse(
  await readFile(new URL('../../design/sample-data.json', import.meta.url), 'utf8'),
)

try {
  // TRUNCATE ... RESTART IDENTITY so game ids start at 1 again.
  await client.execute(
    client.raw.sql`TRUNCATE TABLE "PlayerMessage", "Comment", "GameParticipant", "Game", "UserSport", "Location", "User" RESTART IDENTITY CASCADE`
      .affectedCount()
      .build(),
  )

  const userIds = {}
  for (const u of data.users) {
    const home = u.homeLocation ?? {}
    const user = await db.User.create({
      email: u.id === data.currentUserId ? CURRENT_USER_EMAIL : `${u.id}@sportsmeet.test`,
      name: u.name,
      bio: u.bio ?? '',
      homeLabel: home.label ?? null,
      homeLat: home.lat ?? null,
      homeLng: home.lng ?? null,
    })
    userIds[u.id] = user.id
    for (const s of u.sports ?? []) {
      await db.UserSport.create({ userId: user.id, sport: s.sport, skill: s.skill })
    }
  }

  const locations = {}
  for (const l of data.locations) {
    const location = await db.Location.create({ name: l.name, address: l.address ?? null, lat: l.lat, lng: l.lng })
    locations[l.id] = location
  }

  const gameIds = {}
  for (const g of data.games) {
    const location = locations[g.locationId]
    const game = await db.Game.create({
      sport: g.sport,
      place: location.name,
      time: new Date(g.startsAt),
      ownerId: userIds[g.hostId],
      title: g.title,
      skill: g.skill,
      durationMin: g.durationMin,
      maxPlayers: g.maxPlayers,
      notes: g.notes ?? '',
      locationId: location.id,
    })
    gameIds[g.id] = game.id
    // The host is the game's owner, not a participant row.
    for (const playerId of g.playerIds) {
      if (playerId === g.hostId) continue
      await db.GameParticipant.create({ userId: userIds[playerId], gameId: game.id })
    }
  }

  for (const c of data.comments) {
    await db.Comment.create({
      gameId: gameIds[c.gameId],
      authorId: userIds[c.authorId],
      body: c.body,
      pinned: c.pinned ?? false,
      createdAt: new Date(c.createdAt),
    })
  }

  console.log(
    `Loaded ${data.users.length} users, ${data.locations.length} locations, ` +
      `${data.games.length} games, ${data.comments.length} comments.`,
  )
} finally {
  await client.close()
}
