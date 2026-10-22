// Sends the REAL welcome email (same content signup sends) with sample
// student details, e.g. to show a client what users will receive.
// Usage: npm run email:preview -- someone@example.com ["Student Name"]
import "dotenv/config";
import { sendEmail, welcomeEmail } from "../services/emailService.js";

const [to, name = "Aarav Patel"] = process.argv.slice(2);
if (!to) {
  console.error('Usage: npm run email:preview -- someone@example.com ["Student Name"]');
  process.exit(1);
}

const sample = {
  _id: `preview-${Date.now()}`,
  email: to,
  name,
  jumpstartId: `JS-${new Date().getFullYear()}-00042`,
};
console.log(await sendEmail(welcomeEmail(sample)));
