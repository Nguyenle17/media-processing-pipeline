from flask import Flask, jsonify

from .auth import init_auth
from .config import Settings
from .routes import register_routes


def create_app(settings: Settings | None = None) -> Flask:
    settings = settings or Settings.from_env()

    app = Flask(__name__)
    app.config.update(
        AI_SERVICE_TOKEN=settings.service_token,
        MAX_CONTENT_LENGTH=settings.max_request_bytes,
    )

    init_auth(app)
    register_routes(app)

    @app.errorhandler(413)
    def _request_too_large(_error):
        return jsonify({"error": "Request body too large"}), 413

    return app
