import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "../db";
import * as authSchema from "../db/auth-schema";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        console.log(`[Magic Link] sendMagicLink called for: ${email}`);
        console.log(`[Magic Link] URL: ${url}`);
        console.log(
          `[Magic Link] RESEND_API_KEY present: ${!!process.env.RESEND_API_KEY}`,
        );
        console.log(
          `[Magic Link] EMAIL_FROM: ${process.env.EMAIL_FROM || "Wrestling Draft <noreply@resend.dev>"}`,
        );
        try {
          const result = await resend.emails.send({
            from:
              process.env.EMAIL_FROM || "Wrestling Draft <noreply@resend.dev>",
            to: email,
            subject: "Your Wrestling Draft Login Link",
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #333;">Wrestling Draft Night</h2>
                <p>Click the link below to sign in to your draft session:</p>
                <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #333; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Sign in to Draft</a>
                <p style="color: #888; font-size: 13px;">This link expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
              </div>
            `,
          });
          console.log(`[Magic Link] Resend response:`, JSON.stringify(result));
        } catch (err) {
          console.error(`[Magic Link] Resend error:`, err);
          throw err;
        }
      },
      expiresIn: 60 * 10, // 10 minutes
    }),
    nextCookies(),
  ],
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});

export type Session = typeof auth.$Infer.Session;
