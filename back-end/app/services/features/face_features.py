import math
from typing import Dict, Optional, Tuple

import cv2
import numpy as np
import mediapipe as mp

mp_face_mesh = mp.solutions.face_mesh

# === dataset.py와 동일한 정의/순서 ===
landmark_pairs = [
    (61, 291), (48, 278), (123, 352), (132, 361),
    (55, 285), (33, 263), (133, 362), (65, 295),
    (81, 311), (91, 321), (145, 374), (159, 385),
    (57, 287), (50, 280), (234, 454), (93, 323),
]
center_point_idx = 1  # nose tip

LM = {
    "lip_l": 61, "lip_r": 291,
    "eye_l": 33, "eye_r": 263,
    "nose": 1,  "chin": 152,
    "lip_u": 13, "lip_d": 14,
}

def _euclid(p1, p2) -> float:
    return float(np.linalg.norm(np.array(p1) - np.array(p2)))

def _calculate_ai(dR: float, dL: float) -> float:
    denom = dR + dL
    return 0.0 if denom == 0 else abs(dR - dL) / denom

def _angle(p1, p2) -> float:
    dx, dy = (p2[0] - p1[0]), (p2[1] - p1[1])
    if dx == 0:
        return 90.0
    return round(np.degrees(np.arctan2(dy, dx)), 2)  # dataset.py와 동일 라운딩

def extract_features_from_image_bytes(image_bytes: bytes) -> Tuple[Optional[Dict[str, float]], Optional[np.ndarray]]:
    """
    이미지 바이트 → Mediapipe FaceMesh → dataset.py와 동일한 59개 피처 계산.
    반환: (features_dict, 디버그용 이미지) | (None, img) (검출 실패) | (None, None) (디코딩 실패)
    """
    file_bytes = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        return None, None

    h, w = img.shape[:2]
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5
    ) as face_mesh:
        results = face_mesh.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if not results.multi_face_landmarks:
            # 얼굴 미검출: dataset.py에서도 이런 경우 None 리턴
            return None, img

        lms = results.multi_face_landmarks[0].landmark

        def get_xy(idx: int):
            return (lms[idx].x * w, lms[idx].y * h)

        cx, cy = get_xy(center_point_idx)

        features: Dict[str, float] = {}

        # 1) 기본 AI_x/AI_y/angle (16쌍 × 3 = 48개)  ← 순서 매우 중요
        for (l_idx, r_idx) in landmark_pairs:
            lx, ly = get_xy(l_idx)
            rx, ry = get_xy(r_idx)
            # center 대비 좌/우 거리
            dR_x, dL_x = abs(rx - cx), abs(lx - cx)
            dR_y, dL_y = abs(ry - cy), abs(ly - cy)

            features[f"AI_x_{l_idx}_{r_idx}"] = round(_calculate_ai(dR_x, dL_x), 3)
            features[f"AI_y_{l_idx}_{r_idx}"] = round(_calculate_ai(dR_y, dL_y), 3)
            features[f"angle_{l_idx}_{r_idx}"] = _angle((lx, ly), (rx, ry))

        # 2) 추가 11개 지표 (dataset.py와 계산/순서 동일)
        lip_l = get_xy(LM["lip_l"])
        lip_r = get_xy(LM["lip_r"])
        eye_l = get_xy(LM["eye_l"])
        eye_r = get_xy(LM["eye_r"])
        nose  = get_xy(LM["nose"])
        chin  = get_xy(LM["chin"])
        lip_u = get_xy(LM["lip_u"])
        lip_d = get_xy(LM["lip_d"])

        eye_center = ((eye_l[0] + eye_r[0]) / 2.0, (eye_l[1] + eye_r[1]) / 2.0)
        lip_center = ((lip_l[0] + lip_r[0]) / 2.0, (lip_l[1] + lip_r[1]) / 2.0)

        mouth_width = _euclid(lip_l, lip_r)
        face_width  = _euclid(eye_l, eye_r)
        eye_nose    = _euclid(eye_center, nose)
        lip_nose    = _euclid(lip_center, nose)
        eye_lip     = _euclid(eye_center, lip_center)
        face_height = _euclid(nose, chin)

        features["lip_slope"]              = _angle(lip_l, lip_r)
        features["lip_down_angle_left"]    = _angle(lip_l, chin)
        features["lip_down_angle_right"]   = _angle(lip_r, chin)

        features["ratio_mouth_face"]            = mouth_width / face_width if face_width else 0.0
        features["ratio_lip_nose_eye_nose"]     = lip_nose / eye_nose     if eye_nose else 0.0
        features["ratio_eye_lip_face_height"]   = eye_lip / face_height    if face_height else 0.0
        features["angle_diff_lip_eye"]          = abs(_angle(lip_l, lip_r) - _angle(eye_l, eye_r))
        features["ratio_lip_corner_height"]     = abs(lip_l[1] - lip_r[1]) / face_height if face_height else 0.0
        features["angle_diff_eye_lip"]          = abs(_angle(eye_l, lip_l) - _angle(eye_r, lip_r))
        dist_l = _euclid(lip_center, lip_l)
        dist_r = _euclid(lip_center, lip_r)
        features["ratio_lip_center_symmetry"]   = (abs(dist_l - dist_r) / mouth_width) if mouth_width else 0.0
        features["ratio_mouth_opening"]         = abs(lip_u[1] - lip_d[1]) / face_height if face_height else 0.0

        return features, img
