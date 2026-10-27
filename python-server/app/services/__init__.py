from . import grammar, language, transcription, translation


def warmup() -> None:
    transcription.warmup()
    grammar.warmup()
    translation.warmup()
    language.warmup()
