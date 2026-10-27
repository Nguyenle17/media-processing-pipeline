import hmac

from flask import Flask, current_app, jsonify, request

TOKEN_HEADER = "X-AI-Service-Token"


def init_auth(app: Flask) -> None:
    @app.before_request
    def _require_service_token():
        expected = current_app.config.get("AI_SERVICE_TOKEN")
        if not expected:
            current_app.logger.error("AI_SERVICE_TOKEN is not configured")
            return jsonify({"error": "AI service token is not configured"}), 500

        provided = request.headers.get(TOKEN_HEADER, "")
        if not hmac.compare_digest(provided, expected):
            return jsonify({"error": "Unauthorized"}), 401
