import logging

from flask import Blueprint, jsonify, request

from ..services import grammar as grammar_service

logger = logging.getLogger(__name__)

bp = Blueprint("grammar", __name__)


@bp.post("/grammar")
def grammar():
    text = ((request.get_json(silent=True) or {}).get("text") or "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        return jsonify(
            {"corrected_text": grammar_service.correct_text(text)}
        )
    except Exception as exc:
        logger.exception("Grammar error")
        return jsonify({"error": str(exc)}), 500
