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
  token TEXT,
  send_checkin_email BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  feeling_level INTEGER CHECK (feeling_level >= 1 AND feeling_level <= 10),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

\dt

-- Add columns if upgrading an existing table
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS send_checkin_email BOOLEAN DEFAULT FALSE;
ALTER TABLE history ADD COLUMN IF NOT EXISTS feeling_level INTEGER CHECK (feeling_level >= 1 AND feeling_level <= 10);
ALTER TABLE history ADD COLUMN IF NOT EXISTS note TEXT;
EOF