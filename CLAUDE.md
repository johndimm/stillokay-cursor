# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js web application called "Still Okay" - a check-in system for elderly or at-risk individuals and their caregivers. Users authenticate with Google OAuth and check in at regular intervals. If they miss a check-in, alerts are sent to designated caregivers.

## Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run Next.js linter
```

### Database Management
```bash
./create_tables.sh         # Create database tables
./drop_old_tables.sh       # Drop old tables
./check-missed-checkins.sh # Manually trigger missed check-in cron job
```

## Architecture

### Database Schema
- **users**: Stores user profiles (Google OAuth data)
- **caregivers**: Stores caregiver info per user (email, notification preferences, check-in intervals)
- **history**: Event log for all user actions (check-ins, missed check-ins, emails sent)

### Key Components
- **Authentication**: NextAuth.js with Google OAuth provider
- **Database**: PostgreSQL with connection pooling
- **Email**: Nodemailer for sending alerts and notifications
- **Time Handling**: Luxon library for timezone-aware date/time operations
- **Styling**: CSS modules with custom styles

### API Endpoints
- `/api/checkin` - POST to record user check-in
- `/api/checkin-status` - GET current check-in status and intervals
- `/api/history` - GET user's event history
- `/api/settings` - GET/POST caregiver settings
- `/api/cron-checkin` - POST endpoint for automated missed check-in detection
- `/api/caregiver-confirm` - GET endpoint for caregiver email confirmation

### Frontend Pages
- `/` - Main check-in interface with timeline visualization
- `/settings` - Configure caregiver information and check-in intervals
- `/history` - View complete event history
- `/guide` - User documentation (markdown-based)

### Key Features
- **Interval-based check-ins**: Users must check in within configurable time intervals (default 24 hours)
- **Feeling scale**: Optional 1-10 rating system for how users are feeling when checking in
- **Notes**: Optional text messages users can send to their caregivers during check-in
- **Timeline visualization**: Shows current interval, next check-in time, and reminder notifications
- **Visual feedback**: History calendar uses different shades of green based on feeling level (darker = better)
- **Email notifications**: Alerts caregivers when check-ins are missed, includes feeling level and notes when provided
- **Timezone support**: All times are handled in user's local timezone
- **Event logging**: Complete audit trail of all system events

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXTAUTH_URL` - App URL for NextAuth
- `NEXTAUTH_SECRET` - NextAuth secret key
- `EMAIL_*` - SMTP configuration for sending emails

### Cron Job System
The application includes a cron job system (`/api/cron-checkin`) that should be called periodically to detect missed check-ins and send alerts. This is triggered via the `check-missed-checkins.sh` script.