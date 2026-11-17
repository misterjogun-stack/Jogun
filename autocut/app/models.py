"""편집 파이프라인에서 오가는 데이터 구조."""
from __future__ import annotations

from dataclasses import dataclass, field

from pydantic import BaseModel


@dataclass
class Word:
    start: float
    end: float
    text: str


@dataclass
class Phrase:
    """자막 한 줄이 되는 말 덩어리. 컷 편집의 최소 단위."""
    id: int
    start: float
    end: float
    text: str


class Seg(BaseModel):
    """원본 영상에서 남길 구간(초)."""
    start: float
    end: float


class Cap(BaseModel):
    """원본 시간 기준 자막."""
    start: float
    end: float
    text: str
    emphasis: list[str] = []


class Plan(BaseModel):
    segments: list[Seg]
    captions: list[Cap]
    title: str = ""
    post_text: str = ""
    hashtags: list[str] = []
    warnings: list[str] = []
    caption_color: str | None = None   # "RRGGBB". None이면 룩 기본색
    caption_scale: float = 1.0         # 자막 크기 배율(0.6~1.8)
    music_volume: float = 0.25         # 말소리 대비 배경음악 크기(0~1.5). 배경음악이 없으면 무시
    title_text: str = ""               # 영상 첫 3초에 뜨는 제목(비우면 없음). title은 게시물 글 제목
    title_color: str | None = None
    removed: list[Seg] = []            # 잘려 나간 원본 구간(보고용, normalize_plan이 계산)


@dataclass
class Options:
    industry: str = "general"      # general / hair / food / edu / shop
    aspect: str = "vertical"       # vertical(1080x1920) / original
    fit: str = "cover"             # cover(꽉 채움) / blur(블러 배경)
    target_seconds: int = 0        # 0이면 길이 제한 없음
    captions: bool = True
    look: str = "none"             # none / cinematic / airy
    language: str | None = None    # None이면 자동 감지
    title_text: str = ""           # 첫 3초 제목 모션
    preview_seconds: int = 0       # 0보다 크면 원본 앞부분만 편집(시험용)


@dataclass
class MediaInfo:
    duration: float
    width: int
    height: int
    has_audio: bool
    warnings: list[str] = field(default_factory=list)
