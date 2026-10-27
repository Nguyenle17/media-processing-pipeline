import logging
import os
import subprocess
import tempfile

from flask import Blueprint, jsonify, request

from ..services import transcription
from ..services.transcription import ModelOutOfMemoryError

logger = logging.getLogger(__name__)

bp = Blueprint("transcribe", __name__)


@bp.post("/transcribe")
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file field in request"}), 400

    model_type = request.form.get(
        "type", transcription.DEFAULT_MODEL
    ).strip().lower()
    if model_type not in transcription.available_models():
        return jsonify(
            {
                "error": f"Unknown model '{model_type}'",
                "available": list(transcription.available_models()),
            }
        ), 400

    language = request.form.get("language") or None
    upload = request.files["file"]
    suffix = os.path.splitext(upload.filename or "")[1] or ".bin"

    raw_path = None
    wav_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            upload.save(tmp.name)
            raw_path = tmp.name

        wav_path = transcription.convert_to_wav(raw_path)
        return jsonify(
            transcription.transcribe_file(wav_path, model_type, language)
        )

    except ModelOutOfMemoryError as exc:
        logger.error("CUDA OOM with model '%s'", model_type)
        return jsonify({"error": str(exc)}), 507
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr
        if isinstance(stderr, bytes):
            stderr = stderr.decode(errors="ignore")
        logger.error("ffmpeg error: %s", stderr)
        return jsonify({"error": "Cannot decode audio file"}), 400
    except Exception as exc:
        logger.exception("Transcribe error")
        return jsonify({"error": str(exc)}), 500
    finally:
        for path in (raw_path, wav_path):
            if path and os.path.exists(path):
                os.unlink(path)
