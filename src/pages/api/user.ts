import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("Starting user API request");
    console.log("Request headers:", req.headers);
    const session = await getServerSession(req, res, authOptions);
    console.log("Session:", session);

    if (!session) {
      console.log("No session found");
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "GET") {
      console.log("GET request for user:", session.user?.email);
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user?.email! },
        });
        console.log("Found user:", user);

        if (!user) {
          console.log("User not found");
          return res.status(404).json({ error: "User not found" });
        }

        return res.json({
          caregiverName: user.caregiverName,
          caregiverPhone: user.caregiverPhone,
          caregiverEmail: user.caregiverEmail,
          caregiverEmailVerified: user.caregiverEmailVerified,
          checkInInterval: user.checkInInterval,
        });
      } catch (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }
    }

    if (req.method === "POST") {
      console.log("POST request with body:", req.body);
      const { caregiverName, caregiverPhone, caregiverEmail, checkInInterval } = req.body;

      if (!caregiverName || !caregiverPhone || !caregiverEmail || !checkInInterval) {
        console.log("Missing required fields");
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        // Get current user data
        const currentUser = await prisma.user.findUnique({
          where: { email: session.user?.email! },
        });

        // If email is being changed, reset verification status
        const emailChanged = currentUser?.caregiverEmail !== caregiverEmail;
        
        // Prepare update data
        const updateData: Prisma.UserUpdateInput = {
          caregiverName,
          caregiverPhone,
          caregiverEmail,
          checkInInterval: Number(checkInInterval),
        };

        // Add verification reset if email changed
        if (emailChanged) {
          updateData.caregiverEmailVerified = false;
          updateData.caregiverEmailToken = null;
        }

        const user = await prisma.user.upsert({
          where: { email: session.user?.email! },
          update: updateData,
          create: {
            email: session.user?.email!,
            name: session.user?.name!,
            caregiverName,
            caregiverPhone,
            caregiverEmail,
            caregiverEmailVerified: false,
            checkInInterval: Number(checkInInterval),
          },
        });
        console.log("Created/updated user:", user);

        return res.json({
          caregiverName: user.caregiverName,
          caregiverPhone: user.caregiverPhone,
          caregiverEmail: user.caregiverEmail,
          caregiverEmailVerified: user.caregiverEmailVerified,
          checkInInterval: user.checkInInterval,
        });
      } catch (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Detailed error in user API:", error);
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