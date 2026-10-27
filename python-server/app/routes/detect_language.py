from flask import Blueprint, jsonify, request

from ..services import language as language_service

bp = Blueprint("language", __name__)


@bp.post("/detect-language")
def detect_language():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    return jsonify({"language": language_service.detect_language(text)})
