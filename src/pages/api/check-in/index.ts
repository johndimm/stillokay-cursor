import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("Check-in API: Request headers:", req.headers);
    const session = await getServerSession(req, res, authOptions);
    console.log("Check-in API: Session:", session);

    if (!session) {
      console.log("Check-in API: No session found");
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "POST") {
      console.log("Check-in API: Processing POST request for user:", session.user?.email);
      const user = await prisma.user.findUnique({
        where: { email: session.user?.email! },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastCheckIn = await prisma.checkIn.findFirst({
        where: {
          userId: user.id,
          createdAt: {
            gte: today,
          },
        },
      });

      if (lastCheckIn) {
        return res.status(400).json({ error: "Already checked in today" });
      }

      const checkIn = await prisma.checkIn.create({
        data: {
          userId: user.id,
        },
      });

      return res.json(checkIn);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in check-in API:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 