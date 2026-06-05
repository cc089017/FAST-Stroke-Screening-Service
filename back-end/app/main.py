# back-end/app/main.py
from __future__ import annotations

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers import api_router
from app.db.base import Base


# .env 로드 (SPEECH_VAD_MODE, SPEECH_DTW_SCALE_MODE 등 환경변수 사용 가능)
load_dotenv()

app = FastAPI(
    title="FAST API",
    description="뇌졸중 조기 진단 시스템 API",
    version="1.0.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# API 라우터 등록
app.include_router(api_router, prefix="/api/v1")

# 데이터베이스 테이블 생성
# Base.metadata.create_all(bind=engine)  # 이 부분 제거 또는 수정


@app.get("/")
async def root():
    return {"message": "FAST API Server is running!"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
