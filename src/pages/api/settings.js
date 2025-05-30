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
          <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px 0;">
            <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 14px; box-shadow: 0 2px 16px #eee; padding: 32px 28px;">
              <h2 style="color: #2a5bd7; margin-top: 0;">Still Okay Caregiver Confirmation</h2>
              <p style="font-size: 16px; color: #222;">Hello <b>${caregiver_name || ""}</b>,</p>
              <p style="font-size: 16px; color: #222;"><b>${userName}</b> is using Still Okay, a service for people who live alone and want to make sure someone is notified if they don't check in regularly.</p>
              <p style="font-size: 16px; color: #222;">They have listed you as their caregiver. If you agree to be their caregiver, you'll get an alert if they miss a check-in.</p>
              <div style="margin: 32px 0 24px 0; display: flex; gap: 18px; flex-wrap: wrap;">
                <a href="${optInUrl}" style="background: #2a5bd7; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">Yes, I agree to be their caregiver</a>
                <a href="${optOutUrl}" style="background: #e53935; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">Opt out</a>
              </div>
              <p style="font-size: 15px; color: #555;">If you do not know this person or do not want to be their caregiver, you can opt out above.</p>
              <p style="font-size: 15px; color: #888; margin-top: 32px;">Learn more at <a href="https://stillokay.com" style="color: #2a5bd7;">Still Okay</a>.</p>
            </div>
          </div>
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