"""자막(ASS) 생성과 컷 이후 시간 재계산."""
from __future__ import annotations

from . import config
from .models import Cap, Seg

YELLOW = "&H0000E5FF&"   # ASS는 BGR 순서: FFE500(노랑)
WHITE = "&H00FFFFFF&"


def remap_captions(caps: list[Cap], segs: list[Seg]) -> list[Cap]:
    """원본 시간 자막을 컷 편집 후 타임라인으로 옮긴다. 남은 구간과 겹치지 않으면 버린다."""
    out: list[Cap] = []
    offset = 0.0
    spans = []
    for s in segs:
        spans.append((s.start, s.end, offset))
        offset += s.end - s.start
    for c in caps:
        starts, ends = [], []
        for a, b, off in spans:
            lo, hi = max(c.start, a), min(c.end, b)
            if hi - lo > 0.05:
                starts.append(off + lo - a)
                ends.append(off + hi - a)
        if starts:
            out.append(Cap(start=min(starts), end=max(ends), text=c.text, emphasis=c.emphasis))
    return out


def _ts(t: float) -> str:
    t = max(0.0, t)
    cs = int(round(t * 100))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, cs = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _escape(text: str) -> str:
    return text.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", " ")


def wrap_text(text: str, per_line: int) -> str:
    """두 줄로 나눈다. 공백이 있으면 가운데에 가장 가까운 공백에서 끊는다."""
    text = text.strip()
    if len(text) <= per_line:
        return text
    spaces = [i for i, ch in enumerate(text) if ch == " "]
    mid = len(text) / 2
    cut = min(spaces, key=lambda i: abs(i - mid)) if spaces else int(mid)
    return (text[:cut].strip() + "\\N" + text[cut:].strip()) if spaces else (text[:cut] + "\\N" + text[cut:])


def _styled(cap: Cap, per_line: int) -> str:
    """줄바꿈을 원문 기준으로 먼저 정한 뒤 강조 단어에 색과 크기를 입힌다."""
    text = wrap_text(_escape(cap.text), per_line)
    for w in cap.emphasis:
        w = _escape(w)
        if w and w in text:
            text = text.replace(w, "{\\c" + WHITE + "\\fscx118\\fscy118}" + w + "{\\r}", 1)
    return text


def build_ass(caps: list[Cap], width: int, height: int) -> str:
    vertical = height > width
    fs = int(width * 0.075) if vertical else int(height * 0.07)
    per_line = max(6, int((width * 0.9) / (fs * 0.98)))
    margin_v = int(height * 0.22) if vertical else int(height * 0.08)
    outline = max(3, fs // 13)
    head = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,{config.FONT_NAME},{fs},{YELLOW},{YELLOW},&H00000000&,&H80000000&,-1,0,0,0,100,100,0,0,1,{outline},2,2,"
        f"{int(width * 0.05)},{int(width * 0.05)},{margin_v},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    lines = []
    for c in caps:
        lines.append(f"Dialogue: 0,{_ts(c.start)},{_ts(c.end + 0.08)},Default,,0,0,0,,{_styled(c, per_line)}")
    return head + "\n".join(lines) + "\n"
