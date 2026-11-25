# PostgreSQL Database

`initdb -D .postgres` to create the postgres database

`db` to run the database server (script from ../flake.nix)

Alternatively, to avoid using the Nix script:

`pg_ctl -D .postgres -l .postgres/logfile start` to run the database server

`createdb sportsmeet -h localhost` to initialize sportsmeet db (postgres must be running)

# Prisma ORM

`npx prisma contract emit` to update contract files when changing ./prisma/contract.prisma

`npx prisma db init` to write the tables declared by the contract to the db (postgres must be running)

# REST API

### GET /health
Returns a json object `{ ok: true }`

### PUT /resetdb
Clears the database and seeds it with a dummy state

## Users

### POST /users
Creates a new user with the given `email` and `name` attributes (email must be unique). Returns the User object (will contain their `id`)

### DELETE /users/:id
Deletes the user with the given `id`. This will delete all games they own, and it will remove them from any game they joined.

### GET /users
List of all user objects in database

### GET /users/:id
User object with given `id`

### GET /users/:id/games/owned
List of all game objects the user owns

### GET /users/:id/games/joined
List of all game objects the user has joined

### GET /users/:id/games
Object with `owned` and `joined` attributes that are lists of the games they have joined and own

## Games

### POST /games/:id/participants
Adds the user with the given `userId` as a participant of this game. Will return 409 error if the user has already joined or owns this game.

### POST /games
Creates a new game with given `sport`, `place`, `time`, `ownerId` attributes.

### DELETE /games/:id
Deletes the game with given `id`.

### GET /games
List of all game objects in database

### GET /games/:id
Game object with given id

### GET /games/:id/owner
User object that owns this game

### GET /games/:id/participants
List of User objects that have joined this game as participants

# Game Details page

The Game Details page (`client/src/GameDetails.jsx`) is served by `routes/gameDetails.js` and `routes/me.js`. They use the same Prisma models as the REST API above, under their own paths so they don't collide with `/games` and `/users` (the client reaches them as `/api/game-details`, `/api/me` and `/api/locations`). The host is the game's `owner` and is not a `GameParticipant` row, so a game's player count is its participants + 1.

`npm run db:seed` empties the database and loads `../design/sample-data.json` (users, locations, games, comments). Run it after `npx prisma db init`. `PUT /resetdb` is the quick dummy reset and does not load the sample data.

The acting user is the signed-in user (`req.session.userId`). When nobody is signed in, the seeded sample user `sophia@sportsmeet.test` stands in so the page can be tried without Google sign-in (see `currentUser.js`).

### GET /game-details/:id
One game with its host, location, roster (host first) and comments (pinned first).

### PATCH /game-details/:id
Host only. Edit `sport`, `skill`, `locationId`, `maxPlayers` or `startsAt`.

### POST /game-details/:id/join, DELETE /game-details/:id/join
Join or leave as the current user. Joining locks the game row, so the last spot can't be taken twice.

### DELETE /game-details/:id/players/:userId
Host only. Removes a player and saves an optional `message` to them (`PlayerMessage`).

### POST /game-details/:id/comments, PATCH/DELETE /game-details/:id/comments/:commentId
Comments, replies (one level deep), edit (author), pin (host) and delete (author or host).

### GET /me, GET /locations
The current user, and every location (for the host's edit form).
