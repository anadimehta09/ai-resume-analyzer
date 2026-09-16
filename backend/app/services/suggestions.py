def generate_suggestions(
    resume_analysis: dict,
    score_result: dict
) -> list[str]:
    """
    Generate resume improvement suggestions
    based on analysis and scoring results.
    """

    suggestions = []

    missing_skills = score_result.get(
        "missing_skills",
        []
    )

    if missing_skills:
        skills = ", ".join(missing_skills)

        suggestions.append(
            f"Consider adding relevant missing skills "
            f"such as: {skills}, if you have genuine experience with them."
        )

    experience_score = score_result.get(
        "experience_impact_score",
        0
    )

    if experience_score < 60:
        suggestions.append(
            "Strengthen experience and project descriptions "
            "with measurable achievements, outcomes, and impact."
        )

    section_score = score_result.get(
        "section_score",
        0
    )

    if section_score < 100:
        suggestions.append(
            "Consider adding clearly defined resume sections "
            "such as Skills, Education, Experience, Projects, "
            "or Certifications where relevant."
        )

    parseability_score = score_result.get(
        "parseability_score",
        0
    )

    if parseability_score < 100:
        suggestions.append(
            "Improve resume text readability and formatting "
            "to make the document easier for automated parsers to process."
        )

    keyword_score = score_result.get(
        "keyword_score",
        0
    )

    if keyword_score < 70:
        suggestions.append(
            "Review the job description and naturally include "
            "relevant keywords that accurately represent your skills."
        )

    semantic_score = score_result.get(
        "semantic_similarity_score",
        0
    )

    if semantic_score < 50:
        suggestions.append(
            "Align your resume wording more closely with the "
            "responsibilities and requirements described in the job description."
        )

    if not suggestions:
        suggestions.append(
            "Your resume is well aligned with this job description. "
            "Continue refining measurable achievements and project impact."
        )

    return suggestions