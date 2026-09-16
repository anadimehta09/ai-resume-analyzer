import re
import nltk

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer


def download_nltk_resources():
    """
    Download the NLP resources required by this project.
    """
    resources = [
        ("corpora/stopwords", "stopwords"),
        ("corpora/wordnet", "wordnet"),
    ]

    for path, resource in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(resource, quiet=True)


download_nltk_resources()

STOP_WORDS = set(stopwords.words("english"))
LEMMATIZER = WordNetLemmatizer()


def preprocess_text(text: str) -> str:
    """
    Clean and normalize resume or job-description text.
    """

    text = text.lower()

    # Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)

    # Keep letters, numbers and basic spaces
    text = re.sub(r"[^a-z0-9+#.\s]", " ", text)

    # Tokenize
    tokens = text.split()

    # Remove stop words and lemmatize
    processed_tokens = []

    for token in tokens:
        if token in STOP_WORDS:
            continue

        lemma = LEMMATIZER.lemmatize(token)
        processed_tokens.append(lemma)

    return " ".join(processed_tokens)