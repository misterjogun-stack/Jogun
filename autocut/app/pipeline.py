"""업로드된 영상 하나를 처음부터 끝까지 편집하는 흐름."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from . import planner, render, transcribe
from .models import Options, Phrase, Plan, Seg, Word


def normalize_plan(plan: Plan, duration: float) -> Plan:
    """범위를 벗어난 구간, 겹침, 너무 짧은 구간을 정리한다. 결과가 비면 원본 전체를 쓴다."""
    segs: list[Seg] = []
    for s in sorted(plan.segments, key=lambda x: x.start):
        a, b = max(0.0, s.start), min(duration, s.end)
        if b - a < planner.MIN_SEG:
            continue
        if segs and a <= segs[-1].end:
            segs[-1].end = max(segs[-1].end, b)
        else:
            segs.append(Seg(start=a, end=b))
    if not segs:
        segs = [Seg(start=0, end=duration)]
        plan.warnings.append("유효한 구간이 없어 원본 전체를 사용했습니다.")
    plan.segments = segs
    return plan


def run(
    src: Path,
    workdir: Path,
    opts: Options,
    set_step: Callable[[str, float], None],
    words: list[Word] | None = None,
    client=None,
) -> Plan:
    """words를 넘기면 음성 인식을 건너뛴다(테스트·외부 인식 결과 사용 시)."""
    set_step("분석 중", 0.03)
    info = render.probe(src)
    if info.duration <= 0:
        raise ValueError("영상 길이를 읽지 못했습니다.")

    w, h = render.target_size(info, opts.aspect)
    max_chars = 22 if h > w else 40

    if words is None:
        if info.has_audio:
            set_step("음성 인식 중", 0.10)
            try:
                words = transcribe.transcribe_words(src, opts.language)
            except Exception as e:
                raise RuntimeError(
                    f"음성 인식 모델을 불러오거나 실행하지 못했습니다({type(e).__name__}: {e}). "
                    "처음 실행할 때는 모델을 인터넷에서 내려받아야 합니다."
                ) from e
        else:
            words = []
    phrases: list[Phrase] = transcribe.words_to_phrases(words, max_chars=max_chars)
    (workdir / "transcript.json").write_text(
        json.dumps([p.__dict__ for p in phrases], ensure_ascii=False, indent=1), encoding="utf-8")

    set_step("편집 계획 짜는 중", 0.45)
    plan = planner.make_plan(phrases, info.duration, opts, client=client)
    plan = normalize_plan(plan, info.duration)
    (workdir / "plan.json").write_text(plan.model_dump_json(indent=1), encoding="utf-8")

    set_step("영상 만드는 중", 0.55)
    render.render(
        src, plan, workdir / "out.mp4", workdir, info, opts.aspect, opts.fit, opts.captions,
        on_progress=lambda f: set_step("영상 만드는 중", 0.55 + 0.45 * f),
    )
    set_step("완료", 1.0)
    return plan
