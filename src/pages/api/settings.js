import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { Pool } from "pg";
import crypto from "crypto";
import { sendEmail } from "./sendEmail";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const userEmail = session.user.email;

  if (req.method === "GET") {
    try {
      const client = await pool.connect();
      const userResult = await client.query('SELECT id, name, timezone FROM users WHERE email = $1', [userEmail]);
      if (userResult.rows.length === 0) {
        client.release();
        return res.status(404).json({ error: "User not found" });
      }
      const userId = userResult.rows[0].id;
      const userName = userResult.rows[0].name;
      const userTimezone = userResult.rows[0].timezone || "America/Los_Angeles";
      const cgResult = await client.query('SELECT name, email, email_confirmed, interval FROM caregivers WHERE user_id = $1', [userId]);
      let caregiver = cgResult.rows[0] || {};
      client.release();
      res.json({
        caregiver_name: caregiver.name || "",
        caregiver_email: caregiver.email || "",
        interval: caregiver.interval || 24,
        email_confirmed: caregiver.email_confirmed || false,
        timezone: userTimezone,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  } else if (req.method === "POST") {
    const { caregiver_name, caregiver_email, interval, timezone } = req.body;
    try {
      const client = await pool.connect();
      const userResult = await client.query('SELECT id, name FROM users WHERE email = $1', [userEmail]);
      if (userResult.rows.length === 0) {
        client.release();
        return res.status(404).json({ error: "User not found" });
      }
      const userId = userResult.rows[0].id;
      const userName = userResult.rows[0].name;
      // Update user's timezone
      await client.query('UPDATE users SET timezone = $1 WHERE id = $2', [timezone, userId]);
      // Get previous caregiver email
      const prevCgResult = await client.query('SELECT email FROM caregivers WHERE user_id = $1', [userId]);
      const prevEmail = prevCgResult.rows[0]?.email;
      // Upsert caregiver info
      let token;
      if (prevEmail !== caregiver_email) {
        // Generate a new token for confirmation
        token = crypto.randomBytes(32).toString('hex');
      }
      await client.query(
        `INSERT INTO caregivers (user_id, name, email, interval, email_confirmed, token) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET name = $2, email = $3, interval = $4, email_confirmed = $5, token = $6`,
        [userId, caregiver_name, caregiver_email, interval, prevEmail !== caregiver_email ? false : true, token || null]
      );
      // If caregiver email changed, send confirmation/intro email
      if (prevEmail !== caregiver_email && caregiver_email) {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const optInUrl = `${baseUrl}/api/caregiver-confirm?token=${token}&action=optin`;
        const optOutUrl = `${baseUrl}/api/caregiver-confirm?token=${token}&action=optout`;
        const subject = `Please confirm: ${userName} wants you as their Still Okay caregiver`;
        const html = `
          <p>Hello ${caregiver_name || ""},</p>
          <p><b>${userName}</b> is using Still Okay, a service for people who live alone and want to make sure someone is notified if they don't check in regularly.</p>
          <p>They have listed you as their caregiver. If you agree to be their caregiver, you'll get an alert if they miss a check-in.</p>
          <p><a href="${optInUrl}">Yes, I agree to be their caregiver</a></p>
          <p>If you do not know this person or do not want to be their caregiver, you can opt out here: <a href="${optOutUrl}">Opt out</a></p>
          <p>Learn more at <a href="https://stillokay.com">Still Okay</a>.</p>
        `;
        await sendEmail({
          to: caregiver_email,
          subject,
          html,
        });
        // Log event: caregiver_email_sent
        await client.query(
          'INSERT INTO history (user_id, event_type, event_data) VALUES ($1, $2, $3)',
          [userId, 'caregiver_email_sent', JSON.stringify({ caregiver_name, caregiver_email })]
        );
      }
      // Log event: caregiver_updated
      await client.query(
        'INSERT INTO history (user_id, event_type, event_data) VALUES ($1, $2, $3)',
        [userId, 'caregiver_updated', JSON.stringify({ caregiver_name, caregiver_email, interval })]
      );
      client.release();
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 