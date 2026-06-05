from sqlalchemy import Column, String, Date, DateTime, Enum, Boolean, func
from app.db.base import Base

class User(Base):
    __tablename__ = "user"

    id            = Column(String(50), primary_key=True, index=True, comment="영숫자 조합 아이디")
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name          = Column(String(100), nullable=False)
    birth_date    = Column(Date, nullable=False)
    phone_number  = Column(String(20), nullable=True)
    gender        = Column(Enum("male","female", name="gender_enum"), nullable=True)
    privacy_agreed= Column(Boolean, default=False, nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
