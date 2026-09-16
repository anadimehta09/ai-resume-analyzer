import re

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer


_resources_ready = False


def ensure_nltk_resources():
    global _resources_ready

    if _resources_ready:
        return

    resources = [
        ("corpora/stopwords", "stopwords"),
        ("corpora/wordnet", "wordnet"),
    ]

    for path, resource in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(resource, quiet=True)

    _resources_ready = True


def preprocess_text(text: str) -> str:
    ensure_nltk_resources()

    stop_words = set(stopwords.words("english"))
    lemmatizer = WordNetLemmatizer()

    text = text.lower()

    text = re.sub(
        r"https?://\S+|www\.\S+",
        " ",
        text
    )

    text = re.sub(
        r"[^a-z0-9+#.\s]",
        " ",
        text
    )

    tokens = text.split()

    processed_tokens = []

    for token in tokens:
        if token in stop_words:
            continue

        lemma = lemmatizer.lemmatize(token)
        processed_tokens.append(lemma)

    return " ".join(processed_tokens)