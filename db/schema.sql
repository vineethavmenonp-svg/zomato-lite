-- Schema = the shape of our tables: what columns exist and what each holds.
-- This file is the blueprint we will apply to Neon Postgres later.
-- NOTE: there is deliberately NO average_rating column and NO latest_review column.
-- Those are answers, not facts. We compute them at request time.
-- Facts only:
--   "Priya gave 4 stars on 14 August" -> stored forever.
--   "the average is 4.3"              -> computed when asked, never stored.

CREATE TABLE restaurants (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  cuisine   TEXT NOT NULL,
  area      TEXT NOT NULL
);

CREATE TABLE reviews (
  id            SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
