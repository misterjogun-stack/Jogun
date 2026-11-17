"""ffmpeg 호출: 정보 조회, 컷 편집 + 비율 변환 + 자막 합성 + 음량 정리."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Callable

from . import config
from .captions import build_ass, remap_captions
from .looks import grade_filter, caption_style
from .models import MediaInfo, Plan

FADE = 0.02  # 컷 경계에서 '틱' 소리를 막는 짧은 페이드(초)


def probe(path: Path) -> MediaInfo:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(r.stdout)
    video = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        raise ValueError("영상 스트림을 찾지 못했습니다.")
    # 폰 영상의 회전 정보 반영
    w, h = int(video["width"]), int(video["height"])
    rot = 0
    for sd in video.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    if rot in (90, -90, 270, -270):
        w, h = h, w
    duration = float(data["format"].get("duration") or video.get("duration") or 0)
    has_audio = any(s["codec_type"] == "audio" for s in data["streams"])
    return MediaInfo(duration=duration, width=w, height=h, has_audio=has_audio)


def target_size(info: MediaInfo, aspect: str) -> tuple[int, int]:
    if aspect == "vertical":
        return 1080, 1920
    scale = min(1.0, 1920 / max(info.width, info.height))
    return int(info.width * scale) // 2 * 2, int(info.height * scale) // 2 * 2


def build_filter(plan: Plan, w: int, h: int, fit: str, has_audio: bool, burn_captions: bool, look: str = "none") -> str:
    n = len(plan.segments)
    parts: list[str] = []
    for i, s in enumerate(plan.segments):
        parts.append(f"[0:v]trim=start={s.start:.3f}:end={s.end:.3f},setpts=PTS-STARTPTS[v{i}]")
        if has_audio:
            d = s.end - s.start
            f = min(FADE, d / 2)
            parts.append(
                f"[0:a]atrim=start={s.start:.3f}:end={s.end:.3f},asetpts=PTS-STARTPTS,"
                f"afade=t=in:d={f},afade=t=out:st={d - f:.3f}:d={f}[a{i}]"
            )
    inputs = "".join(f"[v{i}][a{i}]" if has_audio else f"[v{i}]" for i in range(n))
    parts.append(f"{inputs}concat=n={n}:v=1:a={1 if has_audio else 0}[vc]" + ("[ac]" if has_audio else ""))

    if fit == "blur" and w != h:
        parts.append(
            "[vc]split[b][f];"
            f"[b]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},boxblur=30:5[bb];"
            f"[f]scale={w}:{h}:force_original_aspect_ratio=decrease[ff];"
            "[bb][ff]overlay=(W-w)/2:(H-h)/2,setsar=1[vs]"
        )
    else:
        parts.append(f"[vc]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1[vs]")

    grade = grade_filter(look)
    if grade:
        parts.append(f"[vs]{grade}[vg]")
        last = "vg"
    else:
        last = "vs"
    if burn_captions:
        parts.append(f"[{last}]subtitles=captions.ass:fontsdir='{config.FONTS_DIR}'[v]")
    else:
        parts.append(f"[{last}]null[v]")
    if has_audio:
        parts.append("[ac]loudnorm=I=-16:TP=-1.5:LRA=11[a]")
    return ";\n".join(parts)


def render(
    src: Path,
    plan: Plan,
    out: Path,
    workdir: Path,
    info: MediaInfo,
    aspect: str,
    fit: str,
    burn_captions: bool,
    on_progress: Callable[[float], None] | None = None,
    look: str = "none",
) -> None:
    w, h = target_size(info, aspect)
    total = sum(s.end - s.start for s in plan.segments)
    caps = remap_captions(plan.captions, plan.segments) if burn_captions else []
    burn = burn_captions and bool(caps)
    (workdir / "captions.ass").write_text(build_ass(caps, w, h, caption_style(look)), encoding="utf-8")
    (workdir / "filter.txt").write_text(build_filter(plan, w, h, fit, info.has_audio, burn, look), encoding="utf-8")

    cmd = [
        "ffmpeg", "-y", "-v", "error", "-nostats", "-progress", "pipe:1",
        "-i", str(src.resolve()),
        "-filter_complex_script", "filter.txt",
        "-map", "[v]",
    ]
    if info.has_audio:
        cmd += ["-map", "[a]", "-c:a", "aac", "-b:a", "160k"]
    cmd += [
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(out.resolve()),
    ]
    proc = subprocess.Popen(cmd, cwd=workdir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    assert proc.stdout is not None
    for line in proc.stdout:
        if line.startswith("out_time_us=") and on_progress and total > 0:
            try:
                on_progress(min(1.0, int(line.split("=")[1]) / 1e6 / total))
            except ValueError:
                pass
    err = proc.stderr.read() if proc.stderr else ""
    if proc.wait() != 0:
        raise RuntimeError("렌더링 실패: " + err[-600:])
