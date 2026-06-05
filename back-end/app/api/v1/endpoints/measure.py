# app/api/v1/endpoints/measure.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import json
from datetime import datetime
from pathlib import Path

from app.db.session import get_db
from app.core.security import get_user_id_from_cookie
from app.schemas.face import FaceOut
from app.crud.face import create_face
from app.crud.user import get_user_by_id
from app.services.face_result import compose_result_text
from app.services.pipeline import run_pipeline  # ← tapnet 파이프라인 (추론)

router = APIRouter(prefix="/measure", tags=["measure"])

# back-end/app/api/v1/endpoints/measure.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import json

from app.db.session import get_db
from app.core.security import get_user_id_from_cookie
from app.schemas.face import FaceOut
from app.crud.face import create_face
from app.crud.user import get_user_by_id
from app.services.face_result import compose_result_text
from app.services.pipeline import run_pipeline  # TabNet 추론

router = APIRouter()  # ⚠️ 여기서는 prefix 주지 않음 (routers.py에서 붙임)

# ── 1) 예측 전용: /api/v1/measure/face/predict
@router.post("/face/predict")
async def predict_face_only(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="이미지 파일이 비어 있습니다.")
    try:
        feats, proba, label = run_pipeline("face", data)
    except NotImplementedError as e:
        raise HTTPException(501, str(e))
    except Exception as e:
        raise HTTPException(400, str(e))
    return {"modality": "face", "pred_proba": proba, "pred_label": label, "features": feats}

# ── 2) 저장: /api/v1/measure/face/upload
@router.post("/face/upload", response_model=FaceOut)
async def upload_face_and_save(
    image: UploadFile = File(...),
    result_text: Optional[str] = Form(None),
    pred_label: Optional[int] = Form(None),
    features_json: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_cookie),
):
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="이미지 파일이 비어 있습니다.")

    features = None
    if features_json:
        try:
            features = json.loads(features_json)
        except Exception:
            raise HTTPException(status_code=400, detail="features_json 이 유효한 JSON이 아닙니다.")

    if result_text is not None:
        if result_text not in ("정상", "비정상"):
            raise HTTPException(status_code=400, detail="result_text 는 '정상' 또는 '비정상' 이어야 합니다.")
        is_abnormal = (result_text == "비정상")
    elif pred_label is not None:
        if pred_label not in (0, 1):
            raise HTTPException(status_code=400, detail="pred_label 은 0 또는 1 이어야 합니다.")
        is_abnormal = (pred_label == 1)
    else:
        feats2, proba2, label2 = run_pipeline("face", image_bytes)
        features = features or feats2
        is_abnormal = (label2 == 1)

    user = get_user_by_id(db, user_id)
    user_name = getattr(user, "name", None) or user_id
    final_result_text = compose_result_text(user_name_or_id=user_name, is_abnormal=is_abnormal, features=features)

    rec = create_face(
        db,
        user_id=user_id,
        image_bytes=image_bytes,
        image_mime=image.content_type or "image/jpeg",
        image_size=len(image_bytes),
        result_text=final_result_text,
        landmarks_json=features,
    )
    return FaceOut.from_orm(rec)  # pydantic v1
 