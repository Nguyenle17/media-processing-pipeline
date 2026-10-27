import logging

from app import create_app
from app.config import Settings
from app.services import warmup
from app.services.runtime import describe_device

logger = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    settings = Settings.from_env()
    app = create_app(settings)

    logger.info("AI device: %s", describe_device())
    logger.info("Loading models...")
    warmup()
    logger.info("Models ready. Listening on %s:%s", settings.host, settings.port)

    app.run(host=settings.host, port=settings.port, threaded=True)


if __name__ == "__main__":
    main()
