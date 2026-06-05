# 다양한 모델을 predict_proba_pos로 통일하는 래퍼 - 김민규 작성

import numpy as np
import json
import os

def voiced_slices_and_feats(yv, sr, meta):
    # 기존 DTW 계산 로직...
    
    # DTW 스케일 적용 (새 모델용)
    k = load_dtw_scale()
    if k != 1.0:
        # DTW 관련 특성에 스케일 적용
        slice_means *= k
        slope *= k
    
    # ...나머지 기존 로직...
    
def load_dtw_scale():
    """DTW 스케일 로드"""
    scale_path = "backend/app/assets/models/speech/dtw_scale.json"
    if os.path.exists(scale_path):
        with open(scale_path, 'r') as f:
            return json.load(f).get("k", 1.0)
    return 1.0

def apply_dtw_scale(slice_means, slope, k):
    """DTW 계산 결과에 스케일 k 적용"""
    return slice_means * k, slope * k

def predict_with_model(pipe, features, xcols, theta, refs, meta):
    """모델을 사용하여 예측 수행"""
    
    # DTW 계산 (기존 로직)
    slice_means, slope = calculate_dtw(features, refs)  # 이 함수는 기존 코드에서 가져와야 함
    
    # DTW 스케일 적용
    k = load_dtw_scale()
    slice_means, slope = apply_dtw_scale(slice_means, slope, k)
    
    # 예측 수행 (기존 로직)
    prediction = pipe.predict_proba(features)
    risk = prediction[0][1] if len(prediction) > 0 else 0.0
    
    # 결정
    decision = "Normal" if risk < theta else "Abnormal"
    reason = f"Risk score ({risk:.3f}) vs Threshold ({theta:.3f})"
    
    return {
        "risk": risk,
        "theta": theta,
        "decision": decision,
        "reason": reason
    }