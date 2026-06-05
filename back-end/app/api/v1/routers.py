# back-end/app/api/v1/routers.py
from fastapi import APIRouter
from app.api.v1.endpoints import auth, measure, face, arm_predict, speech, results


api_router = APIRouter()

# /api/v1/auth/...
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# /api/v1/measure/...
api_router.include_router(measure.router, prefix="/measure", tags=["measure"])

# (선택) /api/v1/face/...
api_router.include_router(face.router, prefix="/face", tags=["face"])

api_router.include_router(arm_predict.router, prefix="/arm", tags=["arm"])

# (선택) /api/v1/endpoints/speech
api_router.include_router(speech.router, prefix="/speech", tags=["speech"])  # 이 줄 확인

# /api/v1/results/summary
api_router.include_router(results.router, prefix="/results", tags=["results"])


