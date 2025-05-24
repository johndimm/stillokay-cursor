import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid token' });
  }

  try {
    // Find user with matching token
    const user = await prisma.user.findFirst({
      where: { caregiverEmailToken: token }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Update user's email verification status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        caregiverEmailVerified: true,
        caregiverEmailToken: null // Clear the token after verification
      }
    });

    // Redirect to settings page with success message
    res.redirect(302, '/settings?verified=true');
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
} 