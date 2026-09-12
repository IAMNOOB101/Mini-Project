"""
resume_parser.py
Python port of resumeParser.js.
Extracts text from PDF resumes and parses structured info.
"""
import re
import logging
from io import BytesIO

logger = logging.getLogger(__name__)

SKILL_KEYWORDS = [
    "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust",
    "php", "ruby", "react", "vue", "angular", "node", "nodejs", "express",
    "django", "flask", "spring", "mongodb", "postgresql", "mysql", "sql",
    "docker", "kubernetes", "aws", "azure", "gcp", "git", "html", "css",
    "sass", "tailwind", "rest", "graphql", "redis", "elasticsearch",
    "jenkins", "gitlab", "github", "firebase", "heroku",
]

DOMAIN_KEYWORDS = {
    "Software Engineering": ["software engineer", "developer", "programmer", "software development", "full stack"],
    "Frontend Development": ["frontend", "react", "vue", "angular", "ui/ux", "web design", "web developer"],
    "Backend Development": ["backend", "server", "api", "database", "nodejs", "django", "spring"],
    "Data Science":        ["data science", "machine learning", "python", "tensorflow", "pandas", "analytics"],
    "DevOps":              ["devops", "kubernetes", "docker", "ci/cd", "aws", "cloud"],
}


def _empty_resume_info() -> dict:
    return {"name": None, "email": None, "phone": None, "skills": [], "experience": [], "education": [], "domain": None}


def parse_resume(file_buffer: bytes) -> str:
    """
    Extract text from a PDF buffer.
    Equivalent to parseResume() in resumeParser.js.
    Returns the extracted text string (empty string on failure).
    """
    try:
        if not file_buffer:
            logger.warning("No file buffer provided to parse_resume")
            return ""

        logger.info("📄 Parsing resume, buffer size: %d", len(file_buffer))

        # Try pypdf first
        try:
            from pypdf import PdfReader
            reader = PdfReader(BytesIO(file_buffer))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            # Fallback to pdfminer if available
            try:
                from pdfminer.high_level import extract_text as pdfminer_extract
                text = pdfminer_extract(BytesIO(file_buffer))
            except ImportError:
                logger.error("Neither pypdf nor pdfminer is installed")
                return ""

        if not text or not text.strip():
            logger.warning("⚠️ PDF parsed but no text extracted")
            return ""

        logger.info("✅ Resume parsed successfully, text length: %d", len(text))
        return text

    except Exception as exc:
        logger.error("❌ PDF parsing error: %s", exc)
        return ""


def extract_resume_info(text: str) -> dict:
    """
    Extract structured information from resume text.
    Equivalent to extractResumeInfo() in resumeParser.js.
    """
    try:
        if not text or not isinstance(text, str):
            logger.warning("No valid text to extract from")
            return _empty_resume_info()

        info = _empty_resume_info()
        text_lower = text.lower()

        # Extract email
        email_match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
        if email_match:
            info["email"] = email_match.group(0)

        # Extract phone
        phone_match = re.search(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", text)
        if phone_match:
            info["phone"] = phone_match.group(0)

        # Extract skills
        found_skills = set()
        for skill in SKILL_KEYWORDS:
            if skill.lower() in text_lower:
                found_skills.add(skill)
        info["skills"] = list(found_skills)

        # Extract domain
        for domain, keywords in DOMAIN_KEYWORDS.items():
            if any(kw.lower() in text_lower for kw in keywords):
                info["domain"] = domain
                break

        logger.info(
            "✅ Resume info extracted: email=%s phone=%s skills=%d domain=%s",
            bool(info["email"]), bool(info["phone"]), len(info["skills"]), info["domain"],
        )
        return info

    except Exception as exc:
        logger.error("❌ Resume extraction error: %s", exc)
        return _empty_resume_info()


def parse_resume_from_buffer(file_buffer: bytes) -> str:
    """Alias used by the public parse endpoint."""
    return parse_resume(file_buffer)
