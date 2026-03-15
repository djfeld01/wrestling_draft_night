import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    // Auth code flow uses email+password under the hood:
    // player ID as email, auth code as password
    minPasswordLength: 6,
    maxPasswordLength: 128,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        // For MVP, log the magic link to console.
        // In production, integrate with an email service.
        console.log(`[Magic Link] To: ${email}, URL: ${url}, Token: ${token}`);
      },
      expiresIn: 60 * 10, // 10 minutes
    }),
    nextCookies(),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});

export type Session = typeof auth.$Infer.Session;
