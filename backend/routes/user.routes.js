import express from "express";
import multer from "multer";
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  disableTwoFactor,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(verifyToken);

// Get user profile
router.get("/profile", getUserProfile);

// Post user Profile
router.post("/profile/disable-2fa", disableTwoFactor);

// Update user profile (with optional resume file)
router.put("/profile", upload.single("resume"), updateUserProfile);

// Delete account
router.delete("/profile", deleteUserAccount);

export default router;