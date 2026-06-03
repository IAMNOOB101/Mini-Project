import pdfParse from "pdf-parse";

/**
 * Parse PDF resume and extract text
 */
export const parseResume = async (fileBuffer) => {
  try {
    if (!fileBuffer) {
      console.warn("No file buffer provided to parseResume");
      return "";
    }

    console.log("📄 Parsing resume, buffer size:", fileBuffer.length);

    // Parse PDF
    const data = await pdfParse(fileBuffer);
    const text = data.text || "";

    console.log("✅ Resume parsed successfully, extracted text length:", text.length);

    if (!text || text.trim().length === 0) {
      console.warn("⚠️ PDF parsed but no text extracted");
      return "";
    }

    return text;
  } catch (error) {
    console.error("❌ PDF parsing error:", error.message);
    // Return empty string instead of throwing
    return "";
  }
};

/**
 * Extract structured information from resume text
 */
export const extractResumeInfo = (text) => {
  try {
    if (!text || typeof text !== "string") {
      console.warn("No valid text to extract from");
      return getEmptyResumeInfo();
    }

    console.log("🔍 Extracting resume info from", text.length, "characters");

    const info = getEmptyResumeInfo();

    // Extract email
    const emailMatch = text.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    if (emailMatch) {
      info.email = emailMatch[0];
    }

    // Extract phone
    const phoneMatch = text.match(
      /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/
    );
    if (phoneMatch) {
      info.phone = phoneMatch[0];
    }

    // Extract skills
    const skillKeywords = [
      "javascript",
      "typescript",
      "python",
      "java",
      "c++",
      "c#",
      "go",
      "rust",
      "php",
      "ruby",
      "react",
      "vue",
      "angular",
      "node",
      "nodejs",
      "express",
      "django",
      "flask",
      "spring",
      "mongodb",
      "postgresql",
      "mysql",
      "sql",
      "docker",
      "kubernetes",
      "aws",
      "azure",
      "gcp",
      "git",
      "html",
      "css",
      "sass",
      "tailwind",
      "rest",
      "graphql",
      "redis",
      "elasticsearch",
      "jenkins",
      "gitlab",
      "github",
      "firebase",
      "heroku",
    ];

    const textLower = text.toLowerCase();
    const foundSkills = new Set();

    skillKeywords.forEach((skill) => {
      if (textLower.includes(skill.toLowerCase())) {
        foundSkills.add(skill);
      }
    });

    info.skills = Array.from(foundSkills);

    // Extract domain
    const domainKeywords = {
      "Software Engineering": [
        "software engineer",
        "developer",
        "programmer",
        "software development",
        "full stack",
      ],
      "Frontend Development": [
        "frontend",
        "react",
        "vue",
        "angular",
        "ui/ux",
        "web design",
        "web developer",
      ],
      "Backend Development": [
        "backend",
        "server",
        "api",
        "database",
        "nodejs",
        "django",
        "spring",
      ],
      "Data Science": [
        "data science",
        "machine learning",
        "python",
        "tensorflow",
        "pandas",
        "analytics",
      ],
      DevOps: ["devops", "kubernetes", "docker", "ci/cd", "aws", "cloud"],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some((keyword) => textLower.includes(keyword.toLowerCase()))) {
        info.domain = domain;
        break;
      }
    }

    console.log("✅ Resume info extracted:", {
      hasEmail: !!info.email,
      hasPhone: !!info.phone,
      skillsCount: info.skills.length,
      domain: info.domain,
    });

    return info;
  } catch (error) {
    console.error("❌ Resume extraction error:", error.message);
    return getEmptyResumeInfo();
  }
};

/**
 * Get empty resume info object
 */
function getEmptyResumeInfo() {
  return {
    name: null,
    email: null,
    phone: null,
    skills: [],
    experience: [],
    education: [],
    domain: null,
  };
}