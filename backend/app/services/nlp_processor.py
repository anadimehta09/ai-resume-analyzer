import re


def preprocess_text(text: str) -> str:
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

    return " ".join(tokens)