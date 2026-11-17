from app.captions import build_ass, remap_captions, wrap_text
from app.models import Cap, Options, Phrase, Plan, Seg, Word
from app.pipeline import normalize_plan
from app.planner import make_plan, plan_from_llm_result, rule_based_plan, segments_from_phrases
from app.transcribe import words_to_phrases


def W(t, s, e):
    return Word(s, e, t)


def test_phrases_split_on_pause_and_sentence_end():
    words = [W("안녕", 0, .3), W(" 하세요.", .3, .8), W(" 오늘은", .9, 1.2), W(" 펌", 1.2, 1.5), W(" 이야기", 3.0, 3.4)]
    ps = words_to_phrases(words)
    assert [p.text for p in ps] == ["안녕 하세요.", "오늘은 펌", "이야기"]
    assert [p.id for p in ps] == [0, 1, 2]


def test_phrases_split_on_length():
    words = [W(f" 단어{i}", i * .3, i * .3 + .25) for i in range(12)]
    ps = words_to_phrases(words, max_chars=10)
    assert all(len(p.text) <= 10 for p in ps) and len(ps) > 1


def test_segments_pad_merge_and_clamp():
    ps = [Phrase(0, 0.05, 1.0, "a"), Phrase(1, 1.2, 2.0, "b"), Phrase(2, 5.0, 5.9, "c")]
    segs = segments_from_phrases(ps, duration=6.0)
    assert len(segs) == 2                      # 0,1은 간격이 가까워 합쳐짐
    assert segs[0].start == 0.0                # 음수로 내려가지 않음
    assert segs[1].end <= 6.0


def test_remap_captions_after_cut():
    segs = [Seg(start=1.0, end=3.0), Seg(start=10.0, end=12.0)]
    caps = [Cap(start=1.5, end=2.5, text="x"), Cap(start=5.0, end=6.0, text="잘림"), Cap(start=10.5, end=11.0, text="y")]
    out = remap_captions(caps, segs)
    assert [c.text for c in out] == ["x", "y"]
    assert abs(out[0].start - 0.5) < 1e-6 and abs(out[1].start - 2.5) < 1e-6


def test_ass_escapes_and_emphasis():
    ass = build_ass([Cap(start=0, end=1, text="가{나}다 라마바", emphasis=["라마바"])], 1080, 1920)
    assert "{나}" not in ass and "(나)" in ass
    assert "\\fscx118" in ass
    assert "PlayResX: 1080" in ass


def test_wrap_text_two_lines():
    assert wrap_text("짧아요", 12) == "짧아요"
    assert "\\N" in wrap_text("이것은 조금 긴 자막 문장입니다", 8)


def test_llm_result_uses_only_valid_ids_and_fixes():
    ps = [Phrase(i, i * 2.0, i * 2.0 + 1.5, f"문장{i}") for i in range(5)]
    plan = plan_from_llm_result(
        {"keep": [[1, 2], [99, 100]], "fixes": [{"id": 1, "text": "수정됨"}], "emphasis": [{"id": 2, "words": ["문장2", "없는말"]}],
         "title": "t", "post_text": "p", "hashtags": ["#a", "b"]},
        ps, 20)
    assert [c.text for c in plan.captions] == ["수정됨", "문장2"]
    assert plan.captions[1].emphasis == ["문장2"]
    assert plan.hashtags == ["a", "b"]


def test_llm_result_empty_keep_falls_back_to_all():
    ps = [Phrase(0, 0, 1, "a"), Phrase(1, 3, 4, "b")]
    plan = plan_from_llm_result({"keep": [[50, 60]], "title": "", "post_text": "", "hashtags": []}, ps, 10)
    assert len(plan.captions) == 2 and plan.warnings


def test_make_plan_without_key_uses_rules(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    plan = make_plan([Phrase(0, 0, 1, "a")], 5, Options())
    assert plan.segments and any("ANTHROPIC_API_KEY" in w for w in plan.warnings)


def test_make_plan_llm_failure_falls_back():
    class Boom:
        class messages:
            @staticmethod
            def create(**kw):
                raise RuntimeError("down")
    plan = make_plan([Phrase(0, 0, 1, "a")], 5, Options(), client=Boom())
    assert plan.segments and plan.warnings


def test_make_plan_with_fake_client():
    class Block:
        type = "tool_use"
        input = {"keep": [[1, 1]], "title": "제목", "post_text": "글", "hashtags": ["태그"]}

    class Resp:
        content = [Block()]

    class Fake:
        class messages:
            @staticmethod
            def create(**kw):
                assert kw["tool_choice"]["name"] == "submit_edit_plan"
                assert "#1 [" in kw["messages"][0]["content"]
                return Resp()
    ps = [Phrase(0, 0, 1, "버림"), Phrase(1, 3, 4, "남김")]
    plan = make_plan(ps, 10, Options(industry="hair"), client=Fake())
    assert [c.text for c in plan.captions] == ["남김"] and plan.title == "제목"


def test_normalize_plan_clamps_and_merges():
    plan = Plan(segments=[Seg(start=-1, end=2), Seg(start=1.5, end=3), Seg(start=9.9, end=30), Seg(start=4, end=4.1)], captions=[])
    out = normalize_plan(plan, 10)
    assert [(s.start, s.end) for s in out.segments] == [(0.0, 3.0)]  # 9.9~10 와 4~4.1 은 너무 짧아 버림


def test_normalize_plan_empty_uses_full():
    out = normalize_plan(rule_based_plan([], 7.0), 7.0)
    assert out.segments[0].end == 7.0


def test_cinematic_look_filter_and_caption_style():
    from app.looks import caption_style, grade_filter
    from app.render import build_filter
    assert grade_filter("none") == "" and "colorbalance" in grade_filter("cinematic")
    assert grade_filter("unknown") == ""
    plan = Plan(segments=[Seg(start=0, end=2)], captions=[])
    f = build_filter(plan, 1080, 1920, "cover", True, False, "cinematic")
    assert "[vs]curves=" in f and "[vg]null[v]" in f
    assert "[vs]null[v]" in build_filter(plan, 1080, 1920, "cover", True, False, "none")
    assert caption_style("cinematic") == "cinematic" and caption_style("none") == "pop"


def test_cinematic_ass_is_small_white_with_amber_emphasis():
    cap = Cap(start=0, end=1, text="펌이 자연스럽게", emphasis=["자연스럽게"])
    pop = build_ass([cap], 1080, 1920, "pop")
    cine = build_ass([cap], 1080, 1920, "cinematic")
    size = lambda a: int(a.split("Style: Default,")[1].split(",")[1])
    assert size(cine) < size(pop)
    assert "&H00FFFFFF&,&H00FFFFFF&" in cine      # 기본 글자색 흰색
    assert "&H001EBEFA&" in cine                  # 강조는 호박색
