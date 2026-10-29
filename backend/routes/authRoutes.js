import express from "express";
import { register, login, socialLogin } from "../controllers/authController.js";
import {
  loginAccountLimiter,
  loginIpLimiter,
  registerLimiter,
  socialLoginLimiter,
} from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginIpLimiter, loginAccountLimiter, login);
router.post("/social-login", socialLoginLimiter, socialLogin);

export default router;
