import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { sendWelcomeEmail } from "../services/emailService.js";

const googleClientIds = (process.env.GOOGLE_CLIENT_ID || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const googleClient = googleClientIds.length > 0 ? new OAuth2Client() : null;

// Prompt-9 Fix 1: include the user's Jumpstart ID in the JWT payload
// alongside the Mongo id. Lets request handlers and middleware read
// the human-readable id without a DB hit. The id (Mongo _id) remains
// the canonical authentication subject — jumpstartId is informational.
const signToken = (id, jumpstartId = "") =>
  jwt.sign({ id, jumpstartId }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/v1/user/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, password_confirmation, mobile } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      mobile: (mobile || "").toString().trim(),
    });

    // Fire-and-forget: a mail failure must never fail the signup.
    sendWelcomeEmail(user);

    // Prompt-9 Fix 1: surface the freshly-assigned Jumpstart ID in the
    // signup response so the frontend can show it on a welcome screen
    // without waiting for the first login round-trip.
    return res.status(201).json({
      success: true,
      message: "Signup successful!",
      data: {
        jumpstartId: user.jumpstartId || "",
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Signup failed",
    });
  }
};

// POST /api/v1/user/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        msg: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "Invalid email or password",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        msg: "Please sign in with Google",
      });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({
        success: false,
        msg: "Invalid email or password",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        msg: "Your account is suspended. Please contact support.",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id, user.jumpstartId || "");
    const userObj = user.toAuthJSON();

    return res.status(200).json({
      success: true,
      data: {
        user: userObj,
        auth_token: token,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      msg: err.message || "Login failed",
    });
  }
};

// POST /api/v1/user/auth/social-login
export const socialLogin = async (req, res) => {
  try {
    const { provider, token: idToken } = req.body;

    if (provider !== "google" || !idToken) {
      return res.status(400).json({
        success: false,
        msg: "Provider and token are required",
      });
    }

    if (!googleClient) {
      return res.status(503).json({
        success: false,
        msg: "Google login is not configured",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientIds,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = (payload.email || "").toLowerCase();
    const name = payload.name || payload.email || "User";
    const avatar = payload.picture || null;

    if (!email) {
      return res.status(400).json({
        success: false,
        msg: "Google account must have an email",
      });
    }

    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      if (user.isSuspended) {
        return res.status(403).json({
          success: false,
          msg: "Your account is suspended. Please contact support.",
        });
      }

      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = avatar;
        if (!user.name) user.name = name;
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
        password: null,
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const authToken = signToken(user._id, user.jumpstartId || "");
    const userObj = user.toAuthJSON();

    return res.status(200).json({
      success: true,
      data: {
        user: userObj,
        auth_token: authToken,
      },
    });
  } catch (err) {
    console.error("Social login error:", err);

    if (err.message?.includes("Wrong recipient")) {
      return res.status(401).json({
        success: false,
        msg: "Google client ID mismatch. Make sure the frontend and backend use the same Google client ID and that your current origin is allowed in Google Cloud Console.",
      });
    }

    res.status(500).json({
      success: false,
      msg: err.message || "Google login failed",
    });
  }
};
