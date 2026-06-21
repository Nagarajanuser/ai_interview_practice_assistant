from datetime import datetime

def format_iso_datetime(dt) -> str | None:
    """
    Format a datetime object to an ISO format string.
    """
    if not dt:
        return None
    return dt.isoformat()
