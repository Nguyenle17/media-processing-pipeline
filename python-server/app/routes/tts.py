import io
import logging

from flask import Blueprint, jsonify, request, send_file

from ..services import language as language_service
from ..services import translation, tts

logger = logging.getLogger(__name__)

bp = Blueprint("tts", __name__)


@bp.post("/text-to-speech")
def text_to_speech():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    target_lang = language_service.normalize_lang(data.get("lang", "en"))
    auto_translate = data.get("autoTranslate", True)

    if not text:
        return jsonify({"error": "No text provided"}), 400
    if not target_lang:
        return jsonify({"error": "No language provided"}), 400

    voice = tts.voice_for(target_lang)
    if not voice:
        return jsonify({"error": f"Unsupported language: {target_lang}"}), 400

    try:
        source_lang = language_service.detect_language(text)
        logger.info(
            "[TTS] source=%s target=%s autoTranslate=%s",
            source_lang,
            target_lang,
            auto_translate,
        )

        final_text = text
        if auto_translate and source_lang != target_lang:
            final_text = translation.translate_text(text, target_lang, source_lang)
            logger.info("[TTS] Translated: %s", final_text[:120])

        audio = tts.synthesize_mp3(final_text, voice)
        return send_file(io.BytesIO(audio), mimetype="audio/mpeg")

    except Exception as exc:
        logger.exception("TTS error")
        return jsonify({"error": str(exc)}), 500
