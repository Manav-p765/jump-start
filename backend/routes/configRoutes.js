import express from "express";
import {
  getPublicConfig,
  getPublicSupportPages,
  getPublicPackageSections,
  getPublicSectionQuestions,
  getAdminConfig,
  getAdminTranslations,
  putAdminQuestionTranslation,
  putAdminSupportPages,
  postAdminPackage,
  putAdminPackage,
  deleteAdminPackage,
  putAdminPackageSections,
  postSyncSectionFromGoogleSheet,
} from "../controllers/configController.js";
import { adminOnly, protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/public/config", getPublicConfig);
router.get("/public/support-pages", getPublicSupportPages);
router.get("/public/packages/:packageId/sections", protect, getPublicPackageSections);
router.get("/public/packages/:packageId/sections/:sectionId/questions", protect, getPublicSectionQuestions);

router.use("/admin", protect, adminOnly);
router.get("/admin/config", getAdminConfig);
// Translation panel — list + single-question update endpoints.
router.get("/admin/translations", getAdminTranslations);
router.put("/admin/questions/:questionId/translate", putAdminQuestionTranslation);
router.put("/admin/support-pages", putAdminSupportPages);
router.post("/admin/packages", postAdminPackage);
router.put("/admin/packages/:packageId", putAdminPackage);
router.delete("/admin/packages/:packageId", deleteAdminPackage);
router.put("/admin/packages/:packageId/sections", putAdminPackageSections);
router.post("/admin/packages/:packageId/sections/:sectionId/sync-google-sheet", postSyncSectionFromGoogleSheet);

export default router;
