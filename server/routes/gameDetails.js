// Endpoints behind the Game Details page, served under /game-details (see index.js).
// Built on the Prisma models in prisma/contract.prisma. The host is the game's `owner`; they are
// not a GameParticipant row, so the roster is the owner plus the participants.
import { Router } from 'express'
import db, { client } from '../prisma/db.js'
import { currentUserId } from '../currentUser.js'

const router = Router()

const SPORTS = ['Basketball', 'Soccer', 'Beach volleyball', 'Tennis', 'Ultimate', 'Spikeball']
const SKILLS = ['All levels', 'Beginner', 'Intermediate', 'Advanced']

// Ids are integers. Returns null for anything else (the route then replies 404).
const parseId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

// Replies with an error and returns null so a handler can `if (x === null) return`.
const reply = (res, status, error) => {
  res.status(status).json({ error })
  return null
}

// Roster for a game, host first, then players in the order they joined.
// `orm` is db or a transaction's tx.orm.public.
const rosterOf = async (orm, game) => {
  const participants = await orm.GameParticipant.where({ gameId: game.id })
    .orderBy((p) => p.joinedAt.asc())
    .all()
  const ids = [game.ownerId, ...participants.map((p) => p.userId)]
  const users = await orm.User.where((u) => u.id.in(ids))
    .include('sports', (sports) => sports.where({ sport: game.sport }))
    .all()
  return ids
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean)
    .map((u) => ({ id: u.id, name: u.name, skill: u.sports[0]?.skill ?? null }))
}

const titleOf = (game) => game.title ?? `${game.sport} at ${game.place}`

// Comments are one level deep: top-level comments can have replies, replies can't.
const formatComment = (c) => ({
  id: c.id,
  body: c.body,
  pinned: c.pinned,
  createdAt: c.createdAt,
  editedAt: c.editedAt,
  parentId: c.parentId,
  author: { id: c.author.id, name: c.author.name },
})

const commentById = async (id) => {
  const comment = await db.Comment.where({ id }).include('author').first()
  return comment && formatComment(comment)
}

// One game with its host, location, roster (host first) and comments (pinned first), or null.
const loadGame = async (id) => {
  const game = await db.Game.where({ id }).include('owner').include('location').first()
  if (!game) return null
  const comments = await db.Comment.where({ gameId: id })
    .include('author')
    .orderBy((c) => c.createdAt.asc())
    .all()
  // Pinned first. The sort is stable, so each group stays oldest first.
  comments.sort((a, b) => b.pinned - a.pinned)
  return {
    id: game.id,
    sport: game.sport,
    skill: game.skill,
    title: titleOf(game),
    notes: game.notes,
    status: game.status,
    startsAt: game.time,
    durationMin: game.durationMin,
    maxPlayers: game.maxPlayers,
    host: { id: game.owner.id, name: game.owner.name, bio: game.owner.bio },
    location: game.location
      ? { id: game.location.id, name: game.location.name, address: game.location.address, lat: game.location.lat, lng: game.location.lng }
      : { id: null, name: game.place, address: null, lat: null, lng: null },
    players: await rosterOf(db, game),
    comments: comments.map(formatComment),
  }
}

// GET /game-details/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    const game = id && (await loadGame(id))
    if (!game) return reply(res, 404, 'Game not found')
    res.json(game)
  } catch (err) {
    next(err)
  }
})

// Runs `work(orm, game, me)` in a transaction with the game row locked, so two requests can't
// both take the last spot. A write to the row makes other transactions on the same game wait
// until this one commits, then they see the new roster. `work` returns `{ status, body }` to
// reply with, or `{ status, reload: true }` to reply with the whole game once the transaction has
// committed. Throwing rolls everything back.
const withLockedGame = async (req, res, next, work) => {
  try {
    const id = parseId(req.params.id)
    if (id === null) return reply(res, 404, 'Game not found')
    const me = await currentUserId(req)
    if (me === null) return reply(res, 401, 'No current user. Run `npm run db:seed` in server/.')

    const result = await client.transaction(async (tx) => {
      const orm = tx.orm.public
      const current = await orm.Game.where({ id }).first()
      if (!current) return { status: 404, body: { error: 'Game not found' } }
      // Rewriting the same value takes the row lock without changing anything.
      const game = await orm.Game.where({ id }).update({ status: current.status })
      return work(orm, game, me)
    })
    res.status(result.status).json(result.reload ? await loadGame(id) : result.body)
  } catch (err) {
    next(err)
  }
}

const fail = (status, error) => ({ status, body: { error } })

// PATCH /game-details/:id  { sport?, skill?, locationId?, maxPlayers?, startsAt? }
// Host only. Changes the listed fields and returns the game in the same shape as GET /:id.
router.patch('/:id', (req, res, next) =>
  withLockedGame(req, res, next, async (orm, game, me) => {
    if (game.ownerId !== me) return fail(403, 'Only the host can edit this game')

    const { sport, skill, locationId, maxPlayers, startsAt } = req.body ?? {}
    const changes = {}
    if (sport !== undefined) {
      if (!SPORTS.includes(sport)) return fail(400, 'Pick one of the listed sports')
      changes.sport = sport
    }
    if (skill !== undefined) {
      if (!SKILLS.includes(skill)) return fail(400, 'Pick one of the listed skill levels')
      changes.skill = skill
    }
    if (locationId !== undefined) {
      const location = await orm.Location.where({ id: parseId(locationId) ?? -1 }).first()
      if (!location) return fail(400, 'That location doesn’t exist')
      changes.locationId = location.id
      changes.place = location.name
    }
    if (maxPlayers !== undefined) {
      if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 30) return fail(400, 'Players must be between 2 and 30')
      const joined = (await orm.GameParticipant.where({ gameId: game.id }).all()).length + 1
      if (maxPlayers < joined) return fail(409, `${joined} players have already joined, so the limit can’t go lower than that`)
      changes.maxPlayers = maxPlayers
    }
    if (startsAt !== undefined) {
      const date = new Date(startsAt)
      if (typeof startsAt !== 'string' || Number.isNaN(date.getTime())) return fail(400, 'That start time isn’t valid')
      changes.time = date
    }
    if (Object.keys(changes).length === 0) return fail(400, 'Nothing to change')

    await orm.Game.where({ id: game.id }).update(changes)
    return { status: 200, reload: true }
  }),
)

// DELETE /game-details/:id/players/:userId  { message? }
// Host only. Removes a player and saves the host's message to them. Returns the new roster.
router.delete('/:id/players/:userId', (req, res, next) =>
  withLockedGame(req, res, next, async (orm, game, me) => {
    if (game.ownerId !== me) return fail(403, 'Only the host can remove players')
    const userId = parseId(req.params.userId)
    if (userId === game.ownerId) return fail(400, 'The host can’t be removed from their own game')

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (message.length > 1000) return fail(400, 'Message is too long (max 1000 characters)')

    const removed = userId === null ? 0 : await orm.GameParticipant.where({ gameId: game.id, userId }).deleteAndCount()
    if (removed === 0) return fail(404, 'That player isn’t in this game')
    if (message) await orm.PlayerMessage.create({ gameId: game.id, toUserId: userId, fromUserId: me, body: message })
    return { status: 200, body: { players: await rosterOf(orm, game) } }
  }),
)

// POST /game-details/:id/join  (also served at /participants)
// Adds the current user to the roster. The game row is locked, so two people can't take the last
// spot at once. Returns the updated roster.
router.post(['/:id/join', '/:id/participants'], (req, res, next) =>
  withLockedGame(req, res, next, async (orm, game, me) => {
    if (game.status !== 'open') return fail(409, 'This game has been canceled')

    const participants = await orm.GameParticipant.where({ gameId: game.id }).all()
    if (game.ownerId === me || participants.some((p) => p.userId === me)) return fail(409, 'You’re already in this game')
    if (participants.length + 1 >= game.maxPlayers) return fail(409, 'Sorry, this game just filled up')

    await orm.GameParticipant.create({ gameId: game.id, userId: me })
    return { status: 201, body: { players: await rosterOf(orm, game) } }
  }),
)

// DELETE /game-details/:id/join  (also served at /participants)
// Removes the current user from the roster. The host can't leave their own game.
router.delete(['/:id/join', '/:id/participants'], (req, res, next) =>
  withLockedGame(req, res, next, async (orm, game, me) => {
    if (game.ownerId === me) return fail(409, 'Hosts can’t leave their own game')
    const removed = await orm.GameParticipant.where({ gameId: game.id, userId: me }).deleteAndCount()
    if (removed === 0) return fail(409, 'You’re not in this game')
    return { status: 200, body: { players: await rosterOf(orm, game) } }
  }),
)

// Validates a comment body. Returns the trimmed text, or null after replying 400.
const cleanBody = (res, value) => {
  const body = typeof value === 'string' ? value.trim() : ''
  if (!body) return reply(res, 400, 'Comment cannot be empty')
  if (body.length > 1000) return reply(res, 400, 'Comment is too long (max 1000 characters)')
  return body
}

// Loads a comment of this game plus the game's host id, or replies 404 and returns null.
const findComment = async (req, res) => {
  const gameId = parseId(req.params.id)
  const id = parseId(req.params.commentId)
  const comment = gameId && id && (await db.Comment.where({ id, gameId }).include('game').first())
  if (!comment) return reply(res, 404, 'Comment not found')
  return { id: comment.id, authorId: comment.authorId, parentId: comment.parentId, hostId: comment.game.ownerId }
}

// Replies 401 and returns null when there is no current user (the database hasn't been seeded).
const requireMe = async (req, res) => (await currentUserId(req)) ?? reply(res, 401, 'No current user. Run `npm run db:seed` in server/.')

// POST /game-details/:id/comments  { body, parentId? }
// Adds a comment (or a reply, when parentId is given) from the current user.
router.post('/:id/comments', async (req, res, next) => {
  try {
    const gameId = parseId(req.params.id)
    const game = gameId && (await db.Game.where({ id: gameId }).first())
    if (!game) return reply(res, 404, 'Game not found')
    const me = await requireMe(req, res)
    if (me === null) return
    const body = cleanBody(res, req.body?.body)
    if (body === null) return

    let parentId = null
    if (req.body?.parentId != null) {
      const parent = await db.Comment.where({ id: parseId(req.body.parentId) ?? -1, gameId }).first()
      if (!parent) return reply(res, 404, 'Comment not found')
      if (parent.parentId !== null) return reply(res, 400, 'You can only reply to a top-level comment')
      parentId = parent.id
    }

    const created = await db.Comment.create({ gameId, authorId: me, body, parentId })
    res.status(201).json(await commentById(created.id))
  } catch (err) {
    next(err)
  }
})

// PATCH /game-details/:id/comments/:commentId  { pinned } or { body }
// { pinned }: host only, top-level comments only. { body }: the comment's author only.
router.patch('/:id/comments/:commentId', async (req, res, next) => {
  try {
    const { pinned, body } = req.body ?? {}
    if (typeof pinned !== 'boolean' && typeof body !== 'string') {
      return reply(res, 400, 'Send pinned (true/false) or body (text)')
    }
    const comment = await findComment(req, res)
    if (!comment) return
    const me = await requireMe(req, res)
    if (me === null) return

    if (typeof pinned === 'boolean') {
      if (comment.hostId !== me) return reply(res, 403, 'Only the host can pin comments')
      if (comment.parentId !== null) return reply(res, 400, 'Replies can’t be pinned')
      await db.Comment.where({ id: comment.id }).update({ pinned })
    } else {
      if (comment.authorId !== me) return reply(res, 403, 'You can only edit your own comments')
      const text = cleanBody(res, body)
      if (text === null) return
      await db.Comment.where({ id: comment.id }).update({ body: text, editedAt: new Date() })
    }
    res.json(await commentById(comment.id))
  } catch (err) {
    next(err)
  }
})

// DELETE /game-details/:id/comments/:commentId
// The comment's author or the game's host. Deleting a top-level comment deletes its replies too.
router.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    const comment = await findComment(req, res)
    if (!comment) return
    const me = await requireMe(req, res)
    if (me === null) return
    if (comment.authorId !== me && comment.hostId !== me) {
      return reply(res, 403, 'Only the author or the host can delete this comment')
    }
    await db.Comment.where({ id: comment.id }).delete()
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
