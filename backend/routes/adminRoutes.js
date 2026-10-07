import express from "express";
import { adminOnly, protect } from "../middleware/auth.js";
import {
  getAdminDashboard,
  getAdminNotifications,
  getAdminUsers,
  patchAdminUser,
  deleteAdminUser,
  getAdminPayments,
  getAdminSubmissions,
  getAdminSubmissionDetail,
  getAdminResults,
  getAdminStudentReportView,
  getAdminAnalytics,
  getAdminVitalsSummary,
  approveAdminResult,
  deleteAdminResult,
  getManualReviewItems,
  submitManualDecision,
  finalizeManualReview,
  listCoupons,
  createCoupon,
  toggleCoupon,
  deleteCoupon,
} from "../controllers/adminController.js";
import { getAdminPaymentReceipt } from "../controllers/paymentController.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/dashboard", getAdminDashboard);
router.get("/notifications", getAdminNotifications);
router.get("/users", getAdminUsers);
router.patch("/users/:userId", patchAdminUser);
router.delete("/users/:userId", deleteAdminUser);
router.get("/payments", getAdminPayments);
// PDF receipt for any captured payment (:id = Payment._id, from the row).
router.get("/payments/:id/receipt", getAdminPaymentReceipt);
router.get("/submissions", getAdminSubmissions);
router.get("/submissions/:reportId", getAdminSubmissionDetail);
router.get("/results", getAdminResults);
// Admin-only "view the student-facing report" — bypasses the
// publication-status gate that hides un-approved reports from the
// student's own /v1/user/results/:reportId endpoint. Used by the
// "View Student Report" button on the Review Submission page so
// counsellors can see exactly what the student will receive once
// the report is approved.
router.get("/results/:reportId/student-view", getAdminStudentReportView);
router.patch("/results/:reportId/approve", approveAdminResult);
router.delete("/results/:reportId", deleteAdminResult);
// Manual review queue for Section 4 image/diagram items. :reportId here is
// the same value used by /submissions/:reportId and /results/:reportId — the
// per-attempt assessmentReport sub-document id.
router.get("/results/:reportId/manual-review", getManualReviewItems);
router.patch(
  "/results/:reportId/manual-review/:questionId",
  submitManualDecision
);
router.post(
  "/results/:reportId/manual-review/complete",
  finalizeManualReview
);
router.get("/analytics", getAdminAnalytics);

// Core Web Vitals p75, fed by the public POST /api/vitals beacon.
// ?days=N (1-90, default 7) widens the window.
router.get("/vitals/summary", getAdminVitalsSummary);

// Coupons — admin-only CRUD. POST creates a new code, PATCH toggles
// active/inactive, DELETE removes (only safe before redemptions; deleting
// a redeemed coupon still preserves the trail on purchaseHistory because
// couponCode is stored as a snapshot string, not a foreign key).
router.get("/coupons", listCoupons);
router.post("/coupons", createCoupon);
router.patch("/coupons/:id", toggleCoupon);
router.delete("/coupons/:id", deleteCoupon);

export default router;
