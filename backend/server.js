import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import connectDB from "./config/db.js";
import { ensureRequiredEnv } from "./config/env.js";
import { ensureAdminAccount } from "./utils/adminBootstrap.js";
import { isRazorpayConfigured } from "./config/razorpay.js";
import { isEmailConfigured } from "./services/emailService.js";
import { seedGujaratiPackage } from "./scripts/seedGujaratiPackage.mjs";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import paymentWebhookRoutes from "./routes/paymentWebhookRoutes.js";
import counsellingRoutes from "./routes/counsellingRoutes.js";
import vitalsRoutes from "./routes/vitals.js";

const PORT = process.env.PORT || 5000;

ensureRequiredEnv();

const parseAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.CORS_ALLOWED_ORIGINS,
  ]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...configuredOrigins,
  ]);
};

const allowedOrigins = parseAllowedOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};

const app = express();

// Trust the reverse proxy (Nginx/Caddy, then Cloudflare) so req.ip and
// req.protocol reflect the real client rather than 127.0.0.1. Rate
// limiting and secure-cookie decisions depend on this being right.
app.set("trust proxy", 1);

// gzip the JSON responses. Nginx compresses the static bundle, but API
// payloads are produced here and some are large — a full 500-question
// package or an assessment report is a few hundred KB of highly
// repetitive JSON that compresses to a fraction of that. Assessment
// fetches are on the critical path of the test experience, so this is a
// direct TTFB/transfer win on the slowest requests in the app.
//
// Nginx is configured to pass through what we emit rather than
// re-compressing (see deploy/nginx/jumpstart.conf).
app.use(compression());

app.use(cors(corsOptions));

// Mounted ahead of the global express.json() on purpose. The vitals
// route enforces its own 2 KB body cap, and a parser only applies to a
// body nothing upstream has already consumed — behind the global parser
// the cap would silently be the global 100 KB instead.
app.use("/api/vitals", vitalsRoutes);

// Also mounted ahead of the global express.json(), for a different but
// related reason: Razorpay signs the exact bytes it sends, so the webhook's
// HMAC must be computed over the RAW body. Behind the global parser the
// stream is already consumed and re-serialising it yields a different
// digest, so every signature check would fail. The router applies its own
// express.raw(). /order and /verify are ordinary JSON routes and stay
// mounted after the parser, below.
app.use("/api/v1/user/payment/webhook", paymentWebhookRoutes);

app.use(express.json());

// Root – so visiting http://localhost:5000/ shows API is up
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Jumpstart API is running",
    endpoints: {
      health: "GET /api/health",
      register: "POST /api/v1/user/auth/register",
      login: "POST /api/v1/user/auth/login",
      socialLogin: "POST /api/v1/user/auth/social-login",
      init: "GET /api/v1/user/init (Bearer token required)",
    },
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Jumpstart API running" });
});

// Mount routes under /api/v1/user
app.use("/api/v1/user/auth", authRoutes);
app.use("/api/v1/user/payment", paymentRoutes);
// Mounted BEFORE the generic /api/v1/user router, matching how paymentRoutes
// is ordered — a more specific prefix has to win before the broad one.
app.use("/api/v1/user/counselling", counsellingRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1", configRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, msg: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, msg: "Server error" });
});

const startServer = async () => {
  await connectDB();

  // Razorpay keys are intentionally NOT in config/env.js REQUIRED_ENV_VARS —
  // dev and staging boot without them and use ALLOW_FREE_PURCHASE instead.
  // Warn (never crash) when neither is configured, because that combination
  // means nobody can buy anything.
  if (
    process.env.ALLOW_FREE_PURCHASE !== "true" &&
    !isRazorpayConfigured()
  ) {
    console.warn(
      "[payments] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set and " +
        "ALLOW_FREE_PURCHASE is not \"true\" — package purchases will fail."
    );
  }

  // Separate check: the webhook secret is a DIFFERENT value from
  // RAZORPAY_KEY_SECRET (it is set in the Razorpay dashboard). Without it
  // the webhook rejects every delivery, so entitlement would depend solely
  // on the browser returning to /verify.
  if (
    process.env.ALLOW_FREE_PURCHASE !== "true" &&
    !String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim()
  ) {
    console.warn(
      "[payments] RAZORPAY_WEBHOOK_SECRET is not set — Razorpay webhooks " +
        "will be rejected. It differs from RAZORPAY_KEY_SECRET."
    );
  }
  if (!isEmailConfigured()) {
    console.warn(
      "[email] RESEND_API_KEY is not set — transactional emails (welcome " +
        "etc.) will be skipped."
    );
  }
  const adminStatus = await ensureAdminAccount();
  console.log(
    `Admin account ready for ${adminStatus.email}${
      adminStatus.created ? " (created)" : ""
    }`
  );

  // Auto-seed the Gujarati test package on boot so it's guaranteed to
  // exist in production without a manual seed step. Idempotent + insert-
  // only — after the first boot it's just a cheap presence check. Wrapped
  // so a seed hiccup logs but never blocks the API from coming up.
  try {
    const guStatus = await seedGujaratiPackage();
    console.log(
      guStatus.created
        ? "Gujarati package seeded (inserted)"
        : "Gujarati package already present"
    );
  } catch (seedError) {
    console.error(
      "Gujarati package auto-seed failed (continuing boot):",
      seedError.message
    );
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the existing process or change PORT in backend/.env.`
      );
      process.exit(1);
    }

    console.error("Server startup error:", error);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
