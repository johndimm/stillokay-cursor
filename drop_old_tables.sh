#!/bin/bash

psql "postgres://postgres:Leucate1@34.94.209.16:5432/stillokay" <<EOF
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Caregiver" CASCADE;
DROP TABLE IF EXISTS _prisma_migrations CASCADE;
\dt
EOF 