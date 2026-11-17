"""레퍼런스 영상의 색감·컷 속도를 재서 어울리는 룩을 추천한다.

  python tools/analyze_reference.py 레퍼런스/            # 폴더 안 영상 전부
  python tools/analyze_reference.py a.mov b.mp4 --trim-right 0.18

화면 녹화처럼 검은 띠가 있는 영상은 영상이 나오는 영역만 자동으로 찾아 잰다.
오른쪽에 좋아요·댓글 버튼이 떠 있으면 --trim-right 0.18 처럼 그 폭만큼 빼고 잰다.

이 도구는 스타일을 *분석*하는 용도다. 남의 영상은 내려받아 장면을 내 영상에 넣거나 다시 올리지 않는다.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.reference import NOTICE, VIDEO_EXT, analyze, suggest  # noqa: E402

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
