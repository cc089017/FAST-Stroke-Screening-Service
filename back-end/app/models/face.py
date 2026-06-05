from sqlalchemy import Column, String, BigInteger, LargeBinary, JSON, DateTime, Integer, text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Face(Base):
    __tablename__ = "face"

    face_id        = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id        = Column(String(50), ForeignKey("user.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)

    image_blob     = Column(LargeBinary, nullable=False)
    image_mime     = Column(String(64), nullable=False, server_default="image/jpeg")
    image_size     = Column(Integer, nullable=True)

    # 결과 간단 버전: "정상" | "비정상" (문자열로 저장)
    result_text    = Column(String(32), nullable=False)

    # 선택: 특징값/랜드마크 메타(아래 리스트의 값들을 JSON으로 보낼 때 저장)
    landmarks_json = Column(JSON, nullable=True)

    created_at     = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP(6)"), nullable=False)
    updated_at     = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)"), nullable=False)

    # (옵션) 역참조가 필요하면 relationship 구성
    # user = relationship("User", backref="faces")
