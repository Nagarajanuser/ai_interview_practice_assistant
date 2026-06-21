import re

def validate_login_id(login_id: str) -> bool:
    """
    Validate that login_id is at least 3 characters long and only contains
    letters, numbers, hyphens, or underscores.
    """
    if not login_id or len(login_id.strip()) < 3:
        return False
    return bool(re.match(r'^[a-z0-9_\-]+$', login_id.strip().lower()))
