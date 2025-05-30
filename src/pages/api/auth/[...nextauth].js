import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log("NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET);

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      // Insert user into DB if not exists
      try {
        const client = await pool.connect();
        const result = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );
        if (result.rows.length === 0) {
          await client.query(
            'INSERT INTO users (name, email, image) VALUES ($1, $2, $3)',
            [user.name, user.email, user.image]
          );
        }
        client.release();
      } catch (err) {
        console.error('Error inserting user:', err);
        // Optionally, return false to block sign-in on DB error
        // return false;
      }
      return true;
    },
    async session({ session, token }) {
      // Add user id to session if needed
      session.user.id = token.sub;
      return session;
    },
  },
}); 