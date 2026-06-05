from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Optional
import json

from app.db.session import get_db
from app.core.security import get_user_id_from_cookie
from app.schemas.face import FaceOut
from app.crud.face import create_face, get_latest_face_by_user, get_face_image_blob

router = APIRouter(tags=["face"])

# 업로드: multipart/form-data
# - image: UploadFile (점 찍힌 최종 이미지)
# - result_text: "정상" | "비정상"
# - landmarks_json: JSON 문자열(옵션) — 아래 리스트의 피처값들을 담아 보내면 저장됨
#
#  features 예:
#  ["AI_x_61_291","AI_y_61_291","angle_61_291", ... "ratio_mouth_opening"]
@router.post("/", response_model=FaceOut)
async def upload_face_result(
    response: Response,
    image: UploadFile = File(...),
    result_text: str = Form(...),   # "정상" | "비정상"
    landmarks_json: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_cookie),
):
    if result_text not in ("정상", "비정상"):
        raise HTTPException(status_code=400, detail="result_text 는 '정상' 또는 '비정상' 이어야 합니다.")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="이미지 파일이 비어 있습니다.")

    meta = None
    if landmarks_json:
        try:
            meta = json.loads(landmarks_json)
        except Exception:
            raise HTTPException(status_code=400, detail="landmarks_json 이 유효한 JSON이 아닙니다.")

    rec = create_face(
        db,
        user_id=user_id,
        image_bytes=image_bytes,
        image_mime=image.content_type or "image/jpeg",
        image_size=len(image_bytes),
        result_text=result_text,
        landmarks_json=meta,
    )
    return FaceOut.model_validate(rec)

# 현재 로그인 사용자의 최신 기록 메타 조회
@router.get("/latest", response_model=FaceOut)
def get_latest(db: Session = Depends(get_db), user_id: str = Depends(get_user_id_from_cookie)):
    rec = get_latest_face_by_user(db, user_id)
    if not rec:
        raise HTTPException(status_code=404, detail="기록이 없습니다.")
    return FaceOut.model_validate(rec)

# 이미지 바이너리 내려받기(표시용)
@router.get("/{face_id}/image")
def get_image(face_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id_from_cookie)):
    rec = get_face_image_blob(db, face_id)
    if not rec or rec.user_id != user_id:
        raise HTTPException(status_code=404, detail="이미지가 없습니다.")
    return Response(content=rec.image_blob, media_type=rec.image_mime or "image/jpeg")
