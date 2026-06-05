# filepath: c:\fast-main\back-end\app\crud\speech.py
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.models.speech import Speech

def create(db: Session, data: Dict[str, Any]) -> Speech:
    obj = Speech(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_by_user(db: Session, user_id: str, limit: int = 50):
    return db.query(Speech).filter(Speech.user_id == user_id).order_by(Speech.created_at.desc()).limit(limit).all()
