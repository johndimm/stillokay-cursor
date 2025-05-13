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
  secure: true,
  port: 465,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify the request is coming from our cron service
  /*
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
    */

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

  console.log("Found users who haven't checked in:", users);

  // Send email notifications to caregivers
  for (const user of users) {
    try {
      console.log(`Sending email to caregiver ${user.caregiverName} at ${user.caregiverEmail}`);
      
      if (!user.caregiverEmail) {
        console.error(`No caregiver email set for user ${user.name}`);
        continue;
      }

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.caregiverEmail,
        subject: `Still Okay - No Check-in from ${user.name}`,
        text: `Hello ${user.caregiverName},\n\n${user.name} has not checked in today. Please check on them.\n\nBest regards,\nStill Okay`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Still Okay - No Check-in from ${user.name}</h2>
            <p>Hello ${user.caregiverName},</p>
            <p>${user.name} has not checked in today. Please check on them.</p>
            <p>Best regards,<br>Still Okay</p>
          </div>
        `,
      });
      console.log(`Successfully sent email to ${user.caregiverEmail}`);
    } catch (error) {
      console.error(`Failed to send email to ${user.caregiverEmail}:`, error);
    }
  }

  return res.json({ message: "Check completed", usersChecked: users.length });
} 