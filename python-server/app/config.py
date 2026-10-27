import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

DEFAULT_BIND_HOST = "127.0.0.1"
DEFAULT_PORT = 5000
DEFAULT_MAX_REQUEST_BYTES = 512 * 1024 * 1024


def _read_positive_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc
    if value <= 0:
        raise RuntimeError(f"{name} must be greater than zero")
    return value


@dataclass(frozen=True)
class Settings:
    host: str = DEFAULT_BIND_HOST
    port: int = DEFAULT_PORT
    service_token: str | None = None
    max_request_bytes: int = DEFAULT_MAX_REQUEST_BYTES

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        return cls(
            host=os.getenv("AI_BIND_HOST", DEFAULT_BIND_HOST),
            port=_read_positive_int("AI_PORT", DEFAULT_PORT),
            service_token=os.getenv("AI_SERVICE_TOKEN") or None,
            max_request_bytes=_read_positive_int(
                "AI_MAX_REQUEST_BYTES", DEFAULT_MAX_REQUEST_BYTES
            ),
        )
