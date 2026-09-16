import re
from app.services.nlp_processor import preprocess_text

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.services.semantic_matcher import calculate_semantic_similarity

from app.utils.resume_keywords import (
    SKILLS,
    SKILL_ALIASES,
)

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


def skill_exists(text: str, skill: str) -> bool:
    """
    Check whether a canonical skill or any of its aliases
    exists in the given text.
    """

    if keyword_exists(text, skill):
        return True

    aliases = SKILL_ALIASES.get(skill, [])

    for alias in aliases:
        if keyword_exists(text, alias):
            return True

    return False


def find_matching_skills(
    resume_text: str,
    job_description: str
) -> tuple[list[str], list[str]]:
    """
    Find required skills that are present in the resume
    and skills that are missing.

    Skill aliases are normalized to their canonical names.
    """

    matching_skills = []
    missing_skills = []

    for skill in SKILLS:

        if skill_exists(job_description, skill):

            if skill_exists(resume_text, skill):
                matching_skills.append(skill)
            else:
                missing_skills.append(skill)

    return matching_skills, missing_skills


def calculate_similarity(
    resume_text: str,
    job_description: str
) -> float:
    """
    Calculate semantic text similarity using
    NLP preprocessing, TF-IDF and cosine similarity.
    """

    processed_resume = preprocess_text(resume_text)
    processed_job_description = preprocess_text(
        job_description
    )

    documents = [
        processed_resume,
        processed_job_description
    ]

    vectorizer = TfidfVectorizer(
        stop_words="english"
    )

    tfidf_matrix = vectorizer.fit_transform(
        documents
    )

    similarity_matrix = cosine_similarity(
        tfidf_matrix
    )

    similarity_score = similarity_matrix[0][1]

    return round(
        float(similarity_score) * 100,
        2
    )
def score_resume(
    resume_text: str,
    job_description: str,
    resume_analysis: dict
) -> dict:
    """
    Generate complete resume scoring results using
    lexical and semantic similarity.
    """

    tfidf_similarity_score = calculate_similarity(
        resume_text,
        job_description
    )

    semantic_similarity_score = calculate_semantic_similarity(
        resume_text,
        job_description
    )

    combined_similarity_score = round(
        (
            tfidf_similarity_score * 0.40
            + semantic_similarity_score * 0.60
        ),
        2
    )

    matching_skills, missing_skills = find_matching_skills(
        resume_text,
        job_description
    )

    keyword_score = calculate_keyword_score(
        matching_skills,
        missing_skills
    )

    parseability_score = calculate_parseability_score(
        resume_text
    )

    section_score = calculate_section_score(
        resume_analysis
    )

    experience_impact_score = calculate_experience_impact_score(
        resume_text
    )

    ats_score = calculate_ats_score(
        keyword_score,
        parseability_score,
        section_score,
        experience_impact_score
    )

    return {
        "ats_score": ats_score,

        "similarity_score": tfidf_similarity_score,

        "semantic_similarity_score": semantic_similarity_score,

        "combined_similarity_score": combined_similarity_score,

        "keyword_score": keyword_score,

        "parseability_score": parseability_score,

        "section_score": section_score,

        "experience_impact_score": experience_impact_score,

        "matching_skills": matching_skills,

        "missing_skills": missing_skills,
    }