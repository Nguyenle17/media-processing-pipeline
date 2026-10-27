from flask import Blueprint, jsonify

from ..services import transcription
from ..services.runtime import DEVICE

bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    return jsonify(
        {
            "device": DEVICE,
            "whisper_loaded": transcription.current_model(),
            "whisper_available": list(transcription.available_models()),
        }
    )
