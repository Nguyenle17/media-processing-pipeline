import logging

from flask import Blueprint, jsonify, request

from ..services import language as language_service
from ..services import translation

logger = logging.getLogger(__name__)

bp = Blueprint("translation", __name__)


@bp.post("/translate")
def translate():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    target_lang = language_service.normalize_lang(data.get("target_lang", "en"))

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        source_lang = language_service.detect_language(text)
        translated_text = translation.translate_text(text, target_lang, source_lang)
        return jsonify(
            {
                "source_lang": source_lang,
                "target_lang": target_lang,
                "translated_text": translated_text,
            }
        )
    except Exception as exc:
        logger.exception("Translate error")
        return jsonify({"error": str(exc)}), 500
