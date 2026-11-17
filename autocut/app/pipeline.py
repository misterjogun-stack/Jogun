"""업로드된 영상 하나를 처음부터 끝까지 편집하는 흐름."""
from __future__ import annotations

import json
from dataclasses import asdict
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
    # 보고용: 잘려 나간 원본 구간(0.05초 이하 틈은 무시)
    removed, t = [], 0.0
    for sg in segs:
        if sg.start - t > 0.05:
            removed.append(Seg(start=round(t, 2), end=round(sg.start, 2)))
        t = sg.end
    if duration - t > 0.05:
        removed.append(Seg(start=round(t, 2), end=round(duration, 2)))
    plan.removed = removed
    return plan


def cut_report(plan: Plan) -> list[str]:
    """'어디를 얼마나 잘랐는지' 목록."""
    if not plan.removed:
        return ["잘린 부분이 없어요."]
    lines = [f"{r.start:.1f}초 ~ {r.end:.1f}초 ({r.end - r.start:.1f}초)" for r in plan.removed]
    total = sum(r.end - r.start for r in plan.removed)
    return lines + [f"합계 {total:.1f}초 잘림, 완성본 {sum(s.end - s.start for s in plan.segments):.1f}초"]


def run(
    src: Path,
    workdir: Path,
    opts: Options,
    set_step: Callable[[str, float], None],
    words: list[Word] | None = None,
    client=None,
    bgm_path: Path | None = None,
) -> Plan:
    """words를 넘기면 음성 인식을 건너뛴다(테스트·외부 인식 결과 사용 시)."""
    set_step("분석 중", 0.03)
    info = render.probe(src)
    if info.duration <= 0:
        raise ValueError("영상 길이를 읽지 못했습니다.")
    previewed = bool(opts.preview_seconds and opts.preview_seconds < info.duration)
    if previewed:
        info.duration = float(opts.preview_seconds)

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
    if previewed:
        words = [w for w in words if w.end <= info.duration]
    phrases: list[Phrase] = transcribe.words_to_phrases(words, max_chars=max_chars)
    (workdir / "transcript.json").write_text(
        json.dumps([p.__dict__ for p in phrases], ensure_ascii=False, indent=1), encoding="utf-8")

    set_step("편집 계획 짜는 중", 0.45)
    plan = planner.make_plan(phrases, info.duration, opts, client=client)
    plan.title_text = opts.title_text.strip()[:40]
    plan = normalize_plan(plan, info.duration)
    if previewed:
        plan.warnings.append(f"시험용으로 앞 {opts.preview_seconds}초만 편집했어요.")
    (workdir / "plan.json").write_text(plan.model_dump_json(indent=1), encoding="utf-8")

    (workdir / "opts.json").write_text(
        json.dumps({**asdict(opts), "bgm": bgm_path.name if bgm_path else None}, ensure_ascii=False), encoding="utf-8")
    (workdir / "plan_v0.json").write_text(plan.model_dump_json(indent=1), encoding="utf-8")

    set_step("영상 만드는 중", 0.55)
    render.render(
        src, plan, workdir / "out.mp4", workdir, info, opts.aspect, opts.fit, opts.captions,
        on_progress=lambda f: set_step("영상 만드는 중", 0.55 + 0.45 * f),
        look=opts.look, bgm_path=bgm_path,
    )
    set_step("완료", 1.0)
    return plan


def load_phrases(workdir: Path) -> list[Phrase]:
    path = workdir / "transcript.json"
    if not path.exists():
        return []
    return [Phrase(**d) for d in json.loads(path.read_text(encoding="utf-8"))]


def rerender(workdir: Path, plan: Plan, version: int, set_step: Callable[[str, float], None]) -> Path:
    """수정된 계획으로 새 버전 영상을 만든다. 첫 렌더 때 저장한 옵션을 그대로 쓴다."""
    opts = json.loads((workdir / "opts.json").read_text(encoding="utf-8"))
    src = workdir / "source.mp4"
    info = render.probe(src)
    bgm = workdir / opts["bgm"] if opts.get("bgm") else None
    out = workdir / f"out_v{version}.mp4"
    (workdir / f"plan_v{version}.json").write_text(plan.model_dump_json(indent=1), encoding="utf-8")
    set_step("수정 반영 중", 0.05)
    render.render(
        src, plan, out, workdir, info, opts["aspect"], opts["fit"], opts["captions"],
        on_progress=lambda f: set_step("수정 반영 중", 0.05 + 0.95 * f),
        look=opts["look"], bgm_path=bgm,
    )
    set_step("완료", 1.0)
    return out
