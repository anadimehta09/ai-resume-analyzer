from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import Base, engine
from app.models.analysis import Analysis
from app.routes.resume import router as resume_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="AI Resume Analyzer",
    description="AI-powered Resume Analysis API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://ai-resume-analyzer-348h92rlc-anadimehta09.vercel.app"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(resume_router)


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