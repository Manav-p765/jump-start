// Sends one branded test email through Resend.
// Usage: npm run email:test -- you@example.com
import "dotenv/config";
import { sendEmail } from "../services/emailService.js";

const to = process.argv[2];
if (!to) {
  console.error("Usage: npm run email:test -- you@example.com");
  process.exit(1);
}

const result = await sendEmail({
  to,
  subject: "Jumpstride test email",
  name: "Tester",
  heading: "Your email setup works",
  message: "This is a test of the Jumpstride branded email template.\nIf you can see the logo above, everything is wired up.",
  ctaText: "Open Jumpstride",
  ctaUrl: "/",
});
console.log(result);
