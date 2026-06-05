# back-end/app/schemas/face.py
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel

class FaceCreate(BaseModel):
    # 필요 시 클라이언트 입력 검증용 (현재 사용안하면 지워도 무방)
    result_text: Literal["정상", "비정상"]
    landmarks_json: Optional[Dict[str, Any]] = None

class FaceOut(BaseModel):
    face_id: int
    user_id: str
    result_text: str
    created_at: datetime

    class Config:
        orm_mode = True  # ✅ Pydantic v1에서 ORM 객체 직렬화 허용
