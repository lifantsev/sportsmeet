# PostgreSQL Database

`initdb -D .postgres` to create the postgres database

`db` to run the database server (script from ../flake.nix)

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
