import { PrismaClient } from "@prisma/client";
import twilio from "twilio";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify the request is coming from our cron service
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all users who haven't checked in today
  const users = await prisma.user.findMany({
    where: {
      NOT: {
        checkIns: {
          some: {
            createdAt: {
              gte: today,
            },
          },
        },
      },
    },
  });

  // Send SMS notifications to caregivers
  for (const user of users) {
    try {
      await twilioClient.messages.create({
        body: `Don't be alarmed. ${user.name} has identified you as their caregiver. This is only a test message to see how it all works. The message would be different if ${user.name} actually needs your help. Please contact ${user.name} at ${user.email} to let them know the test worked.`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: user.caregiverPhone,
      });
    } catch (error) {
      console.error(`Failed to send SMS to ${user.caregiverPhone}:`, error);
    }
  }

  return res.json({ message: "Check completed", usersChecked: users.length });
} 