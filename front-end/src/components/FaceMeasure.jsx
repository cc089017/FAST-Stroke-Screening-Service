// src/components/FaceMeasure.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { predictFaceFrame, uploadFaceFrame } from "../api/measure";
import {
  initFaceLandmarker,
  detectOnVideo,
  computeBasicFeatures,
  drawSpecificPoints,
  FEATURE_POINT_INDEXES,
} from "../lib/faceLandmarker";

const RAD2DEG = 180 / Math.PI;
const MIRRORED_VIEW = true; // 화면은 좌우 반전 표시(scaleX(-1))

// roll/yaw만 사용. 가이드를 위해 centerTol, scaleMax는 유지
const TH = {
  rollDeg: 3.0,
  yawDeg: 5.0,
  centerTol: 0.06,
  scaleMax: 0.24,
  autoHoldSec: 5.0,
};

function ema(prev, next, a = 0.25) {
  if (!prev) return next;
  const out = {};
  for (const k of Object.keys(next)) out[k] = prev[k] + a * (next[k] - prev[k]);
  return out;
}

// MediaPipe 변환행렬 → 오일러각
function eulerFromMat4(m) {
  const r00 = m[0], r01 = m[1], r02 = m[2];
  const r10 = m[4], r11 = m[5], r12 = m[6];
  const r20 = m[8], r21 = m[9], r22 = m[10];
  const sy = Math.hypot(r00, r10);
  let roll, pitch, yaw;
  if (sy > 1e-6) {
    roll  = Math.atan2(r21, r22);
    pitch = Math.atan2(-r20, sy);
    yaw   = Math.atan2(r10, r00);
  } else {
    roll  = Math.atan2(-r12, r11);
    pitch = Math.atan2(-r20, sy);
    yaw   = 0;
  }
  return { roll: roll * RAD2DEG, pitch: pitch * RAD2DEG, yaw: yaw * RAD2DEG };
}

// 랜드마크로 근사 지표
function approxPose(lm, w, h) {
  const L = lm[33], R = lm[263], N = lm[1], C = lm[152];
  const Lx = L.x * w, Ly = L.y * h;
  const Rx = R.x * w, Ry = R.y * h;
  const Nx = N.x * w, Ny = N.y * h;
  const Cx = C.x * w, Cy = C.y * h;

  const eyeDx = Rx - Lx, eyeDy = Ry - Ly;
  const interEye = Math.hypot(eyeDx, eyeDy) || 1;
  const roll = Math.atan2(eyeDy, eyeDx) * RAD2DEG;

  const midEyeX = (Lx + Rx) / 2;
  const yaw = Math.asin(Math.max(-1, Math.min(1, (Nx - midEyeX) / (interEye * 0.5)))) * RAD2DEG;

  // pitch 근사 (코→턱 벡터 기울기)
  const vnx = Cx - Nx, vny = Cy - Ny;
  const pitch = Math.atan2(vnx, vny) * RAD2DEG;

  return { roll, yaw, pitch };
}

// 간단한 줄바꿈
function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const tryLine = line ? line + " " + w : w;
    if (ctx.measureText(tryLine).width <= maxWidth) {
      line = tryLine;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ===== 얼굴 가이드 오버레이 =====
const FACE_GUIDE = {
  eyeToFace: 2.4,     // 눈동자 간격 → 얼굴 폭 환산 비율(경험치)
  faceAspect: 1.25,   // 얼굴 타원 세로/가로 비율
};

function drawGuides(ctx, w, h) {
  ctx.save();

  // 1) 중앙 정렬 밴드 (폭을 더 좁게)
  const bandScale = 0.6; // 기존 대비 60% 폭
  const bandW = TH.centerTol * w * 2 * bandScale;
  const x0 = Math.round(w / 2 - bandW / 2);
  ctx.fillStyle = "rgba(34,197,94,0.08)";
  ctx.fillRect(x0, 0, bandW, h);
  ctx.strokeStyle = "rgba(34,197,94,0.65)";
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, 0); ctx.lineTo(x0, h);
  ctx.moveTo(x0 + bandW, 0); ctx.lineTo(x0 + bandW, h);
  ctx.stroke();

  // 2) 적정 거리 타원 - 바깥 외곽선만 표시
  const cx = w / 2;
  const cy = Math.min(h * 0.46, h - 40);
  const eyeMax = TH.scaleMax * w;

  let faceWMax = eyeMax * FACE_GUIDE.eyeToFace;
  let faceHMax = faceWMax * FACE_GUIDE.faceAspect;

  // 화면을 넘지 않도록 클램프
  const maxH = h * 0.9;
  if (faceHMax > maxH) {
    const s = maxH / faceHMax;
    faceWMax *= s; faceHMax *= s;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(34,197,94,0.85)";
  ctx.beginPath();
  ctx.ellipse(0, 0, faceWMax / 2, faceHMax / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

export default function FaceMeasure() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animRef = useRef(null);
  const capturingRef = useRef(false);

  const stateRef = useRef({
    smoothed: null,
    lastTs: 0,
    holdSec: 0, // 정상 유지 시간 누적
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let running = true;
    (async () => {
      try {
        // 해상도 선호: 1080p 이상, 프레임레이트 30~60
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, max: 60 },
            aspectRatio: { ideal: 16 / 9 },
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
        landmarkerRef.current = await initFaceLandmarker();
      } catch {
        setErr("카메라 초기화 실패");
        return;
      }

      const loop = () => {
        if (!running) return;
        const v = videoRef.current;
        const c = overlayRef.current;
        const landmarker = landmarkerRef.current;
        const nowTs = performance.now();

        if (!v || !c || !landmarker || !v.videoWidth || !v.videoHeight) {
          stateRef.current.lastTs = nowTs;
          animRef.current = requestAnimationFrame(loop);
          return;
        }

        const w = v.videoWidth, h = v.videoHeight;
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }

        const det = detectOnVideo(landmarker, v, nowTs);
        const lm = det?.faceLandmarks?.[0];
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, w, h);

        // ✅ 항상 가이드 먼저 그리기
        drawGuides(ctx, w, h);

        if (lm) {
          // 측정치 (roll, yaw만 사용)
          let metrics;
          const mat = det?.facialTransformationMatrixes?.[0]?.data;
          if (mat && mat.length >= 16) {
            metrics = eulerFromMat4(mat); // roll, yaw, pitch
          } else {
            const approx = approxPose(lm, w, h);
            metrics = { roll: approx.roll, yaw: approx.yaw, pitch: approx.pitch };
          }
          stateRef.current.smoothed = ema(stateRef.current.smoothed, metrics, 0.25);
          const m = stateRef.current.smoothed || metrics;

          // 임계값 (roll, yaw만 판정)
          const rollOk = Math.abs(m.roll) <= TH.rollDeg;
          const yawOk  = Math.abs(m.yaw)  <= TH.yawDeg;
          const ok = rollOk && yawOk;

          // 안내문(고정 슬롯 배치)
          const viewRoll = MIRRORED_VIEW ? -m.roll : m.roll;
          const viewYaw  = MIRRORED_VIEW ? -m.yaw  : m.yaw;

          // ✅ 동일 문구면 중첩 삼항 불필요: 단순 조건식으로
          const messages = {
            roll: !rollOk ? "머리가 기울어짐." : null,
            yaw:  !yawOk  ? "고개를 돌려 정면을 봐요." : null,
          };

          // --- 고정 좌표 슬롯 & 글자 크기/줄간격 ---
          ctx.save();

          const FONT_PX = 80;
          const FONT2_PX = 50;
          const LINE_H  = Math.round(FONT_PX * 1.28);
          ctx.fillStyle = "#ffffffff";
          ctx.font = `${FONT_PX}px sans-serif`;
          ctx.textBaseline = "top";

          const maxWide = Math.min(800, Math.max(480, Math.floor(w * 0.9)));
          const slots = {
            roll: { x: 32,     y: 32, align: "left",  maxW: 560 },     // 좌상
            yaw:  { x: w - 32, y: 32, align: "right", maxW: 560 },     // 우상
            ok:   { x: w / 2,  y: 28, align: "center",maxW: Math.min(maxWide, w * 0.8) }, // OK 메시지
          };

          const drawMsg = (text, slot) => {
            if (!text) return;
            ctx.textAlign = slot.align;
            const lines = wrapLines(ctx, text, slot.maxW);
            lines.forEach((ln, i) => {
              ctx.fillText(ln, slot.x, slot.y + i * LINE_H);
            });
          };

          let anyShown = false;
          drawMsg(messages.roll, slots.roll); anyShown = anyShown || !!messages.roll;
          drawMsg(messages.yaw,  slots.yaw);  anyShown = anyShown || !!messages.yaw;

          if (!anyShown) {
            ctx.fillStyle = "lime";
            ctx.font = `${FONT_PX}px sans-serif`;
            ctx.textAlign = slots.ok.align;
            const okMsg = "그대로 웃는 얼굴을 유지하세요!";
            const okLines = wrapLines(ctx, okMsg, slots.ok.maxW);
            okLines.forEach((ln, i) => {
              ctx.fillText(ln, slots.ok.x, slots.ok.y + i * LINE_H);
            });
          }
          ctx.restore();

          // 유지 타이머(숫자)
          const dt = stateRef.current.lastTs ? (nowTs - stateRef.current.lastTs) / 1000 : 0;
          stateRef.current.lastTs = nowTs;
          stateRef.current.holdSec = ok ? Math.min(TH.autoHoldSec, stateRef.current.holdSec + dt) : 0;

          const hold = stateRef.current.holdSec;
          const need = TH.autoHoldSec;
          const remaining = Math.max(0, need - hold);
          const timerText = remaining.toFixed(1);

          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "bold 50px sans-serif";
          ctx.fillStyle = ok ? "rgba(0, 255, 0, 0.95)" : "rgba(180,180,180,0.9)";
          ctx.fillText(timerText, w / 2, h * 0.85);
          ctx.restore();

          // 자동 캡처
          if (ok && hold >= TH.autoHoldSec && !capturingRef.current) {
            capturingRef.current = true;
            onCapture();
          }
        } else {
          // 얼굴 미검출
          stateRef.current.lastTs = nowTs;
          stateRef.current.holdSec = 0;

          const ctx2 = c.getContext("2d");
          ctx2.save();

          const vw = v.videoWidth || c.width || 800;
          const vh = v.videoHeight || c.height || 450;

          // ✅ 미검출 상태에서도 가이드 표시
          drawGuides(ctx2, vw, vh);

          ctx2.fillStyle = "red";
          ctx2.font = "25px sans-serif";
          ctx2.textBaseline = "top";
          ctx2.fillText("얼굴을 화면 중앙에 맞춰주세요.", 20, 20);

          ctx2.textAlign = "center";
          ctx2.textBaseline = "middle";
          ctx2.font = "bold 88px sans-serif";
          ctx2.fillStyle = "rgba(180,180,180,0.9)";
          ctx2.fillText(TH.autoHoldSec.toFixed(1), vw / 2, vh * 0.85);
          ctx2.restore();
        }

        animRef.current = requestAnimationFrame(loop);
      };
      animRef.current = requestAnimationFrame(loop);
    })();

    return () => {
      let v = videoRef.current;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const stream = v?.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  

  // 자동 캡처
  const onCapture = async () => {
    setErr("");
    setBusy(true);
    try {
      const v = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!v || !landmarker) throw new Error("no video/landmarker");

      const w = v.videoWidth, h = v.videoHeight;
      const det = detectOnVideo(landmarker, v, performance.now());
      if (!det?.faceLandmarks?.length) throw new Error("얼굴 인식 실패");

      const lm = det.faceLandmarks[0];
      const features = computeBasicFeatures(lm);

      // 캡처(미러)
      const off = document.createElement("canvas");
      off.width = w; off.height = h;
      const octx = off.getContext("2d");

      octx.save();
      octx.translate(w, 0);
      octx.scale(-1, 1);
      octx.drawImage(v, 0, 0, w, h);
      octx.restore();

      // 필요 시 점 표시(보이기 싫으면 아래 줄 주석처리)
      drawSpecificPoints(octx, lm, w, h, FEATURE_POINT_INDEXES, { mirror: true, radius: 1.5 });

      const blob = await new Promise((res) => off.toBlob((b) => res(b), "image/jpeg", 0.9));
      const pred = await predictFaceFrame(blob);
      await uploadFaceFrame(blob, {
        predLabel: Number(pred?.pred_label),
        features,
      });

      navigate("/test/arm"); 
    } catch (e) {
      setErr(e?.message || "업로드/예측 실패");
    } finally {
      setBusy(false);
      capturingRef.current = false;
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-white relative overflow-hidden">
      <div className="w-[133vh] h-[133vh] rounded-full border-[7vw] border-[#f6f6f6] shadow-xl overflow-hidden flex items-center justify-center z-0 relative">
        <div
          style={{
            position: "relative",
            width: "75%",       // 바깥 원(컨테이너) 너비에 맞춤
            height: "70vh",     // 카메라 높이 고정
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)", // 화면 미러
            }}
          />
          <canvas
            ref={overlayRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          />
        </div>

        {err && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-red-600 text-sm">
            {err}
          </div>
        )}
      </div>
    </div>
  );
}

