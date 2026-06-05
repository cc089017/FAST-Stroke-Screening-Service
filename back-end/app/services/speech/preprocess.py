# 오디오 전처리 및 특징 추출 모듈 (speech)
# 학습과 동일한 방식으로 16k mono, VAD, MFCC, ZCR/RMS, DTW 등 처리

import io, os, numpy as np, soundfile as sf, librosa
import tempfile
import subprocess
from typing import List, Tuple, Dict
from fastdtw import fastdtw
from scipy.spatial.distance import euclidean
import numpy as np
import json
import librosa
import pandas as pd

# 기본 파라미터 (meta.json과 일치해야 함)
SR = 16000          # 샘플링 레이트
S = 5               # 슬라이스 개수
N_MFCC = 13         # MFCC 개수

# 기본 모델 경로(함수 인자 우선, 미지정 시 폴백)
MODEL_PATH = "back-end/app/assets/models/speech"

def load_audio_16k(wav_or_bytes, filename=None):
    """
    bytes 또는 파일 경로를 받아 16kHz mono로 변환 (webm/mp3/m4a 등도 robust하게 지원)
    """
    def _to_16k_mono(y, sr):
        y = librosa.to_mono(y.T) if (y.ndim == 2 and y.shape[1] > 1) else (y if y.ndim==1 else y.squeeze())
        if sr != SR:
            y = librosa.resample(y.astype(np.float32), orig_sr=sr, target_sr=SR, res_type="kaiser_best")
        return y.astype(np.float32)

    def _ffmpeg_to_wav_bytes(b: bytes) -> np.ndarray:
        import tempfile, subprocess, soundfile as sf, os
        with tempfile.NamedTemporaryFile(suffix='.bin', delete=False) as f_in:
            f_in.write(b); f_in.flush(); src_path = f_in.name
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f_out:
            wav_path = f_out.name
        try:
            subprocess.run(['ffmpeg','-y','-i',src_path,'-ar','16000','-ac','1',wav_path],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            y, sr = sf.read(wav_path, always_2d=False)
            return _to_16k_mono(np.array(y, dtype=np.float32), sr=SR)
        finally:
            try: os.unlink(src_path)
            except: pass
            try: os.unlink(wav_path)
            except: pass

    # bytes 계열 입력 처리
    if isinstance(wav_or_bytes, (bytes, bytearray, memoryview, io.BytesIO)):
        b = wav_or_bytes if isinstance(wav_or_bytes, (bytes, bytearray, memoryview)) else wav_or_bytes.getvalue()
        # WebM 시그니처
        if b[:4] == b'\x1A\x45\xDF\xA3':
            return _ffmpeg_to_wav_bytes(b)
        # 확장자 힌트로 mp3/m4a/ogg 등은 ffmpeg로
        if filename and str(filename).lower().endswith(('.mp3','.m4a','.aac','.ogg','.flac','.wma','.mka','.m4b')):
            return _ffmpeg_to_wav_bytes(b)
        # 우선 soundfile로 시도, 실패 시 ffmpeg fallback
        try:
            y, sr = sf.read(io.BytesIO(b), always_2d=False)
            return _to_16k_mono(np.array(y, dtype=np.float32), sr)
        except Exception:
            return _ffmpeg_to_wav_bytes(b)

    # 파일 경로 입력 처리
    try:
        y, sr = sf.read(str(wav_or_bytes), always_2d=False)
        return _to_16k_mono(np.array(y, dtype=np.float32), sr)
    except Exception:
        # 경로가 mp3/m4a면 ffmpeg로 변환
        with open(str(wav_or_bytes),'rb') as f:
            return _ffmpeg_to_wav_bytes(f.read())
# === 추가: 연속 유성 run 병합 함수 ===
def _merge_voiced_by_runs(vflag: np.ndarray, hop_length: int, frame_length: int, min_run_frames: int = 3):
    """
    pyin vflag(True/False)에서 연속된 True 구간을 (start, end) 샘플 인덱스로 병합
    - min_run_frames: 너무 짧은 True 조각 제거
    """
    runs = []
    if vflag is None or len(vflag) == 0:
        return runs
    i = 0
    n = len(vflag)
    while i < n:
        if vflag[i]:
            j = i
            while j + 1 < n and vflag[j + 1]:
                j += 1
            if (j - i + 1) >= min_run_frames:
                s = i * hop_length
                e = j * hop_length + frame_length
                runs.append((s, e))
            i = j + 1
        else:
            i += 1
    return runs

# === 교체: voiced_concat 개선 버전 ===
def voiced_concat(y, sr=16000, hop_length=256, frame_length=1024):
    """
    VAD 모드 선택 가능:
    - SPEECH_VAD_MODE=pyin (기본): pyin 기반 + 실패 시 energy fallback
    - SPEECH_VAD_MODE=energy: energy split만 사용 (학습 전처리와 일치 필요 시 권장)
    """
    import os
    vad_mode = (os.environ.get("SPEECH_VAD_MODE", "pyin") or "pyin").lower()
    # 학습과 동일 프레임/홉을 맞추기 위한 환경변수 (없으면 기본값 유지)
    try:
        env_frame = int(os.environ.get("SPEECH_VAD_FRAME", str(frame_length)))
        env_hop = int(os.environ.get("SPEECH_VAD_HOP", str(hop_length)))
        if env_frame > 0 and env_hop > 0:
            frame_length = env_frame
            hop_length = env_hop
    except Exception:
        pass
    print(f"[DEBUG] voiced_concat: input length={len(y)}, vad_mode={vad_mode}")

    def _energy_concat():
        intervals = librosa.effects.split(y, top_db=25, frame_length=frame_length, hop_length=hop_length)
        if intervals.size:
            result = np.concatenate([y[s:e] for s, e in intervals]).astype(np.float32)
            print(f"[DEBUG] voiced_concat energy: intervals={len(intervals)}, output length={len(result)}")
            return result
        print("[DEBUG] voiced_concat energy: no voiced segments found")
        return np.zeros(0, dtype=np.float32)

    if vad_mode == "energy":
        return _energy_concat()

    # default: pyin + fallback
    f0, vflag, vprob = librosa.pyin(
        y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"),
        sr=sr, frame_length=frame_length, hop_length=hop_length, center=False
    )
    if vflag is not None and np.any(vflag):
        runs = _merge_voiced_by_runs(vflag, hop_length, frame_length, min_run_frames=3)
        if runs:
            parts = [y[max(0, s):min(len(y), e)] for s, e in runs]
            result = np.concatenate(parts).astype(np.float32)
            print(f"[DEBUG] voiced_concat pyin-merged: runs={len(runs)}, output length={len(result)}")
            return result
    print("[DEBUG] pyin failed or no valid runs, using energy-based fallback")
    return _energy_concat()

# === 추가: 최에너지 윈도우 선택 ===
def _best_energy_window(yv: np.ndarray, target_samples: int, sr: int = 16000):
    """
    yv에서 RMS 합이 가장 큰 구간(target_samples) 반환
    (중앙 크롭 대신 사용해 중간이 비는 문제를 완화)
    """
    if len(yv) <= target_samples:
        return yv
    hop = 256
    frame = 1024
    rms = librosa.feature.rms(y=yv, frame_length=frame, hop_length=hop, center=False)[0]
    win_frames = max(1, target_samples // hop)
    csum = np.cumsum(np.concatenate([[0.0], rms]))
    best_sum, best_i = -1.0, 0
    for i in range(0, len(rms) - win_frames + 1):
        s = csum[i + win_frames] - csum[i]
        if s > best_sum:
            best_sum, best_i = s, i
    start = best_i * hop
    end = start + target_samples
    return yv[start:end]

# === 교체: trim_voiced_to_target 개선 버전 ===
def trim_voiced_to_target(yv, target_duration_s=10.0, sr=16000):
    """
    개선: 중앙 크롭 -> '최에너지 10초' 크롭
    """
    print(f"[DEBUG] trim_voiced_to_target: input length={len(yv) if yv is not None else 0}, target_duration_s={target_duration_s}")
    if yv is None or len(yv) == 0:
        print("[ERROR] Empty voiced audio input")
        return np.array([], dtype=np.float32)
    target_samples = int(target_duration_s * sr)
    if len(yv) <= target_samples:
        # 길이가 부족하면 타일링으로 정확히 target 길이를 맞춘다 (학습 입력 길이와 일치)
        reps = int(np.ceil(target_samples / max(1, len(yv))))
        yv_ext = np.tile(yv, reps)[:target_samples].astype(np.float32)
        print(f"[DEBUG] Audio shorter than target, tiled to {len(yv_ext)} samples (reps={reps})")
        return yv_ext
    result = _best_energy_window(yv, target_samples, sr=sr)
    print(f"[DEBUG] Trimmed(best-energy) to: {len(result)} samples")
    return result

def load_dtw_scale(model_path=MODEL_PATH):
    """DTW 스케일 로드 (핵심!)"""
    scale_path = os.path.join(model_path, "dtw_scale.json")
    if os.path.exists(scale_path):
        try:
            with open(scale_path, 'r', encoding='utf-8') as f:
                scale_data = json.load(f)
                k = scale_data.get("k", 1.0)
                print(f"[DEBUG] DTW scale loaded: k={k}")
                return k
        except Exception as e:
            print(f"[ERROR] Failed to load DTW scale: {e}")
            return 1.0
    print(f"[WARNING] DTW scale file not found: {scale_path}")
    return 1.0

def dtw_distance_train_like(M1, M2):
    """
    학습과 동일하게 DTW 경로 길이로 나눈 평균 거리 반환
    """
    s1 = M1.T.astype(float)
    s2 = M2.T.astype(float)
    dist, path = fastdtw(s1, s2, dist=euclidean)
    return float(dist) / max(1, len(path))

def dtw_slice_means(slice_mfcc_list: list, refs: list | None, model_path=MODEL_PATH, scale_mode: str = "auto", normal_ref: float = 4.5) -> list:
    """
    각 슬라이스별 참조들과 DTW 평균 계산.
    - refs가 비어있거나(None/[]) 없는 경우: 정상 기준값(normal_ref)으로 대체하여 서비스 지속
    scale_mode:
      - "auto": 원시 DTW 중앙값이 높을 때(k 필요)만 k 적용
      - "always": 항상 k 적용
      - "never": k 미적용
    """
    S = len(slice_mfcc_list)

    # Graceful fallback: 참조가 없으면 정상 평균값으로 채움
    if not refs:
        print(f"[WARNING] DTW refs가 비어 있습니다. normal_ref={normal_ref}로 대체합니다.")
        return [float(normal_ref) for _ in range(S)]

    raw_means = []
    for i in range(S):
        dists = []
        for r in refs:
            try:
                d = dtw_distance_train_like(slice_mfcc_list[i], r[i])
            except Exception as e:
                print(f"[WARN] DTW error slice {i}: {e}")
                d = np.nan
            dists.append(d)
        dists = [x for x in dists if np.isfinite(x)]
        raw_means.append(float(np.mean(dists)) if dists else np.nan)

    k = load_dtw_scale(model_path)
    overall_raw = float(np.nanmedian(raw_means)) if len(raw_means) else np.nan

    apply = False
    mode = (scale_mode or "auto").lower()
    if mode == "always":
        apply = True
    elif mode == "never":
        apply = False
    else:
        # auto: 원시 분포가 8 이상(12.x 계열)일 때만 k 적용
        apply = (overall_raw >= 8.0)

    final_means = [(m * k if (apply and np.isfinite(m)) else m) for m in raw_means]
    print(f"[DEBUG] DTW scaling -> mode={mode}, k={k}, overall_raw={overall_raw:.3f}, applied={apply}")
    for i, (r, f) in enumerate(zip(raw_means, final_means), 1):
        if apply:
            print(f"[DEBUG] slice{i}: raw={r:.3f} -> scaled={f:.3f}")
        else:
            print(f"[DEBUG] slice{i}: raw={r:.3f} (no scaling)")
    return final_means

def dtw_mean_slope(dtw_means):
    """
    5개 DTW 평균의 선형 기울기
    """
    x = np.arange(len(dtw_means))
    y = np.array(dtw_means)
    if len(y) != 5:
        return float('nan')
    coef = np.polyfit(x, y, 1)
    return float(coef[0])

def voiced_slices_and_feats(yv: np.ndarray, sr: int = SR, meta: dict = None, model_path=MODEL_PATH):
    """
    유성음 구간을 슬라이스하고 특징 추출
    """
    print(f"[DEBUG] voiced_slices_and_feats: yv length={len(yv)}")
    
    # 슬라이스 분할
    edges = slice_edges(len(yv), S)
    print(f"[DEBUG] Slice edges: {edges}")
    
    # MFCC 추출
    mfcc_slices = [mfcc_cmvn(yv[s:e], sr=sr, n_mfcc=N_MFCC) for (s, e) in edges]
    
    # ZCR/RMS 계산
    z_mean, z_std, r_mean, r_std = zcr_rms(yv, sr=sr)
    
    # 결과를 pandas DataFrame으로 구성
    feats_dict = {
        "zcr_mean": z_mean,
        "zcr_std": z_std, 
        "rms_mean": r_mean,
        "rms_std": r_std
    }
    
    # DataFrame으로 변환
    feats = pd.DataFrame([feats_dict])
    
    return {
        "yv": yv,
        "edges": edges,
        "S_used": S,
        "zcr_mean": z_mean,
        "zcr_std": z_std,
        "rms_mean": r_mean,
        "rms_std": r_std
    }, feats

def build_feature_vector(feats_dict, mfcc_slices, refs, xcols, model_path=MODEL_PATH):
    """
    최종 특징 벡터 구성 (DTW 스케일 적용 포함)
    """
    print(f"[DEBUG] build_feature_vector: {len(mfcc_slices)} slices, {len(refs)} refs")
    
    # DTW 특징 계산 (스케일 적용됨)
    dtw_means = dtw_slice_means(mfcc_slices, refs, model_path)
    
    # DTW slope 계산
    slope = dtw_mean_slope(dtw_means)
    
    # 전체 특징 딕셔너리 구성
    features = {}
    
    # DTW 특징 추가
    for i in range(S):
        features[f"dtw_slice{i+1}_mean"] = dtw_means[i]
    features["dtw_mean_slope"] = slope
    
    # ZCR/RMS 특징 추가
    features["zcr_mean"] = feats_dict.get("zcr_mean", np.nan)
    features["zcr_std"] = feats_dict.get("zcr_std", np.nan)
    features["rms_mean"] = feats_dict.get("rms_mean", np.nan)
    features["rms_std"] = feats_dict.get("rms_std", np.nan)
    
    # xcols 순서로 특징 벡터 구성
    X = np.array([[features.get(k, np.nan) for k in xcols]], dtype=np.float32)
    
    # Coverage 계산
    x_cover = float(np.isfinite(X).mean())
    
    print(f"[DEBUG] Feature coverage: {x_cover:.3f}")
    print(f"[DEBUG] DTW means: {dtw_means}")
    print(f"[DEBUG] DTW slope: {slope:.6f}")
    
    # DataFrame으로 반환 (기존 코드와 호환)
    feats_df = pd.DataFrame([features])
    
    return feats_df

def load_meta_info(model_path=MODEL_PATH):
    """meta.json에서 전처리 파라미터 로드"""
    meta_path = os.path.join(model_path, "meta.json")
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as f:
            meta = json.load(f)
            return {
                'sr': meta.get('sr', 16000),
                'S_REF': meta.get('S_REF', 5),
                'n_mfcc': meta.get('n_mfcc', 13),
                'target_duration_s': meta.get('target_duration_s', 10.0)
            }
    # 기본값 반환
    return {
        'sr': 16000,
        'S_REF': 5,
        'n_mfcc': 13,
        'target_duration_s': 10.0
    }

# === 복구: 슬라이스 분할/특징 유틸 ===
def slice_edges(L: int, S_: int = S) -> List[Tuple[int, int]]:
    """
    길이 L을 S_개의 균등 구간 (start, end) 튜플 리스트로 반환
    """
    if L <= 0 or S_ <= 0:
        return []
    idx = np.linspace(0, L, num=S_ + 1, dtype=int)
    return [(int(idx[i]), int(idx[i + 1])) for i in range(S_)]

def mfcc_cmvn(y_seg: np.ndarray, sr: int = SR, n_mfcc: int = N_MFCC) -> np.ndarray:
    """
    MFCC 추출 후 CMVN(normalization)
    """
    if y_seg is None or len(y_seg) == 0:
        return np.zeros((n_mfcc, 1), dtype=np.float32)
    M = librosa.feature.mfcc(y=y_seg, sr=sr, n_mfcc=n_mfcc)
    M = (M - M.mean(axis=1, keepdims=True)) / (M.std(axis=1, keepdims=True) + 1e-8)
    return M.astype(np.float32)

def zcr_rms(yv: np.ndarray, sr: int = SR) -> Tuple[float, float, float, float]:
    """
    ZCR/RMS 평균/표준편차
    """
    if yv is None or len(yv) == 0:
        return (np.nan, np.nan, np.nan, np.nan)
    z = librosa.feature.zero_crossing_rate(yv, frame_length=1024, hop_length=256, center=False)[0]
    r = librosa.feature.rms(y=yv, frame_length=1024, hop_length=256, center=False)[0]
    return float(np.mean(z)), float(np.std(z)), float(np.mean(r)), float(np.std(r))
