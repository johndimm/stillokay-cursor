import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { token, action } = req.query;
  if (!token || !action) {
    res.status(400).send("Missing token or action.");
    return;
  }
  try {
    const client = await pool.connect();
    const cgResult = await client.query('SELECT id, email_confirmed FROM caregivers WHERE token = $1', [token]);
    if (cgResult.rows.length === 0) {
      client.release();
      res.status(404).send("Invalid or expired confirmation link.");
      return;
    }
    const caregiverId = cgResult.rows[0].id;
    let message = "";
    if (action === "optin") {
      await client.query('UPDATE caregivers SET email_confirmed = TRUE, opted_in = TRUE, token = NULL WHERE id = $1', [caregiverId]);
      message = `
        <div style="max-width: 480px; margin: 40px auto; background: #fff; border-radius: 14px; box-shadow: 0 2px 12px #e0eaff; padding: 32px 28px; font-family: Arial, sans-serif;">
          <h2 style="color: #2a5bd7; margin-top: 0; font-size: 2rem; letter-spacing: 0.01em;">Still Okay</h2>
          <p style="font-size: 1.2rem; color: #222; font-weight: 600; margin-bottom: 18px;">Thank you for confirming! You are now listed as the caregiver.</p>
          <p style="font-size: 1rem; color: #444; margin-bottom: 18px;">As a caregiver, you'll be notified by email if your loved one misses a check-in. Your role is to check in on them if you receive an alert. No action is needed unless you get a notification.</p>
          <p style="font-size: 1rem; color: #444; margin-bottom: 18px;">If you have questions or want to learn more, visit <a href="https://stillokay.app" style="color: #2a5bd7; text-decoration: underline;">the Still Okay website</a>.</p>
        </div>
      `;
      await client.query(
        'INSERT INTO history (user_id, event_type, event_data) SELECT user_id, $1, $2 FROM caregivers WHERE id = $3',
        ['caregiver_optin', JSON.stringify({ caregiver_id: caregiverId }), caregiverId]
      );
    } else if (action === "optout") {
      await client.query('UPDATE caregivers SET email_confirmed = FALSE, opted_in = FALSE, token = NULL WHERE id = $1', [caregiverId]);
      message = "You have opted out. You will not receive any notifications.";
      await client.query(
        'INSERT INTO history (user_id, event_type, event_data) SELECT user_id, $1, $2 FROM caregivers WHERE id = $3',
        ['caregiver_optout', JSON.stringify({ caregiver_id: caregiverId }), caregiverId]
      );
    } else {
      client.release();
      res.status(400).send("Invalid action.");
      return;
    }
    client.release();
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!DOCTYPE html><html><head><title>Still Okay Caregiver Confirmation</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background: #f8faff; margin: 0; min-height: 100vh;">${message}</body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error.");
  }
} 