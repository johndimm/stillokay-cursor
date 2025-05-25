import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from '../../lib/prisma';
import nodemailer from 'nodemailer';

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Find users who haven't checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    for (const user of users) {
      const lastCheckIn = user.checkIns[0]?.createdAt;
      const interval = user.checkInInterval || 24;
      
      // Calculate reminder lead time
      const reminderMinutes = Math.min(interval * 10, 60);
      if (!lastCheckIn) {
        await sendReminderEmail(transporter, user);
      } else {
        const last = new Date(lastCheckIn);
        const now = new Date();
        const diffMs = now.getTime() - last.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        const intervalMinutes = interval * 60;
        // Send reminder if in the reminder window before due
        if (
          diffMinutes >= (intervalMinutes - reminderMinutes) &&
          diffMinutes < intervalMinutes
        ) {
          await sendReminderEmail(transporter, user);
        }
        // For daily (24h) interval, also send if not checked in today
        if (interval === 24 && (!lastCheckIn || lastCheckIn < today)) {
          await sendReminderEmail(transporter, user);
        }
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error in reminder API:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function sendReminderEmail(transporter: nodemailer.Transporter, user: any) {
  const checkInUrl = `${process.env.NEXTAUTH_URL}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Still Okay - Reminder to Check In",
    text: `Hello ${user.name},\n\nThis is a friendly reminder that you haven't checked in today. Please click the link below to check in:\n\n${checkInUrl}\n\nIf you don't check in by midnight, your caregiver will be notified.\n\nBest regards,\nStill Okay`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Still Okay - Reminder to Check In</h2>
        <p>Hello ${user.name},</p>
        <p>This is a friendly reminder that you haven't checked in today. Please click the button below to check in:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${checkInUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Check In Now</a>
        </div>
        <p style="color: #666;">If you don't check in by midnight, your caregiver will be notified.</p>
        <p>Best regards,<br>Still Okay</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
} 