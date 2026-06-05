from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.db.session import get_db
from app.crud.arm import create_arm
# ↓ 기존 추론/전처리 유틸
from app.services.inference.arm_xgb_runner import predict_proba_and_label
from app.services.features.arm_features import extract_features_from_two_images
from app.core.security import get_user_id_from_cookie

router = APIRouter(tags=["arm"])

# ★ 추가: ARM 라벨 정규화 (모델 라벨 → 'normal'/'abnormal')


@router.post("/predict")
async def predict_arm_v1(
    start_file: UploadFile = File(...),
    end_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_cookie),
):
    # 1) 업로드 바이트
    sb = await start_file.read()
    eb = await end_file.read()
    if not sb or not eb:
        raise HTTPException(status_code=400, detail="start_file, end_file 모두 필요합니다.")

    # 2) 특징 추출/추론
    feats = extract_features_from_two_images(sb, eb) or {}
    proba, label = predict_proba_and_label(feats)

    # 3) 라벨 정규화

    # 4) DB 저장 (정규화 라벨로 저장 권장)
    row = create_arm(
        db,
        user_id=user_id,
        start_bytes=sb,
        start_mime=start_file.content_type or "image/png",
        end_bytes=eb,
        end_mime=end_file.content_type or "image/png",
        label=label,  # ★ 핵심: 'normal' / 'abnormal' 로 저장
        confidence=float(proba) if proba is not None else None,
        features={"version": "v1", "feats_len": len(feats or [])},
    
    )

    # 5) 응답: 프론트가 바로 쓰게 URL 포함
    return JSONResponse({
        "id": row.arm_id,
        "label": label,  # ★ 프론트 표준 라벨
        "confidence": round(float(proba), 6) if proba is not None else None,
        "start_image_url": f"/api/v1/arm/{row.arm_id}/image/start",
        "end_image_url":   f"/api/v1/arm/{row.arm_id}/image/end",
    })


# DB에 저장된 이미지를 스트리밍해서 내려주는 엔드포인트 2개
@router.get("/{arm_id}/image/start")
def get_arm_start_image(arm_id: int, db: Session = Depends(get_db)):
    from app.models.arm import Arm
    row = db.get(Arm, arm_id)
    if not row or not row.start_image_blob:
        raise HTTPException(status_code=404, detail="not found")
    return Response(content=row.start_image_blob, media_type=row.start_image_mime or "image/png")

@router.get("/{arm_id}/image/end")
def get_arm_end_image(arm_id: int, db: Session = Depends(get_db)):
    from app.models.arm import Arm
    row = db.get(Arm, arm_id)
    if not row or not row.end_image_blob:
        raise HTTPException(status_code=404, detail="not found")
    return Response(content=row.end_image_blob, media_type=row.end_image_mime or "image/png")
