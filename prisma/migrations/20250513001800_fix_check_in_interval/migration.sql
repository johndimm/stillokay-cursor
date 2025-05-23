-- Add check-in interval column
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "check_in_interval" INTEGER NOT NULL DEFAULT 24; 