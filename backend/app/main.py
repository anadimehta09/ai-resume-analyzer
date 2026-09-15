from fastapi import FastAPI

app = FastAPI()


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