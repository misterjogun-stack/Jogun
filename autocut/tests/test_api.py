"""서버 전체 흐름. 음성 인식만 가짜로 바꾸고 ffmpeg 렌더링은 실제로 돌린다."""
import shutil
import subprocess
import time

import pytest

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg 필요")


@pytest.fixture()
def client(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from app import config, main, transcribe
    from app.models import Word
    monkeypatch.setattr(config, "DATA_DIR", tmp_path / "data")
    (tmp_path / "data").mkdir()
    words = [Word(1.0, 1.6, "첫"), Word(1.6, 2.2, " 문장"), Word(5.0, 5.6, "두번째"), Word(5.6, 6.4, " 문장")]
    monkeypatch.setattr(transcribe, "transcribe_words", lambda *a, **k: words)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    return TestClient(main.app)


@pytest.fixture()
def media(tmp_path):
    vid, bgm = tmp_path / "in.mp4", tmp_path / "music.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=8",
                    "-f", "lavfi", "-i", "sine=frequency=300:duration=8", "-shortest", "-pix_fmt", "yuv420p", str(vid)], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=600:duration=2", str(bgm)], check=True)
    return vid, bgm


def wait_done(client, jid, timeout=120):
    t = time.time()
    while time.time() - t < timeout:
        j = client.get(f"/api/jobs/{jid}").json()
        if j["status"] in ("done", "error"):
            return j
        time.sleep(0.3)
    raise AssertionError("시간 초과")


def duration(client, jid, v):
    r = client.get(f"/api/jobs/{jid}/video", params={"v": v})
    assert r.status_code == 200
    p = f"/tmp/_t_{jid}_{v}.mp4"
    open(p, "wb").write(r.content)
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True)
    return float(out.stdout)


def test_full_flow_revise_undo_redo(client, media):
    vid, bgm = media
    r = client.post("/api/jobs", files={"file": ("in.mp4", vid.read_bytes()), "bgm": ("m.mp3", bgm.read_bytes())},
                    data={"aspect": "original", "look": "airy"})
    jid = r.json()["id"]
    j = wait_done(client, jid)
    assert j["status"] == "done", j.get("error")
    d0 = duration(client, jid, 0)
    assert 3 < d0 < 6                                   # 말이 있는 두 구간만 남음

    # 1) 잘린 부분 살리기 → 더 길어짐
    r = client.post(f"/api/jobs/{jid}/revise", data={"instruction": "2초에서 5초 사이 잘린 부분 다시 살려 줘"}).json()
    assert r["applied"] and "되살렸" in r["messages"][0]
    j = wait_done(client, jid)
    assert j["version"] == 1 and len(j["history"]) == 1
    assert duration(client, jid, 1) > d0 + 1.5

    # 2) 배경음악 줄이기, 자막색, 끝 자르기: 하나씩
    for text in ("배경음악 조금 더 줄여 줘", "자막 글자색을 노란색으로 바꿔 줘", "마지막 1초는 잘라 줘"):
        assert client.post(f"/api/jobs/{jid}/revise", data={"instruction": text}).json()["applied"]
        assert wait_done(client, jid)["status"] == "done"
    j = client.get(f"/api/jobs/{jid}").json()
    assert j["version"] == 4 and j["plan"]["caption_color"] == "FFE500" and j["plan"]["music_volume"] < 0.25
    assert duration(client, jid, 4) < duration(client, jid, 3) - 0.5

    # 3) 반영할 게 없는 요청은 기록·버전에 넣지 않고 이유만 알려 줌
    r = client.post(f"/api/jobs/{jid}/revise", data={"instruction": "영상에 불꽃 효과를 넣어 줘"}).json()
    assert not r["applied"] and "지원하지 않아요" in r["messages"][0]
    assert client.get(f"/api/jobs/{jid}").json()["version"] == 4

    # 4) 되돌리기 / 다시 적용 / 되돌린 뒤 새 수정은 뒤 기록을 버림
    assert client.post(f"/api/jobs/{jid}/undo").json()["version"] == 3
    assert client.post(f"/api/jobs/{jid}/redo").json()["version"] == 4
    client.post(f"/api/jobs/{jid}/undo"); client.post(f"/api/jobs/{jid}/undo")
    assert client.post(f"/api/jobs/{jid}/revise", data={"instruction": "처음 1초 잘라 줘"}).json()["applied"]
    j = wait_done(client, jid)
    assert j["version"] == 3 and len(j["history"]) == 3
    assert client.post(f"/api/jobs/{jid}/redo").status_code == 409


def test_caption_edit_srt_and_title(client, media):
    vid, _ = media
    r = client.post("/api/jobs", files={"file": ("in.mp4", vid.read_bytes())},
                    data={"aspect": "original", "title_text": "봄 펌 추천", "preview_seconds": "7"})
    jid = r.json()["id"]
    j = wait_done(client, jid)
    assert j["status"] == "done", j.get("error")
    assert j["plan"]["title_text"] == "봄 펌 추천" and j["plan"]["removed"]
    assert any("앞 7초" in w for w in j["plan"]["warnings"])
    assert duration(client, jid, 0) <= 7.1

    caps = client.get(f"/api/jobs/{jid}/captions").json()["captions"]
    assert [c["text"] for c in caps] == ["첫 문장", "두번째 문장"] and caps[0]["time"] is not None
    srt = client.get(f"/api/jobs/{jid}/captions.srt").text
    assert "첫 문장" in srt and "-->" in srt
    # 고치기: 첫 자막 글자 수정, 둘째는 지우기
    r = client.post(f"/api/jobs/{jid}/captions", json={"texts": ["첫 문장입니다", ""]}).json()
    assert r["applied"] and "2곳" in r["messages"][0]
    j = wait_done(client, jid)
    assert j["version"] == 1 and [c["text"] for c in j["plan"]["captions"]] == ["첫 문장입니다"]
    assert client.post(f"/api/jobs/{jid}/captions", json={"texts": ["a", "b", "c"]}).status_code == 400
    assert client.get(f"/api/jobs/{jid}").json()["status"] == "done"          # 실패해도 잠기지 않음
    # 제목 색·자막 크기 말로 고치기
    for text in ("제목 글자색을 노란색으로 바꿔 줘", "자막 더 크게 해 줘"):
        assert client.post(f"/api/jobs/{jid}/revise", data={"instruction": text}).json()["applied"]
        wait_done(client, jid)
    plan = client.get(f"/api/jobs/{jid}").json()["plan"]
    assert plan["title_color"] == "FFE500" and plan["caption_scale"] == 1.2


def test_errors(client, media):
    vid, _ = media
    assert client.get("/api/jobs/nope").status_code == 404
    assert client.post("/api/jobs/nope/revise", data={"instruction": "x"}).status_code == 404
    r = client.post("/api/jobs", files={"file": ("in.mp4", vid.read_bytes()), "bgm": ("m.exe", b"x")})
    assert r.status_code == 400 and "배경음악" in r.json()["detail"]
