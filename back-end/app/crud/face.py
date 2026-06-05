# back-end/app/crud/face.py
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.face import Face

def create_face(
    db: Session,
    *,
    user_id: str,
    image_bytes: bytes,
    image_mime: str,
    image_size: Optional[int],
    result_text: str, 
    landmarks_json: Optional[Dict[str, Any]] = None,
) -> Face:
    face = Face(
        user_id=user_id,
        image_blob=image_bytes,
        image_mime=image_mime,
        image_size=image_size,
        result_text=result_text,
        landmarks_json=landmarks_json,
    )
    db.add(face)
    db.commit()
    db.refresh(face)
    return face

def get_latest_face_by_user(db: Session, user_id: str) -> Optional[Face]:
    return (
        db.query(Face)
        .filter(Face.user_id == user_id)
        .order_by(Face.created_at.desc())
        .first()
    )

def get_face_image_blob(db: Session, face_id: int) -> Optional[Face]:
    return db.query(Face).filter(Face.face_id == face_id).first()
