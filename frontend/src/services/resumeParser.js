import pdfParse from "pdf-parse";

/**
 * Parse PDF resume and extract text
 */
export const parseResume = async (fileBuffer) => {
  try {
    if (!fileBuffer) {
      throw new Error("No file buffer provided");
    }

    // Parse PDF
    const data = await pdfParse(fileBuffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      throw new Error("No text extracted from PDF");
    }

    return text;
  } catch (error) {
    console.error("PDF parsing error:", error.message);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
};

/**
 * Extract structured information from resume text
 */
export const extractResumeInfo = (text) => {
  try {
    const info = {
      name: null,
      email: null,
      phone: null,
      skills: [],
      experience: [],
      education: [],
      domain: null,
    };

    // Extract email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      info.email = emailMatch[0];
    }

    // Extract phone
    const phoneMatch = text.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    if (phoneMatch) {
      info.phone = phoneMatch[0];
    }

    // Extract skills (common keywords)
    const skillKeywords = [
      "javascript",
      "python",
      "java",
      "c++",
      "react",
      "node",
      "express",
      "mongodb",
      "sql",
      "typescript",
      "docker",
      "kubernetes",
      "aws",
      "git",
      "html",
      "css",
      "vue",
      "angular",
      "django",
      "flask",
      "postgresql",
      "mysql",
      "redis",
      "elasticsearch",
    ];

    const textLower = text.toLowerCase();
    skillKeywords.forEach((skill) => {
      if (textLower.includes(skill)) {
        info.skills.push(skill);
      }
    });

    // Remove duplicates
    info.skills = [...new Set(info.skills)];

    // Extract domain based on keywords
    const domainKeywords = {
      "Software Engineering": [
        "software engineer",
        "developer",
        "programmer",
        "software development",
      ],
      "Frontend Development": [
        "frontend",
        "react",
        "vue",
        "angular",
        "ui/ux",
        "web design",
      ],
      "Backend Development": [
        "backend",
        "server",
        "api",
        "database",
        "nodejs",
        "django",
      ],
      "Data Science": ["data science", "machine learning", "python", "tensorflow", "pandas"],
      DevOps: ["devops", "kubernetes", "docker", "ci/cd", "aws", "cloud"],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some((keyword) => textLower.includes(keyword))) {
        info.domain = domain;
        break;
      }
    }

    return info;
  } catch (error) {
    console.error("Resume extraction error:", error);
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
};