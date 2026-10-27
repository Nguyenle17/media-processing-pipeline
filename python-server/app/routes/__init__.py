from flask import Flask

from . import detect_language, grammar, health, transcribe, translation, tts

_BLUEPRINTS = (
    health.bp,
    transcribe.bp,
    grammar.bp,
    translation.bp,
    detect_language.bp,
    tts.bp,
)


def register_routes(app: Flask) -> None:
    for blueprint in _BLUEPRINTS:
        app.register_blueprint(blueprint)
