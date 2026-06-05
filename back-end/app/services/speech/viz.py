# 예측 결과 시각화 - 김민규 작성
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import base64, io

def build_explain_png(y, feats, features, extras, refs, meta, risk, theta, decision):
    try:
        sr = meta.get("sr", 16000)
        fig, axs = plt.subplots(2, 2, figsize=(12, 8))

        # 1) 파형 + 슬라이스 경계
        t = np.arange(len(y)) / sr
        axs[0,0].plot(t, y, color='steelblue', linewidth=0.8)
        edges = extras.get("slice_edges", [])
        for i, e in enumerate(edges[:-1]):
            axs[0,0].axvline(e / sr, color='crimson', linestyle='--', alpha=0.7)
            axs[0,0].text(e / sr, 0.8*np.nanmax(np.abs(y)+1e-6), f"S{i+1}", fontsize=8, color='crimson')
        axs[0,0].set_title("Voiced Waveform & Slice Boundaries")
        axs[0,0].set_xlabel("Time (s)"); axs[0,0].set_ylabel("Amplitude"); axs[0,0].grid(True, alpha=0.3)

        # 2) DTW 막대
        dtw_means = [features.get(f"dtw_slice{i}_mean", 0.0) for i in range(1,6)]
        bars = axs[0,1].bar(range(1,6), dtw_means, color='skyblue', edgecolor='navy')
        axs[0,1].axhline(4.5, color='red', linestyle='--', label='~4.5')
        for b, v in zip(bars, dtw_means):
            axs[0,1].text(b.get_x()+b.get_width()/2, b.get_height()+0.05, f"{v:.2f}", ha='center', va='bottom', fontsize=9)
        axs[0,1].set_title("DTW Distance per Slice")
        axs[0,1].set_xlabel("Slice"); axs[0,1].set_ylabel("Distance"); axs[0,1].legend(); axs[0,1].grid(True, alpha=0.3)

        # 3) ZCR/RMS
        zlabels = ['ZCR Mean','ZCR Std','RMS Mean','RMS Std']
        zvals = [features.get('zcr_mean',0), features.get('zcr_std',0), features.get('rms_mean',0), features.get('rms_std',0)]
        bars2 = axs[1,0].bar(zlabels, zvals, color='lightgreen', edgecolor='darkgreen')
        top = max(max(zvals), 1e-3)
        for b, v in zip(bars2, zvals):
            axs[1,0].text(b.get_x()+b.get_width()/2, v + top*0.02, f"{v:.3f}", ha='center', va='bottom', fontsize=8)
        axs[1,0].set_title("ZCR & RMS"); axs[1,0].grid(True, alpha=0.3)

        # 4) 결과 카드
        axs[1,1].axis('off')
        color = 'red' if decision=='Abnormal' else 'green'
        axs[1,1].text(0.5, 0.75, "Risk", ha='center', fontsize=12, weight='bold')
        axs[1,1].text(0.5, 0.65, f"{risk:.3f}", ha='center', fontsize=20, color=color, weight='bold')
        axs[1,1].text(0.5, 0.48, f"Threshold: {theta:.3f}", ha='center', fontsize=12)
        axs[1,1].text(0.5, 0.32, f"Decision: {decision}", ha='center', fontsize=16, color=color, weight='bold')
        axs[1,1].text(0.5, 0.18, f"DTW Avg: {np.mean(dtw_means):.2f}", ha='center', fontsize=11)

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=120, bbox_inches='tight', facecolor='white'); buf.seek(0)
        b64 = base64.b64encode(buf.getvalue()).decode()
        plt.close(fig)
        return b64
    except Exception as e:
        print(f"[ERROR] build_explain_png: {e}")
        return None


def build_waveform_png(y, meta, extras):
    """파형 + 슬라이스 경계를 단일 이미지로 생성하여 base64 반환"""
    try:
        sr = meta.get("sr", 16000)
        fig, ax = plt.subplots(1, 1, figsize=(10, 3))
        t = np.arange(len(y)) / sr
        ax.plot(t, y, color='steelblue', linewidth=0.8)
        edges = extras.get("slice_edges", [])
        for i, e in enumerate(edges[:-1]):
            ax.axvline(e / sr, color='crimson', linestyle='--', alpha=0.7)
            ax.text(e / sr, 0.8*np.nanmax(np.abs(y)+1e-6), f"S{i+1}", fontsize=8, color='crimson')
        ax.set_title("Voiced Waveform")
        ax.set_xlabel("Time (s)"); ax.set_ylabel("Amplitude"); ax.grid(True, alpha=0.3)
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=120, bbox_inches='tight', facecolor='white'); buf.seek(0)
        b64 = base64.b64encode(buf.getvalue()).decode()
        plt.close(fig)
        return b64
    except Exception as e:
        print(f"[ERROR] build_waveform_png: {e}")
        return None


def build_dtw_png(dtw_means, normal_ref: float = 4.5):
    """DTW 슬라이스 막대 그래프 생성하여 base64 반환"""
    try:
        fig, ax = plt.subplots(1, 1, figsize=(10, 3))
        xs = list(range(1, 6))
        bars = ax.bar(xs, dtw_means, color='skyblue', edgecolor='navy')
        ax.axhline(normal_ref, color='red', linestyle='--', label=f'Normal avg~{normal_ref}')
        for b, v in zip(bars, dtw_means):
            ax.text(b.get_x()+b.get_width()/2, b.get_height()+0.05, f"{v:.2f}", ha='center', va='bottom', fontsize=9)
        ax.set_title("DTW Distance per Slice")
        ax.set_xlabel("Slice"); ax.set_ylabel("Distance"); ax.legend(); ax.grid(True, alpha=0.3)
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=120, bbox_inches='tight', facecolor='white'); buf.seek(0)
        b64 = base64.b64encode(buf.getvalue()).decode()
        plt.close(fig)
        return b64
    except Exception as e:
        print(f"[ERROR] build_dtw_png: {e}")
        return None