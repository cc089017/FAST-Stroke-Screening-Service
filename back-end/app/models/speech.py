
# filepath: c:\fast-main\back-end\app\models\speech.py
from sqlalchemy import Column, BigInteger, String, Float, DateTime, JSON, ForeignKey, text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class Speech(Base):
    __tablename__ = "speech"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("user.id", ondelete="SET NULL", onupdate="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=False), nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    wav_filename = Column(String(255))
    model_tag = Column(String(64))
    risk_score = Column(Float)
    threshold = Column(Float)
    result_text = Column(String(32))
    dtw_slice1 = Column(Float)
    dtw_slice2 = Column(Float)
    dtw_slice3 = Column(Float)
    dtw_slice4 = Column(Float)
    dtw_slice5 = Column(Float)
    dtw_slope = Column(Float)
    x_cover = Column(Float)
    voiced_sec = Column(Float)
    features_json = Column(JSON)
    debug_json = Column(JSON)
    dtw_graph_url = Column(String(255))
    feature_graph_url = Column(String(255))
    waveform_graph_url = Column(String(255))

    user = relationship("User", backref="speech_results", lazy="joined")
