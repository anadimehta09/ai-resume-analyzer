from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends
)
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import json

from app.database.connection import get_db
from app.models.analysis import Analysis
from app.services.parser import extract_resume_text
from app.services.analyzer import analyze_resume
from app.services.scorer import score_resume
from app.services.suggestions import generate_suggestions


router = APIRouter(
    prefix="/resume",
    tags=["Resume"]
)


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


ALLOWED_EXTENSIONS = {".pdf", ".docx"}


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):

    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are allowed"
        )

    file_path = UPLOAD_DIR / file.filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Resume uploaded successfully",
        "filename": file.filename,
        "file_path": str(file_path)
    }


@router.post("/analyze")
async def analyze_resume_api(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    db: Session = Depends(get_db)
):

    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are allowed"
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Job description cannot be empty"
        )

    file_path = UPLOAD_DIR / file.filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        resume_text = extract_resume_text(str(file_path))

        if not resume_text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from resume"
            )

        resume_analysis = analyze_resume(resume_text)

        score_result = score_resume(
            resume_text,
            job_description,
            resume_analysis
        )
        suggestions = generate_suggestions(
    resume_analysis,
    score_result
)

        analysis_record = Analysis(
            resume_name=file.filename,
            job_description=job_description,
            ats_score=score_result["ats_score"],
            match_percentage=score_result["keyword_score"],
            matching_skills=json.dumps(
                score_result["matching_skills"]
            ),
            missing_skills=json.dumps(
                score_result["missing_skills"]
            )
        )

        db.add(analysis_record)
        db.commit()
        db.refresh(analysis_record)

        return {
            "message": "Resume analyzed successfully",
            "analysis_id": analysis_record.id,
            "filename": file.filename,
            "analysis": resume_analysis,
            "score": score_result,
            "suggestions": suggestions
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Resume analysis failed: {str(e)}"
        )
@router.get("/history")
def get_analysis_history(
    db: Session = Depends(get_db)
):
    analyses = (
        db.query(Analysis)
        .order_by(Analysis.created_at.desc())
        .all()
    )

    return [
        {
            "id": analysis.id,
            "resume_name": analysis.resume_name,
            "ats_score": analysis.ats_score,
            "match_percentage": analysis.match_percentage,
            "created_at": analysis.created_at
        }
        for analysis in analyses
    ]