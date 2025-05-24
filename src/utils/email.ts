import nodemailer from "nodemailer";
import crypto from "crypto";
import { prisma } from "../lib/prisma";

// Validate email configuration
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error("Missing email configuration. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.");
}

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
transporter.verify(function (error, success) {
  if (error) {
    console.error("Email transporter verification failed:", error);
  } else {
    console.log("Email transporter is ready to send messages");
  }
});

export const generateEmailToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const sendVerificationEmail = async (userId: string, caregiverEmail: string, caregiverName: string) => {
  console.log("Starting email verification process for:", { userId, caregiverEmail, caregiverName });
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error("Email configuration is missing. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.");
  }

  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not set in environment variables.");
  }

  // Create a new transporter instance for each email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    secure: true,
    port: 465,
  });

  const token = generateEmailToken();
  console.log("Generated verification token");
  
  try {
    // Save the token to the database
    await prisma.user.update({
      where: { id: userId },
      data: { caregiverEmailToken: token }
    });
    console.log("Token saved to database");

    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/verify-caregiver-email?token=${token}`;
    console.log("Verification URL generated:", verificationUrl);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: caregiverEmail,
      subject: "Verify your email address - Still Okay",
      text: `Hello ${caregiverName},\n\nPlease verify your email address by clicking the following link:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nStill Okay`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify your email address</h2>
          <p>Hello ${caregiverName},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <p>Best regards,<br>Still Okay</p>
        </div>
      `,
    };

    console.log("Attempting to send email to:", caregiverEmail);
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    
    return token;
  } catch (error) {
    console.error("Error in sendVerificationEmail:", error);
    throw error;
  }
}; 