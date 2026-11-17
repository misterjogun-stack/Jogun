"""음성 → 단어 단위 타임스탬프 → 말 덩어리(phrase)."""
from __future__ import annotations

import threading
from pathlib import Path

from . import config
from .models import Phrase, Word

_model = None
_lock = threading.Lock()

SENTENCE_END = ".?!。？！…"


def transcribe_words(path: Path, language: str | None = None) -> list[Word]:
    """faster-whisper로 단어 타임스탬프를 얻는다. 모델은 첫 호출 때 한 번만 불러온다."""
    global _model
    with _lock:
        if _model is None:
            from faster_whisper import WhisperModel
            _model = WhisperModel(config.WHISPER_MODEL, device="auto", compute_type="auto")
        model = _model
    segments, _info = model.transcribe(
        str(path),
        language=language,
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
    )
    words: list[Word] = []
    for seg in segments:
        for w in seg.words or []:
            if w.text.strip():
                words.append(Word(float(w.start), float(w.end), w.text))
    return words


def words_to_phrases(words: list[Word], max_chars: int = 22, gap: float = 0.45) -> list[Phrase]:
    """쉬는 구간, 문장 끝, 글자 수 기준으로 단어를 말 덩어리로 묶는다."""
    phrases: list[Phrase] = []
    cur: list[Word] = []

    def flush() -> None:
        if not cur:
            return
        text = "".join(w.text for w in cur).strip()
        if text:
            phrases.append(Phrase(len(phrases), cur[0].start, cur[-1].end, text))
        cur.clear()

    for w in words:
        if cur:
            joined_len = len(("".join(x.text for x in cur) + w.text).strip())
            too_long = joined_len > max_chars
            paused = w.start - cur[-1].end > gap
            ended = cur[-1].text.strip()[-1:] in SENTENCE_END
            if too_long or paused or ended:
                flush()
        cur.append(w)
    flush()
    return phrases
