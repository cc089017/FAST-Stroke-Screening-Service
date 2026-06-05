from typing import Dict, Tuple
from app.core.config import Modality
from app.services.features.face_features import extract_features_from_image_bytes as face_from_image
from app.services.inference.tabnet_runner import predict_proba_and_label
from app.services.features.arm_features import extract_features_from_two_images as arm_extract
from app.services.inference.arm_xgb_runner import predict_proba_and_label as arm_predict
from app.services.arm_result import compose_arm_result

def run_pipeline(modality: Modality, payload: bytes) -> Tuple[Dict[str, float], float, int]:
    if modality == "face":
        feats, _ = face_from_image(payload)
        if not feats: raise ValueError("얼굴 인식 실패")
    elif modality == "arm":
        s_bytes, e_bytes = payload
        feats = arm_extract(s_bytes, e_bytes)
        proba, label = arm_predict(feats)
        text = compose_arm_result(proba, label, feats)
        return {"proba": proba, "label": label, "text": text, "features": feats}
    elif modality == "speech":
        raise NotImplementedError("speech pipeline 준비 중")
    else:
        raise ValueError("Unknown modality")
    proba, label = predict_proba_and_label(modality, feats)
    return feats, proba, label
