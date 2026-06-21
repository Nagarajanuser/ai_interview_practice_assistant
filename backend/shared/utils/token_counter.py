# Token Counter utility stub

def count_tokens(text: str) -> int:
    """
    Very rough estimation of token count in the text (approx 4 chars per token).
    """
    if not text:
        return 0
    return len(text) // 4
