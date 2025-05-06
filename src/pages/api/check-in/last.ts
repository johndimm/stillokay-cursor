import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("Starting last check-in API request");
    const session = await getServerSession(req, res, authOptions);
    console.log("Session:", session);

    if (!session) {
      console.log("No session found");
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "GET") {
      console.log("Getting user for email:", session.user?.email);
      const user = await prisma.user.findUnique({
        where: { email: session.user?.email! },
      });
      console.log("Found user:", user);

      if (!user) {
        console.log("User not found");
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Getting last check-in for user:", user.id);
      const lastCheckIn = await prisma.checkIn.findFirst({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      console.log("Last check-in:", lastCheckIn);

      return res.json({
        lastCheckIn: lastCheckIn?.createdAt || null,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Detailed error in last check-in API:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 