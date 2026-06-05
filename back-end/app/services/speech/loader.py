# 모델 아티팩트 로드 및 가드(무결성 검사) - 김민규 작성

import joblib, json, pickle, os, hashlib
import sys
from app.services.speech.quantile_clipper import QuantileClipper
sys.modules['__main__'].QuantileClipper = QuantileClipper

def short_hash(path):
    with open(path, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()[:8]

def load_artifacts(model_dir):
    """모델 아티팩트들을 로드하는 함수
    - dtw_refs.pkl이 없을 경우 Graceful Fallback: refs = [] 로 대체
    """

    # 모델 파일들의 경로 설정
    pipe_path = os.path.join(model_dir, "rf_pipe.joblib")
    xcols_path = os.path.join(model_dir, "xcols.json")
    thresholds_path = os.path.join(model_dir, "thresholds.json")
    dtw_refs_path = os.path.join(model_dir, "dtw_refs.pkl")
    meta_path = os.path.join(model_dir, "meta.json")

    # 파일 존재 여부 확인
    if not os.path.exists(pipe_path):
        raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {pipe_path}")

    # 파일들 로드
    pipe = joblib.load(pipe_path)

    try:
        with open(xcols_path, 'r', encoding='utf-8') as f:
            xcols = json.load(f)
    except UnicodeDecodeError:
        with open(xcols_path, 'r', encoding='cp949') as f:
            xcols = json.load(f)

    try:
        with open(thresholds_path, 'r', encoding='utf-8') as f:
            thresholds = json.load(f)
            theta = thresholds.get("fusion_threshold", thresholds.get("threshold", 0.5))
    except UnicodeDecodeError:
        with open(thresholds_path, 'r', encoding='cp949') as f:
            thresholds = json.load(f)
            theta = thresholds.get("fusion_threshold", thresholds.get("threshold", 0.5))

    # dtw_refs.pkl: 선택 로드 (없으면 빈 리스트로 대체)
    refs = []
    if os.path.exists(dtw_refs_path):
        try:
            with open(dtw_refs_path, 'rb') as f:
                refs = pickle.load(f)
        except Exception as e:
            print(f"[WARNING] dtw_refs.pkl 로드 실패: {e}. 빈 참조로 대체합니다.")
    else:
        print(f"[WARNING] dtw_refs.pkl이 존재하지 않습니다: {dtw_refs_path}. 빈 참조로 대체합니다.")

    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)
    except UnicodeDecodeError:
        with open(meta_path, 'r', encoding='cp949') as f:
            meta = json.load(f)

    print(f"[Speech] Artifacts loaded from {model_dir}")
    print(f"  rf_pipe.joblib: {hash(str(pipe)) % (16**8):08x}")
    print(f"  xcols.json: {hash(str(xcols)) % (16**8):08x}")
    print(f"  thresholds.json: {hash(str(thresholds)) % (16**8):08x}")
    print(f"  dtw_refs.pkl: {'present' if refs else 'MISSING'}")
    print(f"  meta.json: {hash(str(meta)) % (16**8):08x}")

    return pipe, xcols, theta, refs, meta

# def download_model_if_needed():
#     model_path = "back-end/assets/models/speech_model.joblib"
#     if not os.path.exists(model_path):
#         url = "https://drive.google.com/uc?id=구글드라이브_파일_ID"
#         gdown.download(url, model_path, quiet=False)
#     return model_path

# def download_speech_model_files():
#     import gdown
#     import os
#     files = {
#         "rf_pipe.joblib": "1bKQjPCecmGzbg1Baa3xjEEa-0MpQlpni",
#         "xcols.json": "1UjShIKPd15vriBYApTErLJNdvPopF1NG",
#         "dtw_refs.pkl": "1b2g9EXCKve5zg-b55xzdbBB1DqeykFVo",
#         "meta.json": "1T8g6cgBl-Qlyf894lwuCVmYMHREgOPzy",
#         "thresholds.json": "150GeP1Olbq64l9Gntzs3sxn9wkL-_3nK"
#     }
#     save_dir = "back-end/assets/models/S5_voiced~10s_sr16000_cal_20250910"
#     os.makedirs(save_dir, exist_ok=True)
#     for fname, fid in files.items():
#         url = f"https://drive.google.com/uc?id={fid}"
#         output = os.path.join(save_dir, fname)
#         if not os.path.exists(output):
#             gdown.download(url, output, quiet=False)

# # 모델 로딩 시
# import os
# BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))  # 4번 올라감
# model_path = os.path.join(BASE_DIR, "assets", "models", "S5_voiced~10s_sr16000_cal_20250918_serve4x", "rf_pipe.joblib")  # ← 여기는 새 경로
# model = joblib.load(model_path)  # ← 이 부분이 문제! 함수 밖에서 실행됨