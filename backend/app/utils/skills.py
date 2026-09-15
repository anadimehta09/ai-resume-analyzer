SKILLS = [
    "python",
    "java",
    "c",
    "c++",
    "javascript",
    "typescript",
    "html",
    "css",
    "react",
    "node.js",
    "express",
    "fastapi",
    "django",
    "flask",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "sqlite",
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "nlp",
    "natural language processing",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "pandas",
    "numpy",
    "matplotlib",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "git",
    "github",
    "rest api",
    "restful api",
    "linux",
]


def extract_skills(text: str) -> list[str]:
    text = text.lower()

    found_skills = []

    for skill in SKILLS:
        if skill in text:
            found_skills.append(skill)

    return found_skills