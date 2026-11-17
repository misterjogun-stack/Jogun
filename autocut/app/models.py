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


@dataclass
class Options:
    industry: str = "general"      # general / hair / food / edu / shop
    aspect: str = "vertical"       # vertical(1080x1920) / original
    fit: str = "cover"             # cover(꽉 채움) / blur(블러 배경)
    target_seconds: int = 0        # 0이면 길이 제한 없음
    captions: bool = True
    language: str | None = None    # None이면 자동 감지


@dataclass
class MediaInfo:
    duration: float
    width: int
    height: int
    has_audio: bool
    warnings: list[str] = field(default_factory=list)
