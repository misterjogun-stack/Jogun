"""웹 서버. 실행: uvicorn app.main:app --port 8000"""
from __future__ import annotations

import shutil
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import config, pipeline, render, revise
from .looks import LOOKS
from .models import Options, Plan
from .planner import INDUSTRY_GUIDE

WEB_DIR = config.ROOT / "web"
@asynccontextmanager
async def lifespan(_app: FastAPI):
    _cleanup_old_jobs()
    yield


app = FastAPI(title="AutoCut", lifespan=lifespan)

jobs: dict[str, dict] = {}          # 화면에 보여줄 상태
plans: dict[str, list[Plan]] = {}   # 작업별 계획 버전 목록(0이 처음 결과)
jobs_lock = threading.Lock()
executor = ThreadPoolExecutor(max_workers=1)  # 음성 인식·렌더링은 무거우니 한 번에 하나씩


def _cleanup_old_jobs() -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    cutoff = time.time() - config.JOB_TTL_HOURS * 3600
    for d in config.DATA_DIR.iterdir():
        if d.is_dir() and d.stat().st_mtime < cutoff:
            shutil.rmtree(d, ignore_errors=True)




def _set(job_id: str, **kw) -> None:
    with jobs_lock:
        jobs[job_id].update(kw)


def _step(job_id: str):
    return lambda name, progress: _set(job_id, step=name, progress=round(progress, 3))


def _work(job_id: str, src: Path, workdir: Path, opts: Options, bgm: Path | None) -> None:
    try:
        _set(job_id, status="running")
        plan = pipeline.run(src, workdir, opts, _step(job_id), bgm_path=bgm)
        plans[job_id] = [plan]
        _set(job_id, status="done", version=0, plan=plan.model_dump(), has_bgm=bgm is not None)
    except Exception as e:
        _set(job_id, status="error", error=str(e) or type(e).__name__)


def _revise_work(job_id: str, workdir: Path, new_plan: Plan) -> None:
    version = len(plans[job_id])
    try:
        _set(job_id, status="running")
        pipeline.rerender(workdir, new_plan, version, _step(job_id))
        plans[job_id].append(new_plan)
        _set(job_id, status="done", version=version, plan=new_plan.model_dump())
    except Exception as e:
        with jobs_lock:   # 실패한 수정은 기록에서도 뺀다
            jobs[job_id]["history"] = jobs[job_id]["history"][: jobs[job_id]["version"]]
            jobs[job_id].update(status="done", step="완료", error_note=f"수정 반영에 실패했어요: {e}")


async def _save_upload(file: UploadFile, dest: Path, limit_mb: int, what: str) -> None:
    limit, size = limit_mb * 1024 * 1024, 0
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                raise HTTPException(413, f"{what}이(가) 너무 큽니다(최대 {limit_mb}MB).")
            f.write(chunk)


@app.post("/api/jobs")
async def create_job(
    file: UploadFile = File(...),
    bgm: UploadFile | None = File(None),
    industry: str = Form("general"),
    aspect: str = Form("vertical"),
    fit: str = Form("cover"),
    target_seconds: int = Form(0),
    captions: bool = Form(True),
    look: str = Form("none"),
    language: str = Form(""),
):
    if aspect not in ("vertical", "original") or fit not in ("cover", "blur"):
        raise HTTPException(400, "옵션 값이 올바르지 않습니다.")
    job_id = uuid.uuid4().hex
    workdir = config.DATA_DIR / job_id
    workdir.mkdir(parents=True)
    try:
        src = workdir / "source.mp4"
        await _save_upload(file, src, config.MAX_UPLOAD_MB, "영상 파일")
        bgm_path = None
        if bgm is not None and bgm.filename:
            suffix = Path(bgm.filename).suffix.lower()
            if suffix not in (".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac"):
                raise HTTPException(400, "배경음악은 mp3, m4a, wav, aac, ogg, flac만 올릴 수 있어요.")
            bgm_path = workdir / f"bgm{suffix}"
            await _save_upload(bgm, bgm_path, 100, "배경음악 파일")
    except HTTPException:
        shutil.rmtree(workdir, ignore_errors=True)
        raise
    opts = Options(
        industry=industry if industry in INDUSTRY_GUIDE else "general",
        aspect=aspect, fit=fit,
        target_seconds=max(0, min(target_seconds, 600)),
        captions=captions, look=look if look in LOOKS else "none", language=language or None,
    )
    with jobs_lock:
        jobs[job_id] = {"id": job_id, "status": "queued", "step": "대기 중", "progress": 0.0,
                        "version": 0, "history": []}
    executor.submit(_work, job_id, src, workdir, opts, bgm_path)
    return {"id": job_id}


def _job_or_404(job_id: str) -> dict:
    with jobs_lock:
        job = jobs.get(job_id)
    if job is None:
        raise HTTPException(404, "작업을 찾을 수 없습니다(서버가 다시 시작됐을 수 있어요).")
    return job


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    _job_or_404(job_id)
    with jobs_lock:
        return JSONResponse(dict(jobs[job_id]))


@app.post("/api/jobs/{job_id}/revise")
async def revise_job(job_id: str, instruction: str = Form(...)):
    """말로 고치기. 한 번에 한 가지씩 반영하고, 반영할 게 있으면 새 버전을 렌더링한다."""
    job = _job_or_404(job_id)
    instruction = instruction.strip()
    if not instruction or len(instruction) > 300:
        raise HTTPException(400, "수정 요청을 300자 이내로 적어 주세요.")
    with jobs_lock:
        if job["status"] != "done" or job_id not in plans:
            raise HTTPException(409, "영상이 완성된 뒤에 수정할 수 있어요.")
        job["status"] = "running"          # 동시에 두 번 수정되지 않게 먼저 잠근다
    workdir = config.DATA_DIR / job_id
    try:
        current = plans[job_id][job["version"]]
        duration = render.probe(workdir / "source.mp4").duration
        rev = revise.interpret(instruction, current, duration)
        new_plan, msgs = revise.apply_ops(current, rev.ops, pipeline.load_phrases(workdir), duration)
        new_plan = pipeline.normalize_plan(new_plan, duration)
    except Exception as e:
        _set(job_id, status="done")
        raise HTTPException(500, f"수정 요청을 처리하지 못했어요: {e}")
    messages = msgs + rev.unsupported
    changed = new_plan.model_dump() != current.model_dump()
    entry = {"instruction": instruction, "messages": messages}
    with jobs_lock:
        job.pop("error_note", None)
        if changed:   # history[i]는 버전 i+1을 만든 수정. 되돌린 뒤 새로 고치면 그 뒤 기록은 버린다
            job["history"] = job["history"][: job["version"]] + [entry]
        else:
            job["status"] = "done"
    if changed:
        del plans[job_id][job["version"] + 1:]
        executor.submit(_revise_work, job_id, workdir, new_plan)
    return {"applied": changed, "messages": messages}


@app.post("/api/jobs/{job_id}/undo")
def undo_job(job_id: str):
    job = _job_or_404(job_id)
    with jobs_lock:
        if job["status"] != "done" or job["version"] <= 0:
            raise HTTPException(409, "되돌릴 수정이 없어요.")
        job["version"] -= 1
        job["plan"] = plans[job_id][job["version"]].model_dump()
        job.pop("error_note", None)
    return {"version": job["version"]}


@app.post("/api/jobs/{job_id}/redo")
def redo_job(job_id: str):
    job = _job_or_404(job_id)
    with jobs_lock:
        if job["status"] != "done" or job["version"] + 1 >= len(plans.get(job_id, [])):
            raise HTTPException(409, "다시 적용할 수정이 없어요.")
        job["version"] += 1
        job["plan"] = plans[job_id][job["version"]].model_dump()
    return {"version": job["version"]}


@app.get("/api/jobs/{job_id}/video")
def get_video(job_id: str, download: bool = False, v: int | None = None):
    job = _job_or_404(job_id)
    version = job["version"] if v is None else v
    name = "out.mp4" if version == 0 else f"out_v{version}.mp4"
    path = config.DATA_DIR / job_id / name
    if not job_id.isalnum() or not path.exists():
        raise HTTPException(404, "완성된 영상이 없습니다.")
    return FileResponse(path, media_type="video/mp4", filename="autocut.mp4" if download else None)


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
