import shutil
import subprocess

import pytest

from app.folder import run_folder
from app.models import Word
from app.reference import read_style_look

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg 필요")


def _vid(path, color, dur=6):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c={color}:size=320x568:rate=15:duration={dur}",
                    "-f", "lavfi", "-i", "sine=frequency=300", "-t", str(dur), "-pix_fmt", "yuv420p", str(path)], check=True)


def test_folder_mode_end_to_end(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    root = tmp_path / "AI 영상 편집"
    (root / "원본").mkdir(parents=True)
    (root / "레퍼런스").mkdir()
    _vid(root / "원본" / "촬영본.mp4", "gray", 8)
    _vid(root / "레퍼런스" / "ref.mp4", "0xF0E6D8", 4)      # 밝고 따뜻한 색 → airy 추천
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=600:duration=2",
                    str(root / "원본" / "music.mp3")], check=True)
    words = [Word(1.0, 1.8, "안녕"), Word(1.8, 2.4, " 하세요"), Word(5.0, 6.0, "끝")]
    logs = []
    outs = run_folder(root, title="테스트 제목", log=logs.append, words_for=lambda p: words)

    assert (root / "완성본").is_dir() and len(outs) == 1 and outs[0].exists()
    assert (root / "완성본" / "촬영본_자막.srt").read_text(encoding="utf-8").startswith("1\n")
    report = (root / "완성본" / "촬영본_잘린부분.txt").read_text(encoding="utf-8")
    assert "합계" in report and "잘림" in report
    style = root / "내 스타일.md"
    assert style.exists() and read_style_look(style) in ("airy", "cinematic", "none")
    assert "리듬과 분위기만" in style.read_text(encoding="utf-8")
    assert any("배경음악: music.mp3" in l for l in logs)

    # «내 스타일.md»의 look을 사람이 바꾸면 다음 편집에 반영
    text = style.read_text(encoding="utf-8")
    style.write_text(text.replace(f"look: {read_style_look(style)}", "look: cinematic", 1), encoding="utf-8")
    logs.clear()
    run_folder(root, log=logs.append, words_for=lambda p: words)
    assert any("룩: cinematic" in l for l in logs)


def test_folder_mode_empty_source(tmp_path):
    logs = []
    assert run_folder(tmp_path / "새폴더", log=logs.append) == []
    assert (tmp_path / "새폴더" / "원본").is_dir() and "촬영본을 넣어" in logs[-1]


def test_doctor_runs():
    from app import doctor
    names = [r[0] for r in doctor.checks()]
    assert "FFmpeg" in names and "한글 폰트" in names
