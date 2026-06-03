import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./UserProfile.css";

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [resumeFile, setResumeFile] = useState(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    domain: "",
    role: "",
    experience: "",
    skills: "",
    education: "",
    bio: "",
    desiredSalary: "",
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/user/profile");
      setUser(response.data.data);

      // If resume data exists, auto-fill form
      if (response.data.data.resumeData) {
        console.log("📄 Resume data found, auto-filling form...");
        const filledData = {
          ...response.data.data,
          // Pre-fill from resume data
          skills: response.data.data.resumeData.skills?.join(", ") ||
                  response.data.data.skills || "",
          domain: response.data.data.resumeData.domain ||
                  response.data.data.domain || "",
          phone: response.data.data.resumeData.phone ||
                 response.data.data.phone || "",
          email: response.data.data.resumeData.email ||
                 response.data.data.email || "",
        };
        setFormData(filledData);
      } else {
        setFormData(response.data.data);
      }

      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setError("❌ Only PDF files allowed");
        setResumeFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("❌ File must be less than 5MB");
        setResumeFile(null);
        return;
      }
      setResumeFile(file);
      setError("");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      // If resume file is selected, upload it with form data
      if (resumeFile) {
        const uploadFormData = new FormData();

        // Add all text fields
        Object.keys(formData).forEach((key) => {
          if (formData[key] !== null && formData[key] !== undefined) {
            uploadFormData.append(key, formData[key]);
          }
        });

        // Add resume file
        uploadFormData.append("resume", resumeFile);

        const response = await api.put("/user/profile", uploadFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setUser(response.data.data);
        setSuccess("✅ Profile and resume updated successfully!");
        setIsEditing(false);
        setResumeFile(null);

        // Refresh to show parsed resume data
        await fetchUserProfile();

        setTimeout(() => setSuccess(""), 3000);
      } else {
        // No resume file, just update text fields
        const response = await api.put("/user/profile", formData);
        setUser(response.data.data);
        setSuccess("✅ Profile updated successfully!");
        setIsEditing(false);

        // Refresh to show updates
        await fetchUserProfile();

        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("❌ " + (err.response?.data?.message || "Failed to update profile"));
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    const password = prompt("Enter your password to disable 2FA:");
    if (!password) return;

    try {
      setSaving(true);
      setError("");
      await api.post("/user/profile/disable-2fa", { password });
      setSuccess("✅ 2FA disabled successfully!");
      fetchUserProfile();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("❌ Failed to disable 2FA");
      console.error("Disable 2FA error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setSaving(true);
      setError("");
      await api.delete("/user/profile", {
        data: { password: deletePassword },
      });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    } catch (err) {
      setError("❌ " + (err.response?.data?.message || "Failed to delete account"));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-wrapper">
        {/* Header */}
        <div className="profile-header">
          <div className="header-content">
            <div className="profile-avatar-large">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div>
              <h1 className="profile-title">{user?.firstName} {user?.lastName}</h1>
              <p className="profile-email">{user?.email}</p>
              <span className={`profile-badge ${user?.accountType}`}>
                {user?.accountType === "professional" && "👨‍💼 Professional"}
                {user?.accountType === "student" && "🎓 Student"}
                {user?.accountType === "admin" && "⚙️ Admin"}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="close-btn"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Profile Card */}
        <div className="profile-card">
          {/* Edit Button */}
          <div className="profile-actions">
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={saving}
              className={`btn btn-primary ${saving ? 'loading' : ''}`}
            >
              {saving ? "Saving..." : isEditing ? "💾 Save Changes" : "✏️ Edit Profile"}
            </button>
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData(user);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Form Grid */}
          <div className="form-grid">
            {/* First Name */}
            <div className="form-group">
              <label>First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="form-input"
                />
              ) : (
                <p className="form-value">{user?.firstName || "—"}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label>Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="form-input"
                />
              ) : (
                <p className="form-value">{user?.lastName || "—"}</p>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email Address</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                />
              ) : (
                <p className="form-value">{user?.email || "—"}</p>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label>Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your phone number"
                />
              ) : (
                <p className="form-value">{user?.phone || "—"}</p>
              )}
            </div>

            {/* Domain */}
            <div className="form-group">
              <label>Domain / Field</label>
              {isEditing ? (
                <select
                  name="domain"
                  value={formData.domain || ""}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  <option value="">Select Domain</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Frontend Development">Frontend Development</option>
                  <option value="Backend Development">Backend Development</option>
                  <option value="Full Stack Development">Full Stack Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="DevOps">DevOps</option>
                </select>
              ) : (
                <p className="form-value">{user?.domain || "—"}</p>
              )}
            </div>

            {/* Role */}
            <div className="form-group">
              <label>Desired Role</label>
              {isEditing ? (
                <input
                  type="text"
                  name="role"
                  value={formData.role || ""}
                  onChange={handleInputChange}
                  className="form-input"
                />
              ) : (
                <p className="form-value">{user?.role || "—"}</p>
              )}
            </div>

            {/* Experience */}
            <div className="form-group">
              <label>Years of Experience</label>
              {isEditing ? (
                <input
                  type="number"
                  name="experience"
                  value={formData.experience || ""}
                  onChange={handleInputChange}
                  className="form-input"
                />
              ) : (
                <p className="form-value">{user?.experience || "—"}</p>
              )}
            </div>

            {/* Salary */}
            <div className="form-group">
              <label>Expected Salary (LPA)</label>
              {isEditing ? (
                <input
                  type="number"
                  name="desiredSalary"
                  value={formData.desiredSalary || ""}
                  onChange={handleInputChange}
                  className="form-input"
                />
              ) : (
                <p className="form-value">{user?.desiredSalary || "—"}</p>
              )}
            </div>

            {/* Education - Full Width */}
            <div className="form-group full-width">
              <label>Education</label>
              {isEditing ? (
                <input
                  type="text"
                  name="education"
                  value={formData.education || ""}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., B.Tech in Computer Science"
                />
              ) : (
                <p className="form-value">{user?.education || "—"}</p>
              )}
            </div>

            {/* Skills - Full Width */}
            <div className="form-group full-width">
              <label>Skills (comma-separated)</label>
              {isEditing ? (
                <textarea
                  name="skills"
                  value={formData.skills || ""}
                  onChange={handleInputChange}
                  className="form-input"
                  rows="3"
                  placeholder="e.g., JavaScript, React, Node.js"
                />
              ) : (
                <p className="form-value">{user?.skills || "—"}</p>
              )}
            </div>

            {/* Bio - Full Width */}
            <div className="form-group full-width">
              <label>About You</label>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={formData.bio || ""}
                  onChange={handleInputChange}
                  className="form-input"
                  rows="4"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="form-value">{user?.bio || "—"}</p>
              )}
            </div>
          </div>

          {/* Resume Section - Full Width */}
          <div className="resume-section">
            <h3>📄 Resume</h3>
            <div className="resume-upload-area">
              {user?.resumeURL ? (
                <div className="resume-uploaded">
                  <p>✅ Resume uploaded</p>
                  <a
                    href={user.resumeURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resume-link"
                  >
                    View Resume
                  </a>
                  {isEditing && (
                    <label className="upload-label">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleResumeChange}
                        style={{ display: "none" }}
                      />
                      <span className="upload-btn">📤 Replace Resume</span>
                    </label>
                  )}
                </div>
              ) : (
                <div className="resume-upload-placeholder">
                  <p>No resume uploaded yet</p>
                  {isEditing && (
                    <label className="upload-label">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleResumeChange}
                        style={{ display: "none" }}
                      />
                      <span className="upload-btn">📤 Upload Resume</span>
                    </label>
                  )}
                </div>
              )}
              {resumeFile && (
                <p className="resume-file-selected">
                  ✅ {resumeFile.name} selected
                </p>
              )}
            </div>
          </div>

          {/* 2FA Management Section - MOVED OUTSIDE DANGER ZONE */}
          <div className="twofa-section">
            <h3>🔐 Two-Factor Authentication</h3>

            {user?.totpEnabled ? (
              <div className="twofa-enabled">
                <p className="text-green-600 font-semibold">✅ 2FA is enabled</p>
                <p className="text-gray-600 text-sm mb-4">
                  Your account is protected with two-factor authentication
                </p>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to disable 2FA?")) {
                      handleDisable2FA();
                    }
                  }}
                  className="btn btn-secondary"
                >
                  🔓 Disable 2FA
                </button>
              </div>
            ) : (
              <div className="twofa-disabled">
                <p className="text-orange-600 font-semibold">⚠️ 2FA is not enabled</p>
                <p className="text-gray-600 text-sm mb-4">
                  Enable 2FA for better security
                </p>
                <button
                  onClick={() => alert("Enable 2FA during signup or re-register")}
                  className="btn btn-primary"
                >
                  🔒 Enable 2FA
                </button>
              </div>
            )}
          </div>

          {/* Danger Zone - NOW SEPARATE */}
          <div className="danger-zone">
            <h3>⚠️ Danger Zone</h3>

            {!deleteMode ? (
              <button
                onClick={() => setDeleteMode(true)}
                className="btn btn-danger"
              >
                🗑️ Delete Account
              </button>
            ) : (
              <div className="delete-confirmation">
                <p>This action cannot be undone. Enter your password:</p>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="form-input"
                />
                <div className="btn-group">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={!deletePassword || saving}
                    className="btn btn-danger"
                  >
                    {saving ? "Deleting..." : "Permanently Delete"}
                  </button>
                  <button
                    onClick={() => {
                      setDeleteMode(false);
                      setDeletePassword("");
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
