"""자막(ASS) 생성과 컷 이후 시간 재계산."""
from __future__ import annotations

from . import config
from .models import Cap, Seg

YELLOW = "&H0000E5FF&"   # ASS는 BGR 순서: FFE500(노랑)
WHITE = "&H00FFFFFF&"
AMBER = "&H001EBEFA&"    # FABE1E(호박색), 시네마틱 강조 색


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


def ass_color(hex_rgb: str) -> str:
    """RRGGBB → ASS 색(&H00BBGGRR&)."""
    h = hex_rgb.lstrip("#")
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}&".upper()


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


def _styled(cap: Cap, per_line: int, style: str = "pop") -> str:
    """줄바꿈을 원문 기준으로 먼저 정한 뒤 강조 단어에 색과 크기를 입힌다."""
    text = wrap_text(_escape(cap.text), per_line)
    if style == "airy":      # 조용한 룩: 강조 색 없이, 천천히 나타났다 사라진다
        return "{\\fad(450,450)}" + text
    color, scale = (AMBER, 112) if style == "cinematic" else (WHITE, 118)
    for w in cap.emphasis:
        w = _escape(w)
        if w and w in text:
            text = text.replace(w, "{\\c" + color + f"\\fscx{scale}\\fscy{scale}" + "}" + w + "{\\r}", 1)
    return text


TITLE_SECONDS = 3.0
MAX_LINE_CHARS = 16   # 한 줄 16자 안팎, 두 줄까지


def _title_event(text: str, width: int, height: int, style: str, total: float) -> tuple[str, str]:
    """첫 3초 제목 모션. (스타일 줄, 이벤트 줄)"""
    vertical = height > width
    base = width if vertical else height
    end = min(TITLE_SECONDS, max(0.5, total))
    ms = int(end * 1000)
    x, y = width // 2, int(height * (0.30 if style == "pop" else 0.42))
    if style == "pop":        # 작게 시작해 튀어나왔다 자리 잡기
        fs, bold, spacing = int(base * 0.10), -1, 0
        anim = f"\\pos({x},{y})\\fad(120,350)\\fscx70\\fscy70\\t(0,220,\\fscx106\\fscy106)\\t(220,360,\\fscx100\\fscy100)"
    elif style == "cinematic":  # 천천히 나타나며 자간이 넓어짐
        fs, bold, spacing = int(base * 0.065), 0, 2
        anim = f"\\pos({x},{y})\\fad(600,600)\\t(0,{ms},\\fsp10)"
    else:                     # airy: 살짝 떠오르며 흐릿하게
        fs, bold, spacing = int(base * 0.055), 0, 3
        anim = f"\\move({x},{y + int(height * 0.015)},{x},{y},0,1500)\\fad(700,700)"
    per_line = max(4, int(width * 0.84 / (fs + spacing)))
    text = wrap_text(_escape(text), per_line)
    style_line = (f"Style: Title,{config.FONT_NAME},{fs},{{primary}},{{primary}},&H00000000&,&H66000000&,{bold},0,0,0,100,100,"
                  f"{spacing},0,1,{0 if style != 'pop' else max(3, fs // 14)},{2 if style != 'pop' else 3},5,0,0,0,1")
    event = f"Dialogue: 1,{_ts(0)},{_ts(end)},Title,,0,0,0,,{{{anim}}}{text}"
    return style_line, event


def build_ass(
    caps: list[Cap],
    width: int,
    height: int,
    style: str = "pop",
    color: str | None = None,
    scale: float = 1.0,
    title: str = "",
    title_color: str | None = None,
    total: float = 0.0,
) -> str:
    vertical = height > width
    base = width if vertical else height
    scale = max(0.6, min(scale, 1.8))
    if style == "airy":
        # 레퍼런스처럼 화면 옆쪽 좁은 칸, 중간보다 약간 아래 높이에 작고 연하게
        fs, primary, outline, shadow, spacing = int(base * 0.040 * scale), "&H18FFFFFF&", 0, 2, 2
        align, bold = 1, 0
        ml, mr = int(width * 0.06), int(width * max(0.20, 0.44 - 0.2 * (scale - 1)))
        margin_v = int(height * (0.36 if vertical else 0.12))
        per_line = max(4, int((width - ml - mr) / (fs + spacing)))
    else:
        cine = style == "cinematic"
        fs = int((width * (0.045 if cine else 0.075) if vertical else height * (0.045 if cine else 0.07)) * scale)
        primary = WHITE if cine else YELLOW
        outline = 0 if cine else max(3, fs // 13)
        shadow, spacing, align, bold = (3 if cine else 2), (1 if cine else 0), 2, (0 if cine else -1)
        ml = mr = int(width * 0.05)
        margin_v = int(height * (0.20 if cine else 0.22)) if vertical else int(height * 0.08)
        per_line = max(6, int((width * 0.9) / (fs * 0.98)))
    per_line = min(per_line, MAX_LINE_CHARS)
    if color:
        primary = ass_color(color)
    styles = [
        f"Style: Default,{config.FONT_NAME},{fs},{primary},{primary},&H00000000&,&H66000000&,{bold},0,0,0,100,100,{spacing},0,1,{outline},{shadow},{align},"
        f"{ml},{mr},{margin_v},1"
    ]
    events = []
    if title.strip():
        tcol = ass_color(title_color) if title_color else (YELLOW if style == "pop" else WHITE)
        st, ev = _title_event(title, width, height, style, total or TITLE_SECONDS)
        styles.append(st.replace("{primary}", tcol))
        events.append(ev)
    head = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        + "\n".join(styles) + "\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    for c in caps:
        events.append(f"Dialogue: 0,{_ts(c.start)},{_ts(c.end + 0.08)},Default,,0,0,0,,{_styled(c, per_line, style)}")
    return head + "\n".join(events) + "\n"


def to_srt(caps: list[Cap]) -> str:
    """완성본 시간 기준 자막을 SRT로."""
    def t(x: float) -> str:
        ms = int(round(max(0.0, x) * 1000))
        h, ms = divmod(ms, 3600000)
        m, ms = divmod(ms, 60000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    return "\n".join(f"{i}\n{t(c.start)} --> {t(c.end)}\n{c.text}\n" for i, c in enumerate(caps, 1))
