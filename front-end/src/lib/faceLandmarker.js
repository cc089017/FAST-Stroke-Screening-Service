// front-end/src/lib/faceLandmarker.js
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const VISION_WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let faceLandmarker = null;
export async function initFaceLandmarker() {
  if (faceLandmarker) return faceLandmarker;
  const resolver = await FilesetResolver.forVisionTasks(VISION_WASM_BASE);
  faceLandmarker = await FaceLandmarker.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: "VIDEO",
    numFaces: 1,
  });
  return faceLandmarker;
}
export function detectOnVideo(landmarker, videoEl, ts) {
  return landmarker.detectForVideo(videoEl, ts);
}

export const FEATURE_POINT_INDEXES = [
  61, 291, 48, 278, 123, 352, 132, 361,
  55, 285, 33, 263, 133, 362, 65, 295,
  81, 311, 91, 321, 145, 374, 159, 385,
  57, 287, 50, 280, 234, 454, 93, 323,
];

export function drawSpecificPoints(ctx, lm, width, height, idxList, opts = {}) {
  const { radius = 1.5, color = "rgba(0,255,0,0.95)", mirror = false } = opts;
  ctx.save();
  ctx.fillStyle = color;
  for (const i of idxList) {
    const p = lm[i];
    if (!p) continue;
    const x = (mirror ? (1 - p.x) : p.x) * width;
    const y = p.y * height;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 추론용 기본 피처 (원본 좌표계 기준)
const PAIRS = [
  [61, 291], [48, 278], [123, 352], [132, 361],
  [55, 285], [33, 263], [133, 362], [65, 295],
  [81, 311], [91, 321], [145, 374], [159, 385],
  [57, 287], [50, 280], [234, 454], [93, 323],
];

export function computeBasicFeatures(lm) {
  const f = {};
  const toDeg = (rad) => (rad * 180) / Math.PI;
  for (const [a, b] of PAIRS) {
    const pa = lm[a], pb = lm[b];
    if (!pa || !pb) continue;
    const dx = (pa.x ?? 0) - (pb.x ?? 0);
    const dy = (pa.y ?? 0) - (pb.y ?? 0);
    const angle = toDeg(Math.atan2((pb.y ?? 0) - (pa.y ?? 0), (pb.x ?? 0) - (pa.x ?? 0)));
    f[`AI_x_${a}_${b}`] = dx;
    f[`AI_y_${a}_${b}`] = dy;
    f[`angle_${a}_${b}`] = angle;
  }
  return f;
}
