import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
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
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        userId: user.id,
      },
    });

    return res.json(checkIn);
  } catch (error) {
    console.error("Error in check-in API:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
} 