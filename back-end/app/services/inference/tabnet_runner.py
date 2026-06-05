# back-end/app/services/inference/tabnet_runner.py
from __future__ import annotations

import os
import io
import json
import logging
from typing import Tuple, List, Dict, Any, Optional

import numpy as np
import joblib

try:
    from pytorch_tabnet.tab_model import TabNetClassifier
except Exception:  # pytorch_tabnet 미설치 환경 대비
    TabNetClassifier = None

try:
    import torch
except Exception:
    torch = None


# 프로젝트 루트 기준: app/assets/models/<modality>/<version>/*
_ASSETS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),  # app/services/..
    "assets",
    "models",
)


def _model_dir(modality: str, version: str = "v1") -> str:
    return os.path.join(_ASSETS_DIR, modality, version)


class PassthroughScaler:
    """스케일러 로딩 실패 시 임시로 쓰는 통과 스케일러(변환 없음)."""
    def transform(self, X: np.ndarray) -> np.ndarray:
        return X


class FallbackClassifier:
    """
    모델 파일이 전혀 로드되지 않을 때를 위한 임시 폴백.
    - 항상 0.5 확률을 반환 (중립)
    - 서비스 가동을 멈추지 않기 위한 안전장치
    """
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        # (N, 2) 형태로 반환
        n = X.shape[0]
        p = np.full((n, 2), 0.5, dtype=np.float32)
        return p

    def predict(self, X: np.ndarray) -> np.ndarray:
        # 0 또는 1 임계 0.5 → 항상 1로 해도 되지만, 0으로 둠
        n = X.shape[0]
        return np.zeros((n, 1), dtype=np.float32)


def _load_feature_order(mdir: str) -> List[str]:
    feature_order_path = os.path.join(mdir, "feature_order.json")
    if not os.path.exists(feature_order_path):
        raise FileNotFoundError(f"feature_order.json not found: {feature_order_path}")
    with open(feature_order_path, "r", encoding="utf-8") as f:
        feature_order = json.load(f)
    if not isinstance(feature_order, list) or not all(isinstance(k, str) for k in feature_order):
        raise ValueError("feature_order.json must be a list[str]")
    return feature_order


def _try_load_scaler(mdir: str):
    scaler_path = os.path.join(mdir, "scaler.save")
    try:
        if os.path.exists(scaler_path):
            return joblib.load(scaler_path)
        raise FileNotFoundError(scaler_path)
    except Exception:
        logging.exception("[INFER] scaler load failed (%s). Fallback to PassthroughScaler.", scaler_path)
        return PassthroughScaler()


def _try_load_tabnet_zip(mdir: str) -> Optional[Any]:
    """TabNetClassifier .zip 저장본 로딩 시도."""
    model_path = os.path.join(mdir, "TabNet_final.zip")
    if not os.path.exists(model_path):
        return None
    if TabNetClassifier is None:
        logging.warning("[INFER] pytorch_tabnet이 설치되어 있지 않아 .zip 로딩을 건너뜁니다.")
        return None
    model = TabNetClassifier()
    try:
        model.load_model(model_path)
        logging.info("[INFER] Loaded TabNet zip: %s", model_path)
        return model
    except Exception as e:
        logging.exception("[INFER] TabNet zip load failed (%s): %s", model_path, e)
        return None


def _try_load_sklearn_pickle(mdir: str) -> Optional[Any]:
    """scikit-learn 계열 joblib/pickle 로딩 시도."""
    candidates = ["model.pkl", "model.joblib"]
    for name in candidates:
        path = os.path.join(mdir, name)
        if not os.path.exists(path):
            continue
        try:
            model = joblib.load(path)
            # predict_proba 또는 predict 메서드가 있어야 한다.
            if hasattr(model, "predict_proba") or hasattr(model, "predict"):
                logging.info("[INFER] Loaded sklearn-like model: %s", path)
                return model
            logging.warning("[INFER] %s 로딩됨, 그러나 predict/prob 인터페이스가 없음.", path)
        except Exception as e:
            logging.exception("[INFER] sklearn pickle load failed (%s): %s", path, e)
    return None


def _try_load_torch_pth(mdir: str) -> Optional[Any]:
    """PyTorch .pth 로딩 시도 (간이)."""
    if torch is None:
        return None
    path = os.path.join(mdir, "model.pth")
    if not os.path.exists(path):
        return None
    try:
        obj = torch.load(path, map_location="cpu")
        # obj가 학습된 모형 그 자체(예: torchscript)거나, wrapper일 수 있음
        # 최소한 predict or predict_proba가 있어야 사용 가능
        if hasattr(obj, "predict_proba") or hasattr(obj, "predict"):
            logging.info("[INFER] Loaded torch model (callable): %s", path)
            return obj
        logging.warning("[INFER] torch model loaded but no predict interface: %s", path)
    except Exception as e:
        logging.exception("[INFER] torch .pth load failed (%s): %s", path, e)
    return None


def _load_model_flexible(mdir: str) -> Any:
    """
    TabNet zip → sklearn pickle → torch pth → 폴백 순으로 시도.
    """
    # 1) TabNet .zip
    model = _try_load_tabnet_zip(mdir)
    if model is not None:
        return model

    # 2) sklearn pickle
    model = _try_load_sklearn_pickle(mdir)
    if model is not None:
        return model

    # 3) torch pth
    model = _try_load_torch_pth(mdir)
    if model is not None:
        return model

    # 4) 최종 폴백
    logging.error("[INFER] No valid model file found in: %s  (using FallbackClassifier)", mdir)
    return FallbackClassifier()


def _load_scaler_model_feature_order(modality: str) -> Tuple[Any, Any, List[str]]:
    mdir = _model_dir(modality)
    feature_order = _load_feature_order(mdir)
    scaler = _try_load_scaler(mdir)
    model = _load_model_flexible(mdir)
    return scaler, model, feature_order


def predict_proba_and_label(modality: str, feats: Dict[str, Any]) -> Tuple[float, int]:
    """
    feats: {feature_name: value}
    returns: (proba_of_class_1, label)
    """
    scaler, model, feature_order = _load_scaler_model_feature_order(modality)

    # 입력 벡터 구성 (누락 피처는 0.0)
    X = np.array([[float(feats.get(k, 0.0)) for k in feature_order]], dtype=np.float32)

    # 스케일 변환
    try:
        Xs = scaler.transform(X)
    except Exception as e:
        logging.exception("[INFER] scaler.transform failed. Using raw features. err=%s", e)
        Xs = X

    proba_1: float

    # 모델 유형에 따라 분기
    try:
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(Xs)
            # scikit/TabNet (N,2) 또는 (N,1) 가능성 대응
            if isinstance(proba, np.ndarray):
                if proba.ndim == 2 and proba.shape[1] >= 2:
                    proba_1 = float(proba[0, 1])
                else:
                    proba_1 = float(proba.ravel()[0])
            else:
                # 리스트 등
                proba_1 = float(np.array(proba).ravel()[0])
        elif hasattr(model, "predict"):
            pred = model.predict(Xs)
            proba_1 = float(np.array(pred).ravel()[0])
        else:
            # FallbackClassifier 등
            proba = model.predict_proba(Xs)
            proba_1 = float(np.array(proba)[0, 1])
    except Exception as e:
        logging.exception("[INFER] model inference failed. Using 0.5 as fallback. err=%s", e)
        proba_1 = 0.5

    label = int(proba_1 >= 0.5)
    return proba_1, label
