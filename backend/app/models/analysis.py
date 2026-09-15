from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from datetime import datetime

from app.database.connection import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)

    resume_name = Column(String(255), nullable=False)

    job_description = Column(Text, nullable=False)

    ats_score = Column(Float, nullable=True)

    match_percentage = Column(Float, nullable=True)

    matching_skills = Column(Text, nullable=True)

    missing_skills = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )