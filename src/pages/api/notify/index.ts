import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from '../../../lib/prisma';
import nodemailer from 'nodemailer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Find users who haven't checked in within their interval
    const users = await prisma.user.findMany({
      include: {
        checkIns: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    for (const user of users) {
      const lastCheckIn = user.checkIns[0]?.createdAt;
      const now = new Date();
      
      if (!lastCheckIn) {
        // No check-ins yet, send notification
        await sendNotification(transporter, user);
        continue;
      }

      const nextCheckIn = new Date(lastCheckIn);
      nextCheckIn.setHours(nextCheckIn.getHours() + user.checkInInterval);

      if (now >= nextCheckIn) {
        // User hasn't checked in within their interval, send notification
        await sendNotification(transporter, user);
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error in notification API:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function sendNotification(transporter: nodemailer.Transporter, user: any) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: user.caregiverEmail,
    subject: `Still Okay - No Check-in from ${user.name}`,
    text: `Hello ${user.caregiverName},\n\n${user.name} has not checked in within their ${user.checkInInterval}-hour interval. Please check on them.\n\nBest regards,\nStill Okay`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Still Okay - No Check-in from ${user.name}</h2>
        <p>Hello ${user.caregiverName},</p>
        <p>${user.name} has not checked in within their ${user.checkInInterval}-hour interval. Please check on them.</p>
        <p>Best regards,<br>Still Okay</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
} 