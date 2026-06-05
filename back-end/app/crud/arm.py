from sqlalchemy.orm import Session
from typing import Optional, Any, Dict
from app.models.arm import Arm  # ★ Arm으로 변경

def create_arm(
    db: Session,
    *,
    user_id:str,
    start_bytes: bytes,
    start_mime: str,
    end_bytes: bytes,
    end_mime: str,
    label: Optional[str],
    confidence: Optional[float],
    features: Optional[Dict[str, Any]] = None,
) -> Arm:
    row = Arm(
        user_id=user_id,
        start_image_blob=start_bytes,
        start_image_mime=start_mime or "image/png",
        start_image_size=len(start_bytes) if start_bytes else None,
        end_image_blob=end_bytes,
        end_image_mime=end_mime or "image/png",
        end_image_size=len(end_bytes) if end_bytes else None,
        label=label,
        confidence=confidence,
        features_json=features,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
