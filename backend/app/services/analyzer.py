import re

from app.utils.resume_keywords import (
    SKILLS,
    EDUCATION_KEYWORDS,
    EXPERIENCE_KEYWORDS,
    PROJECT_KEYWORDS,
    CERTIFICATION_KEYWORDS,
)


def find_keywords(text: str, keywords: list[str]) -> list[str]:
    """
    Find keywords present in the resume text
    while reducing false-positive substring matches.
    """

    text = text.lower()

    found = []

    for keyword in keywords:
        keyword = keyword.lower().strip()

        # Escape special regex characters such as +, ., etc.
        pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"

        if re.search(pattern, text):
            found.append(keyword)

    return found


def analyze_resume(text: str) -> dict:
    """
    Analyze resume text and extract important keywords.
    """

    skills = find_keywords(text, SKILLS)

    education = find_keywords(
        text,
        EDUCATION_KEYWORDS
    )

    experience = find_keywords(
        text,
        EXPERIENCE_KEYWORDS
    )

    projects = find_keywords(
        text,
        PROJECT_KEYWORDS
    )

    certifications = find_keywords(
        text,
        CERTIFICATION_KEYWORDS
    )

    return {
        "skills": skills,
        "education": education,
        "experience": experience,
        "projects": projects,
        "certifications": certifications,
    }