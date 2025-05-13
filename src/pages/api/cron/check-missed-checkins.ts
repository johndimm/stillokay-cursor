import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

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

  // Send email notifications to caregivers
  for (const user of users) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email, // Send to user's email for testing
        subject: `Test Notification for ${user.name}`,
        text: `Don't be alarmed. ${user.name} has identified you as their caregiver. This is only a test message to see how it all works. The message would be different if ${user.name} actually needs your help. Please contact ${user.name} at ${user.email} to let them know the test worked.`,
      });
    } catch (error) {
      console.error(`Failed to send email to ${user.email}:`, error);
    }
  }

  return res.json({ message: "Check completed", usersChecked: users.length });
} 