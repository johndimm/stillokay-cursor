import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const userEmail = session.user.email;
  try {
    const client = await pool.connect();
    const userResult = await client.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;
    const histResult = await client.query(
      'SELECT event_type, event_data, created_at FROM history WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    client.release();
    res.json({ events: histResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
} 