import re

from app.utils.resume_keywords import (
    SKILLS,
    SKILL_ALIASES,
    EDUCATION_KEYWORDS,
    EXPERIENCE_KEYWORDS,
    PROJECT_KEYWORDS,
    CERTIFICATION_KEYWORDS,
)


def keyword_exists(text: str, keyword: str) -> bool:
    """
    Check whether a keyword exists as a complete term.
    """
    text = text.lower()
    keyword = keyword.lower().strip()

    pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"

    return re.search(pattern, text) is not None


def find_keyword_matches(
    text: str,
    keywords: list[str]
) -> list[str]:
    """
    Find keywords and their aliases present in the text.
    """
    found = []

    for keyword in keywords:

        if keyword_exists(text, keyword):
            found.append(keyword)
            continue

        for alias, canonical_skill in SKILL_ALIASES.items():

            if canonical_skill == keyword:
                if keyword_exists(text, alias):
                    found.append(keyword)
                    break

    return found


def analyze_resume(text: str) -> dict:
    """
    Analyze resume text and extract important keywords.
    """

    skills = find_keyword_matches(
        text,
        SKILLS
    )

    education = find_keyword_matches(
        text,
        EDUCATION_KEYWORDS
    )

    experience = find_keyword_matches(
        text,
        EXPERIENCE_KEYWORDS
    )

    projects = find_keyword_matches(
        text,
        PROJECT_KEYWORDS
    )

    certifications = find_keyword_matches(
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