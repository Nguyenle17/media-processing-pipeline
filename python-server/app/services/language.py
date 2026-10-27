import logging
import threading
from pathlib import Path

import fasttext

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).resolve().parents[2] / "lid.176.bin"

_model = None
_load_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        with _load_lock:
            if _model is None:
                logger.info("Loading language detection model from %s", MODEL_PATH)
                _model = fasttext.load_model(str(MODEL_PATH))
    return _model


def warmup() -> None:
    _get_model()


def normalize_lang(code: str | None) -> str:
    code = (code or "").strip().lower().replace("_", "-")
    return code.split("-")[0] if code else code


def detect_language(text: str) -> str:
    try:
        clean = (text or "").replace("\n", " ").strip()
        if len(clean) < 5:
            return "en"
        label = _get_model().f.predict(clean, 1, 0.0, "strict")[0][1]
        return label.replace("__label__", "")
    except Exception as exc:
        logger.warning("Language detection failed: %s", exc)
        return "en"
