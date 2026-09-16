import re


def calculate_keyword_score(
    matching_skills: list[str],
    missing_skills: list[str]
) -> float:
    """
    Calculate the percentage of required skills
    found in the resume.
    """

    total_required_skills = (
        len(matching_skills) + len(missing_skills)
    )

    if total_required_skills == 0:
        return 0.0

    score = (
        len(matching_skills)
        / total_required_skills
    ) * 100

    return round(score, 2)


def calculate_parseability_score(resume_text: str) -> float:
    """
    Calculate a basic parseability score based on
    whether meaningful text was successfully extracted.
    """

    if not resume_text or not resume_text.strip():
        return 0.0

    text_length = len(resume_text.strip())

    if text_length < 200:
        return 40.0

    if text_length < 500:
        return 70.0

    return 100.0


def calculate_section_score(
    resume_analysis: dict
) -> float:
    """
    Calculate score based on the presence of
    important resume sections.
    """

    sections = [
        "skills",
        "education",
        "experience",
        "projects",
        "certifications",
    ]

    completed_sections = 0

    for section in sections:
        if resume_analysis.get(section):
            completed_sections += 1

    score = (
        completed_sections
        / len(sections)
    ) * 100

    return round(score, 2)


def calculate_experience_impact_score(
    resume_text: str
) -> float:
    """
    Estimate experience/impact quality using
    action verbs and quantifiable achievements.
    """

    text = resume_text.lower()

    action_verbs = [
        "developed",
        "built",
        "created",
        "implemented",
        "designed",
        "optimized",
        "improved",
        "managed",
        "led",
        "deployed",
        "automated",
    ]

    action_count = sum(
        1
        for verb in action_verbs
        if re.search(
            r"(?<!\w)" + re.escape(verb) + r"(?!\w)",
            text
        )
    )

    metric_patterns = [
        r"\d+%",
        r"\d+\+",
        r"\$\d+",
        r"\d+\s*(users|records|projects|clients)",
    ]

    metric_count = sum(
        1
        for pattern in metric_patterns
        if re.search(pattern, text)
    )

    action_score = min(action_count * 8, 60)
    metric_score = min(metric_count * 10, 40)

    return round(
        action_score + metric_score,
        2
    )


def calculate_ats_score(
    keyword_score: float,
    parseability_score: float,
    section_score: float,
    experience_impact_score: float
) -> float:
    """
    Calculate final ATS score using weighted components.

    Keyword Match       = 45%
    Parseability        = 20%
    Section Completion  = 20%
    Experience/Impact   = 15%
    """

    ats_score = (
        keyword_score * 0.45
        + parseability_score * 0.20
        + section_score * 0.20
        + experience_impact_score * 0.15
    )

    return round(ats_score, 2)