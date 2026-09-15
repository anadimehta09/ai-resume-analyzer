from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil


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