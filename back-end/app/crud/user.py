from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.models.user import User
from app.schemas.user import UserCreate
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user_in: UserCreate) -> User:
    hashed = pwd_ctx.hash(user_in.password)
    db_user = User(
        id=user_in.id,
        email=user_in.email,
        password_hash=hashed,
        name=user_in.name,
        birth_date=user_in.birth_date,
        phone_number=user_in.phone_number,
        gender=user_in.gender,
        privacy_agreed=user_in.privacy_agreed,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()