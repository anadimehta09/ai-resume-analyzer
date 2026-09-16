import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.utils.resume_keywords import SKILLS
from app.services.ats_scorer import (
    calculate_keyword_score,
    calculate_parseability_score,
    calculate_section_score,
    calculate_experience_impact_score,
    calculate_ats_score,
)


def keyword_exists(text: str, keyword: str) -> bool:
    """
    Check whether a keyword exists as a complete term.
    """

    text = text.lower()
    keyword = keyword.lower().strip()

    pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"

    return re.search(pattern, text) is not None


def find_matching_skills(
    resume_text: str,
    job_description: str
) -> tuple[list[str], list[str]]:
    """
    Find required skills that are present in the resume
    and skills that are missing.
    """

    matching_skills = []
    missing_skills = []

    for skill in SKILLS:

        if keyword_exists(job_description, skill):

            if keyword_exists(resume_text, skill):
                matching_skills.append(skill)
            else:
                missing_skills.append(skill)

    return matching_skills, missing_skills


def calculate_similarity(
    resume_text: str,
    job_description: str
) -> float:
    """
    Calculate text similarity using TF-IDF
    and cosine similarity.
    """

    documents = [
        resume_text,
        job_description
    ]

    vectorizer = TfidfVectorizer(
        stop_words="english"
    )

    tfidf_matrix = vectorizer.fit_transform(documents)

    similarity_matrix = cosine_similarity(tfidf_matrix)

    similarity_score = similarity_matrix[0][1]

    return round(float(similarity_score) * 100, 2)


def score_resume(
    resume_text: str,
    job_description: str,
    resume_analysis: dict
) -> dict:
    """
    Generate complete resume scoring results.
    """

    # 1. Text similarity
    similarity_score = calculate_similarity(
        resume_text,
        job_description
    )

    # 2. Matching and missing skills
    matching_skills, missing_skills = find_matching_skills(
        resume_text,
        job_description
    )

    # 3. Keyword score
    keyword_score = calculate_keyword_score(
        matching_skills,
        missing_skills
    )

    # 4. Parseability score
    parseability_score = calculate_parseability_score(
        resume_text
    )

    # 5. Section completion score
    section_score = calculate_section_score(
        resume_analysis
    )

    # 6. Experience / impact score
    experience_impact_score = calculate_experience_impact_score(
        resume_text
    )

    # 7. Final ATS score
    ats_score = calculate_ats_score(
        keyword_score,
        parseability_score,
        section_score,
        experience_impact_score
    )

    return {
        "ats_score": ats_score,
        "similarity_score": similarity_score,
        "keyword_score": keyword_score,
        "parseability_score": parseability_score,
        "section_score": section_score,
        "experience_impact_score": experience_impact_score,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
    }