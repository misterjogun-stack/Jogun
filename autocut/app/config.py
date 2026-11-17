"""환경 변수 기반 설정."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("AUTOCUT_DATA", ROOT / "data"))
FONTS_DIR = Path(os.environ.get("AUTOCUT_FONTS", ROOT / "fonts"))
FONT_NAME = os.environ.get("AUTOCUT_FONT_NAME", "Noto Sans KR")

# 음성 인식 모델 크기: tiny / base / small / medium / large-v3
WHISPER_MODEL = os.environ.get("AUTOCUT_WHISPER", "small")
# 편집 계획을 짜는 모델. ANTHROPIC_API_KEY가 없으면 규칙 기반으로 동작
PLANNER_MODEL = os.environ.get("AUTOCUT_MODEL", "claude-sonnet-5-5")

MAX_UPLOAD_MB = int(os.environ.get("AUTOCUT_MAX_UPLOAD_MB", "1024"))
JOB_TTL_HOURS = int(os.environ.get("AUTOCUT_JOB_TTL_HOURS", "24"))
