"""레퍼런스 영상의 색감·컷 속도를 재서 어울리는 룩을 추천한다.

  python tools/analyze_reference.py 레퍼런스/            # 폴더 안 영상 전부
  python tools/analyze_reference.py a.mov b.mp4 --trim-right 0.18

화면 녹화처럼 검은 띠가 있는 영상은 영상이 나오는 영역만 자동으로 찾아 잰다.
오른쪽에 좋아요·댓글 버튼이 떠 있으면 --trim-right 0.18 처럼 그 폭만큼 빼고 잰다.

이 도구는 스타일을 *분석*하는 용도다. 남의 영상은 내려받아 장면을 내 영상에 넣거나 다시 올리지 않는다.
"""
from __future__ import annotations

import argparse
import colorsys
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".webm"}
NOTICE = "※ 분석 전용: 남의 영상은 스타일 참고용으로만 보세요. 장면을 내 영상에 넣거나 다시 올리지 마세요."


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def duration(path: Path) -> float:
    r = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(r.stdout.strip() or 0)


def extract_frames(path: Path, out: Path, fps: float, limit: int) -> list[Path]:
    _run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vf", f"fps={fps}", "-frames:v", str(limit), str(out / "f%03d.png")])
    return sorted(out.glob("f*.png"))


def find_content_box(frames: list[np.ndarray], dark: float = 0.06) -> tuple[int, int]:
    """여러 프레임에서 '검지 않은 줄'이 가장 길게 이어진 구간(위, 아래)을 찾는다."""
    rows = np.median([f.mean(axis=(1, 2)) for f in frames], axis=0)
    ok = rows > dark
    best, cur_start, best_rng = 0, None, (0, len(rows))
    for i, v in enumerate(list(ok) + [False]):
        if v and cur_start is None:
            cur_start = i
        elif not v and cur_start is not None:
            if i - cur_start > best:
                best, best_rng = i - cur_start, (cur_start, i)
            cur_start = None
    return best_rng


def scene_cuts(path: Path, box: tuple[int, int, int, int]) -> list[float]:
    x0, y0, x1, y1 = box
    r = _run(["ffmpeg", "-v", "info", "-i", str(path), "-vf",
              f"crop={x1 - x0}:{y1 - y0}:{x0}:{y0},select='gt(scene,0.25)',showinfo", "-an", "-f", "null", "-"])
    return [float(m) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]


def analyze(path: Path, trim_right: float = 0.0, fps: float = 2.0, limit: int = 40) -> dict:
    with tempfile.TemporaryDirectory() as td:
        files = extract_frames(path, Path(td), fps, limit)
        if not files:
            raise RuntimeError("프레임을 읽지 못했어요")
        imgs = [np.asarray(Image.open(f).convert("RGB"), dtype=np.float32) / 255 for f in files]
    h, w = imgs[0].shape[:2]
    y0, y1 = find_content_box(imgs)
    x1 = int(w * (1 - trim_right)) // 2 * 2
    crops = [im[y0:y1, :x1] for im in imgs]
    px = np.concatenate([c.reshape(-1, 3)[::7] for c in crops])
    lum = px @ np.array([0.2126, 0.7152, 0.0722])
    mean = px.mean(0) * 255
    lo, hi = px[lum < np.percentile(lum, 15)].mean(0) * 255, px[lum > np.percentile(lum, 85)].mean(0) * 255
    cuts = scene_cuts(path, (0, y0, x1, y1))
    dur = duration(path)
    return {
        "영상 영역": f"{x1}x{y1 - y0} (원본 {w}x{h})",
        "길이(초)": round(dur, 1),
        "컷 수": len(cuts) + 1,
        "컷 평균 간격(초)": round(dur / (len(cuts) + 1), 1),
        "평균 R-B": round(float(mean[0] - mean[2]), 1),
        "그림자 B-R": round(float(lo[2] - lo[0]), 1),
        "밝은곳 R-B": round(float(hi[0] - hi[2]), 1),
        "어두운 5% 밝기": round(float(np.percentile(lum, 5)), 2),
        "밝은 5% 밝기": round(float(np.percentile(lum, 95)), 2),
        "날아간 비율(%)": round(float((lum > 0.95).mean() * 100), 1),
        "채도": round(float(np.mean([colorsys.rgb_to_hsv(*p)[1] for p in px[::40]])), 2),
    }


def suggest(m: dict) -> str:
    """측정값으로 AutoCut 룩을 추천한다. 눈으로 본 레퍼런스 2종에서 정한 단순 기준이라 참고용이다."""
    bright, warm = m["밝은 5% 밝기"] >= 0.88, m["평균 R-B"] >= 8
    if bright and warm:
        return "airy (밝고 따뜻하게 번지는 빛)"
    if m["그림자 B-R"] >= 5 and m["밝은 5% 밝기"] < 0.85:
        return "cinematic (차분하고 그림자가 푸른 색감)"
    return "none 또는 직접 조절 (뚜렷한 특징이 안 보여요)"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="+", type=Path)
    ap.add_argument("--trim-right", type=float, default=0.0, help="오른쪽에서 뺄 비율(버튼 영역), 예: 0.18")
    args = ap.parse_args()
    files: list[Path] = []
    for p in args.paths:
        files += sorted(x for x in p.iterdir() if x.suffix.lower() in VIDEO_EXT) if p.is_dir() else [p]
    if not files:
        print("분석할 영상이 없어요.")
        return 1
    print(NOTICE + "\n")
    for f in files:
        try:
            m = analyze(f, args.trim_right)
        except Exception as e:
            print(f"[{f.name}] 분석 실패: {e}\n")
            continue
        print(f"[{f.name}]")
        for k, v in m.items():
            print(f"  {k}: {v}")
        print(f"  → 추천 룩: {suggest(m)}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
