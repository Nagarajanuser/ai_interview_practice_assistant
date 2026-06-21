# Redis Cache Stub Client (to support future caching mechanisms)

class RedisStub:
    def __init__(self):
        self._store = {}

    def get(self, key: str) -> str | None:
        return self._store.get(key)

    def set(self, key: str, value: str, expire: int | None = None) -> bool:
        self._store[key] = value
        return True

    def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            return True
        return False

redis_client = RedisStub()
