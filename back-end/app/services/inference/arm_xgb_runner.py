# back-end/app/services/inference/arm_xgb_runner.py
from __future__ import annotations
from functools import lru_cache
from pathlib import Path
import numpy as np
from joblib import load

from app.core.config import model_dir, threshold, settings
from app.services.features.arm_features import FEATURE_COLS

MODEL_FILENAME = "xgb_model.pkl"

def _resolve_model_path() -> Path:
    # 1) .env 등에서 절대/상대 경로로 덮어쓰기 (디렉터리 or 파일)
    override = getattr(settings, "ARM_MODEL_DIR", None)
    if override:
        p = Path(override)
        if p.is_dir():
            return p / MODEL_FILENAME
        if p.suffix:  # 파일을 직접 가리키는 경우
            return p

    # 2) core.config의 model_dir("arm") 사용
    try:
        return Path(model_dir("arm")) / MODEL_FILENAME
    except Exception:
        pass

    # 3) 기본 폴백(레포 구조 기준)
    # .../back-end/app/assets/models/arm/v1/xgb_model.pkl
    base = Path(__file__).resolve().parents[3] / "app" / "assets" / "models" / "arm" / "v1"
    return base / MODEL_FILENAME

@lru_cache(maxsize=1)
def _load_model():
    path = _resolve_model_path()
    print(f"[ARM MODEL] loading => {path}")  # 디버그 로그
    if not path.exists():
        raise FileNotFoundError(f"ARM 모델 파일을 찾을 수 없음: {path}")
    return load(path)

def predict_proba_and_label(features: dict[str, float]) -> tuple[float, str]:
    model = _load_model()
    X = np.array([[float(features[k]) for k in FEATURE_COLS]], dtype=float)
    proba1 = float(model.predict_proba(X)[0, 1]) if hasattr(model, "predict_proba") else float(model.predict(X)[0])
    thr = float(getattr(settings, "ARM_THRESHOLD", None) or threshold("arm") or 0.713)
    label = "detected" if proba1 >= thr else "normal"
    return proba1, label
