import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { Pool } from "pg";
import { DateTime } from "luxon";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const userEmail = session.user.email;
  try {
    const client = await pool.connect();
    const userResult = await client.query('SELECT id, timezone FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;
    const timezone = userResult.rows[0].timezone || "America/Los_Angeles";
    const cgResult = await client.query('SELECT interval FROM caregivers WHERE user_id = $1', [userId]);
    const interval = cgResult.rows[0]?.interval || 24;
    const now = DateTime.now().setZone(timezone);
    const intervalStartHour = Math.floor(now.hour / interval) * interval;
    const intervalStart = now.set({ hour: intervalStartHour, minute: 0, second: 0, millisecond: 0 });
    const intervalEnd = intervalStart.plus({ hours: interval });
    const intervalStartUTC = intervalStart.toUTC().toISO();
    const intervalEndUTC = intervalEnd.toUTC().toISO();
    const checkinResult = await client.query(
      `SELECT 1 FROM history WHERE user_id = $1 AND event_type = 'checkin' AND created_at >= $2 AND created_at < $3`,
      [userId, intervalStartUTC, intervalEndUTC]
    );
    client.release();
    res.json({
      checkedIn: checkinResult.rows.length > 0,
      nextIntervalStart: intervalEnd.setZone(timezone).toISO(),
      intervalStart: intervalStart.setZone(timezone).toISO(),
      intervalEnd: intervalEnd.setZone(timezone).toISO(),
      intervalHours: interval
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
} 