import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from '../../../lib/prisma';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

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

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP configuration error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log('Starting email verification process');
    console.log('Environment variables:', {
      EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    });

    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      console.log('No session found');
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log('Session found for user:', session.user?.email);

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
    });

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.caregiverEmail) {
      console.log('No caregiver email set');
      return res.status(400).json({ error: "No caregiver email set" });
    }

    console.log('Sending verification email to:', user.caregiverEmail);

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // Token expires in 24 hours

    // Update user with token and expiry
    await prisma.$executeRaw`
      UPDATE "users"
      SET 
        "caregiver_email_token" = ${token},
        "caregiver_email_token_expiry" = ${expiry},
        "caregiver_email_verified" = false
      WHERE id = ${user.id}
    `;

    // Create verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;
    console.log('Verification URL:', verificationUrl);

    // Send verification email
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.caregiverEmail,
        subject: "Welcome to Still Okay - Please Verify Your Email",
        text: `Hello ${user.caregiverName},

Thank you for being a caregiver for ${user.name} on Still Okay. To verify your email address and start receiving notifications, please click the link below:

${verificationUrl}

This link will expire in 24 hours.

What is Still Okay?
Still Okay is a service that helps people stay connected with their caregivers. ${user.name} will check in periodically to let you know they're doing well. If they miss a check-in, you'll receive a notification.

Best regards,
Still Okay Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Still Okay</h2>
            <p>Hello ${user.caregiverName},</p>
            <p>Thank you for being a caregiver for ${user.name} on Still Okay. To verify your email address and start receiving notifications, please click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #666; font-size: 0.9em;">This link will expire in 24 hours.</p>
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <h3 style="color: #333;">What is Still Okay?</h3>
            <p>Still Okay is a service that helps people stay connected with their caregivers. ${user.name} will check in periodically to let you know they're doing well. If they miss a check-in, you'll receive a notification.</p>
            <p>Best regards,<br>Still Okay Team</p>
          </div>
        `,
      });
      console.log('Email sent successfully:', info);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }

    return res.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Error in email verification process:", error);
    return res.status(500).json({ 
      error: "Failed to send verification email",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 