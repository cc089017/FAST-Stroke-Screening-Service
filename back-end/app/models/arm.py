# back-end/app/models/arm.py
from sqlalchemy import Column, BigInteger, String, Integer, Float, JSON, ForeignKey, text
from sqlalchemy.dialects.mysql import LONGBLOB, DATETIME as MySQLDateTime
from app.db.base import Base

class Arm(Base):
    __tablename__ = "arm"

    arm_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("user.id"), nullable=False)

    start_image_blob = Column(LONGBLOB, nullable=False)
    start_image_mime = Column(String(64), nullable=False, default="image/jpeg")
    start_image_size = Column(Integer, nullable=True)

    end_image_blob   = Column(LONGBLOB, nullable=False)
    end_image_mime   = Column(String(64), nullable=False, default="image/jpeg")
    end_image_size   = Column(Integer, nullable=True)

    label        = Column(String(64), nullable=True)
    confidence   = Column(Float, nullable=True)
    features_json = Column(JSON, nullable=True)

    # ✅ MySQL DATETIME(6)과 동일하게 선언
    created_at = Column(
        MySQLDateTime(fsp=6),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP(6)")
    )
    updated_at = Column(
        MySQLDateTime(fsp=6),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP(6)"),
        onupdate=text("CURRENT_TIMESTAMP(6)")
    )
