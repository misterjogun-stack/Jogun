"""폴더 모드: 폴더 하나만 지정하면 원본 → 완성본.

  python -m app.folder "~/Desktop/AI 영상 편집" --title "봄 펌 추천"
  python -m app.folder "~/Desktop/AI 영상 편집" --preview 60      # 앞 1분만 시험

폴더 구성(없으면 만들어 줌)
  원본/      내가 찍은 촬영본 + 깔고 싶은 배경음악 파일(mp3·m4a·wav, 첫 번째 것을 씀)
  레퍼런스/   마음에 드는 영상(직접 저장한 것). 분석해서 «내 스타일.md»를 만든다
  완성본/    결과: <이름>_편집.mp4, <이름>_자막.srt, <이름>_잘린부분.txt
"""
from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
from pathlib import Path

from . import pipeline
from .captions import remap_captions, to_srt
from .looks import LOOKS
from .models import Options
from .reference import NOTICE, STYLE_FILE, VIDEO_EXT, read_style_look, write_style_file

AUDIO_EXT = {".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac"}
DIRS = ("원본", "레퍼런스", "완성본")


def ensure_dirs(root: Path) -> dict[str, Path]:
    out = {}
    for d in DIRS:
        (root / d).mkdir(parents=True, exist_ok=True)
        out[d] = root / d
    return out


def run_folder(root: Path, title: str = "", preview: int = 0, look: str | None = None, aspect: str = "vertical",
               restyle: bool = False, trim_right: float = 0.0, log=print, client=None, words_for=None) -> list[Path]:
    """words_for(path) -> list[Word]|None 를 주면 음성 인식 대신 그 결과를 쓴다(테스트용)."""
    d = ensure_dirs(root)
    style_path = root / STYLE_FILE
    refs = sorted(p for p in d["레퍼런스"].iterdir() if p.suffix.lower() in VIDEO_EXT)
    if refs and (restyle or not style_path.exists()):
        log(NOTICE)
        log(f"레퍼런스 {len(refs)}개를 분석해 «{STYLE_FILE}»를 만드는 중…")
        write_style_file(root, refs, trim_right, client=client)
        log(f"  → {style_path}")
    chosen = look or read_style_look(style_path) or "none"
    if chosen not in LOOKS:
        chosen = "none"
    videos = sorted(p for p in d["원본"].iterdir() if p.suffix.lower() in VIDEO_EXT)
    musics = sorted(p for p in d["원본"].iterdir() if p.suffix.lower() in AUDIO_EXT)
    if not videos:
        log(f"'{d['원본']}'에 촬영본을 넣어 주세요.")
        return []
    bgm = musics[0] if musics else None
    log(f"룩: {chosen} · 배경음악: {bgm.name if bgm else '없음'} · 촬영본 {len(videos)}개")
    outputs = []
    for v in videos:
        log(f"\n[{v.name}] 편집 중…")
        with tempfile.TemporaryDirectory() as td:
            work = Path(td)
            src = work / "source.mp4"
            shutil.copyfile(v, src)
            bgm_local = None
            if bgm:
                bgm_local = work / f"bgm{bgm.suffix.lower()}"
                shutil.copyfile(bgm, bgm_local)
            opts = Options(look=chosen, aspect=aspect, title_text=title, preview_seconds=preview)
            last = [""]

            def step(name, p):
                if name != last[0]:
                    log(f"  - {name}")
                    last[0] = name
            plan = pipeline.run(src, work, opts, step, words=words_for(v) if words_for else None,
                                client=client, bgm_path=bgm_local)
            out = d["완성본"] / f"{v.stem}_편집.mp4"
            shutil.copyfile(work / "out.mp4", out)
            (d["완성본"] / f"{v.stem}_자막.srt").write_text(to_srt(remap_captions(plan.captions, plan.segments)), encoding="utf-8")
            report = pipeline.cut_report(plan)
            (d["완성본"] / f"{v.stem}_잘린부분.txt").write_text(
                "잘린 부분(원본 기준 시간)\n" + "\n".join(report) + "\n" + "".join(f"※ {w}\n" for w in plan.warnings),
                encoding="utf-8")
        log("  잘린 부분:")
        for line in report:
            log(f"    {line}")
        for w in plan.warnings:
            log(f"  ※ {w}")
        log(f"  → {out}")
        outputs.append(out)
    return outputs


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", type=Path)
    ap.add_argument("--title", default="", help="첫 3초 제목")
    ap.add_argument("--preview", type=int, default=0, help="앞 N초만 시험 편집(예: 60)")
    ap.add_argument("--look", choices=sorted(LOOKS), help="«내 스타일.md» 대신 이 룩을 씀")
    ap.add_argument("--aspect", choices=("vertical", "original"), default="vertical")
    ap.add_argument("--restyle", action="store_true", help="«내 스타일.md»를 레퍼런스로 다시 만듦")
    ap.add_argument("--trim-right", type=float, default=0.0, help="레퍼런스 오른쪽 버튼 영역 비율(예: 0.18)")
    a = ap.parse_args()
    try:
        outs = run_folder(a.folder.expanduser(), a.title, a.preview, a.look, a.aspect, a.restyle, a.trim_right)
    except Exception as e:
        print(f"실패: {e}")
        return 1
    return 0 if outs else 1


if __name__ == "__main__":
    sys.exit(main())
