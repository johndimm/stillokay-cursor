import { Pool } from "pg";
import { DateTime } from "luxon";
import { sendEmail } from "./sendEmail";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const client = await pool.connect();
  let alertsSent = 0;
  let remindersSent = 0;
  const actions = [];
  try {
    // Get all users with their caregivers and settings
    const usersResult = await client.query(`
      SELECT u.id as user_id, u.name as user_name, u.email as user_email, u.timezone,
             c.name as caregiver_name, c.email as caregiver_email, c.email_confirmed, c.opted_in, c.interval
      FROM users u
      JOIN caregivers c ON c.user_id = u.id
      WHERE c.email IS NOT NULL AND c.email_confirmed = TRUE AND c.opted_in = TRUE
    `);
    let nowUTC = DateTime.utc();
    const delayHours = req.query.delayHours ? parseFloat(req.query.delayHours) : 0;
    if (!isNaN(delayHours) && delayHours !== 0) {
      nowUTC = nowUTC.plus({ hours: delayHours });
    }
    // Round to nearest hour
    if (nowUTC.minute >= 30) {
      nowUTC = nowUTC.plus({ hours: 1 });
    }
    nowUTC = nowUTC.set({ minute: 0, second: 0, millisecond: 0 });
    for (const user of usersResult.rows) {
      const { user_id, user_name, user_email, timezone, caregiver_name, caregiver_email, interval } = user;
      const now = nowUTC.setZone(timezone || "America/Los_Angeles");
      // Calculate current and previous interval
      const intervalHours = interval || 24;
      const intervalStartHour = Math.floor(now.hour / intervalHours) * intervalHours;
      const intervalStart = now.set({ hour: intervalStartHour, minute: 0, second: 0, millisecond: 0 });
      const intervalEnd = intervalStart.plus({ hours: intervalHours });
      const prevIntervalStart = intervalStart.minus({ hours: intervalHours });
      const prevIntervalEnd = intervalStart;
      // 1. ALERT: If previous interval ended within the last hour and no check-in
      if (now >= prevIntervalEnd && now < prevIntervalEnd.plus({ hours: 1 })) {
        // Did user check in during previous interval?
        const checkinResult = await client.query(
          `SELECT 1 FROM history WHERE user_id = $1 AND event_type = 'checkin' AND created_at >= $2 AND created_at < $3`,
          [user_id, prevIntervalStart.toUTC().toISO(), prevIntervalEnd.toUTC().toISO()]
        );
        if (checkinResult.rows.length === 0) {
          // Send alert email to caregiver
          await sendEmail({
            to: caregiver_email,
            subject: `Missed check-in alert for ${user_name}`,
            html: `<p>Hello ${caregiver_name || ''},</p>
                   <p><b>${user_name}</b> did not check in during their interval ending at ${prevIntervalEnd.toFormat('ff')} (${timezone}).</p>
                   <p>This is an automated alert from Still Okay.</p>`
          });
          // Log event
          await client.query(
            'INSERT INTO history (user_id, event_type, event_data) VALUES ($1, $2, $3)',
            [user_id, 'missed_checkin_alert', JSON.stringify({ caregiver_email, interval_end: prevIntervalEnd.toISO() })]
          );
          alertsSent++;
          actions.push({
            type: 'alert',
            user_id, user_name, user_email, timezone, caregiver_email, interval,
            interval_end: prevIntervalEnd.toISO(),
            datetime: nowUTC.toISO(),
            localDatetime: nowUTC.setZone(timezone || 'America/Los_Angeles').toISO()
          });
        }
      }
      // 2. REMINDER: If current interval ends in the next hour and no check-in
      if (intervalEnd > now && intervalEnd <= now.plus({ hours: 1 })) {
        const checkinResult = await client.query(
          `SELECT 1 FROM history WHERE user_id = $1 AND event_type = 'checkin' AND created_at >= $2 AND created_at < $3`,
          [user_id, intervalStart.toUTC().toISO(), intervalEnd.toUTC().toISO()]
        );
        if (checkinResult.rows.length === 0) {
          // Send reminder email to user
          await sendEmail({
            to: user_email,
            subject: `Reminder: Please check in with Still Okay`,
            html: `<p>Hello ${user_name},</p>
                   <p>This is a reminder to check in before your interval ends at ${intervalEnd.toFormat('ff')} (${timezone}).</p>
                   <p>If you do not check in, your caregiver will be notified.</p>`
          });
          remindersSent++;
          actions.push({
            type: 'reminder',
            user_id, user_name, user_email, timezone, caregiver_email, interval,
            interval_end: intervalEnd.toISO(),
            datetime: nowUTC.toISO(),
            localDatetime: nowUTC.setZone(timezone || 'America/Los_Angeles').toISO()
          });
        }
      }
    }
    client.release();
    res.json({
      datetime: nowUTC.toISO(),
      alertsSent,
      remindersSent,
      actions
    });
  } catch (err) {
    client.release();
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
} 