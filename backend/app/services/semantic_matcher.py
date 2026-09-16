from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


MODEL_NAME = "all-MiniLM-L6-v2"

model = None


def get_model():
    global model

    if model is None:
        model = SentenceTransformer(MODEL_NAME)

    return model


def calculate_semantic_similarity(
    resume_text: str,
    job_description: str
) -> float:

    model_instance = get_model()

    embeddings = model_instance.encode(
        [resume_text, job_description]
    )

    similarity = cosine_similarity(
        [embeddings[0]],
        [embeddings[1]]
    )[0][0]

    return round(float(similarity) * 100, 2)