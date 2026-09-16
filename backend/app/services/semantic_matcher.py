from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.services.nlp_processor import preprocess_text


def calculate_semantic_similarity(
    resume_text: str,
    job_description: str
) -> float:

    processed_resume = preprocess_text(resume_text)
    processed_job_description = preprocess_text(job_description)

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2)
    )

    tfidf_matrix = vectorizer.fit_transform([
        processed_resume,
        processed_job_description
    ])

    similarity = cosine_similarity(
        tfidf_matrix[0:1],
        tfidf_matrix[1:2]
    )[0][0]

    return round(float(similarity) * 100, 2)