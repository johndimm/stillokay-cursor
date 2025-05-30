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
      message = "Thank you for confirming! You are now listed as the caregiver.";
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
    res.status(200).send(`<html><body><h2>Still Okay</h2><p>${message}</p></body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error.");
  }
} 