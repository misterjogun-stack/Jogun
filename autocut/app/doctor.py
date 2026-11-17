"""설치 점검: 필요한 도구가 깔려 있고 실행되는지 표로 보여 준다.

  python -m app.doctor
"""
from __future__ import annotations

import importlib
import os
import shutil
import subprocess
import sys
import unicodedata

from . import config


def _ver(cmd: list[str]) -> str | None:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        return (r.stdout or r.stderr).splitlines()[0].strip() if r.returncode == 0 else None
    except Exception:
        return None


def checks() -> list[tuple[str, bool, str, str]]:
    rows = []
    ff = _ver(["ffmpeg", "-version"]) if shutil.which("ffmpeg") else None
    rows.append(("FFmpeg", bool(ff), ff or "없음", "자르기·합성·내보내기. 설치: brew install ffmpeg / winget install Gyan.FFmpeg"))
    libass = False
    if ff:
        r = subprocess.run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True)
        libass = " subtitles " in r.stdout
    rows.append(("FFmpeg 자막(libass)", libass, "있음" if libass else "없음", "자막·제목을 입히려면 필요. libass가 포함된 FFmpeg를 설치"))
    for mod, label, why in (("faster_whisper", "Whisper(faster-whisper)", "음성 인식. pip install -r requirements.txt"),
                            ("fastapi", "웹 서버(FastAPI)", "pip install -r requirements.txt"),
                            ("anthropic", "Claude SDK", "AI 편집·해석. pip install -r requirements.txt"),
                            ("numpy", "numpy", "레퍼런스 분석"), ("PIL", "Pillow", "레퍼런스 분석")):
        try:
            m = importlib.import_module(mod)
            rows.append((label, True, getattr(m, "__version__", "있음"), why))
        except Exception:
            rows.append((label, False, "없음", why))
    fonts = [p.name for p in config.FONTS_DIR.glob("*") if p.suffix.lower() in (".ttf", ".otf")] if config.FONTS_DIR.exists() else []
    rows.append(("한글 폰트", bool(fonts), ", ".join(fonts) or "없음", f"{config.FONTS_DIR} 에 Noto Sans KR 넣기(README 참고)"))
    key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    rows.append(("ANTHROPIC_API_KEY", key, "설정됨" if key else "없음", "없으면 규칙 기반 편집·해석으로 동작(선택)"))
    rows.append(("Whisper 모델 크기", True, config.WHISPER_MODEL, "느리면 AUTOCUT_WHISPER=small, 정확도가 더 필요하면 large-v3"))
    return rows


def _width(s: str) -> int:
    return sum(2 if unicodedata.east_asian_width(ch) in "WF" else 1 for ch in s)


def _pad(s: str, w: int) -> str:
    return s + " " * (w - _width(s))


def main() -> int:
    rows = checks()
    w = max(_width(r[0]) for r in rows)
    print(f"{_pad('항목', w)}  {_pad('상태', 4)}  버전/값")
    for name, ok, val, why in rows:
        print(f"{_pad(name, w)}  {_pad('OK' if ok else '없음', 4)}  {val[:60]}" + ("" if ok else f"\n{_pad('', w)}  → {why}"))
    required = {"FFmpeg", "FFmpeg 자막(libass)", "Whisper(faster-whisper)", "웹 서버(FastAPI)"}
    missing = [r[0] for r in rows if r[0] in required and not r[1]]
    print("\n" + ("준비 완료" if not missing else "필수 항목이 빠졌어요: " + ", ".join(missing)))
    return 0 if not missing else 1


if __name__ == "__main__":
    sys.exit(main())
