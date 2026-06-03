import { User } from "../db/index.js";
import bcrypt from "bcryptjs";
import cloudinary from "cloudinary";
import { parseResume, extractResumeInfo } from "../services/resumeParser.js";

/**
 * Get user profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ["password", "totpSecret"],
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update user profile with optional resume upload
 */
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      email,
      phone,
      domain,
      role,
      experience,
      skills,
      education,
      bio,
      desiredSalary,
    } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if new email is already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    // Update text fields
    if (firstName !== undefined && firstName !== null) user.firstName = firstName;
    if (lastName !== undefined && lastName !== null) user.lastName = lastName;
    if (email !== undefined && email !== null) user.email = email;
    if (phone !== undefined && phone !== null) user.phone = phone;
    if (domain !== undefined && domain !== null) user.domain = domain;
    if (role !== undefined && role !== null) user.role = role;
    if (experience !== undefined && experience !== null) user.experience = experience;
    if (skills !== undefined && skills !== null) user.skills = skills;
    if (education !== undefined && education !== null) user.education = education;
    if (bio !== undefined && bio !== null) user.bio = bio;
    if (desiredSalary !== undefined && desiredSalary !== null) user.desiredSalary = desiredSalary;

    // Handle resume file upload if provided
    if (req.file) {
      try {
        console.log("📤 Uploading resume...");

        // Upload to Cloudinary
        const uploadResponse = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.v2.uploader.upload_stream(
            {
              resource_type: "raw",
              folder: "resumes",
              public_id: `resume_${userId}_${Date.now()}`,
            },
            (error, result) => {
              if (error) {
                console.error("❌ Cloudinary upload error:", error);
                reject(error);
              } else {
                console.log("✅ Cloudinary upload successful");
                resolve(result);
              }
            }
          );

          uploadStream.on("error", (err) => {
            console.error("❌ Stream error:", err);
            reject(err);
          });

          uploadStream.end(req.file.buffer);
        });

        // Update resume URL
        user.resumeURL = uploadResponse.secure_url;
        console.log("📄 Resume URL saved:", user.resumeURL);

        // Try to parse resume (non-blocking)
        try {
          const resumeText = await parseResume(req.file.buffer);

          if (resumeText && resumeText.length > 0) {
            const resumeData = extractResumeInfo(resumeText);
            user.resumeData = resumeData;
            console.log("✅ Resume parsed successfully");
          } else {
            console.log("⚠️ Resume parsed but no text extracted");
          }
        } catch (parseErr) {
          console.log("⚠️ Resume parsing skipped (non-blocking):", parseErr.message);
          // Don't fail the entire request if parsing fails
        }
      } catch (uploadErr) {
        console.error("❌ Resume upload error:", uploadErr);
        return res.status(400).json({
          message: "Failed to upload resume",
          error: uploadErr.message,
        });
      }
    }

    // Sync top-level convenience fields into the interviewProfile JSONB
    // so session.controller.js can read profile.domain / profile.experienceLevel
    const currentProfile = user.interviewProfile || {};
    user.interviewProfile = {
      ...currentProfile,
      domain: user.domain ?? currentProfile.domain,
      experienceLevel: user.experience ?? currentProfile.experienceLevel,
      role: user.role ?? currentProfile.role,
      salaryRange: user.desiredSalary ?? currentProfile.salaryRange,
    };

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Disable two-factor authentication
 */
export const disableTwoFactor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password required" });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Disable 2FA
    user.totpSecret = null;
    user.totpEnabled = false;
    await user.save();

    res.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete user account
 */
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ message: "Password required to delete account" });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Clear 2FA before deleting
    user.totpSecret = null;
    user.totpEnabled = false;
    await user.save();

    // Delete user
    await user.destroy();

    res.json({
      success: true,
      message: "Account and all authentication methods deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: error.message });
  }
};