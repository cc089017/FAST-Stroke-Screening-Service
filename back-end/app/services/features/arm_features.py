# back-end/app/services/features/arm_features.py
from __future__ import annotations
import os, logging, math
import cv2, numpy as np
import mediapipe as mp
from typing import Dict, Optional

FEATURE_COLS = [
    "left_start_slope","left_end_slope","left_slope_diff",
    "right_start_slope","right_end_slope","right_slope_diff",
    "left_y0","left_y1","left_y2","left_y3","left_y4",
    "right_y0","right_y1","right_y2","right_y3","right_y4",
]

# 엄지→새끼 손끝 인덱스
_TIP_IDX = [4, 8, 12, 16, 20]

mp_hands = mp.solutions.hands

# ── logging ───────────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
logger.propagate = False
if not logger.handlers:
    _h = logging.StreamHandler()
    _f = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    _h.setFormatter(_f)
    logger.addHandler(_h)
logger.setLevel(logging.INFO)

_ARM_LOG_ENABLED = os.getenv("ARM_FEATURE_LOG", "1").lower() not in ("0", "false", "no")

def _fmt(v: float) -> str:
    if v == float("inf"):
        return "inf"
    return f"{float(v):.6f}"

def _log_features(stage: str, feats: Dict[str, float]) -> None:
    if not _ARM_LOG_ENABLED:
        return
    ordered = [float(feats.get(k, 0.0)) for k in FEATURE_COLS]
    logger.info("[ARM][%s] FEATURE_COLS=%s", stage, FEATURE_COLS)
    logger.info("[ARM][%s] values=[%s]", stage, ", ".join(_fmt(v) for v in ordered))

# ── utils ─────────────────────────────────────────────────────────────────────
def _decode_bgr(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("이미지 디코딩 실패")
    return img

def _extract_xy21(img_bgr: np.ndarray) -> Dict[str, Optional[np.ndarray]]:
    """
    MediaPipe Hands로 21개 랜드마크를 '정규화 좌표(0~1, float32)'로 반환.
    반환: {"Left": (21,2) float32 or None, "Right": (21,2) float32 or None}
    """
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    with mp_hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.5) as hands:
        res = hands.process(rgb)

    out: Dict[str, Optional[np.ndarray]] = {"Left": None, "Right": None}
    if not res.multi_hand_landmarks or not res.multi_handedness:
        return out

    for lm, handed in zip(res.multi_hand_landmarks, res.multi_handedness):
        label = handed.classification[0].label  # "Left" / "Right"
        # ✅ 정규화 좌표 그대로 사용 (0~1)
        pts = np.array([[float(p.x), float(p.y)] for p in lm.landmark], dtype=np.float32)  # (21,2)
        out[label] = pts
    return out

# ── slope: dx≈0 → 항상 +inf (helper 규칙과 동일) ──────────────────────────────
def _slope(p1: np.ndarray, p2: np.ndarray) -> float:
    dx = float(p2[0] - p1[0])
    dy = float(p2[1] - p1[1])
    return (dy / dx) if (abs(dx) > 1e-6) else float("inf")

def _features_from_xy(
    s_xy: Dict[str, Optional[np.ndarray]],
    e_xy: Dict[str, Optional[np.ndarray]],
    H: int  # 시그니처 유지용(미사용)
) -> Dict[str, float]:
    def hand_feats(hand: str):
        s_hand, e_hand = s_xy.get(hand), e_xy.get(hand)

        def slope_of(hxy: Optional[np.ndarray]) -> float:
            if hxy is None:
                return 0.0
            return _slope(hxy[4], hxy[20])  # 엄지(4) ↔ 새끼(20)

        s = slope_of(s_hand)
        e = slope_of(e_hand)
        diff = abs(e - s)

        # ✅ Δy: 정규화 좌표로 end - start (0~1 스케일)
        youts: list[float] = []
        for idx in _TIP_IDX:
            if s_hand is None or e_hand is None:
                youts.append(0.0)
            else:
                youts.append(float(e_hand[idx][1] - s_hand[idx][1]))

        return s, e, diff, youts

    ls, le, ld, ly = hand_feats("Left")
    rs, re, rd, ry = hand_feats("Right")

    feats = {
        "left_start_slope": ls, "left_end_slope": le, "left_slope_diff": ld,
        "right_start_slope": rs, "right_end_slope": re, "right_slope_diff": rd,
        "left_y0": ly[0], "left_y1": ly[1], "left_y2": ly[2], "left_y3": ly[3], "left_y4": ly[4],
        "right_y0": ry[0], "right_y1": ry[1], "right_y2": ry[2], "right_y3": ry[3], "right_y4": ry[4],
    }
    for k in FEATURE_COLS:
        feats.setdefault(k, 0.0)

    _log_features("extract", feats)
    return feats

def extract_features_from_two_images(start_bytes: bytes, end_bytes: bytes) -> Dict[str, float]:
    start = _decode_bgr(start_bytes)
    end = _decode_bgr(end_bytes)
    s_xy = _extract_xy21(start)
    e_xy = _extract_xy21(end)
    H = int(start.shape[0]) if start is not None else 1  # (미사용) 시그니처 유지
    return _features_from_xy(s_xy, e_xy, H)

# (선택) 모델 입력 벡터/로깅 편의 함수
def to_feature_vector(feats: Dict[str, float]) -> np.ndarray:
    vec = np.array([float(feats.get(k, 0.0)) for k in FEATURE_COLS], dtype=np.float32)
    if _ARM_LOG_ENABLED:
        logger.info("[ARM][vector] shape=%s dtype=%s", vec.shape, vec.dtype)
        logger.info("[ARM][vector] values=[%s]", ", ".join(_fmt(v) for v in vec.tolist()))
    return vec

def features_from_two_images_as_vector(start_bytes: bytes, end_bytes: bytes) -> np.ndarray:
    feats = extract_features_from_two_images(start_bytes, end_bytes)
    return to_feature_vector(feats)
