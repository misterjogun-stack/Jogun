"""웹 서버. 실행: uvicorn app.main:app --port 8000"""
from __future__ import annotations

import shutil
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import config, pipeline
from .models import Options
from .looks import LOOKS
from .planner import INDUSTRY_GUIDE

WEB_DIR = config.ROOT / "web"
app = FastAPI(title="AutoCut")

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()
executor = ThreadPoolExecutor(max_workers=1)  # 음성 인식·렌더링은 무거우니 한 번에 하나씩


def _cleanup_old_jobs() -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    cutoff = time.time() - config.JOB_TTL_HOURS * 3600
    for d in config.DATA_DIR.iterdir():
        if d.is_dir() and d.stat().st_mtime < cutoff:
            shutil.rmtree(d, ignore_errors=True)


@app.on_event("startup")
def _startup() -> None:
    _cleanup_old_jobs()


def _set(job_id: str, **kw) -> None:
    with jobs_lock:
        jobs[job_id].update(kw)


def _work(job_id: str, src: Path, workdir: Path, opts: Options) -> None:
    def step(name: str, progress: float) -> None:
        _set(job_id, step=name, progress=round(progress, 3))

    try:
        _set(job_id, status="running")
        plan = pipeline.run(src, workdir, opts, step)
        _set(job_id, status="done", plan=plan.model_dump())
    except Exception as e:
        _set(job_id, status="error", error=str(e) or type(e).__name__)


@app.post("/api/jobs")
async def create_job(
    file: UploadFile = File(...),
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
    src = workdir / "source.mp4"
    limit = config.MAX_UPLOAD_MB * 1024 * 1024
    size = 0
    with src.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                f.close()
                shutil.rmtree(workdir, ignore_errors=True)
                raise HTTPException(413, f"파일이 너무 큽니다(최대 {config.MAX_UPLOAD_MB}MB).")
            f.write(chunk)
    opts = Options(
        industry=industry if industry in INDUSTRY_GUIDE else "general",
        aspect=aspect, fit=fit,
        target_seconds=max(0, min(target_seconds, 600)),
        captions=captions, look=look if look in LOOKS else "none", language=language or None,
    )
    with jobs_lock:
        jobs[job_id] = {"id": job_id, "status": "queued", "step": "대기 중", "progress": 0.0}
    executor.submit(_work, job_id, src, workdir, opts)
    return {"id": job_id}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if job is None:
        raise HTTPException(404, "작업을 찾을 수 없습니다(서버가 다시 시작됐을 수 있어요).")
    return JSONResponse(job)


@app.get("/api/jobs/{job_id}/video")
def get_video(job_id: str, download: bool = False):
    path = config.DATA_DIR / job_id / "out.mp4"
    if not job_id.isalnum() or not path.exists():
        raise HTTPException(404, "완성된 영상이 없습니다.")
    return FileResponse(path, media_type="video/mp4", filename="autocut.mp4" if download else None)


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
