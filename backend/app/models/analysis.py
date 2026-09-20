from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from datetime import datetime

from app.database.connection import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=False, index=True)

    # Resume information
    resume_name = Column(String(255), nullable=False)
    job_description = Column(Text, nullable=False)

    # Main scores
    ats_score = Column(Float, nullable=True)
    keyword_score = Column(Float, nullable=True)
    match_percentage = Column(Float, nullable=True)

    similarity_score = Column(Float, nullable=True)
    semantic_similarity_score = Column(Float, nullable=True)
    combined_similarity_score = Column(Float, nullable=True)

    parseability_score = Column(Float, nullable=True)
    section_score = Column(Float, nullable=True)
    experience_impact_score = Column(Float, nullable=True)

    # Skills
    matching_skills = Column(Text, nullable=True)
    missing_skills = Column(Text, nullable=True)

    # Complete resume analysis
    resume_analysis = Column(Text, nullable=True)

    # Improvement suggestions
    suggestions = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )