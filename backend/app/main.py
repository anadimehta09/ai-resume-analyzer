from fastapi import FastAPI

from app.database.connection import Base, engine
from app.models.analysis import Analysis


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="AI Resume Analyzer",
    description="AI-powered Resume Analysis API",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "AI Resume Analyzer API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }