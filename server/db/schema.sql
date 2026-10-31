-- Tables for the data model in design/HANDOFF.md section 6.
-- Running this drops and recreates everything, so only use it in development.

DROP TABLE IF EXISTS comments, game_players, games, locations, user_sports, users CASCADE;

CREATE TABLE users (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        text NOT NULL,
  email       text UNIQUE,
  photo_url   text,
  bio         text NOT NULL DEFAULT '',
  home_label  text,
  home_lat    double precision,
  home_lng    double precision,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_sports (
  user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport    text NOT NULL,
  skill    text NOT NULL CHECK (skill IN ('All levels', 'Beginner', 'Intermediate', 'Advanced')),
  PRIMARY KEY (user_id, sport)
);

CREATE TABLE locations (
  id       text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name     text NOT NULL,
  address  text,
  lat      double precision NOT NULL,
  lng      double precision NOT NULL
);

CREATE TABLE games (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sport         text NOT NULL,
  skill         text NOT NULL CHECK (skill IN ('All levels', 'Beginner', 'Intermediate', 'Advanced')),
  title         text NOT NULL,
  location_id   text NOT NULL REFERENCES locations(id),
  starts_at     timestamptz NOT NULL,
  duration_min  integer NOT NULL CHECK (duration_min > 0),
  max_players   integer NOT NULL CHECK (max_players BETWEEN 2 AND 30),
  notes         text NOT NULL DEFAULT '',
  host_id       text NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One row per player in a game. Joining = insert, leaving = delete.
CREATE TABLE game_players (
  game_id    text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, user_id)
);

CREATE TABLE comments (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id     text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  author_id   text NOT NULL REFERENCES users(id),
  body        text NOT NULL,
  pinned      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX games_starts_at_idx ON games (starts_at);
CREATE INDEX comments_game_id_idx ON comments (game_id, created_at);
