# pickup

UCLA CS35L Project: a web app for finding, joining and hosting pickup games around UCLA.

- [project requirements](https://web.cs.ucla.edu/classes/fall26/cs35L-2/project.html)
- [project planning doc](https://docs.google.com/document/d/1MEPbdbPozhvAt8uS3-quNM6sx3XvqxS496-_1Lgf4-0/)
- [design handoff](design/HANDOFF.md): screens, design tokens, data model and API

## Project layout

```
client/   React app (Vite), runs on http://localhost:5173
server/   Express API + PostgreSQL, runs on http://localhost:3001
design/   Designs from Claude Design (the UI spec)
```

The client forwards every `/api/...` request to the server, so frontend code can call `fetch('/api/games')` directly.

## Setup

You need Node.js 22+ and PostgreSQL 16+.

1. Install and start PostgreSQL (macOS):

   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```

2. Create the database:

   ```bash
   createdb pickup
   ```

3. Configure the server. Edit `server/.env` if your Postgres needs a username or password (e.g. `postgres://user:password@localhost:5432/pickup`).

   ```bash
   cp server/.env.example server/.env
   ```

4. Install dependencies and load the sample data:

   ```bash
   cd server && npm install && npm run db:reset
   cd ../client && npm install
   ```

## Running

From the repository root, start both servers with:

```bash
bash scripts/dev.sh
```

Open http://localhost:5173. Press Ctrl+C to stop both servers.
The script creates `server/.env` from the example if missing; it does not
create or reset the database. Complete the setup above before the first run.

Alternatively, start them separately:

Use two terminals.

```bash
cd server && npm run dev
```

```bash
cd client && npm run dev
```

Then open http://localhost:5173.

`npm run db:reset` wipes the database and reloads `design/sample-data.json`. Run it again whenever `server/db/schema.sql` changes.
