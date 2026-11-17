from app.captions import build_ass, to_srt
from app.models import Cap, Plan, Seg
from app.pipeline import cut_report, normalize_plan


def test_title_motion_per_look_and_color():
    for style, tag in (("pop", "\\t(0,220"), ("cinematic", "\\fsp10"), ("airy", "\\move(")):
        ass = build_ass([], 1080, 1920, style, title="우리 미용실", title_color="FF3B30", total=10)
        line = [l for l in ass.splitlines() if l.startswith("Dialogue: 1")][0]
        assert line.startswith("Dialogue: 1,0:00:00.00,0:00:03.00,Title") and tag in line
        assert "Style: Title," in ass and "&H00303BFF&" in ass   # 빨강(BGR)
    short = build_ass([], 1080, 1920, "pop", title="짧은 영상", total=2.0)
    assert "0:00:02.00,Title" in short                          # 영상이 3초보다 짧으면 그 길이까지
    assert "Style: Title" not in build_ass([], 1080, 1920, "pop")


def test_caption_lines_max_16_chars_and_scale():
    text = "가" * 30
    ass = build_ass([Cap(start=0, end=1, text=text)], 1080, 1920, "cinematic")
    body = ass.splitlines()[-1].split(",,")[-1]
    assert all(len(x) <= 16 for x in body.split("\\N"))
    size = lambda a: int(a.split("Style: Default,")[1].split(",")[1])
    assert size(build_ass([], 1080, 1920, "pop", scale=1.2)) > size(build_ass([], 1080, 1920, "pop"))


def test_cut_report_lists_removed_ranges():
    plan = normalize_plan(Plan(segments=[Seg(start=1, end=3), Seg(start=5, end=8)], captions=[]), 10)
    assert [(r.start, r.end) for r in plan.removed] == [(0.0, 1.0), (3.0, 5.0), (8.0, 10.0)]
    rep = cut_report(plan)
    assert rep[0].startswith("0.0초 ~ 1.0초") and "합계 5.0초 잘림, 완성본 5.0초" in rep[-1]
    assert cut_report(normalize_plan(Plan(segments=[Seg(start=0, end=10)], captions=[]), 10)) == ["잘린 부분이 없어요."]


def test_srt():
    srt = to_srt([Cap(start=0.5, end=1.25, text="안녕"), Cap(start=61, end=62, text="둘")])
    assert "1\n00:00:00,500 --> 00:00:01,250\n안녕" in srt and "2\n00:01:01,000 --> 00:01:02,000\n둘" in srt
