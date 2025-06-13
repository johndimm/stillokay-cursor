import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { Pool } from "pg";
import { DateTime } from "luxon";
import { sendEmail } from "./sendEmail";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const userEmail = session.user.email;
  const { feelingLevel, note } = req.body;
  try {
    const client = await pool.connect();
    const userResult = await client.query('SELECT id, timezone FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;
    const timezone = userResult.rows[0].timezone || "America/Los_Angeles";
    // Get interval from caregivers table (assume one caregiver per user)
    const cgResult = await client.query('SELECT name, email, interval, send_checkin_email FROM caregivers WHERE user_id = $1', [userId]);
    const interval = cgResult.rows[0]?.interval || 24;
    const caregiverEmail = cgResult.rows[0]?.email;
    const caregiverName = cgResult.rows[0]?.name;
    const sendCheckinEmail = cgResult.rows[0]?.send_checkin_email;
    // Calculate current interval start and end in user's local time
    const now = DateTime.now().setZone(timezone);
    const intervalStartHour = Math.floor(now.hour / interval) * interval;
    const intervalStart = now.set({ hour: intervalStartHour, minute: 0, second: 0, millisecond: 0 });
    const intervalEnd = intervalStart.plus({ hours: interval });
    // Convert to UTC for DB query
    const intervalStartUTC = intervalStart.toUTC().toISO();
    const intervalEndUTC = intervalEnd.toUTC().toISO();
    // Check for existing check-in in this interval
    const checkinResult = await client.query(
      `SELECT 1 FROM history WHERE user_id = $1 AND event_type = 'checkin' AND created_at >= $2 AND created_at < $3`,
      [userId, intervalStartUTC, intervalEndUTC]
    );
    if (checkinResult.rows.length > 0) {
      client.release();
      return res.status(400).json({ error: "Already checked in this interval" });
    }
    await client.query(
      'INSERT INTO history (user_id, event_type, event_data, feeling_level, note) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'checkin', JSON.stringify({}), feelingLevel || null, note || null]
    );
    // Check if previous interval was missed
    const prevIntervalStart = intervalStart.minus({ hours: interval });
    const prevIntervalEnd = intervalStart;
    const prevMissedResult = await client.query(
      `SELECT 1 FROM history WHERE user_id = $1 AND event_type = 'missed_checkin' AND event_data->>'interval_end' = $2`,
      [userId, prevIntervalEnd.toUTC().toISO()]
    );
    let sentImOk = false;
    if (prevMissedResult.rows.length > 0 && caregiverEmail) {
      // Send 'I'm okay' email to caregiver
      let emailContent = `<p>Hello${caregiverName ? ' ' + caregiverName : ''},</p>
                         <p><b>${session.user.name}</b> just checked in after missing their last interval.</p>
                         <p>This means they are okay now. No further action is needed.</p>`;
      
      if (feelingLevel) {
        emailContent += `<p><strong>How they're feeling:</strong> ${feelingLevel}/10</p>`;
      }
      
      if (note) {
        emailContent += `<p><strong>Note:</strong> "${note}"</p>`;
      }
      
      emailContent += `<p style="color:#888;font-size:13px;">You are receiving this because you are listed as a caregiver in Still Okay.</p>`;
      
      await sendEmail({
        to: caregiverEmail,
        subject: `Still Okay: ${session.user.name} checked in after missed interval`,
        html: emailContent
      });
      // Log event: caregiver_im_ok_email_sent
      await client.query(
        'INSERT INTO history (user_id, event_type, event_data) VALUES ($1, $2, $3)',
        [userId, 'caregiver_im_ok_email_sent', JSON.stringify({ caregiver_email: caregiverEmail, sent_at: new Date().toISOString() })]
      );
      sentImOk = true;
    }
    // Send email to caregiver if enabled
    if (sendCheckinEmail && caregiverEmail && !sentImOk) {
      let emailContent = `<p>Hello${caregiverName ? ' ' + caregiverName : ''},</p>
                         <p><b>${session.user.name}</b> just checked in using Still Okay.</p>
                         <p>No action is needed. This is just a notification for your peace of mind.</p>`;
      
      if (feelingLevel) {
        emailContent += `<p><strong>How they're feeling:</strong> ${feelingLevel}/10</p>`;
      }
      
      if (note) {
        emailContent += `<p><strong>Note:</strong> "${note}"</p>`;
      }
      
      emailContent += `<p style="color:#888;font-size:13px;">You are receiving this because you are listed as a caregiver in Still Okay.</p>`;
      
      await sendEmail({
        to: caregiverEmail,
        subject: `Still Okay: ${session.user.name} checked in`,
        html: emailContent
      });
      // Log event: caregiver_checkin_email_sent
      await pool.connect().then(async client => {
        await client.query(
          'INSERT INTO history (user_id, event_type, event_data) VALUES ($1, $2, $3)',
          [userId, 'caregiver_checkin_email_sent', JSON.stringify({ caregiver_email: caregiverEmail, sent_at: new Date().toISOString() })]
        );
        client.release();
      });
    }
    client.release();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
} 