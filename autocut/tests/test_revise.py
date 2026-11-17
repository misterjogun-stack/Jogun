from app.models import Cap, Phrase, Plan, Seg
from app.revise import Op, apply_ops, interpret, parse_rules

PHRASES = [Phrase(0, 1.0, 3.0, "첫 말"), Phrase(1, 12.5, 14.5, "잘렸던 말"), Phrase(2, 20.0, 22.0, "끝 말")]


def base_plan():
    return Plan(segments=[Seg(start=0.9, end=3.2), Seg(start=19.9, end=22.2)],
                captions=[Cap(start=1.0, end=3.0, text="첫 말"), Cap(start=20.0, end=22.0, text="끝 말")])


def test_guide_example_restore():
    r = parse_rules("12초에서 15초 사이 잘린 부분 다시 살려 줘.")
    assert [o.type for o in r.ops] == ["restore"] and (r.ops[0].start, r.ops[0].end) == (12, 15) and not r.unsupported
    plan, msgs = apply_ops(base_plan(), r.ops, PHRASES, 30)
    assert any(s.start <= 12 and s.end >= 15 for s in plan.segments)
    assert "잘렸던 말" in [c.text for c in plan.captions]         # 그 구간 자막도 되살아남
    assert "되살렸" in msgs[0]


def test_guide_example_music_lower_compounds():
    r = parse_rules("배경음악 조금 더 줄여 줘. 말소리가 묻혀.")
    assert r.ops[0].type == "music_volume" and r.ops[0].factor == 0.75
    plan, _ = apply_ops(base_plan(), r.ops, PHRASES, 30)
    assert abs(plan.music_volume - 0.25 * 0.75) < 1e-3


def test_guide_example_color_and_trim_in_one_sentence():
    r = parse_rules("제목 글자색을 노란색으로 바꾸고, 마지막 2초는 잘라 줘.")
    assert [o.type for o in r.ops] == ["trim_end"]
    assert len(r.unsupported) == 1 and "제목" in r.unsupported[0]   # 제목 글자는 아직 없음 → 솔직히 안내
    plan, _ = apply_ops(base_plan(), r.ops, PHRASES, 30)
    assert abs(sum(s.end - s.start for s in plan.segments) - (2.3 + 2.3 - 2.0)) < 1e-6


def test_caption_color():
    r = parse_rules("자막 글자색을 노란색으로 바꿔줘")
    assert r.ops[0].type == "caption_color" and r.ops[0].color == "FFE500"
    assert parse_rules("자막 색을 #3A8DFF 로 바꿔줘").ops[0].color == "3A8DFF"
    assert parse_rules("자막 글자색을 무지개색으로").unsupported


def test_cut_and_trim_start_and_music_off():
    r = parse_rules("20초에서 21초는 잘라줘")
    plan, _ = apply_ops(base_plan(), r.ops, PHRASES, 30)
    assert all(not (s.start < 20.5 < s.end) for s in plan.segments)
    plan, _ = apply_ops(base_plan(), parse_rules("처음 1초 잘라줘").ops, PHRASES, 30)
    assert abs(plan.segments[0].start - 1.9) < 1e-6
    plan, _ = apply_ops(base_plan(), parse_rules("음악 꺼줘").ops, PHRASES, 30)
    assert plan.music_volume == 0.0


def test_unknown_request_is_reported_not_guessed():
    r = parse_rules("영상에 불꽃 효과를 넣어줘")
    assert not r.ops and r.unsupported


def test_original_plan_not_mutated_and_bounds_guard():
    plan = base_plan()
    new, msgs = apply_ops(plan, [Op(type="restore", start=40, end=50), Op(type="trim_end", seconds=999)], PHRASES, 30)
    assert plan.segments[0].start == 0.9 and len(msgs) == 2
    assert len(new.segments) == len(plan.segments)       # 범위 밖·과도한 요청은 무시


def test_llm_interpretation_used_then_falls_back():
    class Blk:
        type = "tool_use"
        input = {"ops": [{"type": "trim_end", "seconds": 3}], "unsupported": []}

    class Fake:
        class messages:
            @staticmethod
            def create(**kw):
                assert kw["tool_choice"]["name"] == "submit_revision"
                return type("R", (), {"content": [Blk()]})()
    assert interpret("아무 말", base_plan(), 30, client=Fake()).ops[0].seconds == 3

    class Boom:
        class messages:
            @staticmethod
            def create(**kw):
                raise RuntimeError("x")
    assert interpret("마지막 2초 잘라줘", base_plan(), 30, client=Boom()).ops[0].seconds == 2
