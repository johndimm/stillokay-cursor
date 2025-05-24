import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Find user with matching token and non-expired token
    const user = await prisma.$queryRaw`
      SELECT id, caregiver_email_token, caregiver_email_token_expiry
      FROM "users"
      WHERE 
        "caregiver_email_token" = ${token}
        AND "caregiver_email_token_expiry" > NOW()
    `;

    if (!user || !Array.isArray(user) || user.length === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Update user to mark email as verified and clear token
    await prisma.$executeRaw`
      UPDATE "users"
      SET 
        "caregiver_email_verified" = true,
        "caregiver_email_token" = NULL,
        "caregiver_email_token_expiry" = NULL
      WHERE id = ${user[0].id}
    `;

    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res.status(500).json({ error: "Failed to verify email" });
  }
} 