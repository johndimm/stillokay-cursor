# Still Okay

A web application that helps people who live alone by providing a daily check-in system. If a user doesn't check in by midnight, their designated caregiver receives an SMS notification.

## Features

- Google OAuth authentication
- Daily check-in system
- Automated SMS notifications
- Simple and intuitive interface

## Prerequisites

- Node.js 18 or later
- PostgreSQL database
- Google OAuth credentials
- Twilio account for SMS notifications

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Your application URL
- `NEXTAUTH_SECRET`: Secret key for NextAuth
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `TWILIO_AUTH_TOKEN`: Twilio auth token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number
- `CRON_SECRET`: Secret key for cron job authentication

## Setting up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add your application URL to the authorized redirect URIs
6. Copy the client ID and secret to your `.env` file

## Setting up Twilio

1. Sign up for a [Twilio account](https://www.twilio.com/)
2. Get your account SID and auth token
3. Get a phone number for sending SMS
4. Add these credentials to your `.env` file

## Setting up the Cron Job

The application includes an endpoint for checking missed check-ins at midnight. You'll need to set up a cron job to call this endpoint. Here's an example using curl:

```bash
0 0 * * * curl -X POST -H "Authorization: Bearer your-cron-secret" https://your-domain.com/api/cron/check-missed-checkins
```

## License

MIT
# stillokay-cursor
