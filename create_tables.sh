#!/bin/bash

psql "postgres://postgres:Leucate1@34.94.209.16:5432/stillokay" <<EOF
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  image TEXT
);

CREATE TABLE IF NOT EXISTS caregivers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  email_confirmed BOOLEAN DEFAULT FALSE,
  opted_in BOOLEAN DEFAULT FALSE,
  interval INTEGER DEFAULT 24,
  token TEXT
);

CREATE TABLE IF NOT EXISTS history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

\dt
EOF 