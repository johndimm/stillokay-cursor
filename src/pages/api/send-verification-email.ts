import type { NextApiRequest, NextApiResponse } from "next";
import { sendVerificationEmail } from "../../utils/email";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("Request body:", req.body);
  const { userId, caregiverEmail, caregiverName } = req.body;
  console.log("Extracted fields:", { userId, caregiverEmail, caregiverName });

  if (!userId || !caregiverEmail || !caregiverName) {
    const missingFields = [];
    if (!userId) missingFields.push('userId');
    if (!caregiverEmail) missingFields.push('caregiverEmail');
    if (!caregiverName) missingFields.push('caregiverName');
    console.error("Missing required fields:", missingFields);
    return res.status(400).json({ 
      error: "Missing required fields", 
      missingFields,
      receivedData: req.body 
    });
  }

  try {
    console.log("Attempting to send verification email...");
    await sendVerificationEmail(userId, caregiverEmail, caregiverName);
    console.log("Verification email sent successfully");
    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Failed to send verification email:", error);
    res.status(500).json({ error: "Failed to send verification email", details: error.message });
  }
} 